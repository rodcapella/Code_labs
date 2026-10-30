import { describe, it, expect } from 'vitest';
import { ROBOT_PALETTE } from './robotPalette';

describe('paleta do robô', () => {
  it('tem 12 cores, todas em hexadecimal válido e sem repetições', () => {
    expect(ROBOT_PALETTE).toHaveLength(12);
    const values = ROBOT_PALETTE.map(c => c.value);
    values.forEach(v => expect(v).toMatch(/^#[0-9A-F]{6}$/i));
    expect(new Set(values).size).toBe(values.length);
  });
});
