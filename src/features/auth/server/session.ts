import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export const SESSION_COOKIE = 'codebot_session';
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const KEY_LENGTH = 64;

export interface Session {
  userId: string;
  username: string;
  /** Momento de emissão (segundos). Sessões emitidas antes de uma revogação deixam de valer. */
  iat?: number;
}

/** Palavra-passe guardada como `scrypt$<salt>$<hash>` (base64). Nunca em texto. */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
};

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const [scheme, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

const b64url = (buf: Buffer | string): string =>
  Buffer.from(buf).toString('base64url');

/** Token de sessão assinado: `payload.assinatura`, com expiração. */
export const signSession = (session: Session, secret: string, nowSeconds: number): string => {
  const payload = b64url(JSON.stringify({ userId: session.userId, username: session.username, iat: nowSeconds, exp: nowSeconds + SESSION_TTL_SECONDS }));
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
};

/** Devolve a sessão se a assinatura estiver certa e o token não tiver expirado. */
export const verifySession = (token: string, secret: string, nowSeconds: number): Session | null => {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Session & { exp: number };
    if (typeof data.exp !== 'number' || data.exp < nowSeconds) return null;
    if (typeof data.userId !== 'string' || typeof data.username !== 'string') return null;
    return { userId: data.userId, username: data.username, iat: typeof data.iat === 'number' ? data.iat : undefined };
  } catch {
    return null;
  }
};

/** Uma sessão é válida se foi emitida depois da última revogação da conta. */
export const isRevoked = (iat: number | undefined, revokedAt: number | null): boolean =>
  revokedAt !== null && (iat === undefined || iat <= revokedAt);

/** Extrai a sessão de um cabeçalho `Cookie`. Sem AUTH_SECRET não há sessões. */
export const sessionFromCookieHeader = (cookieHeader: string | undefined, secret: string | undefined): Session | null => {
  if (!cookieHeader || !secret) return null;
  const pair = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith(`${SESSION_COOKIE}=`));
  if (!pair) return null;
  return verifySession(pair.slice(SESSION_COOKIE.length + 1), secret, Math.floor(Date.now() / 1000));
};

export const sessionCookie = (token: string, secure: boolean): string =>
  `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure ? '; Secure' : ''}`;

export const clearSessionCookie = (secure: boolean): string =>
  `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;

/** Assina um objeto arbitrário com expiração (usado para o estado do OAuth). */
export const signData = (data: Record<string, unknown>, secret: string, nowSeconds: number, ttlSeconds: number): string => {
  const payload = b64url(JSON.stringify({ ...data, exp: nowSeconds + ttlSeconds }));
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
};

export const verifyData = <T extends object>(token: string, secret: string, nowSeconds: number): T | null => {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T & { exp?: number };
    if (typeof data.exp !== 'number' || data.exp < nowSeconds) return null;
    return data;
  } catch {
    return null;
  }
};
