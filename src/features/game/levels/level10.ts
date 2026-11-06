import { LevelMeta } from '../../../shared/types/game';

export const level10: LevelMeta = {
  id: 10,
  intro: {
    pt: {
      title: 'Portais',
      body: [
        'Os portais azuis vão em pares: entrar num transporta o robô para o outro, na mesma direção.',
        'Planeia caminhos que aproveitem o teletransporte. O robô nunca para dentro de um portal.',
      ],
    },
    en: {
      title: 'Portals',
      body: [
        'Blue portals come in pairs: entering one carries the robot to the other, in the same direction.',
        'Plan routes that use the teleport. The robot never stops inside a portal.',
      ],
    },
  },
  colors: {
    robot: '#0F766E',
    box: '#A5B4FC',
    grid: '#4338CA',
  },
  hints: {
    pt: [
      'Um portal que parece longe pode ser o atalho para a caixa seguinte.',
      'Ao sair do portal, continuas virado para a mesma direção: planeia o próximo passo.',
      'mover(n) continua do outro lado se o caminho atravessar um portal.',
    ],
    en: [
      'A portal that looks far away may be the shortcut to the next box.',
      'When you come out of a portal you still face the same way: plan the next step.',
      'move(n) continues on the other side if the path goes through a portal.',
    ],
  },
};
