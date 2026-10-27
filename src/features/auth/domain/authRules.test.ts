import { describe, it, expect } from 'vitest';
import { validateUsername, validatePassword, userKey } from './authRules';
import { hashPassword, verifyPassword, signSession, verifySession, sessionFromCookieHeader, sessionCookie, SESSION_COOKIE } from '../server/session';

describe('regras de conta', () => {
  it('nome de conta: 3 a 10 caracteres, sem espaços', () => {
    expect(validateUsername('rui')).toBe('rui');
    expect(validateUsername('  João_1 ')).toBe('João_1');
    expect(validateUsername('ab')).toBeNull();
    expect(validateUsername('abcdefghijk')).toBeNull();
    expect(validateUsername('a b')).toBeNull();
    expect(validateUsername('<x>')).toBeNull();
  });

  it('palavra-passe: 8 a 128 caracteres', () => {
    expect(validatePassword('12345678')).toBe('12345678');
    expect(validatePassword('1234567')).toBeNull();
    expect(validatePassword('a'.repeat(129))).toBeNull();
  });

  it('chave de utilizador é case-insensitive', () => {
    expect(userKey('Rui')).toBe(userKey('rui'));
  });
});

describe('palavras-passe', () => {
  it('verifica a palavra-passe certa e rejeita a errada', async () => {
    const stored = await hashPassword('segredo-123');
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(stored).not.toContain('segredo-123');
    expect(await verifyPassword('segredo-123', stored)).toBe(true);
    expect(await verifyPassword('outra-coisa', stored)).toBe(false);
  });

  it('dois hashes da mesma palavra-passe são diferentes (sal aleatório)', async () => {
    expect(await hashPassword('mesma-senha')).not.toBe(await hashPassword('mesma-senha'));
  });

  it('formato inválido é rejeitado sem exceção', async () => {
    expect(await verifyPassword('x', 'lixo')).toBe(false);
  });
});

describe('sessões assinadas', () => {
  const secret = 'a'.repeat(40);
  const now = 1_700_000_000;

  it('um token válido devolve a sessão', () => {
    const token = signSession({ userId: 'u1', username: 'rui' }, secret, now);
    expect(verifySession(token, secret, now + 10)).toEqual({ userId: 'u1', username: 'rui' });
  });

  it('um token adulterado é rejeitado', () => {
    const token = signSession({ userId: 'u1', username: 'rui' }, secret, now);
    const [payload, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ userId: 'u2', username: 'admin', exp: now + 99999 })).toString('base64url');
    expect(verifySession(`${forged}.${sig}`, secret, now)).toBeNull();
    expect(verifySession(`${payload}.x`, secret, now)).toBeNull();
  });

  it('um token com outro segredo é rejeitado', () => {
    const token = signSession({ userId: 'u1', username: 'rui' }, secret, now);
    expect(verifySession(token, 'b'.repeat(40), now)).toBeNull();
  });

  it('um token expirado é rejeitado', () => {
    const token = signSession({ userId: 'u1', username: 'rui' }, secret, now);
    expect(verifySession(token, secret, now + 31 * 24 * 60 * 60)).toBeNull();
  });

  it('sem AUTH_SECRET não há sessão, mesmo com cookie', () => {
    const token = signSession({ userId: 'u1', username: 'rui' }, secret, Math.floor(Date.now() / 1000));
    expect(sessionFromCookieHeader(`${SESSION_COOKIE}=${token}`, undefined)).toBeNull();
    expect(sessionFromCookieHeader(undefined, secret)).toBeNull();
  });

  it('o cookie é HttpOnly e SameSite', () => {
    const c = sessionCookie('t', false);
    expect(c).toContain('HttpOnly');
    expect(c).toContain('SameSite=Lax');
    expect(c).not.toContain('Secure');
    expect(sessionCookie('t', true)).toContain('Secure');
  });
});
