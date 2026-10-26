import { describe, it, expect } from 'vitest';
import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';
import { LevelConfig } from '../types/game';

const levels: [string, LevelConfig, number, number][] = [
  ['nível 1', level1, 6, 6],
  ['nível 2', level2, 8, 8],
  ['nível 3', level3, 10, 12],
];

describe('configuração dos níveis', () => {
  it.each(levels)('%s tem a grelha e o nº de caixas esperados', (_name, level, size, boxes) => {
    expect(level.gridSize).toBe(size);
    expect(level.boxes).toHaveLength(boxes);
  });

  it.each(levels)('%s: caixas dentro da grelha, sem repetidas e fora do início do robô', (_name, level) => {
    const keys = level.boxes.map(b => `${b.x},${b.y}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const b of level.boxes) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x).toBeLessThan(level.gridSize);
      expect(b.y).toBeLessThan(level.gridSize);
      expect(b).not.toEqual(level.initialRobotPosition);
    }
  });
});
