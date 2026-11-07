import React from 'react';
import { Lock } from 'lucide-react';
import sprintArt from '../../shared/assets/badges/badge-sprint.png';
import efficiencyArt from '../../shared/assets/badges/badge-efficiency.png';
import resilientArt from '../../shared/assets/badges/badge-resilient.png';
import fidelityArt from '../../shared/assets/badges/badge-fidelity.png';
import { TRANSLATIONS } from '../../shared/i18n/translations';

type Translations = (typeof TRANSLATIONS)['pt'];

const ART = { sprint: sprintArt, efficiency: efficiencyArt, resilient: resilientArt, fidelity: fidelityArt } as const;

const LABELS = (t: Translations) => ({
  sprint: { name: t.badgeSprint, desc: t.badgeSprintDesc },
  efficiency: { name: t.badgeEfficiency, desc: t.badgeEfficiencyDesc },
  resilient: { name: t.badgeResilient, desc: t.badgeResilientDesc },
  fidelity: { name: t.badgeFidelity, desc: t.badgeFidelityDesc },
});

/** Painel de conquistas do perfil: os três distintivos, desbloqueados ou por desbloquear. */
export const BadgesPanel: React.FC<{ t: Translations; unlocked: string[] }> = ({ t, unlocked }) => {
  const labels = LABELS(t);
  return (
    <section aria-labelledby="badges-title" className="rounded-2xl border border-white/10 bg-brand-navy/60 p-4">
      <h2 id="badges-title" className="text-[11px] font-bold uppercase tracking-widest text-brand-cyan">{t.badgesTitle}</h2>
      <ul className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.keys(ART) as (keyof typeof ART)[]).map(id => {
          const on = unlocked.includes(id);
          return (
            <li key={id} className={`flex flex-col items-center gap-1 rounded-xl p-2 text-center ${on ? 'bg-brand-blue/20' : 'bg-brand-ink/60 opacity-60'}`}>
              {on
                ? <img src={ART[id]} alt="" width={48} height={48} className="w-12 h-12" />
                : <span className="relative w-12 h-12 flex items-center justify-center"><img src={ART[id]} alt="" width={48} height={48} className="w-12 h-12 grayscale opacity-30" /><Lock className="absolute w-5 h-5 text-brand-ice/70" aria-hidden="true" /></span>}
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
          return (
            <li key={id} className="flex items-center gap-1 text-xs font-bold text-amber-100">
              <img src={ART[id as keyof typeof ART]} alt="" width={20} height={20} className="w-5 h-5" />{labels[id as keyof typeof labels].name}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
