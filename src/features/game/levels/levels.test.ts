import { describe, it, expect } from 'vitest';
import { LEVEL_SPECS, generateLayout, mulberry32 } from './generator';
import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';
import { level4 } from './level4';

const ids = [1, 2, 3, 4] as const;
const metas = [level1, level2, level3, level4];

describe('especificação dos níveis', () => {
  it.each(ids)('nível %i tem grelha e nº de caixas definidos', id => {
    expect(LEVEL_SPECS[id]).toBeDefined();
    expect(metas[id - 1].id).toBe(id);
  });

  it('a grelha cresce e o nº de caixas também', () => {
    const sizes = ids.map(id => LEVEL_SPECS[id].gridSize);
    const boxes = ids.map(id => LEVEL_SPECS[id].boxCount);
    expect(sizes).toEqual([6, 8, 10, 12]);
    expect(boxes).toEqual([6, 8, 12, 16]);
  });
});

describe('generateLayout', () => {
  it.each(ids)('nível %i: caixas dentro da grelha, sem repetições e fora do robô', id => {
    for (let seed = 1; seed <= 50; seed++) {
      const l = generateLayout(id, seed);
      expect(l.gridSize).toBe(LEVEL_SPECS[id].gridSize);
      expect(l.boxes).toHaveLength(LEVEL_SPECS[id].boxCount);
      const keys = l.boxes.map(b => `${b.x},${b.y}`);
      expect(new Set(keys).size).toBe(keys.length);
      for (const b of l.boxes) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.x).toBeLessThan(l.gridSize);
        expect(b.y).toBeLessThan(l.gridSize);
        expect(b).not.toEqual(l.initialRobotPosition);
      }
    }
  });

  it('a mesma semente dá sempre o mesmo layout (o servidor recalcula)', () => {
    expect(generateLayout(3, 12345)).toEqual(generateLayout(3, 12345));
  });

  it('sementes diferentes dão layouts diferentes (variam por partida)', () => {
    const a = JSON.stringify(generateLayout(2, 1));
    const b = JSON.stringify(generateLayout(2, 2));
    expect(a).not.toBe(b);
  });

  it('o gerador PRNG devolve valores em [0, 1)', () => {
    const rnd = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rnd();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nível desconhecido é erro', () => {
    expect(() => generateLayout(9, 1)).toThrow();
  });
});
