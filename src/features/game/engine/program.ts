import { GameState, LayoutConfig, Language } from '../../../shared/types/game';
import { TRANSLATIONS } from '../../../shared/i18n/translations';
import { MAX_INSTRUCTIONS, MAX_REPEAT } from '../../../shared/config/rules';
import { getNextPosition } from './interpreter';

/** Linhas do programa, sem espaços e sem linhas vazias. */
export const parseProgram = (code: string): string[] =>
  code.split('\n').map(l => l.trim()).filter(l => l !== '');

export const createInitialState = (layout: LayoutConfig): GameState => ({
  gridSize: layout.gridSize,
  robotPosition: layout.initialRobotPosition,
  robotDirection: layout.initialRobotDirection,
  boxes: layout.boxes.map((p, i) => ({ id: `box-${i}`, position: p, collected: false })),
  currentLine: 0,
  error: null,
  victory: false,
  commandCount: 0,
});

/**
 * Instruções executáveis, já expandidas.
 * - `cmd`: um comando do motor (mover, virar, pegar).
 * - `check`: teste de `se_caixa`. Se não houver caixa por recolher na posição do robô,
 *   a execução salta para `skipTo` (o primeiro passo depois do bloco).
 */
export type Instruction =
  | { kind: 'cmd'; text: string; sourceLine: number }
  /** Teste: se a condição falhar, salta para `skipTo`. `box` = há caixa; `room` = casa à frente livre. */
  | { kind: 'check'; cond: 'box' | 'room'; sourceLine: number; skipTo: number }
  /** Salto incondicional (volta ao teste do `enquanto`). */
  | { kind: 'jump'; target: number; sourceLine: number };

export type CompileError =
  | { reason: 'unclosed'; line: number }
  | { reason: 'unexpectedEnd'; line: number }
  | { reason: 'repeatCount'; line: number }
  | { reason: 'loopsNotAllowed'; line: number }
  | { reason: 'conditionalNotAllowed'; line: number }
  | { reason: 'tooLong'; line: number };

export type CompileResult =
  | { ok: true; instructions: Instruction[] }
  | { ok: false; error: CompileError };

export interface CompileOptions {
  allowLoops: boolean;
  allowConditionals: boolean;
}

/** Nós da árvore do programa antes de linearizar. */
type Node =
  | { kind: 'cmd'; text: string; sourceLine: number }
  | { kind: 'if'; sourceLine: number; body: Node[] }
  | { kind: 'while'; sourceLine: number; body: Node[] };

type Block =
  | { ok: true; nodes: Node[]; next: number; size: number }
  | { ok: false; error: CompileError };

/**
 * Compila as linhas do editor em instruções lineares.
 * - `repetir(n) { ... }` é expandido aqui (n cópias do corpo): não depende do estado.
 * - `se_caixa() { ... }` vira uma instrução `check` com salto: depende do estado, por isso
 *   só é decidido durante a execução.
 * Assim o motor, o undo e a validação no servidor avançam sempre por índice.
 */
export const compileProgram = (rawLines: string[], lang: Language, opts: CompileOptions): CompileResult => {
  const t = TRANSLATIONS[lang];
  const lines = rawLines.map(l => l.trim()).filter(l => l !== '');
  const repeatRe = new RegExp(`^${t.cmdRepeatWord}\\((\\d+)\\)\\s*\\{$`);

  // Tamanho contado depois de expandir: um nó conta 1 e cada cópia de repetir conta.
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

      if (line === t.cmdIfBox || line === t.cmdWhileFree) {
        if (!opts.allowConditionals) return fail('conditionalNotAllowed', i);
        const sub = block(i + 1, i);
        if (sub.ok === false) return sub;
        const kind = line === t.cmdIfBox ? 'if' : 'while';
        nodes.push({ kind, sourceLine: i, body: sub.nodes });
        size += 2 + sub.size; // teste + salto (ou só teste no se)
        if (size > MAX_INSTRUCTIONS) return fail('tooLong', i);
        i = sub.next;
        continue;
      }

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

  // Linearização: os saltos de `se_caixa` ficam com índices absolutos.
  const out: Instruction[] = [];
  const emit = (nodes: Node[]) => {
    for (const n of nodes) {
      if (n.kind === 'cmd') {
        out.push({ kind: 'cmd', text: n.text, sourceLine: n.sourceLine });
      } else if (n.kind === 'if') {
        const check: Instruction = { kind: 'check', cond: 'box', sourceLine: n.sourceLine, skipTo: 0 };
        out.push(check);
        emit(n.body);
        check.skipTo = out.length;
      } else {
        // enquanto: teste -> corpo -> salto de volta ao teste
        const start = out.length;
        const check: Instruction = { kind: 'check', cond: 'room', sourceLine: n.sourceLine, skipTo: 0 };
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
    case 'tooLong': return t.errorProgramTooLong;
  }
};

/** Verdadeiro se a casa à frente do robô existe (dentro da grelha). */
export const hasRoomAhead = (state: GameState): boolean =>
  getNextPosition(state.robotPosition, state.robotDirection, state.gridSize) !== null;

/** Verdadeiro se há uma caixa por recolher na posição do robô. */
export const hasBoxHere = (state: GameState): boolean =>
  state.boxes.some(
    b => !b.collected && b.position.x === state.robotPosition.x && b.position.y === state.robotPosition.y,
  );
