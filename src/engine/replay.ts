import { LayoutConfig } from '../types/game';
import { Language } from '../types/game';
import { executeCommand } from './interpreter';
import { createInitialState } from './program';
import { MAX_ERRORS_BY_LEVEL, MIN_STEP_MS } from './rules';
import { KnowledgeLevel } from '../constants/translations';

export type ReplayResult =
  | { ok: true; commands: number; errors: number; steps: number }
  | { ok: false; reason: string };

/**
 * Re-executa as execuções de uma tentativa com o mesmo motor do jogo e
 * devolve o resultado calculado pelo servidor (nunca o que o cliente diz).
 *
 * Regras (espelham o hook do jogo):
 *  - cada execução começa do estado inicial do nível;
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
    let state = createInitialState(layout);
    let failed = false;
    let won = false;

    for (const raw of runs[r]) {
      const line = raw.trim();
      if (!line) continue;
      steps++;
      const next = executeCommand(state, line, language);
      if (next.error) {
        failed = true;
        break;
      }
      state = next;
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
