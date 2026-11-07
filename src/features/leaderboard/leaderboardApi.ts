import { LeaderboardEntry, Language } from '../../shared/types/game';
import { addEntry, loadLeaderboard, saveLeaderboard } from './domain/leaderboard';
import { EntryInput } from './domain/leaderboardRules';
import { KnowledgeLevel } from '../../shared/i18n/translations';
import { randomSeed } from '../game/levels/generator';

const API_URL = '/api/leaderboard';

/** Contexto da tentativa: o servidor valida estas execuções, não o resultado. */
export interface AttemptContext {
  knowledgeLevel: KnowledgeLevel;
  language: Language;
  runs: string[][];
  /** null quando não há servidor: o resultado fica só na cópia local. */
  attemptId: string | null;
}

/** Tentativa: id para submeter e semente que define o layout da partida. */
export interface AttemptTicket {
  attemptId: string | null;
  seed: number;
}

/**
 * Pede ao servidor uma nova tentativa (semente do layout). Sem servidor, usa uma
 * semente local e a partida não pode ser submetida ao ranking.
 */
export const fetchAttempt = async (levelId: number): Promise<AttemptTicket> => {
  try {
    const res = await fetch(`${API_URL}?attempt=${levelId}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { attemptId: string; seed: number };
    return { attemptId: data.attemptId, seed: data.seed };
  } catch {
    return { attemptId: null, seed: randomSeed() };
  }
};

/**
 * Busca o ranking no servidor. Se a API não responder (por exemplo, em
 * `npm run dev` sem `vercel dev`), usa a cópia local.
 */
export const fetchLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  try {
    const res = await fetch(API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { entries: LeaderboardEntry[] };
    saveLeaderboard(data.entries); // cópia local para uso offline
    return data.entries;
  } catch {
    return loadLeaderboard();
  }
};

/** Resposta da submissão: se foi guardada e se entrou no top 10 do nível (null = não sabemos). */
export interface SubmitResult {
  saved: boolean;
  qualified: boolean | null;
}

/**
 * Submete uma vitória para validação no servidor. Guarda sempre uma cópia local
 * (com a pontuação calculada no cliente) para não perder o resultado se a
 * rede falhar. Devolve true só se o servidor aceitou.
 */
export const submitEntry = async (entry: EntryInput, attempt: AttemptContext): Promise<SubmitResult> => {
  saveLeaderboard(addEntry(loadLeaderboard(), { ...entry, id: `local-${Date.now()}` }));
  if (attempt.attemptId === null) return { saved: false, qualified: null }; // sem servidor: não há tentativa para validar
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptId: attempt.attemptId,
        name: entry.name,
        robotColor: entry.robotColor,
        date: entry.date,
        time: entry.time,
        levelId: entry.levelId,
        knowledgeLevel: attempt.knowledgeLevel,
        language: attempt.language,
        runs: attempt.runs,
      }),
    });
    if (!res.ok) return { saved: false, qualified: null };
    const data = (await res.json()) as { qualified?: boolean };
    return { saved: true, qualified: data.qualified === true };
  } catch {
    return { saved: false, qualified: null };
  }
};

/**
 * Pede ao servidor os distintivos desta vitória. Não gasta a tentativa: o resultado pode ser
 * submetido ao ranking depois. Sem servidor (ou se falhar), devolve []: nada é atribuído às cegas.
 */
export const verifyBadges = async (
  entry: { levelId: number; time: number; date: string; robotColor: string },
  attempt: AttemptContext,
): Promise<string[]> => {
  if (attempt.attemptId === null) return [];
  try {
    const res = await fetch(`${API_URL}?action=badges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...entry,
        name: 'AA',
        attemptId: attempt.attemptId,
        knowledgeLevel: attempt.knowledgeLevel,
        language: attempt.language,
        runs: attempt.runs,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { badges?: string[] };
    return Array.isArray(data.badges) ? data.badges : [];
  } catch {
    return [];
  }
};
