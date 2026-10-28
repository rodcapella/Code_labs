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

/** Metadados do nível (estáticos). O layout (posições) é gerado por partida. */
export interface LevelMeta {
  id: number;
  colors: {
    robot: string;
    box: string;
    /** Cor da grelha deste nível (bordas e tom das células). */
    grid: string;
  };
  /** Dicas por idioma; a lista usada depende da língua do utilizador. */
  hints: Record<Language, string[]>;
  /** Conceito testado neste nível (mostrado numa janela antes de começar). */
  intro: Record<Language, { title: string; body: string[] }>;
  /** Imagem de fundo do nível (URL importada). Opcional. */
  backgroundImage?: string;
}

/** Nível pronto a jogar: metadados mais o layout gerado para esta partida. */
export type LevelConfig = LevelMeta & LayoutConfig;

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
