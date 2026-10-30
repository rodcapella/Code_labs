import { describe, it, expect } from 'vitest';
import { LEVEL_SPECS, generateLayout, mulberry32 } from './generator';
import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';
import { level4 } from './level4';
import { level5 } from './level5';
import { level6 } from './level6';
import { level7 } from './level7';
import { level8 } from './level8';
import { level9 } from './level9';

const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const metas = [level1, level2, level3, level4, level5, level6, level7, level8, level9];

describe('especificação dos níveis', () => {
  it.each(ids)('nível %i tem grelha e nº de caixas definidos', id => {
    expect(LEVEL_SPECS[id]).toBeDefined();
    expect(metas[id - 1].id).toBe(id);
  });

  it('grelha, caixas, paredes, buracos e madeira por nível', () => {
    expect(ids.map(id => LEVEL_SPECS[id].gridSize)).toEqual([6, 8, 8, 10, 12, 10, 10, 10, 10]);
    expect(ids.map(id => LEVEL_SPECS[id].boxCount)).toEqual([6, 6, 8, 12, 16, 8, 8, 8, 10]);
    expect(ids.map(id => LEVEL_SPECS[id].wallCount)).toEqual([0, 0, 0, 0, 2, 4, 6, 0, 3]);
    expect(ids.map(id => LEVEL_SPECS[id].holeCount)).toEqual([0, 0, 0, 0, 0, 2, 0, 0, 1]);
    expect(ids.map(id => LEVEL_SPECS[id].woodCount)).toEqual([0, 0, 0, 0, 0, 0, 0, 4, 1]);
  });
});

describe('generateLayout', () => {
  it.each(ids)('nível %i: peças dentro da grelha, sem sobreposição e fora do robô', id => {
    for (let seed = 1; seed <= 40; seed++) {
      const l = generateLayout(id, seed);
      expect(l.boxes).toHaveLength(LEVEL_SPECS[id].boxCount);
      expect(l.walls).toHaveLength(LEVEL_SPECS[id].wallCount);
      expect(l.holes).toHaveLength(LEVEL_SPECS[id].holeCount);
      expect(l.wood).toHaveLength(LEVEL_SPECS[id].woodCount);
      const all = [l.initialRobotPosition, ...l.boxes, ...l.walls, ...l.holes, ...l.wood];
      const keys = all.map(p => `${p.x},${p.y}`);
      expect(new Set(keys).size).toBe(keys.length);
      for (const p of all) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThan(l.gridSize);
        expect(p.y).toBeLessThan(l.gridSize);
      }
    }
  });

  it('a mesma semente dá sempre o mesmo layout (o servidor recalcula)', () => {
    expect(generateLayout(9, 12345)).toEqual(generateLayout(9, 12345));
  });

  it('sementes diferentes dão layouts diferentes (variam por partida)', () => {
    expect(JSON.stringify(generateLayout(6, 1))).not.toBe(JSON.stringify(generateLayout(6, 2)));
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
    expect(() => generateLayout(10, 1)).toThrow();
  });
});
