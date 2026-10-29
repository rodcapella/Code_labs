import { describe, it, expect } from 'vitest';
import { contextualHint, blockedCellAhead } from './hints';
import { createInitialState } from './program';
import { FIXED_LAYOUT } from '../testing/fixtures';
import { TRANSLATIONS } from '../../../shared/i18n/translations';

const state = createInitialState(FIXED_LAYOUT);

describe('dica contextual', () => {
  it('parede, borda, caixa e ciclo têm dicas próprias', () => {
    const t = TRANSLATIONS.pt;
    expect(contextualHint(t.errorWall, state, 'pt')).toBe(t.hintWall);
    expect(contextualHint(t.errorOutOfBounds, state, 'pt')).toBe(t.hintEdge);
    expect(contextualHint(t.errorNoBox, state, 'pt')).toBe(t.hintNoBox);
    expect(contextualHint(t.errorLoopLimit, state, 'pt')).toBe(t.hintLoop);
  });

  it('um erro desconhecido cai na dica de comando inválido', () => {
    expect(contextualHint('qualquer coisa', state, 'pt')).toBe(TRANSLATIONS.pt.hintCommand);
  });
});

describe('parede destacada', () => {
  it('encontra a primeira parede na direção do robô', () => {
    const walled = { ...state, walls: [{ x: 3, y: 0 }] };
    expect(blockedCellAhead(walled)).toEqual({ x: 3, y: 0 });
  });

  it('sem parede à frente (apenas borda), não há casa a destacar', () => {
    expect(blockedCellAhead({ ...state, robotDirection: 'NORTH' })).toBeNull();
  });
});
