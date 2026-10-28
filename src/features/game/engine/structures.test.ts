import { describe, it, expect } from 'vitest';
import { countStructureKinds, structureBonusFor } from './structures';
import { scoreOf } from '../../../shared/config/rules';
import { replayAttempt } from './replay';
import { FIXED_LAYOUT } from '../testing/fixtures';
import { solve } from '../testing/solver';

describe('estruturas usadas na vitória', () => {
  it('sem estruturas, o desconto é zero', () => {
    expect(countStructureKinds(['mover()', 'pegar()'], 'pt')).toBe(0);
    expect(structureBonusFor(['mover()'], 'pt')).toBe(0);
  });

  it('conta tipos, não blocos: dois repetir valem como um tipo', () => {
    const lines = ['repetir(2) {', 'mover()', '}', 'repetir(3) {', 'mover()', '}'];
    expect(countStructureKinds(lines, 'pt')).toBe(1);
  });

  it('repetir, se_caixa e enquanto_livre somam 3 tipos (9 pontos)', () => {
    const lines = ['repetir(2) {', 'mover()', '}', 'se_caixa() {', 'pegar()', '}', 'enquanto_livre() {', 'mover()', '}'];
    expect(countStructureKinds(lines, 'pt')).toBe(3);
    expect(structureBonusFor(lines, 'pt')).toBe(9);
  });

  it('funciona em inglês', () => {
    expect(countStructureKinds(['repeat(2) {', 'move()', '}', 'while_free() {', 'move()', '}'], 'en')).toBe(2);
  });
});

describe('pontuação com desconto', () => {
  it('o desconto baixa a pontuação, sem ficar abaixo de zero', () => {
    expect(scoreOf(10, 0, 0)).toBe(10);
    expect(scoreOf(10, 0, 0, 3)).toBe(7);
    expect(scoreOf(2, 0, 0, 9)).toBe(0);
  });

  it('quem usa repetir ganha a quem anda só com mover()', () => {
    const sequencia = scoreOf(12, 0, 0, 0);
    const repetir = scoreOf(4, 0, 0, structureBonusFor(['repetir(3) {', 'mover()', '}'], 'pt'));
    expect(repetir).toBeLessThan(sequencia);
  });
});

describe('o servidor calcula o desconto a partir da execução vencedora', () => {
  it('uma vitória sem estruturas tem desconto zero', () => {
    const r = replayAttempt(FIXED_LAYOUT, [solve(FIXED_LAYOUT, 'pt')], 'pt', 'beginner');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.structureBonus).toBe(0);
  });

  it('uma vitória com se_caixa no nível avançado recebe o desconto', () => {
    const withIf = solve(FIXED_LAYOUT, 'pt').flatMap(l => (l === 'pegar()' ? ['se_caixa() {', l, '}'] : [l]));
    const r = replayAttempt(FIXED_LAYOUT, [withIf], 'pt', 'advanced');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.structureBonus).toBe(3);
  });
});

