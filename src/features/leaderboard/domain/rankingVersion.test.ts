import { describe, it, expect } from 'vitest';
import { RANKING_VERSION } from '../../../shared/config/rules';
import { keyFor } from './leaderboardRules';

describe('versão do ranking', () => {
  it('as chaves do Redis usam a versão atual (3)', () => {
    expect(RANKING_VERSION).toBe(3);
    expect(keyFor(8)).toBe('leaderboard:v3:level:8');
  });
});
