import levelBackground from '../assets/backgrounds/level2.jpg';
import { LevelConfig } from '../types/game';
import { LAYOUTS } from './layouts';

export const level2: LevelConfig = {
  backgroundImage: levelBackground,
  id: 2,
  ...LAYOUTS[2],
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
