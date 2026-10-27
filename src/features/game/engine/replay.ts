import { LayoutConfig, Language } from '../../../shared/types/game';
import { executeCommand } from './interpreter';
import { createInitialState, compileProgram, hasBoxHere } from './program';
import { MAX_ERRORS_BY_LEVEL, MIN_STEP_MS } from '../../../shared/config/rules';
import { KnowledgeLevel } from '../../../shared/i18n/translations';

export type ReplayResult =
  | { ok: true; commands: number; errors: number; steps: number }
  | { ok: false; reason: string };

/** Funcionalidades disponíveis por nível de conhecimento (espelha o cliente). */
export const featuresFor = (knowledgeLevel: KnowledgeLevel) => ({
  allowLoops: knowledgeLevel !== 'beginner',
  allowConditionals: knowledgeLevel === 'advanced',
});

/**
 * Re-executa as execuções de uma tentativa com o mesmo motor do jogo e
 * devolve o resultado calculado pelo servidor (nunca o que o cliente diz).
 *
 * Regras (espelham o hook do jogo):
 *  - cada execução começa do estado inicial do nível;
 *  - um teste `se_caixa` não é comando: não conta, não gasta erros, mas conta como passo;
 *  - uma linha com erro termina a execução e conta 1 erro;
 *  - a vitória termina a execução; só a última execução pode vencer;
 *  - a tentativa só é válida se os erros ficarem abaixo do limite do nível.
 */
export const replayAttempt = (
  layout: LayoutConfig,
  runs: string[][],
  language: Language,
  knowledgeLevel: KnowledgeLevel,
): ReplayResult => {
  if (runs.length === 0) return { ok: false, reason: 'sem execuções' };

  const maxErrors = MAX_ERRORS_BY_LEVEL[knowledgeLevel];
  let errors = 0;
  let steps = 0;

  for (let r = 0; r < runs.length; r++) {
    const isLast = r === runs.length - 1;
    // O cliente só regista execuções que compilam; aqui é uma verificação de segurança.
    const compiled = compileProgram(runs[r], language, featuresFor(knowledgeLevel));
    if (compiled.ok === false) return { ok: false, reason: 'programa inválido' };
    const program = compiled.instructions;

    let state = createInitialState(layout);
    let failed = false;
    let won = false;
    let pc = 0;

    while (pc < program.length) {
      const instr = program[pc];
      steps++;

      if (instr.kind === 'check') {
        pc = hasBoxHere(state) ? pc + 1 : instr.skipTo;
        continue;
      }

      const next = executeCommand(state, instr.text, language);
      if (next.error) {
        failed = true;
        break;
      }
      state = next;
      pc++;
      if (state.victory) {
        won = true;
        break;
      }
    }

    if (failed) errors++;
    if (errors >= maxErrors) return { ok: false, reason: 'limite de erros excedido' };

    if (won && !isLast) return { ok: false, reason: 'vitória numa execução anterior' };
    if (isLast) {
      if (!won) return { ok: false, reason: 'a última execução não completa o nível' };
      return { ok: true, commands: state.commandCount, errors, steps };
    }
  }

  return { ok: false, reason: 'sem execuções válidas' };
};

/**
 * O tempo declarado tem de ser possível: cada passo executado leva pelo menos
 * MIN_STEP_MS (o cliente espera a velocidade escolhida entre passos).
 */
export const isTimePlausible = (claimedSeconds: number, steps: number): boolean =>
  claimedSeconds + 1 >= (steps * MIN_STEP_MS) / 1000;
