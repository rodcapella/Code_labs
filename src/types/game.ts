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
  /** Índice (0-based) da linha que acabou de ser executada, para destaque no editor. */
  currentLine: number;
  error: string | null;
  victory: boolean;
  /** Número de comandos executados com sucesso. Comandos que falham não contam. */
  commandCount: number;
}

/** Geometria do nível: a parte que o servidor também precisa para validar jogadas. */
export interface LayoutConfig {
  gridSize: number;
  initialRobotPosition: Position;
  initialRobotDirection: Direction;
  boxes: Position[];
}

export interface LevelConfig extends LayoutConfig {
  id: number;
  colors: {
    robot: string;
    box: string;
  };
  /** Dicas por idioma; a lista usada depende da língua do utilizador. */
  hints: Record<Language, string[]>;
  /** Imagem de fundo do nível (URL importada). Opcional. */
  backgroundImage?: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  levelId: number;
  /** Comandos executados com sucesso. */
  commands: number;
  /** Erros cometidos na tentativa vencedora. */
  errors: number;
  time: number;
  date: string;
  robotColor: string;
}
