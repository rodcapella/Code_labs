import { createHash, randomBytes } from 'node:crypto';
import type { Redis } from '@upstash/redis';
import { newSessionId, sessionIdFromCookie } from './session';
import type { Streak } from '../../daily/dailyRules';

/** Dados de utilizador guardados no Redis em `user:{nome em minúsculas}`. */
export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  email?: string;
  /** Identificador estável do Google, se a conta foi criada/ligada por Google. */
  googleSub?: string;
}

/** Entrada de "Os meus resultados" (últimas 100 por conta). */
export interface AccountResult {
  levelId: number;
  score: number;
  commands: number;
  errors: number;
  time: number;
  date: string;
  structureBonus?: number;
  qualified: boolean;
  rank?: number;
  createdAt: string;
}

export const RESET_TTL_SECONDS = 30 * 60;
export const PENDING_TTL_SECONDS = 24 * 60 * 60;
export const RESULTS_MAX = 100;
export const EMAIL_MAX = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Email válido e normalizado (minúsculas), ou null. */
export const validateEmail = (raw: string): string | null => {
  const email = raw.trim().toLowerCase();
  return email.length <= EMAIL_MAX && EMAIL_RE.test(email) ? email : null;
};

export const emailKey = (email: string): string => `email:${email}`;
export const userIdKey = (id: string): string => `userid:${id}`;
export const resultsKey = (id: string): string => `results:${id}`;
export const googleKey = (sub: string): string => `google:${sub}`;
export const sessionKey = (sid: string): string => `session:${sid}`;
export const sessionsOfKey = (userId: string): string => `sessions-of:${userId}`;

/** Token de uso único (recuperação ou confirmação): aleatório, e só o hash é guardado. */
export const newToken = (): { token: string; hash: string } => {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
};
export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
export const tokenKey = (prefix: string, token: string): string => `${prefix}:${hashToken(token)}`;

/** Cria uma sessão no servidor. O cookie só leva o identificador. */
export const createSession = async (redis: Redis, userId: string, username: string): Promise<string> => {
  const sid = newSessionId();
  await redis.set(sessionKey(sid), JSON.stringify({ userId, username }), { ex: 30 * 24 * 60 * 60 });
  await redis.sadd(sessionsOfKey(userId), sid);
  await redis.expire(sessionsOfKey(userId), 30 * 24 * 60 * 60);
  return sid;
};

/** Termina uma sessão (logout). O token copiado deixa de valer de imediato. */
export const revokeSession = async (redis: Redis, sid: string): Promise<void> => {
  const raw = await redis.get<unknown>(sessionKey(sid));
  await redis.del(sessionKey(sid));
  if (raw) {
    const rec = (typeof raw === 'string' ? JSON.parse(raw) : raw) as { userId: string };
    await redis.srem(sessionsOfKey(rec.userId), sid);
  }
};

/** Termina todas as sessões de uma conta (recuperação de palavra-passe, apagar conta). */
export const revokeAllSessions = async (redis: Redis, userId: string): Promise<void> => {
  const sids = (await redis.smembers<string[]>(sessionsOfKey(userId))) ?? [];
  for (const sid of sids) await redis.del(sessionKey(sid));
  await redis.del(sessionsOfKey(userId));
};

/** Conta da sessão do cookie, se a sessão existir E a conta ainda existir. */
export const resolveAccount = async (
  redis: Redis,
  cookieHeader: string | undefined,
): Promise<{ userId: string; username: string } | null> => {
  const sid = sessionIdFromCookie(cookieHeader);
  if (!sid) return null;
  const raw = await redis.get<unknown>(sessionKey(sid));
  if (!raw) return null;
  const rec = (typeof raw === 'string' ? JSON.parse(raw) : raw) as { userId: string; username: string };
  const username = await redis.get<string>(userIdKey(rec.userId));
  if (!username) return null; // conta apagada
  return { userId: rec.userId, username: typeof username === 'string' ? username : rec.username };
};

/** Guarda um resultado na conta e mantém só os últimos RESULTS_MAX. */
export const recordResult = async (redis: Redis, userId: string, result: AccountResult): Promise<void> => {
  await redis.lpush(resultsKey(userId), JSON.stringify(result));
  await redis.ltrim(resultsKey(userId), 0, RESULTS_MAX - 1);
};

/** Distintivos ganhos pela conta (conjunto de ids). */
export const badgesKey = (userId: string): string => `badges:${userId}`;

export const addBadges = async (redis: Redis, userId: string, badges: string[]): Promise<void> => {
  for (const badge of badges) await redis.sadd(badgesKey(userId), badge);
};

/** Desafio diário (ver src/features/daily). */
export const DAILY_TTL_SECONDS = 24 * 60 * 60;
export const DAILY_TOP_SIZE = 100;
export const dailyRankingKey = (date: string): string => `leaderboard:v3:daily:${date}`;
export const dailyDoneKey = (date: string, userId: string): string => `daily:done:${date}:${userId}`;
export const dailyAttemptKey = (date: string, userId: string): string => `daily:attempt:${date}:${userId}`;
export const streakKey = (userId: string): string => `streak:${userId}`;

export const readStreak = async (redis: Redis, userId: string): Promise<Streak | null> => {
  const raw = await redis.get<unknown>(streakKey(userId));
  if (!raw) return null;
  return (typeof raw === 'string' ? JSON.parse(raw) : raw) as Streak;
};

export const writeStreak = async (redis: Redis, userId: string, streak: Streak): Promise<void> => {
  await redis.set(streakKey(userId), JSON.stringify(streak));
};
