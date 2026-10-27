import { describe, it, expect } from 'vitest';
import { validateEmail, newResetToken, hashToken, resetKey, RESULTS_MAX } from './accounts';

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

describe('tokens de recuperação', () => {
  it('o token é aleatório e o hash guardado não é o token', () => {
    const a = newResetToken();
    const b = newResetToken();
    expect(a.token).not.toBe(b.token);
    expect(a.hash).not.toContain(a.token);
    expect(a.token.length).toBeGreaterThanOrEqual(40);
  });

  it('o hash é determinístico e a chave no Redis usa o hash', () => {
    const { token, hash } = newResetToken();
    expect(hashToken(token)).toBe(hash);
    expect(resetKey(token)).toBe(`reset:${hash}`);
    expect(resetKey(token)).not.toContain(token);
  });
});

describe('resultados', () => {
  it('guarda no máximo 100 por conta', () => {
    expect(RESULTS_MAX).toBe(100);
  });
});
