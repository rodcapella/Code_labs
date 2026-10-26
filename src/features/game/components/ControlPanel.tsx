import React from 'react';
import { Terminal, Eraser, Gauge, ChevronUp, RotateCcw, RotateCw, Hand } from 'lucide-react';
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
}

/** Painel direito: console (somente leitura), velocidade e paleta de comandos. */
export const ControlPanel: React.FC<ControlPanelProps> = ({
  t, code, isExecuting, currentLine, error, executionSpeed,
  onSpeedChange, onClear, onAddCommand,
}) => {
  const commands = [
    { label: t.cmdMove, icon: <ChevronUp className="w-4 h-4" /> },
    { label: t.cmdLeft, icon: <RotateCcw className="w-4 h-4" /> },
    { label: t.cmdRight, icon: <RotateCw className="w-4 h-4" /> },
    { label: t.cmdPick, icon: <Hand className="w-4 h-4" /> },
  ];

  return (
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

      <div className="bg-brand-ink rounded-2xl p-4 border border-white/10">
        <h4 className="text-xs font-bold text-brand-ice/75 uppercase tracking-widest mb-3">{t.availableCommands}</h4>
        <div className="grid grid-cols-2 gap-2">
          {commands.map(cmd => (
            <button
              key={cmd.label}
              onClick={() => onAddCommand(cmd.label)}
              className="command-btn flex items-center gap-2 bg-brand-navy px-3 py-2 rounded-xl border border-white/10 font-mono text-xs text-brand-ice/85 hover:border-brand-cyan/60 hover:bg-brand-blue/15 transition-all shadow-sm"
            >
              <div className="p-1 bg-brand-ink rounded-md text-brand-ice/75 group-hover:text-brand-blue">
                {cmd.icon}
              </div>
              {cmd.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-brand-ice/75 text-center italic">
          {t.commandPaletteHint}
        </p>
      </div>
    </div>
  );
};
