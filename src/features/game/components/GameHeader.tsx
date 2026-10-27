import React from 'react';
import { ChevronLeft, Hash, AlertCircle, Undo2, RotateCcw, Pause, Play, Lightbulb, Settings } from 'lucide-react';
import { Tooltip } from '../../../shared/components/Tooltip';
import { TRANSLATIONS } from '../../../shared/i18n/translations';

export type Translations = (typeof TRANSLATIONS)['pt'];

export interface GameHeaderProps {
  t: Translations;
  levelId: number;
  commandCount: number;
  errors: number;
  maxErrors: number;
  boxesCollected: number;
  boxesTotal: number;
  isExecuting: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  victory: boolean;
  undoDisabled: boolean;
  hintsRemaining: number;
  onBack: () => void;
  onUndo: () => void;
  onReset: () => void;
  onPause: () => void;
  onExecuteOrResume: () => void;
  onHint: () => void;
  onSettings: () => void;
}

/** Cabeçalho do nível: estatísticas (tempo, comandos, erros, caixas) e ações. */
export const GameHeader: React.FC<GameHeaderProps> = ({
  t, levelId, commandCount, errors, maxErrors, boxesCollected, boxesTotal,
  isExecuting, isPaused, isGameOver, victory, undoDisabled, hintsRemaining,
  onBack, onUndo, onReset, onPause, onExecuteOrResume, onHint, onSettings,
}) => (
  <header className="bg-brand-navy border-b border-white/10 px-6 py-4 flex items-center justify-between shadow-sm">
    <div className="flex items-center gap-4">
      <button
        aria-label={t.back}
        onClick={onBack}
        className="p-2 hover:bg-brand-navy rounded-lg transition-colors text-brand-ice/80"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <div>
        <h2 className="font-bold text-brand-ice">{t.level} {levelId}</h2>
        <p className="text-xs text-brand-ice/80 font-medium uppercase tracking-wider">{t.challenge}</p>
      </div>
    </div>

    <div className="flex items-center gap-6">
      <div className="text-right hidden sm:block">
        <p className="text-[10px] text-brand-ice/75 uppercase font-bold tracking-widest flex items-center gap-1 justify-end">
          <Hash className="w-3 h-3" />
          {t.commands}
        </p>
        <p className="text-lg font-mono font-bold text-brand-ice/85">{commandCount}</p>
      </div>
      <div className="text-right hidden sm:block" title={t.errorPenaltyHint}>
        <p className="text-[10px] text-brand-ice/75 uppercase font-bold tracking-widest flex items-center gap-1 justify-end">
          <AlertCircle className="w-3 h-3" />
          {t.errorsLabel}
        </p>
        <p className={`text-lg font-mono font-bold ${errors >= maxErrors - 1 ? 'text-red-600' : 'text-brand-ice/85'}`}>
          {errors}/{maxErrors}
        </p>
        {errors === maxErrors - 1 && (
          <p className="text-[10px] font-bold text-red-400">{t.lastErrorWarning}</p>
        )}
      </div>
      <div className="text-right hidden sm:block" aria-live="polite">
        <p className="text-[10px] text-brand-ice/75 uppercase font-bold tracking-widest">{t.boxesLabel}</p>
        <p className="text-lg font-mono font-bold text-brand-ice/85">
          {boxesCollected}/{boxesTotal}
        </p>
      </div>
      <div className="flex gap-2">
        <Tooltip text={t.tooltipUndo} position="bottom">
          <button
            onClick={onUndo}
            disabled={undoDisabled}
            className="flex items-center gap-2 px-4 py-2 text-brand-ice/75 font-semibold hover:bg-brand-navy rounded-xl transition-all disabled:opacity-30"
          >
            <Undo2 className="w-4 h-4" />
            {t.undo}
          </button>
        </Tooltip>
        <Tooltip text={t.tooltipReset} position="bottom">
          <button
            onClick={onReset}
            disabled={isExecuting && !isPaused}
            className="flex items-center gap-2 px-4 py-2 text-brand-ice/75 font-semibold hover:bg-brand-navy rounded-xl transition-all disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            {t.reset}
          </button>
        </Tooltip>
        {isExecuting && !isPaused ? (
          <Tooltip text={t.tooltipPause} position="bottom">
            <button
              onClick={onPause}
              className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all"
            >
              <Pause className="w-4 h-4 fill-current" />
              {t.pause}
            </button>
          </Tooltip>
        ) : (
          <Tooltip text={isPaused ? t.tooltipResume : t.tooltipExecute} position="bottom">
            <button
              onClick={onExecuteOrResume}
              disabled={victory || isGameOver}
              className="flex items-center gap-2 px-6 py-2 bg-brand-blue text-white font-bold rounded-xl shadow-lg shadow-brand-blue/20 hover:bg-brand-blue transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              {isPaused ? t.resume : t.execute}
            </button>
          </Tooltip>
        )}
        <Tooltip text={t.tooltipHint} position="bottom">
          <button
            onClick={onHint}
            disabled={hintsRemaining === 0 || victory}
            className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 font-bold rounded-xl border border-amber-200 hover:bg-amber-100 transition-all disabled:opacity-30"
            title={t.hintsRemaining(hintsRemaining)}
          >
            <Lightbulb className={`w-4 h-4 ${hintsRemaining > 0 ? 'fill-amber-400' : ''}`} />
            <span className="hidden md:inline">{t.hintLabel} ({hintsRemaining})</span>
          </button>
        </Tooltip>
        <Tooltip text={t.tooltipSettings} position="bottom">
          <button
            aria-label={t.tooltipSettings}
            onClick={onSettings}
            className="p-2 hover:bg-brand-navy rounded-xl transition-all text-brand-ice/75"
          >
            <Settings className="w-5 h-5" />
          </button>
        </Tooltip>
      </div>
    </div>
  </header>
);
