import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LeaderboardScreen } from './LeaderboardScreen';
import { UserConfig } from '../../shared/i18n/translations';

vi.mock('./leaderboardApi', () => ({
  fetchLeaderboard: vi.fn(async () => []),
}));

const config: UserConfig = {
  name: 'rui', age: 20, level: 'beginner', language: 'pt', robotColor: '#2563EB', completedLevels: [],
};

describe('LeaderboardScreen', () => {
  it('mostra o carregamento arcade e remove-o quando o ranking chega', async () => {
    render(<LeaderboardScreen onBack={vi.fn()} userConfig={config} />);
    expect(screen.getByRole('status')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });
});
