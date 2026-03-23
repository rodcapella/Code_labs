import { LevelConfig } from '../types/game';

export const level3: LevelConfig = {
  id: 3,
  gridSize: 8,
  initialRobotPosition: { x: 4, y: 4 },
  initialRobotDirection: 'SOUTH',
  boxes: [
    { x: 0, y: 0 },
    { x: 7, y: 7 },
    { x: 0, y: 7 },
    { x: 7, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 7 },
  ],
  colors: {
    robot: '#059669',
    box: '#34D399',
  },
  hints: [
    'O desafio final do MVP! O robô começa bem no centro.',
    'As caixas estão espalhadas pelos cantos e bordas.',
    'Use o máximo de eficiência para bater o recorde no Ranking!',
  ],
};
