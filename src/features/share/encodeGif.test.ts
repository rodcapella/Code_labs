import { describe, it, expect } from 'vitest';
import { encodeGif } from './encodeGif';

describe('codificação do GIF', () => {
  it('gera um GIF89a com dois frames e termina com o trailer', () => {
    const w = 4, h = 4;
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < rgba.length; i += 4) { rgba[i] = 255; rgba[i + 3] = 255; }
    const bytes = encodeGif([
      { rgba, width: w, height: h, delay: 300 },
      { rgba, width: w, height: h, delay: 300 },
    ]);
    const header = String.fromCharCode(...bytes.slice(0, 6));
    expect(header).toBe('GIF89a');
    expect(bytes[bytes.length - 1]).toBe(0x3b); // trailer GIF
    // Dois frames: o marcador de imagem (0x2C) aparece pelo menos duas vezes.
    expect(bytes.filter(b => b === 0x2c).length).toBeGreaterThanOrEqual(2);
  });
});
