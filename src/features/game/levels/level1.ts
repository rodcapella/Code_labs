import levelBackground from '../../../shared/assets/backgrounds/level1.jpg';
import { LevelConfig } from '../../../shared/types/game';
import { LAYOUTS } from './layouts';

export const level1: LevelConfig = {
  backgroundImage: levelBackground,
  id: 1,
  ...LAYOUTS[1],
  colors: {
    robot: '#2563EB',
    box: '#60A5FA',
  },
  hints: {
    pt: [
    'Tente usar mover() para chegar até a primeira caixa.',
    'Lembre-se de usar virar_direita() ou virar_esquerda() para mudar a direção.',
    'Use pegar() quando estiver exatamente em cima de uma caixa.',
    'Você pode combinar vários comandos para coletar todas as caixas de uma vez!',
    ],
    en: [
    'Try using move() to reach the first box.',
    'Remember to use turn_right() or turn_left() to change direction.',
    'Use pick() when you are exactly on top of a box.',
    'You can combine several commands to collect all the boxes at once!',
    ],
  },
};
