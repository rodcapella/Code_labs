import { KnowledgeLevel } from '../constants/translations';

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
