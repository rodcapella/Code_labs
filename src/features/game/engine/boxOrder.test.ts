import { describe, it, expect } from 'vitest';
import { executeCommand } from './interpreter';
import { createInitialState } from './program';
import { FIXED_LAYOUT } from '../testing/fixtures';
import { TRANSLATIONS } from '../../../shared/i18n/translations';

const t = TRANSLATIONS.pt;

// Duas caixas em (1,0) e (2,0); a caixa 2 está primeiro no caminho, a 1 mais à frente.
const ordered = {
  ...FIXED_LAYOUT,
  boxes: [{ x: 2, y: 0 }, { x: 1, y: 0 }],
  boxOrder: [2, 1],
};

describe('ordem de recolha', () => {
  it('apanhar a caixa com número mais baixo funciona', () => {
    let s = createInitialState(ordered);
    s = executeCommand(s, 'mover()', 'pt');           // (1,0): caixa 1
    s = executeCommand(s, 'pegar()', 'pt');
    expect(s.boxes.find(b => b.order === 1)?.collected).toBe(true);
    expect(s.error).toBeNull();
  });

  it('apanhar uma caixa fora de ordem falha e não recolhe', () => {
    let s = createInitialState(ordered);
    s = executeCommand(s, 'mover(2)', 'pt');          // (2,0): caixa 2, ainda não é a vez
    s = executeCommand(s, 'pegar()', 'pt');
    expect(s.error).toBe(t.errorBoxOrder);
    expect(s.boxes.every(b => !b.collected)).toBe(true);
    expect(s.commandCount).toBe(1);                    // só o mover(2) conta
  });

  it('depois de recolher a caixa 1, a caixa 2 já pode ser apanhada', () => {
    let s = createInitialState(ordered);
    s = executeCommand(s, 'mover()', 'pt');
    s = executeCommand(s, 'pegar()', 'pt');
    s = executeCommand(s, 'virar_direita()', 'pt');
    s = executeCommand(s, 'virar_direita()', 'pt');
    s = executeCommand(s, 'mover()', 'pt');           // volta a (0,0)
    s = executeCommand(s, 'virar_direita()', 'pt');
    s = executeCommand(s, 'virar_direita()', 'pt');
    s = executeCommand(s, 'mover(2)', 'pt');          // (2,0)
    s = executeCommand(s, 'pegar()', 'pt');
    expect(s.victory).toBe(true);
  });

  it('níveis sem ordem não são afetados', () => {
    const s = executeCommand({ ...createInitialState(FIXED_LAYOUT), robotPosition: { x: 4, y: 4 } }, 'pegar()', 'pt');
    expect(s.error).toBe(t.errorNoBox);
  });
});
