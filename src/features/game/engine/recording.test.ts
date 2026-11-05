import { describe, it, expect } from 'vitest';
import { recordFrames } from './recording';
import { FIXED_LAYOUT } from '../testing/fixtures';
import { solve } from '../testing/solver';

const opts = { allowLoops: true, allowConditionals: true };

describe('gravação da solução', () => {
  it('o primeiro frame é o estado inicial e cada comando acrescenta um frame', () => {
    const frames = recordFrames(FIXED_LAYOUT, ['mover()', 'mover()'], 'pt', opts);
    expect(frames).toHaveLength(3);
    expect(frames[0].robotPosition).toEqual({ x: 0, y: 0 });
    expect(frames[2].robotPosition).toEqual({ x: 2, y: 0 });
  });

  it('a solução completa termina com a vitória', () => {
    const frames = recordFrames(FIXED_LAYOUT, solve(FIXED_LAYOUT, 'pt'), 'pt', opts);
    expect(frames.at(-1)?.victory).toBe(true);
    expect(frames.at(-1)?.boxes.every(b => b.collected)).toBe(true);
  });

  it('uma queda mostra o robô no buraco e depois o início', () => {
    const layout = { ...FIXED_LAYOUT, holes: [{ x: 1, y: 0 }] };
    const frames = recordFrames(layout, ['mover()'], 'pt', opts);
    const fall = frames.find(f => f.fell);
    expect(fall?.robotPosition).toEqual({ x: 1, y: 0 });
    expect(frames.at(-1)?.robotPosition).toEqual({ x: 0, y: 0 });
  });

  it('um programa que não compila não gera frames', () => {
    expect(recordFrames(FIXED_LAYOUT, ['repetir(2) {'], 'pt', opts)).toEqual([]);
  });
});
