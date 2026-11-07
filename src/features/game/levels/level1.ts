import levelBackgroundDay from '../../../shared/assets/backgrounds/level1-day.jpg';
import levelBackground from '../../../shared/assets/backgrounds/level1.jpg';
import { LevelMeta } from '../../../shared/types/game';

export const level1: LevelMeta = {
  backgroundImage: levelBackground,
  backgroundImageDay: levelBackgroundDay,
  id: 1,
  intro: {
    pt: {
      title: 'Sequências',
      body: [
        'Um programa é uma lista de comandos executada de cima para baixo, um de cada vez.',
        'Usa mover(), virar e pegar() para recolher todas as caixas.',
      ],
    },
    en: {
      title: 'Sequences',
      body: [
        'A program is a list of commands run from top to bottom, one at a time.',
        'Use move(), turn and pick() to collect every box.',
      ],
    },
  },
  colors: {
    robot: '#2563EB',
    box: '#60A5FA',
    grid: '#0A84FF',
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
