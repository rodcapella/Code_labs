import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export const SESSION_COOKIE = 'codebot_session';
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const KEY_LENGTH = 64;

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

const b64url = (buf: Buffer | string): string => Buffer.from(buf).toString('base64url');

/** Identificador de sessão: 256 bits aleatórios, opaco (não contém dados). */
export const newSessionId = (): string => randomBytes(32).toString('base64url');

const SESSION_ID_RE = /^[A-Za-z0-9_-]{43}$/;

/** Assina um objeto com expiração (usado só para o estado do login com Google). */
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

/** Valor de um cookie pelo nome, ou null. */
export const cookieValue = (header: string | undefined, name: string): string | null => {
  const pair = (header ?? '').split(';').map(c => c.trim()).find(c => c.startsWith(`${name}=`));
  return pair ? pair.slice(name.length + 1) : null;
};

/** Identificador de sessão vindo do cookie, se tiver o formato certo. */
export const sessionIdFromCookie = (header: string | undefined): string | null => {
  const sid = cookieValue(header, SESSION_COOKIE);
  return sid && SESSION_ID_RE.test(sid) ? sid : null;
};

export const sessionCookie = (sid: string, secure: boolean): string =>
  `${SESSION_COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure ? '; Secure' : ''}`;

export const clearSessionCookie = (secure: boolean): string =>
  `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
