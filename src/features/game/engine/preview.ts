import { LayoutConfig, Language, Position, GameState } from '../../../shared/types/game';
import { MAX_RUN_STEPS } from '../../../shared/config/rules';
import { TRANSLATIONS } from '../../../shared/i18n/translations';
import { compileProgram, createInitialState, checkCondition, CompileOptions } from './program';
import { executeCommand, getNextPosition, isWall } from './interpreter';

export interface PreviewStep {
  x: number;
  y: number;
  /** Ordem da visita (1 = primeira casa depois do início). */
  step: number;
}

export interface PreviewResult {
  /** Casas visitadas, por ordem, sem contar a posição inicial. */
  steps: PreviewStep[];
  /** Motivo de paragem, se a execução não chegou ao fim do programa. */
  stoppedBy: 'end' | 'victory' | 'error' | 'loopLimit' | 'compileError';
}

/**
 * Simula o programa sem o executar no ecrã: mostra a ordem das casas que o robô visitaria.
 * Usa o mesmo compilador, o mesmo motor e o mesmo limite de passos que a execução real.
 */
export const previewPath = (
  layout: LayoutConfig,
  lines: string[],
  lang: Language,
  opts: CompileOptions,
): PreviewResult => {
  const compiled = compileProgram(lines, lang, opts);
  if (compiled.ok === false) return { steps: [], stoppedBy: 'compileError' };

  const program = compiled.instructions;
  let state = createInitialState(layout);
  const steps: PreviewStep[] = [];
  let pc = 0;
  let runSteps = 0;

  while (pc < program.length) {
    if (++runSteps > MAX_RUN_STEPS) return { steps, stoppedBy: 'loopLimit' };
    const instr = program[pc];

    if (instr.kind === 'check') {
      pc = checkCondition(state, instr.cond) ? pc + 1 : instr.skipTo;
      continue;
    }
    if (instr.kind === 'jump') {
      pc = instr.target;
      continue;
    }

    // mover(n): tudo-ou-nada. Mostra cada casa do caminho; se uma for parede/borda, a jogada falha.
    const moveN = instr.text.match(new RegExp(`^${TRANSLATIONS[lang].cmdMoveWord}\\((\\d+)\\)$`));
    if (moveN) {
      const n = Number(moveN[1]);
      const cells: Position[] = [];
      let pos = state.robotPosition;
      for (let i = 0; i < n; i++) {
        const nxt = getNextPosition(pos, state.robotDirection, state.gridSize);
        if (nxt === null || isWall(state.walls, nxt)) return { steps, stoppedBy: 'error' };
        cells.push(nxt);
        pos = nxt;
      }
      for (const c of cells) steps.push({ x: c.x, y: c.y, step: steps.length + 1 });
      state = { ...state, robotPosition: pos, commandCount: state.commandCount + 1 } as GameState;
      pc++;
      continue;
    }

    const next = executeCommand(state, instr.text, lang);
    if (next.error) return { steps, stoppedBy: 'error' };
    const moved = next.robotPosition.x !== state.robotPosition.x || next.robotPosition.y !== state.robotPosition.y;
    state = next;
    if (moved) {
      const p: Position = state.robotPosition;
      steps.push({ x: p.x, y: p.y, step: steps.length + 1 });
    }
    pc++;
    if (state.victory) return { steps, stoppedBy: 'victory' };
  }
  return { steps, stoppedBy: 'end' };
};
