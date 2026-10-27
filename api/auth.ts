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
  resolveAccount, RESET_TTL_SECONDS,
} from '../src/features/auth/server/accounts';
import { sendMail, mailConfigured, appUrl } from '../src/features/auth/server/mailer';

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
        return res.status(200).json({ configured: false, account: null });
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
        account: account ? { username: account.username, email } : null,
      });
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
      if (!rec || !(await verifyPassword(password, rec.passwordHash))) {
        return res.status(403).json({ error: 'palavra-passe incorreta' });
      }
      // Ordem: primeiro invalida a sessão (userid), depois apaga o resto.
      await redis.del(userIdKey(rec.id));
      await redis.del(userKey(rec.username));
      if (rec.email) await redis.del(emailKey(rec.email));
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

