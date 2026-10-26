import { GameState, LayoutConfig } from '../../../shared/types/game';

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
