import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { StrictMode, createElement, ReactNode } from 'react';
import { useProgramRunner, StepEvent, parseProgram } from './useProgramRunner';
import { fixedLevel as level1 } from '../testing/fixtures';

const strict = ({ children }: { children: ReactNode }) => createElement(StrictMode, null, children);

const setup = (onEvent = vi.fn<(e: StepEvent) => void>(), maxErrors = 10, lvl = level1) =>
  renderHook(() => useProgramRunner(lvl, 'pt', maxErrors, onEvent), { wrapper: strict });

// Nível pequeno com as 3 caixas originais, para testar a vitória de forma fixa.
const miniLevel = {
  ...level1,
  gridSize: 5,
  boxes: [{ x: 2, y: 2 }, { x: 4, y: 0 }, { x: 1, y: 4 }],
};

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
    const six = Array(6).fill('mover()').join('\n');
    act(() => result.current.run(six));
    runFor(600 * 10);
    expect(result.current.state.error).toBeTruthy();
    expect(result.current.state.robotPosition).toEqual({ x: level1.gridSize - 1, y: 0 });
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

  it('recolher todas as caixas (mini-nível 5×5) dá vitória', () => {
    const onEvent = vi.fn();
    const { result } = setup(onEvent, 10, miniLevel);
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

  it('repetir executa o corpo o número de vezes indicado', () => {
    const { result } = renderHook(
      () => useProgramRunner(level1, 'pt', 10, vi.fn(), true),
      { wrapper: strict },
    );
    act(() => result.current.run('repetir(3) {\nmover()\n}'));
    runFor(600 * 4);
    expect(result.current.state.robotPosition).toEqual({ x: 3, y: 0 });
    expect(result.current.state.commandCount).toBe(3);
  });

  it('bloco sem fecho mostra erro de compilação, não começa e não conta como erro', () => {
    const { result } = renderHook(
      () => useProgramRunner(level1, 'pt', 10, vi.fn(), true),
      { wrapper: strict },
    );
    act(() => result.current.run('repetir(2) {\nmover()'));
    expect(result.current.isExecuting).toBe(false);
    expect(result.current.state.error).toBeTruthy();
    expect(result.current.state.currentLine).toBe(0);
    expect(result.current.errors).toBe(0);
    expect(result.current.runs).toHaveLength(0);
  });

  it('nível iniciante (sem ciclos) rejeita repetir com erro de compilação', () => {
    const { result } = renderHook(
      () => useProgramRunner(level1, 'pt', 10, vi.fn(), false),
      { wrapper: strict },
    );
    act(() => result.current.run('repetir(2) {\nmover()\n}'));
    expect(result.current.isExecuting).toBe(false);
    expect(result.current.state.error).toBeTruthy();
  });

  it('se_caixa executa o bloco só quando há caixa na posição atual', () => {
    const { result } = renderHook(
      () => useProgramRunner(level1, 'pt', 10, vi.fn(), true, true),
      { wrapper: strict },
    );
    // Sem caixa em (2,0): o bloco é saltado e o comando pegar() não conta.
    act(() => result.current.run('mover()\nmover()\nse_caixa() {\npegar()\n}'));
    runFor(600 * 6);
    expect(result.current.state.commandCount).toBe(2);
    expect(result.current.state.boxes.filter(b => b.collected)).toHaveLength(0);
  });

  it('se_caixa recolhe a caixa quando ela existe na posição', () => {
    const { result } = renderHook(
      () => useProgramRunner(level1, 'pt', 10, vi.fn(), true, true),
      { wrapper: strict },
    );
    // Caminho até à caixa (2,2): dois passos para Este, virar à direita, dois para Sul.
    const program = [
      'mover()', 'mover()', 'virar_direita()', 'mover()', 'mover()',
      'se_caixa() {', 'pegar()', '}',
    ].join('\n');
    act(() => result.current.run(program));
    runFor(600 * 15);
    expect(result.current.state.boxes.filter(b => b.collected)).toHaveLength(1);
    expect(result.current.state.commandCount).toBe(6);
  });

  it('se_caixa não está disponível fora do nível avançado', () => {
    const { result } = renderHook(
      () => useProgramRunner(level1, 'pt', 10, vi.fn(), true, false),
      { wrapper: strict },
    );
    act(() => result.current.run('se_caixa() {\npegar()\n}'));
    expect(result.current.isExecuting).toBe(false);
    expect(result.current.state.error).toBeTruthy();
  });

  it('enquanto_livre repete até à borda (número de passos decidido na execução)', () => {
    const { result } = renderHook(
      () => useProgramRunner(level1, 'pt', 10, vi.fn(), true, true),
      { wrapper: strict },
    );
    // Robô em (0,0) virado a Este, grelha 6x6: 5 casas até à borda.
    act(() => result.current.run('enquanto_livre() {\nmover()\n}'));
    runFor(600 * 20);
    expect(result.current.state.robotPosition).toEqual({ x: 5, y: 0 });
    expect(result.current.state.commandCount).toBe(5);
    expect(result.current.errors).toBe(0);
  });

  it('ciclo sem fim é travado e conta como erro', () => {
    const { result } = renderHook(
      () => useProgramRunner(level1, 'pt', 10, vi.fn(), true, true),
      { wrapper: strict },
    );
    // Vira para Sul e para Este sem parar, com a casa à frente sempre livre.
    act(() => result.current.run('enquanto_livre() {\nvirar_direita()\nvirar_esquerda()\n}'));
    runFor(600 * (1000 + 50));
    expect(result.current.isExecuting).toBe(false);
    expect(result.current.errors).toBe(1);
    expect(result.current.state.error).toMatch(/demasiados passos|too many steps/);
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
