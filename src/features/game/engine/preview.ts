import { LayoutConfig, Language, Position, GameState } from '../../../shared/types/game';
import { MAX_RUN_STEPS } from '../../../shared/config/rules';
import { TRANSLATIONS } from '../../../shared/i18n/translations';
import { compileProgram, createInitialState, checkCondition, CompileOptions } from './program';
import { executeCommand, getNextPosition, isWall, isSolidAt } from './interpreter';

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
 * Usa o mesmo compilador, o mesmo motor e as mesmas regras da execução real: uma queda num buraco
 * reinicia o programa do início (cada queda conta como erro) até ao limite de erros do nível.
 */
export const previewPath = (
  layout: LayoutConfig,
  lines: string[],
  lang: Language,
  opts: CompileOptions,
  maxErrors: number = Number.POSITIVE_INFINITY,
): PreviewResult => {
  const compiled = compileProgram(lines, lang, opts);
  if (compiled.ok === false) return { steps: [], stoppedBy: 'compileError' };

  const t = TRANSLATIONS[lang];
  const program = compiled.instructions;
  let state: GameState = createInitialState(layout);
  const steps: PreviewStep[] = [];
  let pc = 0;
  let runSteps = 0;
  let falls = 0;

  const push = (x: number, y: number) => steps.push({ x, y, step: steps.length + 1 });

  // Queda: a casa do buraco entra no caminho, conta um erro e o programa recomeça do início.
  const fall = (hole: Position): PreviewResult | null => {
    push(hole.x, hole.y);
    falls++;
    if (falls >= maxErrors) return { steps, stoppedBy: 'error' };
    state = createInitialState(layout);
    pc = 0;
    return null;
  };

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

    // mover(n): tudo-ou-nada, exceto a queda num buraco, que reinicia o programa.
    const moveN = instr.text.match(new RegExp(`^${t.cmdMoveWord}\\((\\d+)\\)$`));
    if (moveN) {
      const n = Number(moveN[1]);
      const cells: Position[] = [];
      let pos = state.robotPosition;
      let fellAt: Position | null = null;
      for (let i = 0; i < n; i++) {
        const nxt = getNextPosition(pos, state.robotDirection, state.gridSize);
        if (nxt === null || isSolidAt(state, nxt)) {
          // Parede ou borda: a jogada inteira é cancelada (não há passos desta jogada).
          return { steps, stoppedBy: 'error' };
        }
        cells.push(nxt);
        pos = nxt;
        if (isWall(state.holes, nxt)) {
          fellAt = nxt;
          break;
        }
      }
      if (fellAt) {
        // Mostra as casas até ao buraco (a do buraco é registada por fall).
        for (const c of cells.slice(0, -1)) push(c.x, c.y);
        const end = fall(fellAt);
        if (end) return end;
        continue;
      }
      for (const c of cells) push(c.x, c.y);
      state = { ...state, robotPosition: pos, commandCount: state.commandCount + 1 } as GameState;
      pc++;
      continue;
    }

    const next = executeCommand(state, instr.text, lang);
    if (next.fell) {
      const end = fall(next.robotPosition);
      if (end) return end;
      continue;
    }
    if (next.error) return { steps, stoppedBy: 'error' };
    const moved = next.robotPosition.x !== state.robotPosition.x || next.robotPosition.y !== state.robotPosition.y;
    state = next;
    if (moved) push(state.robotPosition.x, state.robotPosition.y);
    pc++;
    if (state.victory) return { steps, stoppedBy: 'victory' };
  }
  return { steps, stoppedBy: 'end' };
};
