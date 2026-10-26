import levelBackground from '../../../shared/assets/backgrounds/level4.jpg';
import { LevelConfig } from '../../../shared/types/game';
import { LAYOUTS } from './layouts';

export const level4: LevelConfig = {
  backgroundImage: levelBackground,
  id: 4,
  ...LAYOUTS[4],
  colors: {
    robot: '#DB2777',
    box: '#F472B6',
  },
  hints: {
    pt: [
      'Último nível! O tabuleiro é o maior de todos: planeje a rota antes de executar.',
      'Comece no centro virado para o Norte e percorra as caixas em ordem de proximidade.',
      'Muitos erros acabam o nível: confirme cada grupo de comandos antes de seguir em frente.',
    ],
    en: [
      'Last level! This is the biggest board: plan your route before running.',
      'Start in the centre facing North and visit the boxes in order of proximity.',
      'Many errors end the level: check each group of commands before moving on.',
    ],
  },
};
