import { LeaderboardEntry } from '../../../shared/types/game';
import { MAX_LINE_LENGTH, MAX_RUNS, MAX_LINES_PER_RUN } from '../../../shared/config/rules';
import { scoreOf as rulesScoreOf } from '../../../shared/config/rules';

/** Partilhado entre o cliente e a API (api/leaderboard.ts). */
export const LEADERBOARD_SIZE = 10;
export const LEVEL_IDS = [1, 2, 3] as const;
export const MAX_COMMANDS = 10000;
export const MAX_ERRORS = 10000;
export const MAX_TIME_SECONDS = 86400;

export const keyFor = (levelId: number): string => `leaderboard:level:${levelId}`;

/** Pontuação (comandos, erros e tempo). Menor é melhor. */
export const scoreOf = rulesScoreOf;

/**
 * Score numérico para o sorted set do Redis: pontuação primeiro, e o tempo
 * exato como desempate (limitado a 99999 s para não invadir a pontuação).
 */
export const encodeScore = (e: Pick<LeaderboardEntry, 'commands' | 'errors' | 'time'>): number =>
  scoreOf(e.commands, e.errors, e.time) * 100000 + Math.min(Math.max(e.time, 0), 99999);

export type EntryInput = Omit<LeaderboardEntry, 'id'>;

/** Envio de uma vitória: o servidor recalcula comandos e erros a partir das execuções. */
export interface Submission {
  name: string;
  robotColor: string;
  date: string;
  time: number;
  levelId: number;
  knowledgeLevel: 'beginner' | 'intermediate' | 'advanced';
  language: 'pt' | 'en';
  runs: string[][];
}

export type ValidationResult =
  | { ok: true; submission: Submission }
  | { ok: false; error: string };

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** Valida a forma do envio (não a jogada: isso é feito re-executando). */
export const validateSubmission = (body: unknown): ValidationResult => {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'corpo inválido' };
  const b = body as Record<string, unknown>;

  if (typeof b.name !== 'string') return { ok: false, error: 'nome inválido' };
  const name = b.name.trim();
  if (!/^[\p{L}\p{N} ._-]{1,10}$/u.test(name)) return { ok: false, error: 'nome inválido' };

  if (!isInt(b.levelId, 1, 3)) return { ok: false, error: 'nível inválido' };
  if (!isInt(b.time, 0, MAX_TIME_SECONDS)) return { ok: false, error: 'tempo inválido' };

  if (typeof b.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) {
    return { ok: false, error: 'data inválida' };
  }
  if (typeof b.robotColor !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(b.robotColor)) {
    return { ok: false, error: 'cor inválida' };
  }
  if (b.knowledgeLevel !== 'beginner' && b.knowledgeLevel !== 'intermediate' && b.knowledgeLevel !== 'advanced') {
    return { ok: false, error: 'nível de conhecimento inválido' };
  }
  if (b.language !== 'pt' && b.language !== 'en') return { ok: false, error: 'idioma inválido' };

  if (!Array.isArray(b.runs) || b.runs.length === 0 || b.runs.length > MAX_RUNS) {
    return { ok: false, error: 'execuções inválidas' };
  }
  const runs: string[][] = [];
  for (const run of b.runs) {
    if (!Array.isArray(run) || run.length > MAX_LINES_PER_RUN) {
      return { ok: false, error: 'execução inválida' };
    }
    const lines: string[] = [];
    for (const line of run) {
      if (typeof line !== 'string' || line.length > MAX_LINE_LENGTH) {
        return { ok: false, error: 'linha inválida' };
      }
      lines.push(line);
    }
    runs.push(lines);
  }

  return {
    ok: true,
    submission: {
      name,
      robotColor: b.robotColor,
      date: b.date,
      time: b.time,
      levelId: b.levelId,
      knowledgeLevel: b.knowledgeLevel,
      language: b.language,
      runs,
    },
  };
};
