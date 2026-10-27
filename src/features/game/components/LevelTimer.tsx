import React from 'react';

interface LevelTimerProps {
  /** Segundos decorridos desde a primeira execução do nível. */
  seconds: number;
  /** true enquanto o nível está a correr (não pausado, não concluído). */
  running: boolean;
  label: string;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Relógio do nível em mm:ss, sobre o tabuleiro. Conta o mesmo tempo que entra no ranking. */
export const LevelTimer: React.FC<LevelTimerProps> = ({ seconds, running, label }) => (
  <div
    role="timer"
    aria-label={`${label}: ${Math.floor(seconds / 60)} min ${seconds % 60} s`}
    className="absolute top-3 left-3 z-20 flex items-center gap-3 px-4 py-2 rounded-xl bg-brand-ink/85 border border-white/15 shadow-lg"
  >
    <span className="text-[10px] uppercase tracking-widest text-brand-ice/70 font-bold">{label}</span>
    <span className="font-mono text-2xl font-bold tabular-nums text-brand-cyan" aria-hidden="true">
      {pad(Math.floor(seconds / 60))}:{pad(seconds % 60)}
    </span>
    <span
      aria-hidden="true"
      className={`h-2.5 w-2.5 rounded-full ${running ? 'bg-emerald-400 animate-pulse' : 'bg-brand-ice/30'}`}
    />
  </div>
);
