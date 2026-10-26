import levelBackground from '../assets/backgrounds/level2.jpg';
import { LevelConfig } from '../types/game';

export const level2: LevelConfig = {
  backgroundImage: levelBackground,
  id: 2,
  gridSize: 8,
  initialRobotPosition: { x: 0, y: 5 },
  initialRobotDirection: 'NORTH',
  boxes: [
    { x: 1, y: 1 },
    { x: 3, y: 3 },
    { x: 5, y: 5 },
    { x: 0, y: 0 },
    { x: 7, y: 7 },
    { x: 2, y: 6 },
    { x: 6, y: 2 },
    { x: 4, y: 1 },
  ],
  colors: {
    robot: '#7C3AED',
    box: '#A78BFA',
  },
  hints: {
    pt: [
    'Este nível é um pouco maior! Planeje seus movimentos.',
    'Você começa no canto inferior esquerdo virado para o Norte.',
    'Tente coletar as caixas na ordem mais próxima para economizar comandos.',
    ],
    en: [
    'This level is a bit bigger! Plan your moves.',
    'You start in the bottom-left corner facing North.',
    'Try collecting the boxes in the closest order to save commands.',
    ],
  },
};
