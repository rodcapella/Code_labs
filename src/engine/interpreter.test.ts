import { describe, it, expect } from 'vitest';
import { executeCommand, getNextPosition, rotateLeft, rotateRight } from './interpreter';
import { createInitialState } from '../hooks/useProgramRunner';
import { level1 } from '../levels/level1';
import { GameState } from '../types/game';

const base = (overrides: Partial<GameState> = {}): GameState => ({
  ...createInitialState(level1),
  ...overrides,
});

describe('getNextPosition', () => {
  it('avança na direção indicada', () => {
    expect(getNextPosition({ x: 2, y: 2 }, 'NORTH', 5)).toEqual({ x: 2, y: 1 });
    expect(getNextPosition({ x: 2, y: 2 }, 'EAST', 5)).toEqual({ x: 3, y: 2 });
    expect(getNextPosition({ x: 2, y: 2 }, 'SOUTH', 5)).toEqual({ x: 2, y: 3 });
    expect(getNextPosition({ x: 2, y: 2 }, 'WEST', 5)).toEqual({ x: 1, y: 2 });
  });

  it('devolve null fora da grelha', () => {
    expect(getNextPosition({ x: 0, y: 0 }, 'NORTH', 5)).toBeNull();
    expect(getNextPosition({ x: 0, y: 0 }, 'WEST', 5)).toBeNull();
    expect(getNextPosition({ x: 4, y: 4 }, 'EAST', 5)).toBeNull();
    expect(getNextPosition({ x: 4, y: 4 }, 'SOUTH', 5)).toBeNull();
  });
});

describe('rotação', () => {
  it('roda 90 graus em cada sentido e volta ao início após 4 rotações', () => {
    expect(rotateLeft('NORTH')).toBe('WEST');
    expect(rotateRight('NORTH')).toBe('EAST');
    let d: GameState['robotDirection'] = 'EAST';
    for (let i = 0; i < 4; i++) d = rotateRight(d);
    expect(d).toBe('EAST');
  });
});

describe('executeCommand (pt)', () => {
  it('mover() desloca o robô e conta o comando', () => {
    const next = executeCommand(base(), 'mover()', 'pt');
    expect(next.robotPosition).toEqual({ x: 1, y: 0 });
    expect(next.commandCount).toBe(1);
    expect(next.error).toBeNull();
  });

  it('virar_direita() e virar_esquerda() mudam a direção', () => {
    const right = executeCommand(base(), 'virar_direita()', 'pt');
    expect(right.robotDirection).toBe('SOUTH');
    const left = executeCommand(base(), 'virar_esquerda()', 'pt');
    expect(left.robotDirection).toBe('NORTH');
  });

  it('mover() para fora do grelha dá erro e NÃO conta o comando', () => {
    const state = base({ robotPosition: { x: 4, y: 0 } });
    const next = executeCommand(state, 'mover()', 'pt');
    expect(next.error).toBeTruthy();
    expect(next.robotPosition).toEqual({ x: 4, y: 0 });
    expect(next.commandCount).toBe(0);
  });

  it('pegar() sem caixa dá erro e NÃO conta o comando', () => {
    const next = executeCommand(base(), 'pegar()', 'pt');
    expect(next.error).toBeTruthy();
    expect(next.commandCount).toBe(0);
  });

  it('pegar() sobre uma caixa marca-a como recolhida', () => {
    const state = base({ robotPosition: { x: 2, y: 2 } });
    const next = executeCommand(state, 'pegar()', 'pt');
    expect(next.boxes.find(b => b.position.x === 2 && b.position.y === 2)?.collected).toBe(true);
    expect(next.victory).toBe(false);
    expect(next.commandCount).toBe(1);
  });

  it('não recolhe duas vezes a mesma caixa', () => {
    const state = base({ robotPosition: { x: 2, y: 2 } });
    const once = executeCommand(state, 'pegar()', 'pt');
    const twice = executeCommand(once, 'pegar()', 'pt');
    expect(twice.error).toBeTruthy();
    expect(twice.commandCount).toBe(1);
  });

  it('vitória só quando a última caixa é recolhida', () => {
    let state = base({
      robotPosition: { x: 2, y: 2 },
      boxes: [
        { id: 'a', position: { x: 2, y: 2 }, collected: true },
        { id: 'b', position: { x: 4, y: 0 }, collected: false },
      ],
    });
    state = { ...state, robotPosition: { x: 4, y: 0 } };
    const won = executeCommand(state, 'pegar()', 'pt');
    expect(won.victory).toBe(true);
  });

  it('comando desconhecido dá erro e não conta', () => {
    const next = executeCommand(base(), 'saltar()', 'pt');
    expect(next.error).toContain('saltar()');
    expect(next.commandCount).toBe(0);
  });

  it('linha vazia ou só com espaços não altera o estado', () => {
    const state = base();
    expect(executeCommand(state, '   ', 'pt')).toBe(state);
  });

  it('não muta o estado original', () => {
    const state = base();
    const snapshot = JSON.stringify(state);
    executeCommand(state, 'mover()', 'pt');
    executeCommand(state, 'pegar()', 'pt');
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe('executeCommand (en)', () => {
  it('aceita os comandos em inglês', () => {
    const next = executeCommand(base(), 'move()', 'en');
    expect(next.robotPosition).toEqual({ x: 1, y: 0 });
    expect(executeCommand(base(), 'turn_right()', 'en').robotDirection).toBe('SOUTH');
  });

  it('rejeita comandos em português quando o idioma é inglês', () => {
    expect(executeCommand(base(), 'mover()', 'en').error).toBeTruthy();
  });
});
