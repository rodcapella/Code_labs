import { describe, it, expect } from 'vitest';
import { executeCommand } from './interpreter';
import { createInitialState } from './program';
import { previewPath } from './preview';
import { replayAttempt } from './replay';
import { FIXED_LAYOUT } from '../testing/fixtures';
import { TRANSLATIONS } from '../../../shared/i18n/translations';
import { LayoutConfig } from '../../../shared/types/game';

const t = TRANSLATIONS.pt;
const layout = (over: Partial<LayoutConfig>): LayoutConfig => ({ ...FIXED_LAYOUT, ...over });
const opts = { allowLoops: true, allowConditionals: true };

describe('buraco', () => {
  it('pisar um buraco faz o robô cair (com erro e marcado)', () => {
    const s = createInitialState(layout({ holes: [{ x: 1, y: 0 }] }));
    const r = executeCommand(s, 'mover()', 'pt');
    expect(r.fell).toBe(true);
    expect(r.error).toBe(t.errorHole);
  });

  it('um buraco não bloqueia: o movimento para lá é uma queda, não uma parede', () => {
    const s = createInitialState(layout({ holes: [{ x: 1, y: 0 }] }));
    expect(executeCommand(s, 'mover()', 'pt').error).not.toBe(t.errorWall);
  });

  it('a pré-visualização mostra a queda e o reinício, até ao limite de erros', () => {
    const r = previewPath(layout({ holes: [{ x: 2, y: 0 }] }), ['mover(4)'], 'pt', opts, 3);
    expect(r.stoppedBy).toBe('error');
    expect(r.steps.filter(p => p.x === 2 && p.y === 0)).toHaveLength(3);
  });

  it('uma execução que cai conta como erro na re-execução do servidor', () => {
    const r = replayAttempt(layout({ holes: [{ x: 1, y: 0 }] }), [['mover()', 'mover()']], 'pt', 'advanced');
    expect(r.ok).toBe(false);
  });
});

describe('madeira e partir()', () => {
  const wood = layout({ wood: [{ x: 1, y: 0 }] });

  it('a madeira bloqueia o movimento com mensagem própria', () => {
    const r = executeCommand(createInitialState(wood), 'mover()', 'pt');
    expect(r.error).toBe(t.errorWood);
    expect(r.robotPosition).toEqual({ x: 0, y: 0 });
  });

  it('partir() remove a madeira à frente e conta como comando', () => {
    const r = executeCommand(createInitialState(wood), 'partir()', 'pt');
    expect(r.wood).toEqual([]);
    expect(r.commandCount).toBe(1);
    expect(r.error).toBeNull();
  });

  it('depois de partir, o caminho fica livre', () => {
    let s = executeCommand(createInitialState(wood), 'partir()', 'pt');
    s = executeCommand(s, 'mover()', 'pt');
    expect(s.robotPosition).toEqual({ x: 1, y: 0 });
  });

  it('partir() sem madeira à frente é erro', () => {
    const r = executeCommand(createInitialState(layout({})), 'partir()', 'pt');
    expect(r.error).toBe(t.errorNoWood);
    expect(r.commandCount).toBe(0);
  });

  it('a condição se_parede considera a madeira como bloqueio', () => {
    // Madeira à frente = bloqueio: a condição é verdadeira, vira para Sul e anda um passo.
    const r = previewPath(wood, ['se_parede() {', 'virar_direita()', '}', 'mover()'], 'pt', opts);
    expect(r.stoppedBy).toBe('end');
    expect(r.steps).toEqual([{ x: 0, y: 1, step: 1 }]);
  });
});
