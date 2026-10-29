import { describe, it, expect } from 'vitest';
import { LEVEL_SPECS, generateLayout, mulberry32 } from './generator';
import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';
import { level4 } from './level4';
import { level5 } from './level5';
import { level6 } from './level6';
import { level7 } from './level7';

const ids = [1, 2, 3, 4, 5, 6, 7] as const;
const metas = [level1, level2, level3, level4, level5, level6, level7];

describe('especificação dos níveis', () => {
  it.each(ids)('nível %i tem grelha e nº de caixas definidos', id => {
    expect(LEVEL_SPECS[id]).toBeDefined();
    expect(metas[id - 1].id).toBe(id);
  });

  it('a grelha cresce e o nº de caixas também', () => {
    const sizes = ids.map(id => LEVEL_SPECS[id].gridSize);
    const boxes = ids.map(id => LEVEL_SPECS[id].boxCount);
    expect(sizes).toEqual([6, 8, 8, 10, 12, 10, 10]);
    expect(boxes).toEqual([6, 6, 8, 12, 16, 8, 8]);
  });

  it('paredes: 0, 0, 0, 0, 2, 4 e 6 (nível 6 e 7 com a mesma grelha)', () => {
    expect(ids.map(id => LEVEL_SPECS[id].wallCount)).toEqual([0, 0, 0, 0, 2, 4, 6]);
    expect(LEVEL_SPECS[7].gridSize).toBe(LEVEL_SPECS[6].gridSize);
  });
});

describe('generateLayout', () => {
  it.each(ids)('nível %i: caixas e paredes dentro da grelha, sem repetições, fora do robô', id => {
    for (let seed = 1; seed <= 50; seed++) {
      const l = generateLayout(id, seed);
      expect(l.gridSize).toBe(LEVEL_SPECS[id].gridSize);
      expect(l.boxes).toHaveLength(LEVEL_SPECS[id].boxCount);
      expect(l.walls ?? []).toHaveLength(LEVEL_SPECS[id].wallCount);
      const all = [...l.boxes, ...(l.walls ?? []), l.initialRobotPosition].map(p => `${p.x},${p.y}`);
      expect(new Set(all).size).toBe(all.length);
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

  it('com paredes, todas as caixas são alcançáveis a partir do robô', () => {
    for (const id of [5, 6, 7] as const) {
      for (let seed = 1; seed <= 30; seed++) {
        const l = generateLayout(id, seed);
        const walls = new Set((l.walls ?? []).map(w => `${w.x},${w.y}`));
        const seen = new Set([`${l.initialRobotPosition.x},${l.initialRobotPosition.y}`]);
        const queue = [l.initialRobotPosition];
        while (queue.length) {
          const c = queue.shift()!;
          for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
            const n = { x: c.x + dx, y: c.y + dy };
            const k = `${n.x},${n.y}`;
            if (n.x < 0 || n.y < 0 || n.x >= l.gridSize || n.y >= l.gridSize || walls.has(k) || seen.has(k)) continue;
            seen.add(k);
            queue.push(n);
          }
        }
        for (const b of l.boxes) expect(seen.has(`${b.x},${b.y}`)).toBe(true);
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
