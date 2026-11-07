import React from 'react';
import { Zap, Target, ShieldCheck, Lock } from 'lucide-react';
import { TRANSLATIONS } from '../../shared/i18n/translations';

type Translations = (typeof TRANSLATIONS)['pt'];

const ICONS = { sprint: Zap, efficiency: Target, resilient: ShieldCheck } as const;

const LABELS = (t: Translations) => ({
  sprint: { name: t.badgeSprint, desc: t.badgeSprintDesc },
  efficiency: { name: t.badgeEfficiency, desc: t.badgeEfficiencyDesc },
  resilient: { name: t.badgeResilient, desc: t.badgeResilientDesc },
});

/** Painel de conquistas do perfil: os três distintivos, desbloqueados ou por desbloquear. */
export const BadgesPanel: React.FC<{ t: Translations; unlocked: string[] }> = ({ t, unlocked }) => {
  const labels = LABELS(t);
  return (
    <section aria-labelledby="badges-title" className="rounded-2xl border border-white/10 bg-brand-navy/60 p-4">
      <h2 id="badges-title" className="text-[11px] font-bold uppercase tracking-widest text-brand-cyan">{t.badgesTitle}</h2>
      <ul className="mt-3 grid grid-cols-3 gap-3">
        {(Object.keys(ICONS) as (keyof typeof ICONS)[]).map(id => {
          const Icon = ICONS[id];
          const on = unlocked.includes(id);
          return (
            <li key={id} className={`flex flex-col items-center gap-1 rounded-xl p-2 text-center ${on ? 'bg-brand-blue/20' : 'bg-brand-ink/60 opacity-60'}`}>
              {on ? <Icon className="w-6 h-6 text-amber-300" aria-hidden="true" /> : <Lock className="w-6 h-6 text-brand-ice/50" aria-hidden="true" />}
              <span className="text-[11px] font-bold text-brand-ice">{labels[id].name}</span>
              <span className="sr-only">{on ? '' : t.badgesLocked}</span>
              <span className="text-[10px] text-brand-ice/70">{labels[id].desc}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

/** Faixa no ecrã de vitória: só os distintivos ganhos nesta vitória. */
export const BadgesStrip: React.FC<{ t: Translations; earned: string[] }> = ({ t, earned }) => {
  if (earned.length === 0) return null;
  const labels = LABELS(t);
  return (
    <div className="rounded-xl border border-amber-300/40 bg-amber-300/10 p-3 text-center" role="status">
      <p className="text-[11px] font-bold uppercase tracking-widest text-amber-200">{t.badgesNew}</p>
      <ul className="mt-2 flex flex-wrap justify-center gap-2">
        {earned.filter(id => id in labels).map(id => {
          const Icon = ICONS[id as keyof typeof ICONS];
          return (
            <li key={id} className="flex items-center gap-1 text-xs font-bold text-amber-100">
              <Icon className="w-4 h-4" aria-hidden="true" />{labels[id as keyof typeof labels].name}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
