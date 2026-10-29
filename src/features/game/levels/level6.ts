import { LevelMeta } from '../../../shared/types/game';

export const level6: LevelMeta = {
  id: 6,
  intro: {
    pt: {
      title: 'Enquanto e paredes',
      body: [
        'enquanto_livre() { ... } repete enquanto a casa à frente estiver livre (sem parede nem borda).',
        'se_parede() { ... } executa o bloco só se a casa à frente for uma parede ou a borda.',
        'Há quatro paredes na grelha: a condição olha para o cenário, não só para a casa atual.',
      ],
    },
    en: {
      title: 'While and walls',
      body: [
        'while_free() { ... } repeats while the square ahead is free (no wall or edge).',
        'if_wall() { ... } runs the block only if the square ahead is a wall or the edge.',
        'There are four walls on the grid: the condition looks at the scene, not only the current square.',
      ],
    },
  },
  colors: {
    robot: '#0D9488',
    box: '#5EEAD4',
    grid: '#14B8A6',
  },
  hints: {
    pt: [
      'Experimenta enquanto_livre() { mover() } para andar até à borda.',
      'Um ciclo sem fim é travado depois de muitos passos e conta como erro.',
      'Combina enquanto_livre() com virar_direita() para varrer a grelha.',
    ],
    en: [
      'Try while_free() { move() } to walk to the edge.',
      'An endless loop is stopped after many steps and counts as an error.',
      'Combine while_free() with turn_right() to sweep the grid.',
    ],
  },
};
