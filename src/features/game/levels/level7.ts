import levelBackground from '../../../shared/assets/backgrounds/level7.jpg';
import { LevelMeta } from '../../../shared/types/game';

export const level7: LevelMeta = {
  id: 7,
  backgroundImage: levelBackground,
  intro: {
    pt: {
      title: 'Enquanto com paredes',
      body: [
        'enquanto_livre() { ... } continua até bater numa parede ou na borda.',
        'Seis paredes bloqueiam o caminho: combina o enquanto com virar para contornar cada uma.',
      ],
    },
    en: {
      title: 'While with walls',
      body: [
        'while_free() { ... } keeps going until it hits a wall or the edge.',
        'Six walls block the way: combine the loop with turns to go around each one.',
      ],
    },
  },
  colors: {
    robot: '#E11D48',
    box: '#FDA4AF',
    grid: '#F43F5E',
  },
  hints: {
    pt: [
      'Um enquanto_livre() pára antes de cada parede: vira e repete para contornar.',
      'Usa mover(n) quando souberes quantas casas faltam.',
    ],
    en: [
      'A while_free() stops before each wall: turn and repeat to go around.',
      'Use move(n) when you know how many squares are left.',
    ],
  },
};
