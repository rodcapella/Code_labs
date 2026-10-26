import { LayoutConfig } from '../../../shared/types/game';

/** Geometria dos níveis, sem imagens: o servidor importa isto para re-executar jogadas. */
export const LAYOUTS: Record<number, LayoutConfig> = {
  1: {
    gridSize: 6,
    initialRobotPosition: { x: 0, y: 0 },
    initialRobotDirection: 'EAST',
    boxes: [
      { x: 2, y: 2 }, { x: 4, y: 0 }, { x: 1, y: 4 },
      { x: 5, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 5 },
    ],
  },
  2: {
    gridSize: 8,
    initialRobotPosition: { x: 0, y: 7 },
    initialRobotDirection: 'NORTH',
    boxes: [
      { x: 1, y: 1 }, { x: 3, y: 3 }, { x: 5, y: 5 }, { x: 0, y: 0 },
      { x: 7, y: 7 }, { x: 2, y: 6 }, { x: 6, y: 2 }, { x: 4, y: 1 },
    ],
  },
  3: {
    gridSize: 10,
    initialRobotPosition: { x: 4, y: 4 },
    initialRobotDirection: 'SOUTH',
    boxes: [
      { x: 0, y: 0 }, { x: 9, y: 9 }, { x: 0, y: 9 }, { x: 9, y: 0 },
      { x: 4, y: 0 }, { x: 4, y: 9 }, { x: 2, y: 5 }, { x: 7, y: 3 },
      { x: 5, y: 8 }, { x: 8, y: 6 }, { x: 1, y: 2 }, { x: 6, y: 1 },
    ],
  },
  4: {
    gridSize: 12,
    initialRobotPosition: { x: 6, y: 6 },
    initialRobotDirection: 'NORTH',
    boxes: [
      { x: 0, y: 0 }, { x: 11, y: 0 }, { x: 0, y: 11 }, { x: 11, y: 11 },
      { x: 6, y: 0 }, { x: 6, y: 11 }, { x: 0, y: 6 }, { x: 11, y: 6 },
      { x: 3, y: 3 }, { x: 8, y: 3 }, { x: 3, y: 8 }, { x: 8, y: 8 },
      { x: 5, y: 2 }, { x: 9, y: 5 }, { x: 2, y: 9 }, { x: 7, y: 10 },
    ],
  },
};
