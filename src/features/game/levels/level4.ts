import levelBackgroundDay from '../../../shared/assets/backgrounds/level4-day.jpg';
import levelBackground from '../../../shared/assets/backgrounds/level3.jpg';
import { LevelMeta } from '../../../shared/types/game';

export const level4: LevelMeta = {
  backgroundImage: levelBackground,
  backgroundImageDay: levelBackgroundDay,
  id: 4,
  intro: {
    pt: {
      title: 'Repetir (for)',
      body: [
        'repetir(n) { ... } executa o bloco um número fixo de vezes.',
        'Usa-o quando um padrão de comandos se repete.',
      ],
    },
    en: {
      title: 'Repeat (for)',
      body: [
        'repeat(n) { ... } runs the block a fixed number of times.',
        'Use it when the same pattern of commands repeats.',
      ],
    },
  },
  colors: {
    robot: '#059669',
    box: '#6EE7B7',
    grid: '#34D399',
  },
  hints: {
    pt: [
    'O desafio final do MVP! A posição inicial do robô muda a cada partida.',
    'As caixas aparecem em posições diferentes a cada partida.',
    'Use o máximo de eficiência para bater o recorde no Ranking!',
    ],
    en: [
    'The final challenge! The robot’s start position changes every game.',
    'The boxes appear in different places every game.',
    'Be efficient to beat the record on the Ranking!',
    ],
  },
};
