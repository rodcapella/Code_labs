import { GameState, Direction, Position, Language } from '../types/game';
import { TRANSLATIONS } from '../constants/translations';

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

export const rotateLeft = (dir: Direction): Direction => {
  const dirs: Direction[] = ['NORTH', 'WEST', 'SOUTH', 'EAST'];
  const idx = dirs.indexOf(dir);
  return dirs[(idx + 1) % 4];
};

export const rotateRight = (dir: Direction): Direction => {
  const dirs: Direction[] = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
  const idx = dirs.indexOf(dir);
  return dirs[(idx + 1) % 4];
};

export const executeCommand = (state: GameState, command: string, lang: Language): GameState => {
  const cmd = command.trim();
  if (!cmd) return state;

  const newState = { ...state, commandCount: state.commandCount + 1 };
  const t = TRANSLATIONS[lang];

  if (cmd === t.cmdMove) {
    const nextPos = getNextPosition(newState.robotPosition, newState.robotDirection, newState.gridSize);
    if (!nextPos) {
      return { ...newState, error: t.errorOutOfBounds };
    }
    return { ...newState, robotPosition: nextPos };
  } else if (cmd === t.cmdLeft) {
    return { ...newState, robotDirection: rotateLeft(newState.robotDirection) };
  } else if (cmd === t.cmdRight) {
    return { ...newState, robotDirection: rotateRight(newState.robotDirection) };
  } else if (cmd === t.cmdPick) {
    const boxIndex = newState.boxes.findIndex(
      b => !b.collected && b.position.x === newState.robotPosition.x && b.position.y === newState.robotPosition.y
    );

    if (boxIndex === -1) {
      return { ...newState, error: t.errorNoBox };
    }

    const newBoxes = [...newState.boxes];
    newBoxes[boxIndex] = { ...newBoxes[boxIndex], collected: true };
    
    const allCollected = newBoxes.every(b => b.collected);
    return { ...newState, boxes: newBoxes, victory: allCollected };
  } else {
    return { ...newState, error: t.errorInvalidCommand(cmd) };
  }
};
