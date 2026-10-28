import { LeaderboardEntry } from '../../../shared/types/game';
import { scoreOf as rulesScoreOf } from '../../../shared/config/rules';
import { LEADERBOARD_SIZE } from './leaderboardRules';

export const LEADERBOARD_KEY = 'codebot_leaderboard';
export { LEADERBOARD_SIZE };

export const formatPlayerName = (name: string): string =>
  name.trim().toUpperCase().slice(0, 10);

/** Pontuação: comandos, erros e tempo. Menor é melhor. */
export const scoreOf = (entry: LeaderboardEntry): number =>
  rulesScoreOf(entry.commands, entry.errors, entry.time, entry.structureBonus ?? 0);

/** Ordena por pontuação e, em empate, por tempo. */
export const compareEntries = (a: LeaderboardEntry, b: LeaderboardEntry): number => {
  const diff = scoreOf(a) - scoreOf(b);
  return diff !== 0 ? diff : a.time - b.time;
};

export const addEntry = (entries: LeaderboardEntry[], entry: LeaderboardEntry): LeaderboardEntry[] =>
  [...entries, entry].sort(compareEntries).slice(0, LEADERBOARD_SIZE);

const isEntry = (value: unknown): value is LeaderboardEntry => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.name === 'string' && typeof v.commands === 'number' && typeof v.time === 'number';
};

/** Entradas antigas (sem `errors`) são tratadas como tendo 0 erros. */
const normalize = (e: LeaderboardEntry): LeaderboardEntry => ({
  ...e,
  errors: typeof e.errors === 'number' ? e.errors : 0,
});

export const parseLeaderboard = (raw: string | null): LeaderboardEntry[] => {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isEntry).map(normalize) : [];
  } catch {
    return [];
  }
};

export const loadLeaderboard = (): LeaderboardEntry[] =>
  parseLeaderboard(localStorage.getItem(LEADERBOARD_KEY));

export const saveLeaderboard = (entries: LeaderboardEntry[]): void =>
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));

/**
 * Um resultado entra no top do nível se houver vaga ou se for estritamente
 * melhor que o último lugar. Empates com o último lugar não entram.
 */
export const qualifiesForTop = (
  entries: LeaderboardEntry[],
  candidate: Omit<LeaderboardEntry, 'id' | 'name'>,
): boolean => {
  const level = entries.filter(e => e.levelId === candidate.levelId).sort(compareEntries);
  if (level.length < LEADERBOARD_SIZE) return true;
  const probe: LeaderboardEntry = { ...candidate, id: 'probe', name: '' };
  return compareEntries(probe, level[LEADERBOARD_SIZE - 1]) < 0;
};
