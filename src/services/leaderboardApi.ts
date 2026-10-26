import { LeaderboardEntry, Language } from '../types/game';
import { addEntry, loadLeaderboard, saveLeaderboard } from '../engine/leaderboard';
import { EntryInput } from '../engine/leaderboardRules';
import { KnowledgeLevel } from '../constants/translations';

const API_URL = '/api/leaderboard';

/** Contexto da tentativa: o servidor valida estas execuções, não o resultado. */
export interface AttemptContext {
  knowledgeLevel: KnowledgeLevel;
  language: Language;
  runs: string[][];
}

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

/**
 * Submete uma vitória para validação no servidor. Guarda sempre uma cópia local
 * (com a pontuação calculada no cliente) para não perder o resultado se a
 * rede falhar. Devolve true só se o servidor aceitou.
 */
export const submitEntry = async (entry: EntryInput, attempt: AttemptContext): Promise<boolean> => {
  saveLeaderboard(addEntry(loadLeaderboard(), { ...entry, id: `local-${Date.now()}` }));
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
    return res.ok;
  } catch {
    return false;
  }
};
