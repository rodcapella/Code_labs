import { GIFEncoder, quantize, applyPalette } from 'gifenc';

export interface RgbaFrame {
  /** Pixels RGBA, por linha. */
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  /** Duração do frame em milissegundos. */
  delay: number;
}

/** Codifica frames RGBA num GIF animado (ciclo infinito). Tudo corre no browser. */
export const encodeGif = (frames: RgbaFrame[]): Uint8Array => {
  const encoder = GIFEncoder();
  for (const f of frames) {
    const palette = quantize(f.rgba, 256);
    const index = applyPalette(f.rgba, palette);
    encoder.writeFrame(index, f.width, f.height, { palette, delay: f.delay });
  }
  encoder.finish();
  return encoder.bytes();
};
