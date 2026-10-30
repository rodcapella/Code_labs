import { describe, it, expect } from 'vitest';
import { validateUsername, validatePassword, userKey } from './authRules';
import {
  hashPassword, verifyPassword, sessionCookie, sessionIdFromCookie, newSessionId, signData, verifyData,
  SESSION_COOKIE,
} from '../server/session';
import { suggestUsername } from '../server/google';
import { appUrl } from '../server/mailer';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

describe('sessões (identificador opaco no cookie)', () => {
  it('o identificador tem 256 bits e é diferente em cada sessão', () => {
    const a = newSessionId();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(newSessionId());
  });

  it('lê o identificador do cookie e rejeita formatos que não são de sessão', () => {
    const sid = newSessionId();
    expect(sessionIdFromCookie(`${SESSION_COOKIE}=${sid}`)).toBe(sid);
    expect(sessionIdFromCookie(`${SESSION_COOKIE}=abc`)).toBeNull();
    expect(sessionIdFromCookie('outro=valor')).toBeNull();
    expect(sessionIdFromCookie(undefined)).toBeNull();
  });

  it('o cookie é HttpOnly, SameSite e Secure em produção', () => {
    const c = sessionCookie('t', false);
    expect(c).toContain('HttpOnly');
    expect(c).toContain('SameSite=Lax');
    expect(c).not.toContain('Secure');
    expect(sessionCookie('t', true)).toContain('Secure');
  });
});

describe('dados assinados (estado do login com Google)', () => {
  const secret = 'c'.repeat(40);
  it('um estado válido é lido de volta', () => {
    const t = signData({ state: 'abc', verifier: 'v' }, secret, 1000, 600);
    expect(verifyData<{ state: string }>(t, secret, 1100)?.state).toBe('abc');
  });
  it('um estado adulterado ou expirado é rejeitado', () => {
    const t = signData({ state: 'abc' }, secret, 1000, 600);
    expect(verifyData(t.replace(/^./, 'x'), secret, 1100)).toBeNull();
    expect(verifyData(t, secret, 2000)).toBeNull();
  });
});

describe('nome sugerido para contas Google', () => {
  it('usa o nome Google, sem caracteres inválidos e com 3 a 10 caracteres', () => {
    expect(suggestUsername('Rui Silva', undefined)).toBe('RuiSilva');
    expect(suggestUsername('Maria José Gonçalves', undefined)).toMatch(/^[\p{L}\p{N}._-]{3,10}$/u);
  });

  it('sem nome, usa a parte local do email', () => {
    expect(suggestUsername(undefined, 'ana.costa@gmail.com')).toBe('ana.costa');
  });

  it('nomes curtos são preenchidos até 3 caracteres', () => {
    expect(suggestUsername('a', undefined)).toBe('a__');
  });
});

describe('segurança: links e cabeçalhos', () => {
  it('o link de recuperação só usa APP_URL (nunca o cabeçalho Host)', () => {
    const before = process.env.APP_URL;
    try {
      delete process.env.APP_URL;
      expect(appUrl()).toBeNull();
      process.env.APP_URL = 'https://exemplo.pt/';
      expect(appUrl()).toBe('https://exemplo.pt');
    } finally {
      if (before === undefined) delete process.env.APP_URL; else process.env.APP_URL = before;
    }
  });

  it('vercel.json define CSP com frame-ancestors, HSTS e Referrer-Policy', () => {
    const cfg = JSON.parse(readFileSync(resolve(__dirname, '../../../../vercel.json'), 'utf8'));
    const headers = Object.fromEntries(cfg.headers[0].headers.map((h: { key: string; value: string }) => [h.key, h.value]));
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(headers['Content-Security-Policy']).toContain("object-src 'none'");
    expect(headers['Strict-Transport-Security']).toContain('max-age=');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  });
});
