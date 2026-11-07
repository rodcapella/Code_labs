import React, { useEffect, useState } from 'react';
import { TRANSLATIONS } from '../../shared/i18n/translations';
import { secondsUntilUtcMidnight } from './dailyRules';

type Translations = (typeof TRANSLATIONS)['pt'];

interface DailyCardProps {
  t: Translations;
  loggedIn: boolean;
  streak: number;
  doneToday: boolean;
  message: string | null;
  onPlay: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const hms = (total: number) => `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;

/** Cartão do desafio diário: contador até à meia-noite UTC, sequência e botão de jogar. */
export const DailyCard: React.FC<DailyCardProps> = ({ t, loggedIn, streak, doneToday, message, onPlay }) => {
  const [seconds, setSeconds] = useState(() => secondsUntilUtcMidnight(new Date()));

  useEffect(() => {
    const id = setInterval(() => setSeconds(secondsUntilUtcMidnight(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  const canPlay = loggedIn && !doneToday;

  return (
    <section aria-labelledby="daily-title" className="rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4 text-center">
      <h2 id="daily-title" className="text-[11px] font-bold uppercase tracking-widest text-amber-200">{t.dailyTitle}</h2>
      <p className="mt-2 text-xs text-brand-ice/80">
        {t.dailyResetsIn} <span className="font-mono font-bold text-brand-ice" aria-live="off">{hms(seconds)}</span>
      </p>
      {loggedIn && streak > 0 && (
        <p className="mt-1 text-xs font-bold text-amber-100">{t.dailyStreak(streak)}</p>
      )}
      {!loggedIn && <p className="mt-2 text-xs text-brand-ice/75">{t.dailyLoginNeeded}</p>}
      {loggedIn && doneToday && <p className="mt-2 text-xs text-brand-ice/75">{t.dailyDone}</p>}
      {message && !doneToday && <p className="mt-2 text-xs text-red-300" role="status">{message}</p>}
      <button
        type="button"
        onClick={onPlay}
        disabled={!canPlay}
        className="mt-3 w-full rounded-xl bg-amber-400 py-2 text-sm font-bold text-brand-ink disabled:opacity-40"
      >
        {t.dailyPlay}
      </button>
    </section>
  );
};
