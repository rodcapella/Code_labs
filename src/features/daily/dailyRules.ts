import { KnowledgeLevel } from '../../shared/i18n/translations';

/** Dias seguidos com o desafio concluído para ganhar a conquista "Fidelidade Diária". */
export const STREAK_BADGE_DAYS = 7;

/**
 * Níveis possíveis no desafio diário, por nível de conhecimento. Um iniciante só recebe níveis
 * que consegue resolver com sequências, argumentos e direção (sem repetir nem decisões).
 */
export const DAILY_POOLS: Record<KnowledgeLevel, number[]> = {
  beginner: [1, 2, 3],
  intermediate: [2, 3, 4],
  advanced: [4, 5, 6, 7, 8, 9, 10, 11],
};

/** Nível do dia: escolhido pela semente dentro do conjunto do conhecimento do jogador. */
export const dailyLevelFor = (seed: number, knowledge: KnowledgeLevel): number => {
  const pool = DAILY_POOLS[knowledge];
  return pool[seed % pool.length];
};

/** Data UTC no formato YYYY-MM-DD (o desafio muda à meia-noite UTC). */
export const utcDateString = (date: Date): string => date.toISOString().slice(0, 10);

/** Soma dias a uma data YYYY-MM-DD (respeita meses e anos). */
export const addDays = (dateStr: string, days: number): string => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export interface Streak {
  /** Último dia (UTC) em que o desafio foi concluído. */
  lastDate: string;
  /** Dias seguidos até lastDate, incluindo esse dia. */
  count: number;
}

/**
 * Atualiza a sequência ao concluir o desafio de `today`.
 * - Mesmo dia: não muda (uma conclusão por dia).
 * - Dia anterior concluído: soma 1.
 * - Falhou algum dia (ou primeira vez): recomeça em 1.
 */
export const nextStreak = (prev: Streak | null, today: string): Streak => {
  if (prev && prev.lastDate === today) return prev;
  if (prev && prev.lastDate === addDays(today, -1)) return { lastDate: today, count: prev.count + 1 };
  return { lastDate: today, count: 1 };
};

/** Conquistas ligadas à sequência. */
export const streakBadges = (count: number): string[] => (count >= STREAK_BADGE_DAYS ? ['fidelity'] : []);

/** Segundos até à próxima meia-noite UTC (para o contador do desafio). */
export const secondsUntilUtcMidnight = (now: Date): number => {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(0, Math.floor((next - now.getTime()) / 1000));
};
