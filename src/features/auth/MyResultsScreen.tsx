import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { fetchResults, AccountResult } from './authApi';
import { ArcadeLoader } from '../../shared/components/ArcadeLoader';
import { scoreOf } from '../../shared/config/rules';

interface MyResultsScreenProps {
  onBack: () => void;
  messages: {
    title: string; back: string; empty: string; loading: string; unavailable: string;
    level: string; points: string; commands: string; errors: string; time: string;
    date: string; status: string; inRanking: string; notInRanking: string; rank: string;
  };
}

/** "Os meus resultados": todas as vitórias da conta (as últimas 100). */
export const MyResultsScreen: React.FC<MyResultsScreenProps> = ({ onBack, messages: m }) => {
  const [results, setResults] = useState<AccountResult[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchResults().then(r => {
      if (!active) return;
      setResults(r);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="relative min-h-screen bg-brand-ink text-brand-ice p-6 brand-page overflow-y-auto">
      {loading && <ArcadeLoader label={m.loading} />}
      <div className="max-w-3xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-xs text-brand-cyan mb-6">
          <ArrowLeft className="w-4 h-4" />{m.back}
        </button>
        <h1 className="text-lg mb-6 brand-glow">{m.title}</h1>
        {!loading && results === null && <p className="text-xs text-red-400">{m.unavailable}</p>}
        {!loading && results !== null && results.length === 0 && <p className="text-xs text-brand-ice/70">{m.empty}</p>}
        {results && results.length > 0 && (
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 gap-3 pb-3 mb-3 border-b-2 border-brand-navy text-[8px] md:text-[10px] text-brand-cyan min-w-[560px]">
              <div>{m.date}</div><div>{m.level}</div><div>{m.points}</div><div>{m.commands}</div><div>{m.errors}</div><div>{m.time}</div><div>{m.status}</div>
            </div>
            {results.map((r, i) => (
              <div key={`${r.createdAt}-${i}`} className="grid grid-cols-7 gap-3 py-2 border-b border-white/10 text-[8px] md:text-xs min-w-[560px]">
                <div>{r.date}</div>
                <div>{r.levelId}</div>
                <div>{scoreOf(r.commands, r.errors, r.time, r.structureBonus ?? 0)}</div>
                <div>{r.commands}</div>
                <div>{r.errors}</div>
                <div>{r.time}s</div>
                <div className={r.qualified ? 'text-emerald-400' : 'text-brand-ice/60'}>
                  {r.qualified ? `${m.inRanking}${r.rank ? ` (${m.rank} ${r.rank})` : ''}` : m.notInRanking}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
