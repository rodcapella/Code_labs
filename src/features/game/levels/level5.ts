import levelBackgroundDay from '../../../shared/assets/backgrounds/level4-day.jpg';
import levelBackground from '../../../shared/assets/backgrounds/level4.jpg';
import { LevelMeta } from '../../../shared/types/game';

export const level5: LevelMeta = {
  backgroundImage: levelBackground,
  backgroundImageDay: levelBackgroundDay,
  id: 5,
  intro: {
    pt: {
      title: 'Decisões (se e senão)',
      body: [
        'se_caixa() { ... } executa o bloco só se houver uma caixa por recolher na casa atual.',
        'senao() { ... } logo a seguir executa o outro caminho quando não há caixa.',
        'Há também duas paredes na grelha: não as podes atravessar.',
      ],
    },
    en: {
      title: 'Decisions (if and else)',
      body: [
        'if_box() { ... } runs the block only if there is a box still to collect on the current square.',
        'else() { ... } right after it runs the other path when there is no box.',
        'There are also two walls on the grid: you cannot cross them.',
      ],
    },
  },
  colors: {
    robot: '#DB2777',
    box: '#FCD34D',
    grid: '#F59E0B',
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
