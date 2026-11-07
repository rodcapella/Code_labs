import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { validateUsername, validatePassword, userKey } from '../src/features/auth/domain/authRules';
import {
  hashPassword, verifyPassword, sessionIdFromCookie, sessionCookie, clearSessionCookie,
  signData, verifyData, cookieValue,
} from '../src/features/auth/server/session';
import {
  UserRecord, validateEmail, emailKey, userIdKey, resultsKey, googleKey, newToken, tokenKey,
  createSession, revokeSession, revokeAllSessions, resolveAccount, RESET_TTL_SECONDS, PENDING_TTL_SECONDS, badgesKey,
} from '../src/features/auth/server/accounts';
import { sendMail, mailConfigured, appUrl } from '../src/features/auth/server/mailer';
import {
  googleConfigured, pkce, randomState, authorizationUrl, exchangeCode, fetchProfile, suggestUsername,
} from '../src/features/auth/server/google';

/**
 * GET  /api/auth?action=me                              → conta da sessão (ou null)
 * GET  /api/auth?action=results                         → "Os meus resultados"
 * GET  /api/auth?action=google-start | google-callback  → login com Google
 * POST /api/auth?action=register  { username, password, email }  → 202 sempre (confirma por email)
 * POST /api/auth?action=confirm   { token }             → cria a conta e inicia sessão
 * POST /api/auth?action=login     { username, password }
 * POST /api/auth?action=logout                          → termina a sessão no servidor
 * POST /api/auth?action=set-email { email, password? }  (com sessão)
 * POST /api/auth?action=forgot    { email }             → 200 sempre
 * POST /api/auth?action=reset     { token, password }
 * POST /api/auth?action=delete    { password? }         (com sessão)
 *
 * AUTH_SECRET é obrigatório para as contas (assina o estado do login com Google).
 * Sem ele, as rotas de conta respondem 503 e o jogo continua anónimo.
 */

const clientIp = (req: VercelRequest): string => {
  const fwd = req.headers['x-forwarded-for'];
  const first = Array.isArray(fwd) ? fwd[0] : fwd?.split(',')[0];
  return first?.trim() || 'unknown';
};

const bodyOf = (req: VercelRequest): Record<string, unknown> =>
  (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>;

const parseJson = <T>(raw: unknown): T | null =>
  raw === null || raw === undefined ? null : ((typeof raw === 'string' ? JSON.parse(raw) : raw) as T);

/**
 * Cria a conta se o nome e o email (se houver) estiverem livres. Devolve null em caso de conflito.
 * Email e nome são reservados com SET NX: duas criações simultâneas não se sobrepõem.
 */
const provisionUser = async (
  redis: Redis,
  data: { username: string; passwordHash: string; email?: string; googleSub?: string },
): Promise<UserRecord | null> => {
  const id = crypto.randomUUID();
  const record: UserRecord = {
    id,
    username: data.username,
    passwordHash: data.passwordHash,
    createdAt: new Date().toISOString(),
    ...(data.googleSub ? { googleSub: data.googleSub } : {}),
  };
  if (data.email) {
    if (!(await redis.set(emailKey(data.email), id, { nx: true }))) return null;
    record.email = data.email;
  }
  if (!(await redis.set(userKey(data.username), JSON.stringify(record), { nx: true }))) {
    if (record.email) await redis.del(emailKey(record.email));
    return null;
  }
  await redis.set(userIdKey(id), data.username);
  if (data.googleSub) await redis.set(googleKey(data.googleSub), id);
  return record;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.AUTH_SECRET;
  const secure = Boolean(process.env.VERCEL) || req.headers['x-forwarded-proto'] === 'https';
  const action = typeof req.query.action === 'string' ? req.query.action : '';

  try {
    // Terminar sessão não precisa de configuração: apaga o cookie e, se possível, a sessão no servidor.
    if (req.method === 'POST' && action === 'logout') {
      if (secret) {
        const sid = sessionIdFromCookie(req.headers.cookie);
        if (sid) await revokeSession(Redis.fromEnv(), sid);
      }
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
    const account = await resolveAccount(redis, req.headers.cookie);
    const ip = clientIp(req);

    const limited = async (prefix: string, max: number, identifier: string = ip) => {
      const limit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(max, '1 m'), prefix });
      return !(await limit.limit(identifier)).success;
    };

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
        account: account
          ? { username: account.username, email, badges: await redis.smembers<string[]>(badgesKey(account.userId)) }
          : null,
      });
    }

    if (req.method === 'GET' && action === 'results') {
      if (!account) return res.status(401).json({ error: 'sem sessão' });
      const raw = await redis.lrange<unknown>(resultsKey(account.userId), 0, 99);
      const results = raw.map(r => parseJson<Record<string, unknown>>(r)).filter(Boolean);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ results });
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
      const back = (outcome: 'ok' | 'error', sid?: string) => {
        const base = (process.env.APP_URL ?? '').replace(/\/$/, '') || '/';
        const cookies = [`oauth_state=; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`];
        if (sid) cookies.push(sessionCookie(sid, secure));
        res.setHeader('Set-Cookie', cookies);
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

      // Conta já ligada a este Google: reutiliza. Senão, cria uma. Nunca se liga por email (não verificado).
      const existingId = await redis.get<string>(googleKey(profile.sub));
      const existingName = existingId ? await redis.get<string>(userIdKey(String(existingId))) : null;
      let userId = existingId && existingName ? String(existingId) : null;
      let username = existingName ? String(existingName) : null;
      if (!userId || !username) {
        const base = suggestUsername(profile.name, profile.email);
        if (!base) return back('error');
        const verifiedEmail = profile.email_verified ? validateEmail(profile.email ?? '') : null;
        for (let n = 0; n < 100 && !userId; n++) {
          const candidate = n === 0 ? base : `${base.slice(0, 10 - String(n + 1).length)}${n + 1}`;
          const data = { username: candidate, passwordHash: '', googleSub: profile.sub };
          const created = (verifiedEmail && (await provisionUser(redis, { ...data, email: verifiedEmail })))
            || (await provisionUser(redis, data));
          if (created) {
            userId = created.id;
            username = created.username;
          }
        }
        if (!userId || !username) return back('error');
      }

      return back('ok', await createSession(redis, userId, username));
    }

    if (req.method !== 'POST') {
      return res.status(404).json({ error: 'rota não existe' });
    }

    const body = bodyOf(req);

    if ((action === 'set-email' || action === 'delete') && !account) {
      return res.status(401).json({ error: 'sem sessão' });
    }

    if (action === 'register') {
      const base = appUrl();
      if (base === null || !mailConfigured()) return res.status(503).json({ error: 'registo indisponível' });
      if (await limited('rl:auth', 10)) return res.status(429).json({ error: 'demasiadas tentativas, tenta mais tarde' });
      const username = typeof body.username === 'string' ? validateUsername(body.username) : null;
      const password = typeof body.password === 'string' ? validatePassword(body.password) : null;
      const email = typeof body.email === 'string' ? validateEmail(body.email) : null;
      if (username === null || password === null) return res.status(400).json({ error: 'nome ou palavra-passe inválidos' });
      if (email === null) return res.status(400).json({ error: 'email inválido' });
      if (await limited('rl:auth-user', 5, `u:${username.toLowerCase()}`)) {
        return res.status(429).json({ error: 'demasiadas tentativas, tenta mais tarde' });
      }

      // O hash é sempre calculado, para que o tempo de resposta não revele se o nome já existe.
      const passwordHash = await hashPassword(password);
      const taken = (await redis.get(userKey(username))) !== null || (await redis.get(emailKey(email))) !== null;
      if (taken) {
        // Quem já tem conta recebe um aviso; quem tentou não vê diferença na resposta.
        await sendMail(email, 'Conta já existente · SapienteAI CodeBot Lab',
          `<p>Já existe uma conta com este nome ou email. Se foste tu, entra normalmente ou recupera a palavra-passe em <a href="${base}">${base}</a>.</p>`);
      } else {
        const { token } = newToken();
        await redis.set(tokenKey('pending', token), JSON.stringify({ username, email, passwordHash }), { ex: PENDING_TTL_SECONDS });
        const link = `${base}/#confirm=${token}`;
        await sendMail(email, 'Confirma o teu email · SapienteAI CodeBot Lab',
          `<p>Para criar a conta, abre este link (válido 24 horas):</p><p><a href="${link}">${link}</a></p><p>Se não pediste isto, ignora este email.</p>`);
      }
      return res.status(202).json({ ok: true });
    }

    if (action === 'confirm') {
      if (await limited('rl:confirm', 10)) return res.status(429).json({ error: 'demasiados pedidos, tenta mais tarde' });
      const token = typeof body.token === 'string' ? body.token : '';
      if (!token) return res.status(400).json({ error: 'link inválido ou expirado' });
      // GETDEL: o link só funciona uma vez.
      const pending = parseJson<{ username: string; email: string; passwordHash: string }>(
        await redis.getdel<unknown>(tokenKey('pending', token)),
      );
      if (!pending) return res.status(400).json({ error: 'link inválido ou expirado' });
      const created = await provisionUser(redis, { username: pending.username, email: pending.email, passwordHash: pending.passwordHash });
      if (!created) return res.status(409).json({ error: 'o nome ou o email entretanto ficou ocupado; faz um novo registo' });
      const sid = await createSession(redis, created.id, created.username);
      res.setHeader('Set-Cookie', sessionCookie(sid, secure));
      return res.status(201).json({ account: { username: created.username, email: created.email ?? null } });
    }

    if (action === 'login') {
      if (await limited('rl:auth', 10)) return res.status(429).json({ error: 'demasiadas tentativas, tenta mais tarde' });
      const username = typeof body.username === 'string' ? validateUsername(body.username) : null;
      const password = typeof body.password === 'string' ? validatePassword(body.password) : null;
      if (username === null || password === null) return res.status(400).json({ error: 'nome ou palavra-passe inválidos' });
      if (await limited('rl:auth-user', 5, `u:${username.toLowerCase()}`)) {
        return res.status(429).json({ error: 'demasiadas tentativas, tenta mais tarde' });
      }
      const record = parseJson<UserRecord>(await redis.get<unknown>(userKey(username)));
      // Verifica sempre uma palavra-passe, para não revelar pela demora se o nome existe.
      const ok = record
        ? await verifyPassword(password, record.passwordHash)
        : (await hashPassword(password), false);
      if (!record || !ok) return res.status(401).json({ error: 'nome ou palavra-passe inválidos' });
      const sid = await createSession(redis, record.id, record.username);
      res.setHeader('Set-Cookie', sessionCookie(sid, secure));
      return res.status(200).json({ account: { username: record.username, email: record.email ?? null } });
    }

    if (action === 'set-email') {
      const email = typeof body.email === 'string' ? validateEmail(body.email) : null;
      if (email === null) return res.status(400).json({ error: 'email inválido' });
      const rec = parseJson<UserRecord>(await redis.get<unknown>(userKey(account!.username)));
      if (!rec) return res.status(401).json({ error: 'sem sessão' });
      // Com sessão roubada, sem a palavra-passe não se pode ligar um email próprio e recuperar a conta.
      if (rec.passwordHash !== '') {
        const password = typeof body.password === 'string' ? body.password : '';
        if (!(await verifyPassword(password, rec.passwordHash))) {
          return res.status(403).json({ error: 'palavra-passe incorreta' });
        }
      }
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
      const base = appUrl();
      if (!mailConfigured() || base === null) return res.status(503).json({ error: 'envio de email indisponível' });
      const email = typeof body.email === 'string' ? validateEmail(body.email) : null;
      // Resposta igual exista ou não conta com este email.
      if (email) {
        const userId = await redis.get<string>(emailKey(email));
        const username = userId ? await redis.get<string>(userIdKey(String(userId))) : null;
        const rec = username ? parseJson<UserRecord>(await redis.get<unknown>(userKey(String(username)))) : null;
        if (rec && rec.email === email) {
          const { token } = newToken();
          await redis.set(tokenKey('reset', token), JSON.stringify({ userId: rec.id }), { ex: RESET_TTL_SECONDS });
          // O token vai no fragmento (#): não é enviado ao servidor nem aparece nos registos de acesso.
          const link = `${base}/#reset=${token}`;
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
      const stored = parseJson<{ userId: string }>(await redis.getdel<unknown>(tokenKey('reset', token)));
      if (!stored) return res.status(400).json({ error: 'link inválido ou expirado' });
      const username = await redis.get<string>(userIdKey(stored.userId));
      const rec = username ? parseJson<UserRecord>(await redis.get<unknown>(userKey(String(username)))) : null;
      if (!rec) return res.status(400).json({ error: 'link inválido ou expirado' });
      await redis.set(userKey(rec.username), JSON.stringify({ ...rec, passwordHash: await hashPassword(password) }));
      // Todas as sessões da conta terminam: um cookie roubado não sobrevive à recuperação.
      await revokeAllSessions(redis, rec.id);
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete') {
      const password = typeof body.password === 'string' ? body.password : '';
      const rec = parseJson<UserRecord>(await redis.get<unknown>(userKey(account!.username)));
      // Contas só Google não têm palavra-passe: a sessão ativa basta.
      const passwordOk = rec !== null && (rec.passwordHash === '' || (await verifyPassword(password, rec.passwordHash)));
      if (!rec || !passwordOk) return res.status(403).json({ error: 'palavra-passe incorreta' });
      await revokeAllSessions(redis, rec.id);
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
