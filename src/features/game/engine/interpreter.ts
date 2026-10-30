import { GameState, Direction, Position, Language } from '../../../shared/types/game';
import { TRANSLATIONS } from '../../../shared/i18n/translations';
import { MAX_MOVE_COUNT } from '../../../shared/config/rules';

const DIRECTIONS_LEFT: Direction[] = ['NORTH', 'WEST', 'SOUTH', 'EAST'];
const DIRECTIONS_RIGHT: Direction[] = ['NORTH', 'EAST', 'SOUTH', 'WEST'];

export const samePosition = (a: Position, b: Position): boolean =>
  a.x === b.x && a.y === b.y;

export const isWall = (walls: Position[], p: Position): boolean =>
  walls.some(w => samePosition(w, p));

/** Casas que bloqueiam o movimento: paredes e madeira. Buracos não bloqueiam (fazem cair). */
export const isSolidAt = (state: GameState, p: Position): boolean =>
  isWall(state.walls, p) || isWall(state.wood, p);

/** Casa à frente dentro da grelha, ou null se for a borda. */
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
 * Executa um comando sobre um estado e devolve o novo estado. Função pura.
 *
 * Um comando que falha devolve o estado com `error` e não conta em `commandCount`.
 * Um `mover(n)` é tudo-ou-nada: se uma das casas for borda ou parede, o robô
 * fica onde estava e a jogada conta como um erro.
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
    fell: false,
    commandCount: state.commandCount + 1,
  });
  const fallInto = (pos: Position): GameState => ({ ...state, robotPosition: pos, error: t.errorHole, fell: true });
  const blockedMessage = (pos: Position): string =>
    isWall(state.wood, pos) ? t.errorWood : t.errorWall;

  const moveN = cmd.match(new RegExp(`^${t.cmdMoveWord}\\((\\d+)\\)$`));
  if (moveN) {
    const n = Number(moveN[1]);
    if (n < 1 || n > MAX_MOVE_COUNT) return fail(t.errorMoveN);
    let pos = state.robotPosition;
    for (let i = 0; i < n; i++) {
      const next = getNextPosition(pos, state.robotDirection, state.gridSize);
      if (next === null) return fail(t.errorOutOfBounds);
      if (isSolidAt(state, next)) return fail(blockedMessage(next));
      if (isWall(state.holes, next)) return fallInto(next);
      pos = next;
    }
    return ok({ robotPosition: pos });
  }

  if (cmd === t.cmdMove) {
    const next = getNextPosition(state.robotPosition, state.robotDirection, state.gridSize);
    if (next === null) return fail(t.errorOutOfBounds);
    if (isSolidAt(state, next)) return fail(blockedMessage(next));
    if (isWall(state.holes, next)) return fallInto(next);
    return ok({ robotPosition: next });
  }

  // partir(): remove a madeira à frente. Conta como comando.
  if (cmd === t.cmdBreak) {
    const ahead = getNextPosition(state.robotPosition, state.robotDirection, state.gridSize);
    if (ahead === null || !isWall(state.wood, ahead)) return fail(t.errorNoWood);
    return ok({ wood: state.wood.filter(w => !samePosition(w, ahead)) });
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
