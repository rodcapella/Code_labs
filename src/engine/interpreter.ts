import { GameState, Direction, Position, Language } from '../types/game';
import { TRANSLATIONS } from '../constants/translations';

const DIRECTIONS_LEFT: Direction[] = ['NORTH', 'WEST', 'SOUTH', 'EAST'];
const DIRECTIONS_RIGHT: Direction[] = ['NORTH', 'EAST', 'SOUTH', 'WEST'];

export const samePosition = (a: Position, b: Position): boolean =>
  a.x === b.x && a.y === b.y;

export const getNextPosition = (pos: Position, dir: Direction, gridSize: number): Position | null => {
  let nextX = pos.x;
  let nextY = pos.y;

  switch (dir) {
    case 'NORTH': nextY -= 1; break;
    case 'EAST':  nextX += 1; break;
    case 'SOUTH': nextY += 1; break;
    case 'WEST':  nextX -= 1; break;
  }

  if (nextX < 0 || nextX >= gridSize || nextY < 0 || nextY >= gridSize) {
    return null;
  }

  return { x: nextX, y: nextY };
};

export const rotateLeft = (dir: Direction): Direction =>
  DIRECTIONS_LEFT[(DIRECTIONS_LEFT.indexOf(dir) + 1) % 4];

export const rotateRight = (dir: Direction): Direction =>
  DIRECTIONS_RIGHT[(DIRECTIONS_RIGHT.indexOf(dir) + 1) % 4];

/**
 * Executa um único comando e devolve o novo estado. Função pura: não mantém
 * nada fora do estado devolvido, por isso pode ser testada e chamada sem React.
 *
 * Um comando que falha devolve o estado com `error` preenchido e não conta
 * em `commandCount`.
 */
export const executeCommand = (state: GameState, command: string, lang: Language): GameState => {
  const cmd = command.trim();
  if (!cmd) return state;

  const t = TRANSLATIONS[lang];
  const fail = (error: string): GameState => ({ ...state, error });
  const ok = (patch: Partial<GameState>): GameState => ({
    ...state,
    ...patch,
    error: null,
    commandCount: state.commandCount + 1,
  });

  if (cmd === t.cmdMove) {
    const next = getNextPosition(state.robotPosition, state.robotDirection, state.gridSize);
    return next ? ok({ robotPosition: next }) : fail(t.errorOutOfBounds);
  }

  if (cmd === t.cmdLeft) {
    return ok({ robotDirection: rotateLeft(state.robotDirection) });
  }

  if (cmd === t.cmdRight) {
    return ok({ robotDirection: rotateRight(state.robotDirection) });
  }

  if (cmd === t.cmdPick) {
    const idx = state.boxes.findIndex(
      b => !b.collected && samePosition(b.position, state.robotPosition)
    );
    if (idx === -1) return fail(t.errorNoBox);

    const boxes = state.boxes.map((b, i) => (i === idx ? { ...b, collected: true } : b));
    return ok({ boxes, victory: boxes.every(b => b.collected) });
  }

  return fail(t.errorInvalidCommand(cmd));
};
