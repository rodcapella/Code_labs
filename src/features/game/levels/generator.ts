import { Direction, LayoutConfig, Position } from '../../../shared/types/game';

/** Tamanho da grelha e número de caixas de cada nível. Posições são geradas por partida. */
export const LEVEL_SPECS: Record<number, { gridSize: number; boxCount: number }> = {
  1: { gridSize: 6, boxCount: 6 },
  2: { gridSize: 8, boxCount: 8 },
  3: { gridSize: 10, boxCount: 12 },
  4: { gridSize: 12, boxCount: 16 },
  5: { gridSize: 10, boxCount: 8 },
};

const DIRECTIONS: Direction[] = ['NORTH', 'EAST', 'SOUTH', 'WEST'];

/** PRNG determinístico (mulberry32): a mesma semente dá sempre a mesma sequência. */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Layout de uma partida: posição e direção iniciais do robô e posições das caixas.
 * As caixas nunca ficam no ponto de partida, e a grelha é aberta, por isso
 * qualquer layout gerado tem solução. Usado pelo jogo e pelo servidor.
 */
export const generateLayout = (levelId: number, seed: number): LayoutConfig => {
  const spec = LEVEL_SPECS[levelId];
  if (!spec) throw new Error(`nível desconhecido: ${levelId}`);

  const rnd = mulberry32(seed);
  const cells: Position[] = [];
  for (let x = 0; x < spec.gridSize; x++) {
    for (let y = 0; y < spec.gridSize; y++) cells.push({ x, y });
  }
  // Fisher–Yates: a primeira célula é o robô, as seguintes são caixas.
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  return {
    gridSize: spec.gridSize,
    initialRobotPosition: cells[0],
    initialRobotDirection: DIRECTIONS[Math.floor(rnd() * DIRECTIONS.length)],
    boxes: cells.slice(1, 1 + spec.boxCount),
  };
};

/** Semente aleatória para partidas sem servidor (desenvolvimento local). */
export const randomSeed = (): number => crypto.getRandomValues(new Uint32Array(1))[0];
