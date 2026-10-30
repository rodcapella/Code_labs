import { describe, it, expect } from 'vitest';
import { starsFor, starBudget } from './rules';

describe('estrelas', () => {
  it('orçamento = 2 × caixas + tamanho da grelha', () => {
    expect(starBudget(6, 6)).toBe(18);
  });

  it('3 estrelas: sem erros e dentro do orçamento', () => {
    expect(starsFor(18, 0, 6, 6)).toBe(3);
  });

  it('acima do orçamento, sem erros, são 2 estrelas', () => {
    expect(starsFor(19, 0, 6, 6)).toBe(2);
  });

  it('1 erro dá no máximo 2 estrelas', () => {
    expect(starsFor(5, 1, 6, 6)).toBe(2);
  });

  it('2 ou mais erros dão 1 estrela', () => {
    expect(starsFor(5, 2, 6, 6)).toBe(1);
  });
});
