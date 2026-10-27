import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { validateUsername, validatePassword, userKey } from '../src/features/auth/domain/authRules';
import {
  hashPassword, verifyPassword, signSession, sessionFromCookieHeader,
  sessionCookie, clearSessionCookie,
} from '../src/features/auth/server/session';
import {
  UserRecord, validateEmail, emailKey, userIdKey, resultsKey, newResetToken, resetKey,
  resolveAccount, RESET_TTL_SECONDS, googleKey,
} from '../src/features/auth/server/accounts';
import { sendMail, mailConfigured, appUrl } from '../src/features/auth/server/mailer';
import { signData, verifyData } from '../src/features/auth/server/session';
import {
  googleConfigured, googleRedirectUri, pkce, randomState, authorizationUrl,
  exchangeCode, fetchProfile, suggestUsername,
} from '../src/features/auth/server/google';

/**
 * GET  /api/auth?action=me                              → conta da sessão (ou null)
 * GET  /api/auth?action=results                         → "Os meus resultados"
 * POST /api/auth?action=register  { username, password, email? }
 * POST /api/auth?action=login     { username, password }
 * POST /api/auth?action=logout
 * POST /api/auth?action=set-email { email }             (com sessão)
 * POST /api/auth?action=forgot    { email }             (resposta sempre igual)
 * POST /api/auth?action=reset     { token, password }
 * POST /api/auth?action=delete    { password }          (com sessão)
 *
 * Sem AUTH_SECRET, as rotas de conta respondem 503 e o jogo continua anónimo.
 */

const clientIp = (req: VercelRequest): string => {
  const fwd = req.headers['x-forwarded-for'];
  const first = Array.isArray(fwd) ? fwd[0] : fwd?.split(',')[0];
  return first?.trim() || 'unknown';
};

const bodyOf = (req: VercelRequest): Record<string, unknown> =>
  (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>;

/** Valor de um cookie pelo nome, ou null. */
const cookieValue = (header: string | undefined, name: string): string | null => {
  const pair = (header ?? '').split(';').map(c => c.trim()).find(c => c.startsWith(`${name}=`));
  return pair ? pair.slice(name.length + 1) : null;
};

const parseJson = <T>(raw: unknown): T | null =>
  raw === null || raw === undefined ? null : ((typeof raw === 'string' ? JSON.parse(raw) : raw) as T);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.AUTH_SECRET;
  const secure = Boolean(process.env.VERCEL) || req.headers['x-forwarded-proto'] === 'https';
  const action = typeof req.query.action === 'string' ? req.query.action : '';

  try {
    // Ações sem Redis.
    if (req.method === 'POST' && action === 'logout') {
      res.setHeader('Set-Cookie', clearSessionCookie(secure));
      return res.status(200).json({ ok: true });
    }

    if (!secret) {
      if (req.method === 'GET' && action === 'me') {
        return res.status(200).json({ configured: false, googleEnabled: false, account: null });
      }
      return res.status(503).json({ error: 'contas indisponíveis' });
    }

    const redis = Redis.fromEnv();
    const now = Math.floor(Date.now() / 1000);
    const session = sessionFromCookieHeader(req.headers.cookie, secret);
    const account = await resolveAccount(redis, req.headers.cookie, secret);
    const ip = clientIp(req);

    const limited = async (prefix: string, max: number) => {
      const limit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(max, '1 m'), prefix });
      return !(await limit.limit(ip)).success;
    };

    // Leitura da conta (sessão).
    if (req.method === 'GET' && action === 'me') {
      let email: string | null = null;
      if (account) {
        const rec = parseJson<UserRecord>(await redis.get<unknown>(userKey(account.username)));
        email = rec?.email ?? null;
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        configured: true,
        googleEnabled: googleConfigured(),
        account: account ? { username: account.username, email } : null,
      });
    }

    if (req.method === 'GET' && action === 'google-start') {
      if (!googleConfigured()) return res.status(503).json({ error: 'login com Google indisponível' });
      const state = randomState();
      const { verifier, challenge } = pkce();
      const saved = signData({ state, verifier }, secret, now, 600);
      res.setHeader('Set-Cookie', `oauth_state=${saved}; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=600${secure ? '; Secure' : ''}`);
      res.setHeader('Location', authorizationUrl(state, challenge));
      return res.status(302).end();
    }

    if (req.method === 'GET' && action === 'google-callback') {
      const back = (outcome: 'ok' | 'error') => {
        const base = (process.env.APP_URL ?? '').replace(/\/$/, '') || '/';
        res.setHeader('Set-Cookie', `oauth_state=; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`);
        res.setHeader('Location', `${base}/?google=${outcome}`);
        return res.status(302).end();
      };
      const code = typeof req.query.code === 'string' ? req.query.code : '';
      const state = typeof req.query.state === 'string' ? req.query.state : '';
      const cookie = cookieValue(req.headers.cookie, 'oauth_state');
      const saved = cookie ? verifyData<{ state: string; verifier: string }>(cookie, secret, now) : null;
      if (!code || !saved || saved.state !== state) return back('error');

      const accessToken = await exchangeCode(code, saved.verifier);
      const profile = accessToken ? await fetchProfile(accessToken) : null;
      if (!profile) return back('error');

      // Conta já ligada a este Google: reutiliza. Senão, cria uma conta nova.
      // Nunca se liga automaticamente pelo email: os emails das contas não estão verificados.
      let userId = await redis.get<string>(googleKey(profile.sub));
      let username: string | null = userId ? await redis.get<string>(userIdKey(String(userId))) : null;
      if (!userId || !username) {
        const base = suggestUsername(profile.name, profile.email);
        if (!base) return back('error');
        let chosen: string | null = null;
        for (let n = 0; n < 100 && !chosen; n++) {
          const candidate = n === 0 ? base : `${base.slice(0, 10 - String(n + 1).length)}${n + 1}`;
          const id = crypto.randomUUID();
          const record: UserRecord = {
            id, username: candidate, passwordHash: '', createdAt: new Date().toISOString(), googleSub: profile.sub,
          };
          if (await redis.set(userKey(candidate), JSON.stringify(record), { nx: true })) {
            chosen = candidate;
            userId = id;
            // Email do Google (verificado) só fica ligado se ainda não estiver noutra conta.
            const email = profile.email_verified ? validateEmail(profile.email ?? '') : null;
            if (email && (await redis.set(emailKey(email), id, { nx: true }))) {
              await redis.set(userKey(candidate), JSON.stringify({ ...record, email }));
            }
            await redis.set(userIdKey(id), candidate);
            await redis.set(googleKey(profile.sub), id);
          }
        }
        if (!chosen) return back('error');
        username = chosen;
      }

      const token = signSession({ userId: String(userId), username }, secret, now);
      res.setHeader('Set-Cookie', sessionCookie(token, secure));
      return back('ok');
    }

    if (req.method === 'GET' && action === 'results') {
      if (!account) return res.status(401).json({ error: 'sem sessão' });
      const raw = await redis.lrange<unknown>(resultsKey(account.userId), 0, 99);
      const results = raw.map(r => parseJson<Record<string, unknown>>(r)).filter(Boolean);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ results });
    }

    if (req.method !== 'POST') {
      return res.status(404).json({ error: 'rota não existe' });
    }

    const body = bodyOf(req);

    // Ações que exigem sessão.
    if (action === 'set-email' || action === 'delete') {
      if (!account) return res.status(401).json({ error: 'sem sessão' });
    }

    if (action === 'register' || action === 'login') {
      if (await limited('rl:auth', 10)) return res.status(429).json({ error: 'demasiadas tentativas, tenta mais tarde' });
      const username = typeof body.username === 'string' ? validateUsername(body.username) : null;
      const password = typeof body.password === 'string' ? validatePassword(body.password) : null;
      if (username === null || password === null) {
        return res.status(400).json({ error: 'nome ou palavra-passe inválidos' });
      }
      const key = userKey(username);

      if (action === 'register') {
        let email: string | undefined;
        if (body.email !== undefined && body.email !== '') {
          const e = typeof body.email === 'string' ? validateEmail(body.email) : null;
          if (e === null) return res.status(400).json({ error: 'email inválido' });
          if (!(await redis.set(emailKey(e), 'pending', { nx: true }))) {
            return res.status(409).json({ error: 'esse email já está ligado a outra conta' });
          }
          email = e;
        }
        const record: UserRecord = {
          id: crypto.randomUUID(),
          username,
          passwordHash: await hashPassword(password),
          createdAt: new Date().toISOString(),
          ...(email ? { email } : {}),
        };
        const created = await redis.set(key, JSON.stringify(record), { nx: true });
        if (!created) {
          if (email) await redis.del(emailKey(email));
          return res.status(409).json({ error: 'esse nome já existe' });
        }
        if (email) await redis.set(emailKey(email), record.id);
        await redis.set(userIdKey(record.id), username);
        const token = signSession({ userId: record.id, username }, secret, now);
        res.setHeader('Set-Cookie', sessionCookie(token, secure));
        return res.status(201).json({ account: { username, email: email ?? null } });
      }

      // login
      const record = parseJson<UserRecord>(await redis.get<unknown>(key));
      // Verifica sempre uma palavra-passe, para não revelar pela demora se o nome existe.
      const ok = record
        ? await verifyPassword(password, record.passwordHash)
        : (await hashPassword(password), false);
      if (!record || !ok) return res.status(401).json({ error: 'nome ou palavra-passe inválidos' });
      const token = signSession({ userId: record.id, username: record.username }, secret, now);
      res.setHeader('Set-Cookie', sessionCookie(token, secure));
      return res.status(200).json({ account: { username: record.username, email: record.email ?? null } });
    }

    if (action === 'set-email') {
      const email = typeof body.email === 'string' ? validateEmail(body.email) : null;
      if (email === null) return res.status(400).json({ error: 'email inválido' });
      const rec = parseJson<UserRecord>(await redis.get<unknown>(userKey(account!.username)));
      if (!rec) return res.status(401).json({ error: 'sem sessão' });
      if (rec.email === email) return res.status(200).json({ ok: true, email });
      if (!(await redis.set(emailKey(email), rec.id, { nx: true }))) {
        return res.status(409).json({ error: 'esse email já está ligado a outra conta' });
      }
      if (rec.email) await redis.del(emailKey(rec.email));
      await redis.set(userKey(rec.username), JSON.stringify({ ...rec, email }));
      return res.status(200).json({ ok: true, email });
    }

    if (action === 'forgot') {
      if (await limited('rl:forgot', 5)) return res.status(429).json({ error: 'demasiados pedidos, tenta mais tarde' });
      if (!mailConfigured()) return res.status(503).json({ error: 'envio de email indisponível' });
      const email = typeof body.email === 'string' ? validateEmail(body.email) : null;
      // Resposta igual exista ou não conta com este email.
      if (email) {
        const userId = await redis.get<string>(emailKey(email));
        const username = userId ? await redis.get<string>(userIdKey(String(userId))) : null;
        const rec = username ? parseJson<UserRecord>(await redis.get<unknown>(userKey(String(username)))) : null;
        if (rec && rec.email === email) {
          const { token, hash: _hash } = newResetToken();
          await redis.set(resetKey(token), JSON.stringify({ userId: rec.id }), { ex: RESET_TTL_SECONDS });
          const link = `${appUrl(req.headers.host)}/?reset=${token}`;
          await sendMail(
            email,
            'Recuperar palavra-passe · SapienteAI CodeBot Lab',
            `<p>Para definir uma nova palavra-passe, abre este link (válido 30 minutos):</p><p><a href="${link}">${link}</a></p><p>Se não pediste isto, ignora este email.</p>`,
          );
        }
      }
      return res.status(200).json({ ok: true });
    }

    if (action === 'reset') {
      const token = typeof body.token === 'string' ? body.token : '';
      const password = typeof body.password === 'string' ? validatePassword(body.password) : null;
      if (!token || password === null) return res.status(400).json({ error: 'pedido inválido' });
      // GETDEL: o link só funciona uma vez.
      const stored = parseJson<{ userId: string }>(await redis.getdel<unknown>(resetKey(token)));
      if (!stored) return res.status(400).json({ error: 'link inválido ou expirado' });
      const username = await redis.get<string>(userIdKey(stored.userId));
      const rec = username ? parseJson<UserRecord>(await redis.get<unknown>(userKey(String(username)))) : null;
      if (!rec) return res.status(400).json({ error: 'link inválido ou expirado' });
      await redis.set(userKey(rec.username), JSON.stringify({ ...rec, passwordHash: await hashPassword(password) }));
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete') {
      const password = typeof body.password === 'string' ? body.password : '';
      const rec = parseJson<UserRecord>(await redis.get<unknown>(userKey(account!.username)));
      // Contas só Google não têm palavra-passe: a sessão ativa (cookie SameSite=Lax) basta.
      const passwordOk = rec !== null && (rec.passwordHash === '' || (await verifyPassword(password, rec.passwordHash)));
      if (!rec || !passwordOk) {
        return res.status(403).json({ error: 'palavra-passe incorreta' });
      }
      // Ordem: primeiro invalida a sessão (userid), depois apaga o resto.
      await redis.del(userIdKey(rec.id));
      await redis.del(userKey(rec.username));
      if (rec.email) await redis.del(emailKey(rec.email));
      if (rec.googleSub) await redis.del(googleKey(rec.googleSub));
      await redis.del(resultsKey(rec.id));
      res.setHeader('Set-Cookie', clearSessionCookie(secure));
      return res.status(200).json({ ok: true });
    }

    return res.status(404).json({ error: 'rota não existe' });
  } catch (err) {
    console.error('auth API', err);
    return res.status(500).json({ error: 'erro interno' });
  }
}

