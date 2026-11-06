import { LevelMeta } from '../../../shared/types/game';

export const level9: LevelMeta = {
  id: 9,
  intro: {
    pt: {
      title: 'Revisão',
      body: [
        'Revisão: junta tudo o que aprendeste até aqui.',
        'Combina repetir, se_caixa com senao, se_parede e enquanto_livre. Há paredes, um buraco e madeira: planeia antes de executar.',
      ],
    },
    en: {
      title: 'Review',
      body: [
        'Review: it brings together everything you learned so far.',
        'Combine repeat, if_box with else, if_wall and while_free. Plan before you run: the path preview helps.',
      ],
    },
  },
  colors: {
    robot: '#BE185D',
    box: '#F9A8D4',
    grid: '#EC4899',
  },
  hints: {
    pt: [
      'Começa por desenhar a rota no papel, casa a casa.',
      'Um enquanto_livre() dentro de repetir(2) { } faz o mesmo percurso duas vezes.',
      'Usa se_caixa() { pegar() } senao { mover() } para não perder passos.',
    ],
    en: [
      'Start by sketching the route on paper, square by square.',
      'A while_free() inside repeat(2) { } walks the same route twice.',
      'Use if_box() { pick() } else { move() } to avoid wasted steps.',
    ],
  },
};
