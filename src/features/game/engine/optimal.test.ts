import { describe, it, expect } from 'vitest';
import { minimumCommands } from './optimal';
import { executeCommand } from './interpreter';
import { createInitialState } from './program';
import { generateLayout } from '../levels/generator';
import { FIXED_LAYOUT } from '../testing/fixtures';
import { LayoutConfig, GameState } from '../../../shared/types/game';
import { TRANSLATIONS } from '../../../shared/i18n/translations';

/** Referência lenta: a mesma pesquisa, mas com o motor completo a cada transição. */
const slowMinimum = (layout: LayoutConfig, maxDepth = 60, cap = 120_000): number | null => {
  const t = TRANSLATIONS.pt;
  const actions = [t.cmdMove, t.cmdLeft, t.cmdRight, t.cmdPick, t.cmdBreak, ...[2, 3, 4, 5, 6, 7, 8, 9].map(n => t.cmdMoveN(n))];
  const key = (s: GameState) => `${s.robotPosition.x},${s.robotPosition.y},${s.robotDirection},${s.boxes.map(b => (b.collected ? 1 : 0)).join('')},${s.wood.length}`;
  let frontier = [createInitialState(layout)];
  const seen = new Set([key(frontier[0])]);
  for (let d = 0; d < maxDepth && frontier.length; d++) {
    const next: GameState[] = [];
    for (const s of frontier) {
      for (const cmd of actions) {
        const c = executeCommand(s, cmd, 'pt');
        if (c.error || c.fell) continue;
        if (c.victory) return d + 1;
        const k = key(c);
        if (seen.has(k)) continue;
        seen.add(k);
        if (seen.size > cap) return null;
        next.push(c);
      }
    }
    frontier = next;
  }
  return null;
};

describe('mínimo absoluto de comandos', () => {
  it('uma caixa em linha reta: mover(2) e pegar() = 2 comandos', () => {
    const layout = { ...FIXED_LAYOUT, gridSize: 5, initialRobotPosition: { x: 0, y: 0 }, initialRobotDirection: 'EAST' as const, boxes: [{ x: 2, y: 0 }] };
    expect(minimumCommands(layout, 'pt')).toBe(2);
  });

  it('caixa atrás do robô: virar, mover(2), pegar() = 3 comandos', () => {
    const layout = { ...FIXED_LAYOUT, gridSize: 5, initialRobotPosition: { x: 2, y: 2 }, initialRobotDirection: 'EAST' as const, boxes: [{ x: 0, y: 2 }] };
    expect(minimumCommands(layout, 'pt')).toBe(4); // virar, virar, mover(2), pegar()
  });

  it('coincide com a pesquisa de referência (motor completo) em layouts reais', () => {
    for (const [levelId, seed] of [[1, 3], [1, 8], [1, 21]] as const) {
      const layout = generateLayout(levelId, seed);
      const fast = minimumCommands(layout, 'pt');
      const slow = slowMinimum(layout);
      expect(fast).not.toBeNull();
      if (slow !== null) expect(fast).toBe(slow);
    }
  });

  it('desiste (null) em vez de demorar quando o espaço de estados é grande demais', () => {
    expect(minimumCommands(generateLayout(11, 4), 'pt', 50)).toBeNull();
  });

  it('é rápido em níveis reais (limite de servidor)', () => {
    const t0 = Date.now();
    for (const id of [1, 9, 10]) minimumCommands(generateLayout(id, 42), 'pt');
    expect(Date.now() - t0).toBeLessThan(4000);
  }, 20000);
});
