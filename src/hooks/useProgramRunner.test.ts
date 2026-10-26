import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { StrictMode, createElement, ReactNode } from 'react';
import { useProgramRunner, StepEvent, parseProgram } from './useProgramRunner';
import { level1 } from '../levels/level1';

const strict = ({ children }: { children: ReactNode }) => createElement(StrictMode, null, children);

const setup = (onEvent = vi.fn<(e: StepEvent) => void>(), maxErrors = 10) =>
  renderHook(() => useProgramRunner(level1, 'pt', maxErrors, onEvent), { wrapper: strict });

// Avança o relógio em blocos de 100 ms, cada um num act próprio, para que o React
// processe os efeitos (que reagendam o passo seguinte) entre cada passo, como num browser.
const runFor = (ms: number) => {
  for (let t = 0; t < ms; t += 100) {
    act(() => { vi.advanceTimersByTime(100); });
  }
};

describe('useProgramRunner', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ignora linhas vazias ao interpretar o programa', () => {
    expect(parseProgram('  mover()  \n\n   \n pegar()')).toEqual(['mover()', 'pegar()']);
  });

  it('executa uma linha por intervalo de velocidade', () => {
    const { result } = setup();
    act(() => result.current.run('mover()\nmover()'));
    expect(result.current.state.robotPosition).toEqual({ x: 0, y: 0 });
    runFor(600);
    expect(result.current.state.robotPosition).toEqual({ x: 1, y: 0 });
    runFor(600);
    expect(result.current.state.robotPosition).toEqual({ x: 2, y: 0 });
    runFor(600);
    expect(result.current.isExecuting).toBe(false);
  });

  it('em Strict Mode, cada passo acontece uma só vez e o histórico não duplica', () => {
    const { result } = setup();
    act(() => result.current.run('mover()\nmover()'));
    runFor(600);
    runFor(600);
    expect(result.current.state.commandCount).toBe(2);
    expect(result.current.historyLength).toBe(2);
  });

  it('pausa e retoma sem perder a posição', () => {
    const { result } = setup();
    act(() => result.current.run('mover()\nmover()\nmover()'));
    runFor(600);
    act(() => result.current.pause());
    expect(result.current.isPaused).toBe(true);
    runFor(5000);
    expect(result.current.state.robotPosition.x).toBe(1);
    act(() => result.current.run('mover()\nmover()\nmover()'));
    runFor(600);
    expect(result.current.state.robotPosition.x).toBe(2);
  });

  it('alterar a velocidade a meio da execução aplica-se ao passo seguinte', () => {
    const { result } = setup();
    act(() => result.current.run('mover()\nmover()\nmover()'));
    act(() => result.current.setSpeed(300));
    runFor(300);
    expect(result.current.state.robotPosition.x).toBe(1);
    runFor(300);
    expect(result.current.state.robotPosition.x).toBe(2);
  });

  it('para no primeiro erro e não avança mais linhas', () => {
    const onEvent = vi.fn();
    const { result } = setup(onEvent);
    act(() => result.current.run('mover()\nmover()\nmover()\nmover()\nmover()'));
    runFor(600 * 10);
    expect(result.current.state.error).toBeTruthy();
    expect(result.current.state.robotPosition).toEqual({ x: 4, y: 0 });
    expect(result.current.isExecuting).toBe(false);
    expect(onEvent).toHaveBeenCalledWith('error');
  });

  it('undo restaura posição e comandos, incluindo o ponto da execução', () => {
    const { result } = setup();
    act(() => result.current.run('mover()\nmover()'));
    runFor(600);
    runFor(600);
    expect(result.current.state.robotPosition.x).toBe(2);
    act(() => result.current.undo());
    expect(result.current.state.robotPosition.x).toBe(1);
    expect(result.current.state.commandCount).toBe(1);
    act(() => result.current.undo());
    expect(result.current.state.robotPosition.x).toBe(0);
    expect(result.current.historyLength).toBe(0);
  });

  it('undo não funciona durante a execução', () => {
    const { result } = setup();
    act(() => result.current.run('mover()\nmover()'));
    runFor(600);
    act(() => result.current.undo());
    expect(result.current.state.robotPosition.x).toBe(1);
  });

  it('recolher as três caixas do nível 1 dá vitória', () => {
    const onEvent = vi.fn();
    const { result } = setup(onEvent);
    // Robô em (0,0) virado a Este. Caixas em (2,2), (4,0) e (1,4).
    const program = [
      'mover()', 'mover()',               // (2,0)
      'virar_direita()', 'mover()', 'mover()', // (2,2) virado a Sul
      'pegar()',
      'virar_esquerda()', 'mover()', 'mover()', // (4,2) virado a Este
      'virar_esquerda()', 'mover()', 'mover()', // (4,0) virado a Norte
      'pegar()',
      'virar_esquerda()', 'mover()', 'mover()', 'mover()', // (1,0) virado a Oeste
      'virar_esquerda()', 'mover()', 'mover()', 'mover()', 'mover()', // (1,4) virado a Sul
      'pegar()',
    ].join('\n');
    act(() => result.current.run(program));
    runFor(600 * 30);
    expect(result.current.state.boxes.every(b => b.collected)).toBe(true);
    expect(result.current.state.victory).toBe(true);
    expect(result.current.state.error).toBeNull();
    expect(result.current.isExecuting).toBe(false);
    expect(onEvent).toHaveBeenLastCalledWith('victory');
  });

  it('conta erros e termina a tentativa ao atingir o máximo', () => {
    const onEvent = vi.fn();
    const { result } = setup(onEvent, 2);
    // 'pegar()' falha logo na primeira linha (não há caixa em (0,0))
    act(() => result.current.run('pegar()'));
    runFor(600);
    expect(result.current.errors).toBe(1);
    expect(result.current.isGameOver).toBe(false);

    act(() => result.current.run('pegar()'));
    runFor(600);
    expect(result.current.errors).toBe(2);
    expect(result.current.isGameOver).toBe(true);
    expect(onEvent).toHaveBeenCalledWith('gameover');

    // Com o limite atingido, não se pode voltar a executar
    act(() => result.current.run('mover()'));
    expect(result.current.isExecuting).toBe(false);
    expect(result.current.state.robotPosition).toEqual(level1.initialRobotPosition);
  });

  it('os erros mantêm-se entre execuções e só se repõem com reset', () => {
    const { result } = setup(vi.fn(), 10);
    act(() => result.current.run('pegar()'));
    runFor(600);
    act(() => result.current.run('mover()'));
    runFor(600);
    expect(result.current.errors).toBe(1);
    act(() => result.current.reset());
    expect(result.current.errors).toBe(0);
  });

  it('reset repõe o estado inicial do nível', () => {
    const { result } = setup();
    act(() => result.current.run('mover()'));
    runFor(600);
    act(() => result.current.reset());
    expect(result.current.state.robotPosition).toEqual(level1.initialRobotPosition);
    expect(result.current.state.commandCount).toBe(0);
    expect(result.current.started).toBe(false);
    expect(result.current.errors).toBe(0);
  });
});
