import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within, cleanup } from '@testing-library/react';
import { StrictMode } from 'react';
import { GameScreen } from './GameScreen';
import { TRANSLATIONS, UserConfig } from '../constants/translations';
import { level1 } from '../levels/level1';
import { LEADERBOARD_KEY } from '../engine/leaderboard';

// Áudio não existe no jsdom: os sons viram no-ops.
vi.mock('../utils/audio', () => ({
  playMoveSound: vi.fn(), playTurnSound: vi.fn(), playPickSound: vi.fn(),
  playErrorSound: vi.fn(), playVictorySound: vi.fn(), playClickSound: vi.fn(),
  playBeepBoopSound: vi.fn(),
}));

const t = TRANSLATIONS.pt;

const config = (level: UserConfig['level']): UserConfig => ({
  name: 'rui', age: 20, level, language: 'pt', robotColor: '#2563EB', completedLevels: [],
});

const renderGame = (level: UserConfig['level'] = 'beginner', onUpdateConfig = vi.fn()) =>
  render(
    <StrictMode>
      <GameScreen onBack={vi.fn()} userConfig={config(level)} onUpdateConfig={onUpdateConfig} />
    </StrictMode>,
  );

// Avança o relógio em passos de 100 ms, cada um dentro de act, para o React
// processar os efeitos que reagendam o passo seguinte (como num browser).
const runFor = (ms: number) => {
  for (let elapsed = 0; elapsed < ms; elapsed += 100) {
    act(() => { vi.advanceTimersByTime(100); });
  }
};

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

const counterOf = (label: string) => {
  const p = screen.getByText(label).parentElement!;
  return within(p).getByText(/^\d+(\/\d+)?$/).textContent;
};

// BFS: sequência mínima de comandos que recolhe todas as caixas do nível.
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N, E, S, O (ordem de rotação)
const solve = (lvl: typeof level1): string[] => {
  const boxIndex = new Map(lvl.boxes.map((b, i) => [`${b.x},${b.y}`, i]));
  const goal = (1 << lvl.boxes.length) - 1;
  const start = { x: lvl.initialRobotPosition.x, y: lvl.initialRobotPosition.y, d: DIRS.findIndex(
    ([dx, dy]) => lvl.initialRobotDirection === ['NORTH', 'EAST', 'SOUTH', 'WEST'][DIRS.indexOf([dx, dy] as number[])] ),
    mask: 0 };
  const startD = ['NORTH', 'EAST', 'SOUTH', 'WEST'].indexOf(lvl.initialRobotDirection);
  const seen = new Set<string>();
  const queue: { x: number; y: number; d: number; mask: number; path: string[] }[] = [
    { x: start.x, y: start.y, d: startD, mask: 0, path: [] },
  ];
  seen.add(`${start.x},${start.y},${startD},0`);
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.mask === goal) return cur.path;
    const moves: [string, typeof cur][] = [];
    const [dx, dy] = DIRS[cur.d];
    const nx = cur.x + dx, ny = cur.y + dy;
    if (nx >= 0 && ny >= 0 && nx < lvl.gridSize && ny < lvl.gridSize) {
      moves.push([t.cmdMove, { ...cur, x: nx, y: ny, path: [...cur.path, t.cmdMove] }]);
    }
    moves.push([t.cmdRight, { ...cur, d: (cur.d + 1) % 4, path: [...cur.path, t.cmdRight] }]);
    moves.push([t.cmdLeft, { ...cur, d: (cur.d + 3) % 4, path: [...cur.path, t.cmdLeft] }]);
    const bi = boxIndex.get(`${cur.x},${cur.y}`);
    if (bi !== undefined && !(cur.mask & (1 << bi))) {
      moves.push([t.cmdPick, { ...cur, mask: cur.mask | (1 << bi), path: [...cur.path, t.cmdPick] }]);
    }
    for (const [, n] of moves) {
      const key = `${n.x},${n.y},${n.d},${n.mask}`;
      if (!seen.has(key)) { seen.add(key); queue.push(n); }
    }
  }
  throw new Error('sem solução');
};

describe('GameScreen (Strict Mode)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    localStorage.setItem('tutorial_completed', 'true'); // sem overlay de tutorial
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('contar comandos é exato em Strict Mode (sem duplicar)', () => {
    renderGame();
    click(t.cmdMove);
    click(t.cmdMove);
    click(t.execute);
    runFor(600 * 3);
    expect(counterOf(t.commands)).toBe('2');
    expect(counterOf(t.errorsLabel)).toBe('0/10');
  });

  it('desfazer repõe o comando anterior', () => {
    renderGame();
    click(t.cmdMove);
    click(t.cmdMove);
    click(t.execute);
    runFor(600 * 3);
    expect(counterOf(t.commands)).toBe('2');
    click(t.undo);
    expect(counterOf(t.commands)).toBe('1');
  });

  it('pausar interrompe a execução e retomar continua do mesmo passo', () => {
    renderGame();
    click(t.cmdMove);
    click(t.cmdMove);
    click(t.cmdMove);
    click(t.execute);
    runFor(600);                       // 1 passo
    click(t.pause);
    runFor(5000);                      // em pausa não avança
    expect(counterOf(t.commands)).toBe('1');
    click(t.resume);
    runFor(600 * 3);
    expect(counterOf(t.commands)).toBe('3');
  });

  it('limite de erros (avançado = 3) termina a tentativa e "tentar novamente" repõe', () => {
    renderGame('advanced');
    click(t.cmdPick); // sem caixa em (0,0): erro
    for (let i = 0; i < 3; i++) {
      click(t.execute);
      runFor(600 * 2);
    }
    expect(screen.getByText(t.gameOverTitle)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.retryLevel }));
    expect(counterOf(t.errorsLabel)).toBe('0/3');
    expect(screen.queryByText(t.gameOverTitle)).toBeNull();
  });

  it('vitória grava uma única entrada no ranking e chama onUpdateConfig uma vez', () => {
    const onUpdate = vi.fn();
    renderGame('beginner', onUpdate);
    for (const cmd of solve(level1)) click(cmd);
    click(t.execute);
    runFor(600 * 60);

    expect(screen.getByText(t.victoryDesc(0, 0).split(' usando')[0], { exact: false })).toBeTruthy();
    const entries = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) ?? '[]');
    expect(entries).toHaveLength(1);
    expect(entries[0].levelId).toBe(1);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith({ completedLevels: [1] });
  });
});
