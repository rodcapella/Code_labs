import levelBackground from '../assets/backgrounds/level3.jpg';
import { LevelConfig } from '../types/game';
import { LAYOUTS } from './layouts';

export const level3: LevelConfig = {
  backgroundImage: levelBackground,
  id: 3,
  ...LAYOUTS[3],
  colors: {
    robot: '#059669',
    box: '#34D399',
  },
  hints: {
    pt: [
    'O desafio final do MVP! O robô começa bem no centro.',
    'As caixas estão espalhadas pelos cantos e bordas.',
    'Use o máximo de eficiência para bater o recorde no Ranking!',
    ],
    en: [
    'The final challenge! The robot starts right in the centre.',
    'The boxes are spread across the corners and edges.',
    'Be efficient to beat the record on the Ranking!',
    ],
  },
};
