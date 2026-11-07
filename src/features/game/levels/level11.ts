import levelBackground from '../../../shared/assets/backgrounds/level11.jpg';
import { LevelMeta } from '../../../shared/types/game';

export const level11: LevelMeta = {
  id: 11,
  backgroundImage: levelBackground,
  intro: {
    pt: {
      title: 'Ordem de recolha',
      body: [
        'As caixas têm números. Tens de as apanhar pela ordem: primeiro a de número mais baixo.',
        'Apanhar uma caixa fora de ordem não funciona e conta como erro. A caixa a destacar é a próxima.',
      ],
    },
    en: {
      title: 'Collection order',
      body: [
        'The boxes are numbered. You must collect them in order: the lowest number first.',
        'Collecting a box out of order does not work and counts as an error. The highlighted box is the next one.',
      ],
    },
  },
  colors: {
    robot: '#7C3AED',
    box: '#FDBA74',
    grid: '#C2410C',
  },
  hints: {
    pt: [
      'Antes de andar, descobre qual é a caixa número 1 e onde está.',
      'Os portais podem levar-te à caixa seguinte mais depressa do que um caminho direto.',
      'Ao chegar a uma caixa fora de ordem, o robô não a apanha: só o número mais baixo conta.',
    ],
    en: [
      'Before moving, find box number 1 and where it is.',
      'Portals can take you to the next box faster than a direct path.',
      'If you reach a box out of order, the robot will not collect it: only the lowest number counts.',
    ],
  },
};
