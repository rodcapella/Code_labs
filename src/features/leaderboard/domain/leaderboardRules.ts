import { LeaderboardEntry } from '../../../shared/types/game';
import { MAX_LINE_LENGTH, MAX_RUNS, MAX_LINES_PER_RUN } from '../../../shared/config/rules';
import { scoreOf as rulesScoreOf } from '../../../shared/config/rules';

/** Partilhado entre o cliente e a API (api/leaderboard.ts). */
export const LEADERBOARD_SIZE = 10;
export { LEVEL_IDS } from '../../../shared/config/rules';
import { LEVEL_IDS as LEVELS } from '../../../shared/config/rules';
export const MAX_COMMANDS = 10000;
export const MAX_ERRORS = 10000;
export const MAX_TIME_SECONDS = 86400;

import { RANKING_VERSION } from '../../../shared/config/rules';

/** Chave do ranking de um nível. A versão muda quando os níveis são renumerados (ranking reiniciado). */
export const keyFor = (levelId: number): string => `leaderboard:v${RANKING_VERSION}:level:${levelId}`;

/** Tentativa emitida pelo servidor (semente do layout). Consumida ao submeter. */
export const attemptKey = (attemptId: string): string => `attempt:${attemptId}`;
export const ATTEMPT_TTL_SECONDS = 30 * 60;

/** Pontuação (comandos, erros e tempo). Menor é melhor. */
export const scoreOf = rulesScoreOf;

/**
 * Score numérico para o sorted set do Redis: pontuação primeiro, e o tempo
 * exato como desempate (limitado a 99999 s para não invadir a pontuação).
 */
export const encodeScore = (e: Pick<LeaderboardEntry, 'commands' | 'errors' | 'time' | 'structureBonus'>): number =>
  scoreOf(e.commands, e.errors, e.time, e.structureBonus ?? 0) * 100000 + Math.min(Math.max(e.time, 0), 99999);

export type EntryInput = Omit<LeaderboardEntry, 'id'>;

/** Envio de uma vitória: o servidor recalcula comandos e erros a partir das execuções. */
export interface Submission {
  attemptId: string;
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

/** Nome do jogador: 1 a 10 caracteres (letras, números, espaço, ponto, traço e underscore). */
export const PLAYER_NAME_MAX = 10;
const PLAYER_NAME_RE = /^[\p{L}\p{N} ._-]{1,10}$/u;

/** Devolve o nome limpo (sem espaços nas pontas) ou null se for inválido. */
export const validatePlayerName = (raw: string): string | null => {
  const name = raw.trim();
  return PLAYER_NAME_RE.test(name) ? name : null;
};

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** Valida a forma do envio (não a jogada: isso é feito re-executando). */
export const validateSubmission = (body: unknown): ValidationResult => {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'corpo inválido' };
  const b = body as Record<string, unknown>;

  if (typeof b.name !== 'string') return { ok: false, error: 'nome inválido' };
  const name = b.name.trim();
  if (validatePlayerName(name) === null) return { ok: false, error: 'nome inválido' };

  const levelId = typeof b.levelId === 'number' && (LEVELS as readonly number[]).includes(b.levelId) ? b.levelId : null;
  if (levelId === null) return { ok: false, error: 'nível inválido' };
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

  if (typeof b.attemptId !== 'string' || !/^[0-9a-f-]{36}$/.test(b.attemptId)) {
    return { ok: false, error: 'tentativa inválida' };
  }

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
      attemptId: b.attemptId,
      name,
      robotColor: b.robotColor,
      date: b.date,
      time: b.time,
      levelId,
      knowledgeLevel: b.knowledgeLevel,
      language: b.language,
      runs,
    },
  };
};
