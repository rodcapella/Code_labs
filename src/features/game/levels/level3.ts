import levelBackground from '../../../shared/assets/backgrounds/level3.jpg';
import { LevelMeta } from '../../../shared/types/game';

export const level3: LevelMeta = {
  backgroundImage: levelBackground,
  id: 3,
  colors: {
    robot: '#059669',
    box: '#34D399',
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
