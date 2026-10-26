import { LeaderboardEntry } from '../types/game';
import { addEntry, loadLeaderboard, saveLeaderboard } from '../engine/leaderboard';
import { EntryInput } from '../engine/leaderboardRules';

const API_URL = '/api/leaderboard';

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
 * Submete uma vitória. Guarda sempre na cópia local primeiro, para não perder
 * o resultado se a rede falhar. Devolve true se o servidor aceitou.
 */
export const submitEntry = async (entry: EntryInput): Promise<boolean> => {
  saveLeaderboard(addEntry(loadLeaderboard(), { ...entry, id: `local-${Date.now()}` }));
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    return res.ok;
  } catch {
    return false;
  }
};
