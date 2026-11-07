import { LayoutConfig, Language } from '../../../shared/types/game';

/** Limite de estados explorados. Acima disto, o mínimo não é calculado (devolve null). */
export const MAX_MINIMUM_STATES = 400_000;

// Direções em ordem horária (N, E, S, O): virar à direita soma 1, à esquerda subtrai 1.
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];
const DIR_INDEX: Record<string, number> = { NORTH: 0, EAST: 1, SOUTH: 2, WEST: 3 };

/**
 * Número mínimo absoluto de comandos para vencer um layout.
 *
 * Pesquisa em largura sobre os estados do tabuleiro: casa, direção, caixas recolhidas e madeira
 * partida. Cada comando custa 1, por isso o primeiro estado vitorioso encontrado dá o mínimo.
 * Nenhum programa com ciclos ou condições executa menos comandos, porque cada execução é uma
 * sequência de comandos que um programa linear também consegue executar.
 *
 * Regras espelhadas de interpreter.ts (e verificadas por teste contra ele):
 *  - mover(n) (n de 1 a 9): cada casa tem de ser livre (sem parede, madeira ou borda). Um buraco
 *    é proibido num caminho mínimo (cai e reinicia). Um portal teletransporta para o par.
 *  - pegar(): só a caixa com o número mais baixo ainda por recolher, se o nível tiver ordem.
 *  - partir(): remove a madeira à frente.
 *  - virar à esquerda e à direita custam 1 e não mudam de casa.
 *
 * Recolha forçada: sobre uma caixa apanhável só se expande "pegar()". Adiar essa recolha nunca
 * encurta o caminho, porque a caixa tem de ser apanhada de qualquer forma.
 *
 * Devolve null se a pesquisa passar de `maxStates` (o distintivo não é atribuído).
 */
export const minimumCommands = (
  layout: LayoutConfig,
  _lang: Language,
  maxStates: number = MAX_MINIMUM_STATES,
): number | null => {
  const N = layout.gridSize;
  const cellOf = (x: number, y: number) => y * N + x;
  const solid = new Uint8Array(N * N);
  const hole = new Uint8Array(N * N);
  const partner = new Int32Array(N * N).fill(-1);
  for (const w of layout.walls) solid[cellOf(w.x, w.y)] = 1;
  for (const h of layout.holes) hole[cellOf(h.x, h.y)] = 1;
  for (const p of layout.portals ?? []) {
    partner[cellOf(p.a.x, p.a.y)] = cellOf(p.b.x, p.b.y);
    partner[cellOf(p.b.x, p.b.y)] = cellOf(p.a.x, p.a.y);
  }

  // Bits da máscara: 0..boxCount-1 = caixas; a seguir, a madeira.
  const boxCount = layout.boxes.length;
  const woodCount = layout.wood.length;
  if (boxCount + woodCount > 30) return null;
  const boxBit = new Map<number, number>();
  layout.boxes.forEach((b, i) => boxBit.set(cellOf(b.x, b.y), i));
  const woodBit = new Map<number, number>();
  layout.wood.forEach((w, i) => {
    woodBit.set(cellOf(w.x, w.y), boxCount + i);
    solid[cellOf(w.x, w.y)] = 1;
  });
  const boxesMask = (1 << boxCount) - 1;
  const order = layout.boxOrder ?? null;
  const states = 2 ** (boxCount + woodCount);

  const isVictory = (mask: number) => (mask & boxesMask) === boxesMask;

  // Próxima caixa na ordem: a de número mais baixo ainda por recolher (-1 se o nível não tem ordem).
  const nextBox = (mask: number): number => {
    if (!order) return -1;
    let best = -1;
    for (let i = 0; i < boxCount; i++) {
      if (mask & (1 << i)) continue;
      if (best === -1 || order[i] < order[best]) best = i;
    }
    return best;
  };

  const startCell = cellOf(layout.initialRobotPosition.x, layout.initialRobotPosition.y);
  const encode = (cell: number, dir: number, mask: number) => (cell * 4 + dir) * states + mask;
  const seen = new Set<number>([encode(startCell, DIR_INDEX[layout.initialRobotDirection], 0)]);
  let frontier: [number, number, number][] = [[startCell, DIR_INDEX[layout.initialRobotDirection], 0]];
  let depth = 0;

  // Devolve true se o estado é novo (e fica na fronteira seguinte).
  const add = (c: number, d: number, m: number, out: [number, number, number][]): boolean => {
    const k = encode(c, d, m);
    if (seen.has(k)) return false;
    seen.add(k);
    out.push([c, d, m]);
    return true;
  };

  while (frontier.length > 0) {
    const next: [number, number, number][] = [];
    for (const [cell, dir, mask] of frontier) {
      if (seen.size > maxStates) return null;
      const cx = cell % N;
      const cy = (cell - cx) / N;

      // Recolha forçada: sobre uma caixa apanhável, só "pegar()" (custa 1).
      const bit = boxBit.get(cell);
      if (bit !== undefined && !(mask & (1 << bit)) && (!order || nextBox(mask) === bit)) {
        const m = mask | (1 << bit);
        if (isVictory(m)) return depth + 1;
        add(cell, dir, m, next);
        continue;
      }

      // Virar à esquerda e à direita.
      add(cell, (dir + 1) % 4, mask, next);
      add(cell, (dir + 3) % 4, mask, next);

      // Partir a madeira à frente.
      const ax = cx + DX[dir];
      const ay = cy + DY[dir];
      if (ax >= 0 && ay >= 0 && ax < N && ay < N) {
        const wb = woodBit.get(cellOf(ax, ay));
        if (wb !== undefined && !(mask & (1 << wb))) {
          const m = mask | (1 << wb);
          if (add(cell, dir, m, next) && isVictory(m)) return depth + 1;
        }
      }

      // mover(1..9): cada casa tem de ser livre; um portal teletransporta para o par.
      let x = cx;
      let y = cy;
      for (let k = 1; k <= 9; k++) {
        const nx = x + DX[dir];
        const ny = y + DY[dir];
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) break;
        const ncell = cellOf(nx, ny);
        if (solid[ncell] || hole[ncell]) break;
        const landed = partner[ncell] >= 0 ? partner[ncell] : ncell;
        x = landed % N;
        y = (landed - x) / N;
        if (add(landed, dir, mask, next) && isVictory(mask)) return depth + 1;
      }
    }
    frontier = next;
    depth++;
  }
  return null;
};
