import { LeaderboardEntry } from '../types/game';
import { ERROR_PENALTY } from './rules';

/** Partilhado entre o cliente e a API (api/leaderboard.ts). */
export const LEADERBOARD_SIZE = 10;
export const LEVEL_IDS = [1, 2, 3] as const;
export const MAX_COMMANDS = 10000;
export const MAX_ERRORS = 10000;
export const MAX_TIME_SECONDS = 86400;

export const keyFor = (levelId: number): string => `leaderboard:level:${levelId}`;

/** Pontuação: comandos + penalização por erro. Menor é melhor. */
export const scoreOf = (commands: number, errors: number): number =>
  commands + errors * ERROR_PENALTY;

/**
 * Score numérico para o sorted set do Redis: pontuação primeiro, tempo em
 * segundos como desempate (tempo limitado a 99999 s para não invadir a pontuação).
 */
export const encodeScore = (e: Pick<LeaderboardEntry, 'commands' | 'errors' | 'time'>): number =>
  scoreOf(e.commands, e.errors) * 100000 + Math.min(Math.max(e.time, 0), 99999);

export type EntryInput = Omit<LeaderboardEntry, 'id'>;

export type ValidationResult =
  | { ok: true; entry: EntryInput }
  | { ok: false; error: string };

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** Valida o corpo de um POST. Não confia em nada que venha do cliente. */
export const validateEntry = (body: unknown): ValidationResult => {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'corpo inválido' };
  const b = body as Record<string, unknown>;

  if (typeof b.name !== 'string') return { ok: false, error: 'nome inválido' };
  const name = b.name.trim();
  if (!/^[\p{L}\p{N} ._-]{1,10}$/u.test(name)) return { ok: false, error: 'nome inválido' };

  if (!isInt(b.levelId, 1, 3)) return { ok: false, error: 'nível inválido' };
  if (!isInt(b.commands, 0, MAX_COMMANDS)) return { ok: false, error: 'comandos inválidos' };
  if (!isInt(b.errors, 0, MAX_ERRORS)) return { ok: false, error: 'erros inválidos' };
  if (!isInt(b.time, 0, MAX_TIME_SECONDS)) return { ok: false, error: 'tempo inválido' };

  if (typeof b.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) {
    return { ok: false, error: 'data inválida' };
  }
  if (typeof b.robotColor !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(b.robotColor)) {
    return { ok: false, error: 'cor inválida' };
  }

  return {
    ok: true,
    entry: {
      name,
      levelId: b.levelId,
      commands: b.commands,
      errors: b.errors,
      time: b.time,
      date: b.date,
      robotColor: b.robotColor,
    },
  };
};
