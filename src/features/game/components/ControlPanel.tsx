import React from 'react';
import { Terminal, Eraser, Gauge, ChevronUp, RotateCcw, RotateCw, Hand, Repeat, CornerDownLeft, GitBranch, Shield, Route, Hammer } from 'lucide-react';
import { CodeEditor } from './CodeEditor';
import { Tooltip } from '../../../shared/components/Tooltip';
import { Translations } from './GameHeader';

export const SPEED_OPTIONS = [1000, 600, 300] as const;

export interface ControlPanelProps {
  t: Translations;
  code: string;
  isExecuting: boolean;
  currentLine: number;
  error: string | null;
  executionSpeed: number;
  onSpeedChange: (speed: number) => void;
  onClear: () => void;
  onAddCommand: (command: string) => void;
  showLoops: boolean;
  showConditionals: boolean;
  /** mover(n) disponível a partir do nível 2. */
  showMoveN: boolean;
  /** partir() disponível a partir do nível da madeira. */
  showBreak: boolean;
}

const btnBase = 'command-btn flex items-center gap-2 bg-brand-navy px-3 py-2 min-h-10 rounded-xl font-mono text-xs transition-all shadow-sm';
const moveBtn = `${btnBase} border border-white/10 text-brand-ice/85 hover:border-brand-cyan/60 hover:bg-brand-blue/15`;
const loopBtn = `${btnBase} border border-brand-cyan/40 text-brand-cyan hover:bg-brand-blue/15`;
const decisionBtn = `${btnBase} border border-brand-violet/60 text-brand-violet hover:bg-brand-violet/15`;

/**
 * Painel direito: console (somente leitura), velocidade e paleta de comandos.
 * A paleta está dividida em grupos recolhíveis (<details>), para caber em ecrãs pequenos.
 */
export const ControlPanel: React.FC<ControlPanelProps> = ({
  t, code, isExecuting, currentLine, error, executionSpeed,
  onSpeedChange, onClear, onAddCommand, showLoops, showConditionals, showMoveN, showBreak,
}) => (
  <div className="w-full lg:w-[450px] bg-brand-navy border-l border-white/10 p-6 flex flex-col gap-6">
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-4 text-brand-ice/75">
        <Terminal className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-widest">{t.consoleTitle}</span>
        <button
          type="button"
          onClick={onClear}
          disabled={isExecuting || code === ''}
          className="ml-auto flex items-center gap-1 px-3 py-1 text-xs font-bold text-brand-ice/70 hover:text-brand-cyan border border-white/10 rounded-lg transition-all disabled:opacity-30"
        >
          <Eraser className="w-3 h-3" />
          {t.clearCode}
        </button>
      </div>
      <CodeEditor
        code={code}
        isExecuting={isExecuting}
        currentLine={currentLine}
        placeholder={t.placeholder}
        error={error}
      />
    </div>

    <div className="bg-brand-ink rounded-2xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-brand-ice/75 uppercase tracking-widest flex items-center gap-2">
          <Gauge className="w-3 h-3" />
          {t.speedLabel}
        </h4>
        <span className="text-xs font-mono font-bold text-brand-cyan">{(executionSpeed / 1000).toFixed(1)}s</span>
      </div>
      <div className="flex gap-2">
        {SPEED_OPTIONS.map(speed => (
          <Tooltip key={speed} text={t.tooltipSpeed} position="top">
            <button
              onClick={() => onSpeedChange(speed)}
              className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                executionSpeed === speed
                  ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                  : 'bg-brand-navy text-brand-ice/80 border border-white/10 hover:border-brand-cyan/50'
              }`}
            >
              {(speed / 1000).toFixed(1)}s
            </button>
          </Tooltip>
        ))}
      </div>
    </div>

    <div className="bg-brand-ink rounded-2xl p-4 border border-white/10 space-y-3">
      <h4 className="text-xs font-bold text-brand-ice/75 uppercase tracking-widest mb-1">{t.availableCommands}</h4>

      <details open className="group">
        <summary className="cursor-pointer select-none text-[11px] font-bold uppercase tracking-widest text-brand-ice/70 py-1">
          {t.groupMove}
        </summary>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button onClick={() => onAddCommand(t.cmdMove)} className={moveBtn}>
            <ChevronUp className="w-4 h-4" />{t.cmdMove}
          </button>
          <button onClick={() => onAddCommand(t.cmdLeft)} className={moveBtn}>
            <RotateCcw className="w-4 h-4" />{t.cmdLeft}
          </button>
          <button onClick={() => onAddCommand(t.cmdRight)} className={moveBtn}>
            <RotateCw className="w-4 h-4" />{t.cmdRight}
          </button>
          <button onClick={() => onAddCommand(t.cmdPick)} className={moveBtn}>
            <Hand className="w-4 h-4" />{t.cmdPick}
          </button>
          {showBreak && (
            <button onClick={() => onAddCommand(t.cmdBreak)} className={`${moveBtn} text-amber-300 border-amber-400/50`}>
              <Hammer className="w-4 h-4" />{t.cmdBreak}
            </button>
          )}
          {showMoveN && [2, 3, 4].map(n => (
            <button key={n} onClick={() => onAddCommand(t.cmdMoveN(n))} className={`${moveBtn} text-brand-cyan border-brand-blue/50`}>
              <Route className="w-4 h-4" />{t.cmdMoveN(n)}
            </button>
          ))}
        </div>
      </details>

      {showLoops && (
        <details open className="group">
          <summary className="cursor-pointer select-none text-[11px] font-bold uppercase tracking-widest text-brand-ice/70 py-1">
            {t.groupRepeat}
          </summary>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={() => onAddCommand(t.cmdRepeat(2))} className={loopBtn}>
              <Repeat className="w-4 h-4" />{t.cmdRepeat(2)}
            </button>
            <button onClick={() => onAddCommand(t.cmdRepeat(3))} className={loopBtn}>
              <Repeat className="w-4 h-4" />{t.cmdRepeat(3)}
            </button>
          </div>
        </details>
      )}

      {showConditionals && (
        <details open className="group">
          <summary className="cursor-pointer select-none text-[11px] font-bold uppercase tracking-widest text-brand-ice/70 py-1">
            {t.groupDecisions}
          </summary>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={() => onAddCommand(t.cmdIfBox)} className={decisionBtn}>
              <GitBranch className="w-4 h-4" />{t.cmdIfBox}
            </button>
            <button onClick={() => onAddCommand(t.cmdIfWall)} className={decisionBtn}>
              <Shield className="w-4 h-4" />{t.cmdIfWall}
            </button>
            <button onClick={() => onAddCommand(t.cmdElse)} className={decisionBtn}>
              <GitBranch className="w-4 h-4" />{t.cmdElse}
            </button>
            <button onClick={() => onAddCommand(t.cmdWhileFree)} className={decisionBtn}>
              <Repeat className="w-4 h-4" />{t.cmdWhileFree}
            </button>
          </div>
        </details>
      )}

      {(showLoops || showConditionals) && (
        <button onClick={() => onAddCommand(t.cmdBlockEnd)} className={`${loopBtn} w-full justify-center`}>
          <CornerDownLeft className="w-4 h-4" />{t.cmdBlockEnd}
        </button>
      )}

      <p className="mt-1 text-[10px] text-brand-ice/75 text-center italic">{t.commandPaletteHint}</p>
    </div>
  </div>
);
