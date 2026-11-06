import { LayoutConfig, LevelConfig } from '../../../shared/types/game';
import { level1 } from '../levels/level1';

/** Layout fixo para testes determinísticos (não é usado pelo jogo). */
export const FIXED_LAYOUT: LayoutConfig = {
  gridSize: 6,
  initialRobotPosition: { x: 0, y: 0 },
  initialRobotDirection: 'EAST',
  boxes: [
    { x: 2, y: 2 }, { x: 4, y: 0 }, { x: 1, y: 4 },
    { x: 5, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 5 },
  ],
  walls: [],
  holes: [],
  wood: [],
  portals: [],
};

export const fixedLevel: LevelConfig = { ...level1, ...FIXED_LAYOUT };
