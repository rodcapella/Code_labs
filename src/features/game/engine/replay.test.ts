import { describe, it, expect } from 'vitest';
import { replayAttempt, isTimePlausible } from './replay';
import { FIXED_LAYOUT } from '../testing/fixtures';
import { generateLayout } from '../levels/generator';
import { TRANSLATIONS } from '../../../shared/i18n/translations';
import { solve } from '../testing/solver';
import { LayoutConfig, Language } from '../../../shared/types/game';

const L1 = FIXED_LAYOUT;
const winning = solve(L1, 'pt');

describe('replayAttempt', () => {
  it('uma jogada vencedora é aceite e os comandos são recalculados', () => {
    const r = replayAttempt(L1, [winning], 'pt', 'beginner');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.commands).toBe(winning.length);
      expect(r.errors).toBe(0);
    }
  });

  it('um erro numa execução falhada conta como erro e não invalida a vitória', () => {
    const failing = ['pegar()']; // sem caixa em (0,0): erro na primeira linha
    const r = replayAttempt(L1, [failing, winning], 'pt', 'beginner');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.errors).toBe(1);
  });

  it('afirmar vitória sem recolher todas as caixas é rejeitado', () => {
    const r = replayAttempt(L1, [['mover()']], 'pt', 'beginner');
    expect(r.ok).toBe(false);
  });

  it('uma execução que vence antes da última é rejeitada (vitória forjada)', () => {
    const r = replayAttempt(L1, [winning, ['mover()']], 'pt', 'beginner');
    expect(r.ok).toBe(false);
  });

  it('comandos do idioma errado contam como erro', () => {
    const r = replayAttempt(L1, [['move()', 'pick()']], 'pt', 'beginner');
    expect(r.ok).toBe(false);
  });

  it('ultrapassar o limite de erros do nível invalida a tentativa', () => {
    const failing = ['pegar()'];
    // avançado = 3 erros; com 3 execuções falhadas não há vitória possível
    const r = replayAttempt(L1, [failing, failing, failing, winning], 'pt', 'advanced');
    expect(r.ok).toBe(false);
  });

  it('repetir é aceite no nível intermédio e recalcula os comandos', () => {
    // Robô em (0,0) virado a Este; 3 repetições de mover() chegam a (3,0)
    const r = replayAttempt(L1, [['repetir(3) {', 'mover()', '}', 'pegar()']], 'pt', 'intermediate');
    expect(r.ok).toBe(false); // sem recolher todas as caixas: não é vitória
    const r2 = replayAttempt(L1, [winning], 'pt', 'intermediate');
    expect(r2.ok).toBe(true);
  });

  it('repetir é rejeitado no nível iniciante', () => {
    const r = replayAttempt(L1, [['repetir(2) {', 'mover()', '}']], 'pt', 'beginner');
    expect(r.ok).toBe(false);
  });

  it('se_caixa no nível avançado: a solução com cada pegar() dentro de se_caixa é aceite', () => {
    // Cada pegar() só ocorre sobre uma caixa, por isso o bloco nunca é saltado.
    const withCondition = winning.flatMap(line =>
      line === TRANSLATIONS.pt.cmdPick ? ['se_caixa() {', line, '}'] : [line],
    );
    const r = replayAttempt(L1, [withCondition], 'pt', 'advanced');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.commands).toBe(winning.length);
  });

  it('aceita vitórias em layouts gerados por semente (cada partida é diferente)', () => {
    for (const seed of [11, 222, 3333]) {
      const layout = generateLayout(1, seed);
      const solution = solve(layout, 'pt');
      const r = replayAttempt(layout, [solution], 'pt', 'beginner');
      expect(r.ok).toBe(true);
    }
  });

  it('a mesma solução não serve noutro layout (a semente muda o resultado)', () => {
    const solution = solve(generateLayout(1, 11), 'pt');
    const other = generateLayout(1, 222);
    expect(replayAttempt(other, [solution], 'pt', 'beginner').ok).toBe(false);
  });

  it('se_caixa é rejeitado no nível intermédio', () => {
    const r = replayAttempt(L1, [['se_caixa() {', 'pegar()', '}']], 'pt', 'intermediate');
    expect(r.ok).toBe(false);
  });

  it('sem execuções é rejeitado', () => {
    expect(replayAttempt(L1, [], 'pt', 'beginner').ok).toBe(false);
  });
});

describe('isTimePlausible', () => {
  it('aceita um tempo igual ou superior ao mínimo para os passos executados', () => {
    expect(isTimePlausible(10, 30)).toBe(true); // 30 passos × 0,3 s = 9 s
  });

  it('rejeita um tempo impossível para os passos enviados', () => {
    expect(isTimePlausible(2, 30)).toBe(false);
  });
});
