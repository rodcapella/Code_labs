import levelBackground from '../assets/backgrounds/level2.jpg';
import { LevelConfig } from '../types/game';

export const level2: LevelConfig = {
  backgroundImage: levelBackground,
  id: 2,
  gridSize: 6,
  initialRobotPosition: { x: 0, y: 5 },
  initialRobotDirection: 'NORTH',
  boxes: [
    { x: 1, y: 1 },
    { x: 3, y: 3 },
    { x: 5, y: 5 },
    { x: 0, y: 0 },
  ],
  colors: {
    robot: '#7C3AED',
    box: '#A78BFA',
  },
  hints: [
    'Este nível é um pouco maior! Planeje seus movimentos.',
    'Você começa no canto inferior esquerdo virado para o Norte.',
    'Tente coletar as caixas na ordem mais próxima para economizar comandos.',
  ],
};
