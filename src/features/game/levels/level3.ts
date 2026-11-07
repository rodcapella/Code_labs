import levelBackgroundDay from '../../../shared/assets/backgrounds/level3-day.jpg';
import levelBackground from '../../../shared/assets/backgrounds/level2.jpg';
import { LevelMeta } from '../../../shared/types/game';

export const level3: LevelMeta = {
  backgroundImage: levelBackground,
  backgroundImageDay: levelBackgroundDay,
  id: 3,
  intro: {
    pt: {
      title: 'Direção',
      body: [
        'Antes de andar, o robô precisa de estar virado para o lado certo.',
        'Combina virar_esquerda() e virar_direita() com mover() para planear a rota.',
      ],
    },
    en: {
      title: 'Direction',
      body: [
        'Before moving, the robot must face the right way.',
        'Combine turn_left() and turn_right() with move() to plan the route.',
      ],
    },
  },
  colors: {
    robot: '#7C3AED',
    box: '#A78BFA',
    grid: '#7A5CFC',
  },
  hints: {
    pt: [
    'Este nível é um pouco maior! Planeje seus movimentos.',
    'Você começa no canto inferior esquerdo virado para o Norte.',
    'Tente coletar as caixas na ordem mais próxima para economizar comandos.',
    ],
    en: [
    'This level is a bit bigger! Plan your moves.',
    'Check which way the robot is facing before you plan the route.',
    'Try collecting the boxes in the closest order to save commands.',
    ],
  },
};
