import levelBackground from '../../../shared/assets/backgrounds/level4.jpg';
import { LevelMeta } from '../../../shared/types/game';

export const level4: LevelMeta = {
  backgroundImage: levelBackground,
  id: 4,
  colors: {
    robot: '#DB2777',
    box: '#F472B6',
  },
  hints: {
    pt: [
      'Último nível! O tabuleiro é o maior de todos: planeje a rota antes de executar.',
      'Observe onde o robô começa e para onde está virado antes de planejar a rota.',
      'Muitos erros acabam o nível: confirme cada grupo de comandos antes de seguir em frente.',
    ],
    en: [
      'Last level! This is the biggest board: plan your route before running.',
      'Look at where the robot starts and which way it faces before planning your route.',
      'Many errors end the level: check each group of commands before moving on.',
    ],
  },
};
