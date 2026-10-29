import { describe, it, expect } from 'vitest';
import { previewPath } from './preview';
import { FIXED_LAYOUT } from '../testing/fixtures';

const opts = { allowLoops: true, allowConditionals: true };

describe('pré-visualização do caminho', () => {
  it('mover(2) mostra as duas casas por ordem, sem executar nada', () => {
    const r = previewPath(FIXED_LAYOUT, ['mover(2)'], 'pt', opts);
    expect(r.stoppedBy).toBe('end');
    expect(r.steps).toEqual([{ x: 1, y: 0, step: 1 }, { x: 2, y: 0, step: 2 }]);
  });

  it('repetir gera as visitas repetidas, com números crescentes', () => {
    const r = previewPath(FIXED_LAYOUT, ['repetir(3) {', 'mover()', '}'], 'pt', opts);
    expect(r.steps.map(s => `${s.x},${s.y}`)).toEqual(['1,0', '2,0', '3,0']);
    expect(r.steps.map(s => s.step)).toEqual([1, 2, 3]);
  });

  it('um erro para o caminho no sítio onde falha (parede ou borda)', () => {
    const r = previewPath(FIXED_LAYOUT, ['mover()', 'mover()', 'mover()', 'mover()', 'mover()', 'mover()'], 'pt', opts);
    expect(r.stoppedBy).toBe('error');
    expect(r.steps).toHaveLength(5); // a 6.ª casa sai da grelha de 6x6
  });

  it('um programa que não compila não mostra caminho', () => {
    const r = previewPath(FIXED_LAYOUT, ['repetir(2) {', 'mover()'], 'pt', opts);
    expect(r).toEqual({ steps: [], stoppedBy: 'compileError' });
  });

  it('um ciclo sem fim pára no limite de passos e não bloqueia', () => {
    const r = previewPath(FIXED_LAYOUT, ['enquanto_livre() {', 'virar_direita()', 'virar_esquerda()', '}'], 'pt', opts);
    expect(r.stoppedBy).toBe('loopLimit');
  });

  it('a pré-visualização segue a condição: se_caixa sem caixa não anda', () => {
    const r = previewPath(FIXED_LAYOUT, ['se_caixa() {', 'mover()', '}'], 'pt', opts);
    expect(r.stoppedBy).toBe('end');
    expect(r.steps).toEqual([]);
  });
});
