import { describe, it, expect } from 'vitest';
import { nextStreak, addDays, dailyLevelFor, DAILY_POOLS, streakBadges, secondsUntilUtcMidnight, utcDateString } from './dailyRules';
import { generateDailySeed } from './server/dailySeed';

describe('sequência de dias', () => {
  it('primeira conclusão começa em 1', () => {
    expect(nextStreak(null, '2026-11-07')).toEqual({ lastDate: '2026-11-07', count: 1 });
  });

  it('dia seguinte soma 1; mesmo dia não muda', () => {
    const s1 = nextStreak(null, '2026-11-07');
    const s2 = nextStreak(s1, '2026-11-08');
    expect(s2.count).toBe(2);
    expect(nextStreak(s2, '2026-11-08')).toEqual(s2);
  });

  it('um dia falhado recomeça em 1', () => {
    const s = { lastDate: '2026-11-07', count: 5 };
    expect(nextStreak(s, '2026-11-09').count).toBe(1);
  });

  it('atravessa mudança de mês e de ano', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(nextStreak({ lastDate: '2026-12-31', count: 3 }, '2027-01-01').count).toBe(4);
  });
});

describe('conquista de fidelidade', () => {
  it('aparece a partir de 7 dias seguidos', () => {
    expect(streakBadges(6)).toEqual([]);
    expect(streakBadges(7)).toEqual(['fidelity']);
  });
});

describe('nível do dia', () => {
  it('a semente é determinística: a mesma data dá sempre a mesma semente', () => {
    expect(generateDailySeed('2026-11-07')).toBe(generateDailySeed('2026-11-07'));
    expect(generateDailySeed('2026-11-07')).not.toBe(generateDailySeed('2026-11-08'));
  });

  it('o nível escolhido pertence sempre ao conjunto do conhecimento do jogador', () => {
    for (const knowledge of ['beginner', 'intermediate', 'advanced'] as const) {
      for (let seed = 0; seed < 200; seed++) {
        expect(DAILY_POOLS[knowledge]).toContain(dailyLevelFor(seed, knowledge));
      }
    }
  });

  it('um iniciante nunca recebe níveis com repetir ou decisões', () => {
    expect(Math.max(...DAILY_POOLS.beginner)).toBeLessThanOrEqual(3);
  });
});

describe('contador até à meia-noite UTC', () => {
  it('a meia-noite UTC dá o dia inteiro; 23:59:30 dá 30 segundos', () => {
    expect(secondsUntilUtcMidnight(new Date('2026-11-07T00:00:00Z'))).toBe(86400);
    expect(secondsUntilUtcMidnight(new Date('2026-11-07T23:59:30Z'))).toBe(30);
  });

  it('a data UTC muda à meia-noite UTC, independentemente do fuso local', () => {
    expect(utcDateString(new Date('2026-11-07T23:59:59Z'))).toBe('2026-11-07');
    expect(utcDateString(new Date('2026-11-08T00:00:00Z'))).toBe('2026-11-08');
  });
});
