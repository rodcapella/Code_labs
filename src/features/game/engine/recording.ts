import { GameState, LayoutConfig, Language } from '../../../shared/types/game';
import { MAX_RUN_STEPS } from '../../../shared/config/rules';
import { compileProgram, createInitialState, checkCondition, CompileOptions } from './program';
import { executeCommand } from './interpreter';

/**
 * Estados do tabuleiro ao longo da passagem vencedora, para gerar a animação da solução.
 * Segue as mesmas regras do hook (quedas reiniciam, condições, limite de passos), por isso
 * a animação mostra exatamente o que foi validado no servidor.
 * Devolve [] se o programa não compilar.
 */
export const recordFrames = (
  layout: LayoutConfig,
  lines: string[],
  lang: Language,
  opts: CompileOptions,
): GameState[] => {
  const compiled = compileProgram(lines, lang, opts);
  if (compiled.ok === false) return [];

  const program = compiled.instructions;
  let state = createInitialState(layout);
  const frames: GameState[] = [state];
  let pc = 0;
  let steps = 0;

  while (pc < program.length && steps < MAX_RUN_STEPS) {
    steps++;
    const instr = program[pc];

    if (instr.kind === 'check') {
      pc = checkCondition(state, instr.cond) ? pc + 1 : instr.skipTo;
      continue;
    }
    if (instr.kind === 'jump') {
      pc = instr.target;
      continue;
    }

    const next = executeCommand(state, instr.text, lang);
    if (next.fell) {
      // O robô aparece no buraco; depois a execução reinicia do início.
      frames.push({ ...next, error: null });
      state = createInitialState(layout);
      frames.push(state);
      pc = 0;
      continue;
    }
    if (next.error) break;

    state = next;
    frames.push(state);
    pc++;
    if (state.victory) break;
  }
  return frames;
};
