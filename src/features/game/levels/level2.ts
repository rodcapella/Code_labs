import levelBackground from '../../../shared/assets/backgrounds/level1.jpg';
import { LevelMeta } from '../../../shared/types/game';

export const level2: LevelMeta = {
  backgroundImage: levelBackground,
  id: 2,
  intro: {
    pt: {
      title: 'Argumentos',
      body: [
        'mover(n) anda n casas de uma só vez (de 1 a 9). Conta como um único comando.',
        'Um programa com mover(4) é mais curto do que quatro mover().',
      ],
    },
    en: {
      title: 'Arguments',
      body: [
        'move(n) moves n squares at once (from 1 to 9). It counts as a single command.',
        'A program with move(4) is shorter than four move() calls.',
      ],
    },
  },
  colors: {
    robot: '#2563EB',
    box: '#7DD3FC',
    grid: '#38BDF8',
  },
  hints: {
    pt: [
      'Tenta mover(3) em vez de três mover() seguidos.',
      'Se uma parede estiver no caminho, o movimento inteiro falha e não se mexe.',
    ],
    en: [
      'Try move(3) instead of three move() calls in a row.',
      'If a wall is in the way, the whole move fails and the robot does not move.',
    ],
  },
};
