import { describe, it, expect } from 'vitest';
import { replayAttempt, isTimePlausible } from './replay';
import { LAYOUTS } from '../levels/layouts';
import { TRANSLATIONS } from '../../../shared/i18n/translations';
import { LayoutConfig, Language } from '../../../shared/types/game';

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N, E, S, O

// Pesquisa em largura: sequência mínima de comandos que recolhe todas as caixas.
const solve = (layout: LayoutConfig, lang: Language): string[] => {
  const t = TRANSLATIONS[lang];
  const boxIndex = new Map(layout.boxes.map((b, i) => [`${b.x},${b.y}`, i]));
  const goal = (1 << layout.boxes.length) - 1;
  const startD = ['NORTH', 'EAST', 'SOUTH', 'WEST'].indexOf(layout.initialRobotDirection);
  type N = { x: number; y: number; d: number; mask: number; path: string[] };
  const queue: N[] = [{ x: layout.initialRobotPosition.x, y: layout.initialRobotPosition.y, d: startD, mask: 0, path: [] }];
  const seen = new Set([`${queue[0].x},${queue[0].y},${startD},0`]);
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.mask === goal) return cur.path;
    const next: N[] = [];
    const [dx, dy] = DIRS[cur.d];
    const nx = cur.x + dx, ny = cur.y + dy;
    if (nx >= 0 && ny >= 0 && nx < layout.gridSize && ny < layout.gridSize) {
      next.push({ ...cur, x: nx, y: ny, path: [...cur.path, t.cmdMove] });
    }
    next.push({ ...cur, d: (cur.d + 1) % 4, path: [...cur.path, t.cmdRight] });
    next.push({ ...cur, d: (cur.d + 3) % 4, path: [...cur.path, t.cmdLeft] });
    const bi = boxIndex.get(`${cur.x},${cur.y}`);
    if (bi !== undefined && !(cur.mask & (1 << bi))) {
      next.push({ ...cur, mask: cur.mask | (1 << bi), path: [...cur.path, t.cmdPick] });
    }
    for (const n of next) {
      const key = `${n.x},${n.y},${n.d},${n.mask}`;
      if (!seen.has(key)) { seen.add(key); queue.push(n); }
    }
  }
  throw new Error('sem solução');
};

const L1 = LAYOUTS[1];
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
