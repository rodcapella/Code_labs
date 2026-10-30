import { describe, it, expect } from 'vitest';
import { validateEmail, newToken, hashToken, tokenKey, RESULTS_MAX } from './accounts';

describe('email', () => {
  it('aceita um email válido e normaliza para minúsculas', () => {
    expect(validateEmail('  Rui@Exemplo.PT ')).toBe('rui@exemplo.pt');
  });

  it('rejeita formatos inválidos', () => {
    expect(validateEmail('sem-arroba.pt')).toBeNull();
    expect(validateEmail('a b@c.pt')).toBeNull();
    expect(validateEmail('x@y')).toBeNull();
    expect(validateEmail('a'.repeat(250) + '@b.pt')).toBeNull();
  });
});

describe('tokens de uso único', () => {
  it('o token é aleatório e o hash guardado não é o token', () => {
    const a = newToken();
    const b = newToken();
    expect(a.token).not.toBe(b.token);
    expect(a.hash).not.toContain(a.token);
    expect(a.token.length).toBeGreaterThanOrEqual(40);
  });

  it('o hash é determinístico e a chave no Redis usa o hash', () => {
    const { token, hash } = newToken();
    expect(hashToken(token)).toBe(hash);
    expect(tokenKey('reset', token)).toBe(`reset:${hash}`);
    expect(tokenKey('reset', token)).not.toContain(token);
  });
});

describe('resultados', () => {
  it('guarda no máximo 100 por conta', () => {
    expect(RESULTS_MAX).toBe(100);
  });
});
