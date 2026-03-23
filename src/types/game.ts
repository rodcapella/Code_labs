export type Language = 'pt' | 'en';

export type Direction = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';

export interface Position {
  x: number;
  y: number;
}

export interface Box {
  id: string;
  position: Position;
  collected: boolean;
}

export interface GameState {
  gridSize: number;
  robotPosition: Position;
  robotDirection: Direction;
  boxes: Box[];
  isExecuting: boolean;
  currentLine: number;
  error: string | null;
  victory: boolean;
  commandCount: number;
}

export interface LevelConfig {
  id: number;
  gridSize: number;
  initialRobotPosition: Position;
  initialRobotDirection: Direction;
  boxes: Position[];
  colors: {
    robot: string;
    box: string;
  };
  hints: string[];
}

export type Command = 'mover()' | 'virar_esquerda()' | 'virar_direita()' | 'pegar()';

export interface LeaderboardEntry {
  id: string;
  name: string;
  levelId: number;
  commands: number;
  time: number;
  date: string;
  robotColor: string;
}
