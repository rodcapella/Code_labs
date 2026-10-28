import { LevelMeta } from '../../../shared/types/game';

export const level5: LevelMeta = {
  id: 5,
  intro: {
    pt: {
      title: 'Enquanto (while)',
      body: [
        'enquanto_livre() { ... } repete o bloco enquanto a casa à frente estiver livre (dentro da grelha).',
        'Não sabes à partida quantas vezes vai repetir: o programa decide durante a execução.',
      ],
    },
    en: {
      title: 'While loops',
      body: [
        'while_free() { ... } repeats the block while the square ahead is free (inside the grid).',
        'You do not know in advance how many times it runs: the program decides while it runs.',
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
