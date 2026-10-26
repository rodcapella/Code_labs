import levelBackground from '../assets/backgrounds/level3.jpg';
import { LevelConfig } from '../types/game';

export const level3: LevelConfig = {
  backgroundImage: levelBackground,
  id: 3,
  gridSize: 10,
  initialRobotPosition: { x: 4, y: 4 },
  initialRobotDirection: 'SOUTH',
  boxes: [
    { x: 0, y: 0 },
    { x: 9, y: 9 },
    { x: 0, y: 9 },
    { x: 9, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 9 },
    { x: 2, y: 5 },
    { x: 7, y: 3 },
    { x: 5, y: 8 },
    { x: 8, y: 6 },
    { x: 1, y: 2 },
    { x: 6, y: 1 },
  ],
  colors: {
    robot: '#059669',
    box: '#34D399',
  },
  hints: {
    pt: [
    'O desafio final do MVP! O robô começa bem no centro.',
    'As caixas estão espalhadas pelos cantos e bordas.',
    'Use o máximo de eficiência para bater o recorde no Ranking!',
    ],
    en: [
    'The final challenge! The robot starts right in the centre.',
    'The boxes are spread across the corners and edges.',
    'Be efficient to beat the record on the Ranking!',
    ],
  },
};
