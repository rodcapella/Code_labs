import levelBackground from '../../../shared/assets/backgrounds/level2.jpg';
import { LevelMeta } from '../../../shared/types/game';

export const level2: LevelMeta = {
  backgroundImage: levelBackground,
  id: 2,
  colors: {
    robot: '#7C3AED',
    box: '#A78BFA',
    grid: '#7A5CFC',
  },
  hints: {
    pt: [
    'Este nível é um pouco maior! Planeje seus movimentos.',
    'Você começa no canto inferior esquerdo virado para o Norte.',
    'Tente coletar as caixas na ordem mais próxima para economizar comandos.',
    ],
    en: [
    'This level is a bit bigger! Plan your moves.',
    'Check which way the robot is facing before you plan the route.',
    'Try collecting the boxes in the closest order to save commands.',
    ],
  },
};
