import { KnowledgeLevel } from '../i18n/translations';

/**
 * Número de erros permitidos por tentativa de nível. Ao atingir o limite,
 * a tentativa termina (game over) e o jogador tem de recomeçar o nível.
 */
export const MAX_ERRORS_BY_LEVEL: Record<KnowledgeLevel, number> = {
  beginner: 10,
  intermediate: 6,
  advanced: 3,
};

/** Cada erro acrescenta este número de comandos à pontuação do ranking. */
export const ERROR_PENALTY = 2;

/** A cada quantos segundos o tempo soma 1 ponto à pontuação. */
export const SECONDS_PER_POINT = 10;

/**
 * Pontuação do ranking (menor é melhor):
 * comandos + penalização por erro + penalização por tempo.
 */
export const scoreOf = (commands: number, errors: number, timeSeconds: number, structureBonus = 0): number =>
  Math.max(
    0,
    commands + errors * ERROR_PENALTY + Math.floor(Math.max(timeSeconds, 0) / SECONDS_PER_POINT) - structureBonus,
  );

/** Duração mínima de um passo: a velocidade mais rápida do jogo. */
export const MIN_STEP_MS = 300;
/** Limites de tamanho do envio, para o servidor não re-executar algo enorme. */
export const MAX_RUNS = 50;
export const MAX_LINES_PER_RUN = 200;
export const MAX_LINE_LENGTH = 40;

/** Níveis existentes. Acrescentar um nível: adicionar aqui, no layout e no ficheiro do nível. */
export const LEVEL_IDS = [1, 2, 3, 4, 5] as const;

/** Limites do compilador de programas (repetir). */
export const MAX_REPEAT = 9;
export const MAX_INSTRUCTIONS = 500;

/** Modo demonstração: sem resultados no nível, o ranking volta ao início após este tempo. */
export const DEMO_RETURN_MS = 5000;

/** Passos máximos de uma execução (proteção contra ciclos enquanto sem fim). */
export const MAX_RUN_STEPS = 1000;

/** Desconto na pontuação por cada tipo de estrutura (repetir, se, enquanto) usado na vitória. */
export const STRUCTURE_BONUS = 3;
