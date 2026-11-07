import levelBackgroundDay from '../../../shared/assets/backgrounds/level8-day.jpg';
import levelBackground from '../../../shared/assets/backgrounds/level8.jpg';
import { LevelMeta } from '../../../shared/types/game';

export const level8: LevelMeta = {
  id: 8,
  backgroundImage: levelBackground,
  backgroundImageDay: levelBackgroundDay,
  intro: {
    pt: {
      title: 'Madeira',
      body: [
        'A madeira bloqueia o caminho, como uma parede, mas pode ser aberta.',
        'partir() remove a madeira que está à frente. Conta como um comando.',
      ],
    },
    en: {
      title: 'Wood',
      body: [
        'Wood blocks the way, like a wall, but it can be opened.',
        'break() removes the wood on the square ahead. It counts as one command.',
      ],
    },
  },
  colors: {
    robot: '#92400E',
    box: '#FDE68A',
    grid: '#B45309',
  },
  hints: {
    pt: [
      'Procura a madeira na tua frente antes de contar passos.',
      'partir() só funciona com madeira na casa da frente.',
      'Depois de partir, a casa fica livre e o caminho continua normal.',
    ],
    en: [
      'Look for wood in front of you before counting steps.',
      'break() only works when there is wood on the square ahead.',
      'Once broken, the square is free and the path continues as normal.',
    ],
  },
};
