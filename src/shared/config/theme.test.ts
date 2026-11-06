import { describe, it, expect } from 'vitest';
import { resolveTheme, isNightHour, loadSettings, DEFAULT_SETTINGS } from './settings';
import { soundForEvent } from '../utils/audio';
import { classify } from '../../features/game/hooks/useProgramRunner';
import { createInitialState } from '../../features/game/engine/program';
import { FIXED_LAYOUT } from '../../features/game/testing/fixtures';

describe('tema', () => {
  it('noite é entre as 19h e as 7h', () => {
    expect(isNightHour(19)).toBe(true);
    expect(isNightHour(2)).toBe(true);
    expect(isNightHour(7)).toBe(false);
    expect(isNightHour(12)).toBe(false);
  });

  it('automático segue a hora; uma escolha manual ignora a hora', () => {
    expect(resolveTheme('auto', 22)).toBe('night');
    expect(resolveTheme('auto', 10)).toBe('day');
    expect(resolveTheme('day', 22)).toBe('day');
    expect(resolveTheme('night', 10)).toBe('night');
  });

  it('o padrão é automático', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('auto');
  });
});

describe('sons contextuais', () => {
  it('cada evento tem o seu som; eventos sem som ficam de fora', () => {
    expect(soundForEvent('move')).toBe('floor');
    expect(soundForEvent('portal')).toBe('portal');
    expect(soundForEvent('break')).toBe('wood');
    expect(soundForEvent('fall')).toBe('fall');
    expect(soundForEvent('error')).toBe('error');
    expect(soundForEvent('victory')).toBe('victory');
    expect(soundForEvent('unknown')).toBeNull();
  });
});

describe('classificação dos passos', () => {
  const base = createInitialState(FIXED_LAYOUT);

  it('pousar num portal é o evento de portal', () => {
    const layout = { ...FIXED_LAYOUT, portals: [{ a: { x: 2, y: 0 }, b: { x: 2, y: 4 } }] };
    const prev = { ...createInitialState(layout), robotPosition: { x: 1, y: 0 } };
    const next = { ...prev, robotPosition: { x: 2, y: 4 } };
    expect(classify(prev, next)).toBe('portal');
  });

  it('um movimento normal é move, e a madeira partida é break', () => {
    expect(classify(base, { ...base, robotPosition: { x: 1, y: 0 } })).toBe('move');
    const withWood = { ...base, wood: [{ x: 1, y: 0 }] };
    expect(classify(withWood, { ...withWood, wood: [] })).toBe('break');
  });
});
