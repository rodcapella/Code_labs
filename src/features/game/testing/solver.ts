import { LayoutConfig, Language } from '../../../shared/types/game';
import { TRANSLATIONS } from '../../../shared/i18n/translations';

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N, E, S, O

// Pesquisa em largura: sequência mínima de comandos que recolhe todas as caixas.
export const solve = (layout: LayoutConfig, lang: Language): string[] => {
  const t = TRANSLATIONS[lang];
  const boxIndex = new Map(layout.boxes.map((b, i) => [`${b.x},${b.y}`, i]));
  const wallSet = new Set([...(layout.walls ?? []), ...(layout.holes ?? [])].map(w => `${w.x},${w.y}`));
  const goal = (1 << layout.boxes.length) - 1;
  const startD = ['NORTH', 'EAST', 'SOUTH', 'WEST'].indexOf(layout.initialRobotDirection);
  type N = { x: number; y: number; d: number; mask: number; path: string[] };
  const queue: N[] = [{ x: layout.initialRobotPosition.x, y: layout.initialRobotPosition.y, d: startD, mask: 0, path: [] }];
  const seen = new Set([`${queue[0].x},${queue[0].y},${startD},0`]);
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.mask === goal) return cur.path;
    const next: N[] = [];
    const [dx, dy] = DIRS[cur.d];
    const nx = cur.x + dx, ny = cur.y + dy;
    if (nx >= 0 && ny >= 0 && nx < layout.gridSize && ny < layout.gridSize && !wallSet.has(`${nx},${ny}`)) {
      next.push({ ...cur, x: nx, y: ny, path: [...cur.path, t.cmdMove] });
    }
    next.push({ ...cur, d: (cur.d + 1) % 4, path: [...cur.path, t.cmdRight] });
    next.push({ ...cur, d: (cur.d + 3) % 4, path: [...cur.path, t.cmdLeft] });
    const bi = boxIndex.get(`${cur.x},${cur.y}`);
    if (bi !== undefined && !(cur.mask & (1 << bi))) {
      next.push({ ...cur, mask: cur.mask | (1 << bi), path: [...cur.path, t.cmdPick] });
    }
    for (const n of next) {
      const key = `${n.x},${n.y},${n.d},${n.mask}`;
      if (!seen.has(key)) { seen.add(key); queue.push(n); }
    }
  }
  throw new Error('sem solução');
};
