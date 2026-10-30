import { createHash, randomBytes } from 'node:crypto';
import { sessionFromCookieHeader, isRevoked } from './session';

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
export const revokeSessionsKey = (id: string): string => `revoked:${id}`;
export const googleKey = (sub: string): string => `google:${sub}`;
export const resultsKey = (id: string): string => `results:${id}`;

/** Token de recuperação: aleatório, e só o hash é guardado. */
export const newResetToken = (): { token: string; hash: string } => {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
};
export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
export const resetKey = (token: string): string => `reset:${hashToken(token)}`;

type RedisLike = {
  get<T>(key: string): Promise<T | null>;
  getdel<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: Record<string, unknown>): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
};

const parse = <T>(raw: unknown): T | null => {
  if (raw === null || raw === undefined) return null;
  return (typeof raw === 'string' ? JSON.parse(raw) : raw) as T;
};

/** Conta da sessão, se a sessão for válida E a conta ainda existir. */
export const resolveAccount = async (
  redis: RedisLike,
  cookieHeader: string | undefined,
  secret: string | undefined,
): Promise<{ userId: string; username: string } | null> => {
  const session = sessionFromCookieHeader(cookieHeader, secret);
  if (!session) return null;
  const username = await redis.get<string>(userIdKey(session.userId));
  if (!username) return null; // conta apagada: a sessão deixa de valer
  const revokedAt = Number(await redis.get<string>(revokeSessionsKey(session.userId))) || null;
  if (isRevoked(session.iat, revokedAt)) return null; // emitida antes de uma recuperação de palavra-passe
  return { userId: session.userId, username: typeof username === 'string' ? username : session.username };
};

export const readUser = async (redis: RedisLike, username: string, userKeyFn: (u: string) => string): Promise<UserRecord | null> =>
  parse<UserRecord>(await redis.get<unknown>(userKeyFn(username)));

/** Guarda um resultado na conta e mantém só os últimos RESULTS_MAX. */
export const recordResult = async (
  redis: RedisLike & { lpush(key: string, ...v: string[]): Promise<unknown>; ltrim(key: string, s: number, e: number): Promise<unknown> },
  userId: string,
  result: AccountResult,
): Promise<void> => {
  await redis.lpush(resultsKey(userId), JSON.stringify(result));
  await redis.ltrim(resultsKey(userId), 0, RESULTS_MAX - 1);
};
