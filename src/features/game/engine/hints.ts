import { GameState, Language } from '../../../shared/types/game';
import { TRANSLATIONS } from '../../../shared/i18n/translations';
import { getNextPosition, isWall } from './interpreter';

/**
 * Dica contextual para o erro de execução atual. Usa o texto do erro para escolher a dica
 * (o motor devolve mensagens traduzidas, não códigos).
 */
export const contextualHint = (error: string, state: GameState, lang: Language): string => {
  const t = TRANSLATIONS[lang];
  if (error === t.errorWall) return t.hintWall;
  if (error === t.errorOutOfBounds) return t.hintEdge;
  if (error === t.errorNoBox) return t.hintNoBox;
  if (error === t.errorLoopLimit) return t.hintLoop;
  if (error === t.errorMoveN) return t.hintMoveN;
  if (error === t.errorHole) return t.hintHole;
  if (error === t.errorBoxOrder) return t.hintBoxOrder;
  if (error === t.errorWood) return t.hintWood;
  if (error === t.errorNoWood) return t.hintNoWood;
  // Qualquer outro erro de comando: o comando não existe nesta versão do jogo.
  void state;
  return t.hintCommand;
};

/** Primeira parede na direção do robô, até 9 casas (para destacar onde o movimento foi travado). */
export const blockedCellAhead = (state: GameState): { x: number; y: number } | null => {
  let pos = state.robotPosition;
  for (let i = 0; i < 9; i++) {
    const next = getNextPosition(pos, state.robotDirection, state.gridSize);
    if (next === null) return null;
    if (isWall(state.walls, next)) return next;
    pos = next;
  }
  return null;
};
