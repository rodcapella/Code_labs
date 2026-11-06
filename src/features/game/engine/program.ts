import { GameState, LayoutConfig, Language } from '../../../shared/types/game';
import { TRANSLATIONS } from '../../../shared/i18n/translations';
import { MAX_INSTRUCTIONS, MAX_REPEAT } from '../../../shared/config/rules';
import { getNextPosition, isSolidAt } from './interpreter';

/** Linhas do programa, sem espaços e sem linhas vazias. */
export const parseProgram = (code: string): string[] =>
  code.split('\n').map(l => l.trim()).filter(l => l !== '');

export const createInitialState = (layout: LayoutConfig): GameState => ({
  gridSize: layout.gridSize,
  robotPosition: layout.initialRobotPosition,
  robotDirection: layout.initialRobotDirection,
  boxes: layout.boxes.map((p, i) => ({ id: `box-${i}`, position: p, collected: false })),
  walls: layout.walls,
  holes: layout.holes,
  wood: layout.wood,
  portals: layout.portals ?? [],
  currentLine: 0,
  error: null,
  victory: false,
  commandCount: 0,
});

/**
 * Condições de teste:
 * - `box`: há caixa por recolher na casa atual (se_caixa).
 * - `room`: a casa à frente está livre (enquanto_livre).
 * - `blocked`: a casa à frente é borda ou parede (se_parede).
 */
export type Condition = 'box' | 'room' | 'blocked';

/**
 * Instruções executáveis, já expandidas.
 * - `cmd`: um comando do motor (mover, virar, pegar, mover(n)).
 * - `check`: se a condição for falsa, salta para `skipTo`.
 * - `jump`: salto incondicional (volta ao teste do enquanto, ou fim do bloco "se" antes do "senao").
 */
export type Instruction =
  | { kind: 'cmd'; text: string; sourceLine: number }
  | { kind: 'check'; cond: Condition; sourceLine: number; skipTo: number }
  | { kind: 'jump'; target: number; sourceLine: number };

export type CompileError =
  | { reason: 'unclosed'; line: number }
  | { reason: 'unexpectedEnd'; line: number }
  | { reason: 'repeatCount'; line: number }
  | { reason: 'loopsNotAllowed'; line: number }
  | { reason: 'conditionalNotAllowed'; line: number }
  | { reason: 'elseWithoutIf'; line: number }
  | { reason: 'tooLong'; line: number };

export type CompileResult =
  | { ok: true; instructions: Instruction[] }
  | { ok: false; error: CompileError };

export interface CompileOptions {
  allowLoops: boolean;
  allowConditionals: boolean;
}

type Node =
  | { kind: 'cmd'; text: string; sourceLine: number }
  | { kind: 'if'; cond: 'box' | 'blocked'; sourceLine: number; body: Node[]; elseBody?: Node[] }
  | { kind: 'while'; sourceLine: number; body: Node[] };

type Block =
  | { ok: true; nodes: Node[]; next: number; size: number }
  | { ok: false; error: CompileError };

/**
 * Compila as linhas do editor em instruções lineares.
 * - `repetir(n) { ... }` é expandido aqui (n cópias do corpo): não depende do estado.
 * - `se_caixa` / `se_parede` com `senao { ... }` e `enquanto_livre() { ... }` dependem do estado:
 *   viram instruções `check` e `jump`, decididas durante a execução.
 * - `senao` só existe logo depois de um bloco `se` (se_caixa ou se_parede).
 */
export const compileProgram = (rawLines: string[], lang: Language, opts: CompileOptions): CompileResult => {
  const t = TRANSLATIONS[lang];
  const lines = rawLines.map(l => l.trim()).filter(l => l !== '');
  const repeatRe = new RegExp(`^${t.cmdRepeatWord}\\((\\d+)\\)\\s*\\{$`);

  const block = (start: number, openLine: number | null): Block => {
    const nodes: Node[] = [];
    let size = 0;
    let i = start;
    const fail = (reason: CompileError['reason'], line: number): Block => ({ ok: false, error: { reason, line } });

    while (i < lines.length) {
      const line = lines[i];

      if (line === t.cmdBlockEnd) {
        if (openLine === null) return fail('unexpectedEnd', i);
        return { ok: true, nodes, next: i + 1, size };
      }

      const rep = line.match(repeatRe);
      if (rep) {
        if (!opts.allowLoops) return fail('loopsNotAllowed', i);
        const n = Number(rep[1]);
        if (n < 1 || n > MAX_REPEAT) return fail('repeatCount', i);
        const sub = block(i + 1, i);
        if (sub.ok === false) return sub;
        for (let k = 0; k < n; k++) {
          nodes.push(...sub.nodes);
          size += sub.size;
          if (size > MAX_INSTRUCTIONS) return fail('tooLong', i);
        }
        i = sub.next;
        continue;
      }

      if (line === t.cmdIfBox || line === t.cmdIfWall) {
        if (!opts.allowConditionals) return fail('conditionalNotAllowed', i);
        const sub = block(i + 1, i);
        if (sub.ok === false) return sub;
        const node: Node & { kind: 'if' } = {
          kind: 'if',
          cond: line === t.cmdIfBox ? 'box' : 'blocked',
          sourceLine: i,
          body: sub.nodes,
        };
        size += 1 + sub.size;
        let next = sub.next;
        // "senao" tem de vir logo depois do "}" do bloco "se".
        // Só depois de se_caixa (decisão: o senao não existe após se_parede).
        if (node.cond === 'box' && lines[next] === t.cmdElse) {
          const elseSub = block(next + 1, next);
          if (elseSub.ok === false) return elseSub;
          node.elseBody = elseSub.nodes;
          size += 1 + elseSub.size;
          next = elseSub.next;
        }
        if (size > MAX_INSTRUCTIONS) return fail('tooLong', i);
        nodes.push(node);
        i = next;
        continue;
      }

      if (line === t.cmdWhileFree) {
        if (!opts.allowConditionals) return fail('conditionalNotAllowed', i);
        const sub = block(i + 1, i);
        if (sub.ok === false) return sub;
        nodes.push({ kind: 'while', sourceLine: i, body: sub.nodes });
        size += 2 + sub.size; // teste + salto de volta
        if (size > MAX_INSTRUCTIONS) return fail('tooLong', i);
        i = sub.next;
        continue;
      }

      if (line === t.cmdElse) return fail('elseWithoutIf', i);

      nodes.push({ kind: 'cmd', text: line, sourceLine: i });
      size += 1;
      if (size > MAX_INSTRUCTIONS) return fail('tooLong', i);
      i++;
    }

    if (openLine !== null) return fail('unclosed', openLine);
    return { ok: true, nodes, next: i, size };
  };

  const result = block(0, null);
  if (result.ok === false) return { ok: false, error: result.error };

  // Linearização: os saltos ficam com índices absolutos.
  const out: Instruction[] = [];
  const emit = (nodes: Node[]) => {
    for (const n of nodes) {
      if (n.kind === 'cmd') {
        out.push({ kind: 'cmd', text: n.text, sourceLine: n.sourceLine });
      } else if (n.kind === 'if') {
        const check: Instruction & { kind: 'check' } = { kind: 'check', cond: n.cond, sourceLine: n.sourceLine, skipTo: 0 };
        out.push(check);
        emit(n.body);
        if (n.elseBody) {
          const jump: Instruction & { kind: 'jump' } = { kind: 'jump', target: 0, sourceLine: n.sourceLine };
          out.push(jump);
          check.skipTo = out.length; // o "senao" começa aqui
          emit(n.elseBody);
          jump.target = out.length;
        } else {
          check.skipTo = out.length;
        }
      } else {
        // enquanto: teste -> corpo -> salto de volta ao teste
        const start = out.length;
        const check: Instruction & { kind: 'check' } = { kind: 'check', cond: 'room', sourceLine: n.sourceLine, skipTo: 0 };
        out.push(check);
        emit(n.body);
        out.push({ kind: 'jump', target: start, sourceLine: n.sourceLine });
        check.skipTo = out.length;
      }
    }
  };
  emit(result.nodes);
  return { ok: true, instructions: out };
};

/** Mensagem de erro de compilação, no idioma do utilizador. */
export const compileErrorMessage = (error: CompileError, lang: Language): string => {
  const t = TRANSLATIONS[lang];
  switch (error.reason) {
    case 'unclosed': return t.errorRepeatUnclosed;
    case 'unexpectedEnd': return t.errorUnexpectedEnd;
    case 'repeatCount': return t.errorRepeatCount;
    case 'loopsNotAllowed': return t.errorLoopsNotAllowed;
    case 'conditionalNotAllowed': return t.errorConditionalNotAllowed;
    case 'elseWithoutIf': return t.errorElseWithoutIf;
    case 'tooLong': return t.errorProgramTooLong;
  }
};

/** Verdadeiro se há uma caixa por recolher na posição do robô. */
export const hasBoxHere = (state: GameState): boolean =>
  state.boxes.some(
    b => !b.collected && b.position.x === state.robotPosition.x && b.position.y === state.robotPosition.y,
  );

/** Verdadeiro se a casa à frente existe e não é parede. */
export const hasRoomAhead = (state: GameState): boolean => {
  const next = getNextPosition(state.robotPosition, state.robotDirection, state.gridSize);
  return next !== null && !isSolidAt(state, next);
};

/** Avalia uma condição de teste sobre o estado. Usada pelo hook e pelo servidor. */
export const checkCondition = (state: GameState, cond: Condition): boolean => {
  if (cond === 'box') return hasBoxHere(state);
  if (cond === 'room') return hasRoomAhead(state);
  return !hasRoomAhead(state); // blocked: borda ou parede
};
