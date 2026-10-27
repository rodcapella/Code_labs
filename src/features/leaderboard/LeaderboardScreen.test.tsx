import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup, act } from '@testing-library/react';
import { afterEach } from 'vitest';
import { fetchLeaderboard } from './leaderboardApi';
import { LeaderboardScreen } from './LeaderboardScreen';
import { UserConfig } from '../../shared/i18n/translations';

vi.mock('./leaderboardApi', () => ({
  fetchLeaderboard: vi.fn(async () => []),
}));

const entry = (id: number, levelId: number, commands: number) => ({
  id: `${levelId}-${commands}`, name: `P${levelId}-${commands}`, levelId, commands, errors: 0, time: 10,
  date: '2026-01-01', robotColor: '#000000',
});

const config: UserConfig = {
  name: 'rui', age: 20, level: 'beginner', language: 'pt', robotColor: '#2563EB', completedLevels: [],
};

describe('LeaderboardScreen', () => {
  afterEach(() => {
    cleanup();
  });

  it('mostra o carregamento arcade e remove-o quando o ranking chega', async () => {
    render(<LeaderboardScreen onBack={vi.fn()} userConfig={config} />);
    expect(screen.getByRole('status')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('mostra um separador por nível, com no máximo 10 resultados por nível', async () => {
    const level1 = Array.from({ length: 12 }, (_, i) => entry(i, 1, 10 + i));
    const level2 = [entry(100, 2, 5)];
    vi.mocked(fetchLeaderboard).mockResolvedValue([...level1, ...level2]);
    render(<LeaderboardScreen onBack={vi.fn()} userConfig={config} />);
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(screen.getAllByText(/^P1-/)).toHaveLength(10);
    expect(screen.queryByText('P2-5')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: /^\S+ 2$/ }));
    expect(screen.getByText('P2-5')).toBeTruthy();
    expect(screen.queryByText(/^P1-/)).toBeNull();
  });

  describe('modo demonstração', () => {
    it('sem resultados no nível, volta ao início após 5 segundos', async () => {
      vi.useFakeTimers();
      try {
        vi.mocked(fetchLeaderboard).mockResolvedValue([]);
        const onBack = vi.fn();
        render(<LeaderboardScreen onBack={onBack} userConfig={config} />);
        await act(async () => {
          await Promise.resolve();
          await Promise.resolve();
        });
        act(() => { vi.advanceTimersByTime(4900); });
        expect(onBack).not.toHaveBeenCalled();
        act(() => { vi.advanceTimersByTime(200); });
        expect(onBack).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('um toque cancela a volta automática', async () => {
      vi.useFakeTimers();
      try {
        vi.mocked(fetchLeaderboard).mockResolvedValue([]);
        const onBack = vi.fn();
        render(<LeaderboardScreen onBack={onBack} userConfig={config} />);
        await act(async () => {
          await Promise.resolve();
          await Promise.resolve();
        });
        act(() => { window.dispatchEvent(new Event('pointerdown')); });
        act(() => { vi.advanceTimersByTime(10000); });
        expect(onBack).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('com resultados no nível, não volta sozinho', async () => {
      vi.useFakeTimers();
      try {
        vi.mocked(fetchLeaderboard).mockResolvedValue([entry(1, 1, 12)]);
        const onBack = vi.fn();
        render(<LeaderboardScreen onBack={onBack} userConfig={config} />);
        await act(async () => {
          await Promise.resolve();
          await Promise.resolve();
        });
        act(() => { vi.advanceTimersByTime(10000); });
        expect(onBack).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
