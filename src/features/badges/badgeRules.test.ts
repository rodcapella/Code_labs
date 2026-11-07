import { describe, it, expect } from 'vitest';
import { evaluateBadges, SPRINT_LIMIT_SECONDS, isBadgeId } from './badgeRules';

const win = { won: true, time: 60, commands: 12, minimumCommands: 10, resilient: false };

describe('regras dos distintivos', () => {
  it('Velocista: menos de 30 segundos (30 exatos não contam)', () => {
    expect(SPRINT_LIMIT_SECONDS).toBe(30);
    expect(evaluateBadges({ ...win, time: 29.9 })).toContain('sprint');
    expect(evaluateBadges({ ...win, time: 30 })).not.toContain('sprint');
  });

  it('Mestre da Eficiência: só com o número mínimo exato', () => {
    expect(evaluateBadges({ ...win, commands: 10 })).toContain('efficiency');
    expect(evaluateBadges({ ...win, commands: 11 })).not.toContain('efficiency');
    // Sem mínimo calculado, não se atribui o distintivo.
    expect(evaluateBadges({ ...win, commands: 10, minimumCommands: null })).not.toContain('efficiency');
  });

  it('Explorador Resiliente: houve queda ou batida e mesmo assim venceu', () => {
    expect(evaluateBadges({ ...win, resilient: true })).toContain('resilient');
    expect(evaluateBadges({ ...win, resilient: false })).not.toContain('resilient');
  });

  it('sem vitória não há distintivos', () => {
    expect(evaluateBadges({ ...win, won: false, time: 5, commands: 1, minimumCommands: 1, resilient: true })).toEqual([]);
  });

  it('um distintivo pode juntar-se a outros', () => {
    expect(evaluateBadges({ won: true, time: 10, commands: 4, minimumCommands: 4, resilient: true }))
      .toEqual(['sprint', 'efficiency', 'resilient']);
  });

  it('só ids conhecidos são aceites', () => {
    expect(isBadgeId('sprint')).toBe(true);
    expect(isBadgeId('hacker')).toBe(false);
    expect(isBadgeId(42)).toBe(false);
  });
});

describe('conquista de fidelidade', () => {
  it('é um id válido de distintivo', () => {
    expect(isBadgeId('fidelity')).toBe(true);
  });
});
