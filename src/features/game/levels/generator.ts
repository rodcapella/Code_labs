import { Direction, LayoutConfig, Position } from '../../../shared/types/game';

/** Grelha, caixas e paredes de cada nível. Posições são geradas por partida. */
export const LEVEL_SPECS: Record<number, { gridSize: number; boxCount: number; wallCount: number; holeCount: number; woodCount: number }> = {
  1: { gridSize: 6, boxCount: 6, wallCount: 0, holeCount: 0, woodCount: 0 },
  2: { gridSize: 8, boxCount: 6, wallCount: 0, holeCount: 0, woodCount: 0 },
  3: { gridSize: 8, boxCount: 8, wallCount: 0, holeCount: 0, woodCount: 0 },
  4: { gridSize: 10, boxCount: 12, wallCount: 0, holeCount: 0, woodCount: 0 },
  5: { gridSize: 12, boxCount: 16, wallCount: 2, holeCount: 0, woodCount: 0 },
  6: { gridSize: 10, boxCount: 8, wallCount: 4, holeCount: 2, woodCount: 0 },
  7: { gridSize: 10, boxCount: 8, wallCount: 6, holeCount: 0, woodCount: 0 },
  8: { gridSize: 10, boxCount: 8, wallCount: 0, holeCount: 0, woodCount: 4 },
  9: { gridSize: 10, boxCount: 10, wallCount: 3, holeCount: 1, woodCount: 1 },
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
/**
 * Casas alcançáveis a partir do robô sem atravessar paredes nem buracos.
 * A madeira é atravessável: pode ser partida com partir(), por isso não bloqueia o alcance.
 */
const reachable = (start: Position, impassable: Position[], gridSize: number): Set<string> => {
  const blocked = new Set(impassable.map(w => `${w.x},${w.y}`));
  const seen = new Set([`${start.x},${start.y}`]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const key = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) continue;
      if (blocked.has(key) || seen.has(key)) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen;
};

/**
 * Layout de uma partida: robô, caixas e paredes. Nenhuma peça fica sobre outra, as caixas
 * e o robô nunca ficam em parede, e todas as caixas são alcançáveis (verificado por pesquisa).
 * Se uma tentativa não for jogável, sorteia outra com o mesmo gerador (mesma semente, mesmo resultado).
 */
export const generateLayout = (levelId: number, seed: number): LayoutConfig => {
  const spec = LEVEL_SPECS[levelId];
  if (!spec) throw new Error(`nível desconhecido: ${levelId}`);

  const rnd = mulberry32(seed);
  for (let attempt = 0; attempt < 200; attempt++) {
    const cells: Position[] = [];
    for (let x = 0; x < spec.gridSize; x++) {
      for (let y = 0; y < spec.gridSize; y++) cells.push({ x, y });
    }
    // Fisher–Yates: 1.ª célula = robô; seguintes = caixas; depois paredes.
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const start = cells[0];
    const boxes = cells.slice(1, 1 + spec.boxCount);
    const walls = cells.slice(1 + spec.boxCount, 1 + spec.boxCount + spec.wallCount);
    const holeStart = 1 + spec.boxCount + spec.wallCount;
    const holes = cells.slice(holeStart, holeStart + spec.holeCount);
    const woodStart = holeStart + spec.holeCount;
    const wood = cells.slice(woodStart, woodStart + spec.woodCount);
    const reach = reachable(start, [...walls, ...holes], spec.gridSize);
    const allReachable = boxes.every(b => reach.has(`${b.x},${b.y}`));
    if (!allReachable) continue;

    return {
      gridSize: spec.gridSize,
      initialRobotPosition: start,
      initialRobotDirection: DIRECTIONS[Math.floor(rnd() * DIRECTIONS.length)],
      boxes,
      walls,
      holes,
      wood,
    };
  }
  throw new Error(`não foi possível gerar um layout jogável para o nível ${levelId}`);
};

/** Semente aleatória para partidas sem servidor (desenvolvimento local). */
export const randomSeed = (): number => crypto.getRandomValues(new Uint32Array(1))[0];
