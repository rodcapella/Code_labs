/** Distintivos desbloqueáveis. Os ids são estáveis: são guardados no perfil e na conta. */
export const BADGE_IDS = ['sprint', 'efficiency', 'resilient', 'fidelity'] as const;
export type BadgeId = (typeof BADGE_IDS)[number];

/** Velocista: completar o nível em menos de 30 segundos. */
export const SPRINT_LIMIT_SECONDS = 30;

export interface BadgeEvidence {
  /** Tempo validado pelo servidor (segundos). */
  time: number;
  /** Comandos da passagem vencedora, calculados pelo servidor. */
  commands: number;
  /** Mínimo absoluto de comandos do layout; null se não foi possível calcular. */
  minimumCommands: number | null;
  /** Houve uma queda num buraco ou uma batida numa parede durante a tentativa vencedora. */
  resilient: boolean;
  won: boolean;
}

/**
 * Distintivos ganhos por uma vitória. Função pura, usada no servidor (que verifica as provas)
 * e testável. Sem vitória, não há distintivo. Sem mínimo calculado, não há "Mestre da Eficiência".
 */
export const evaluateBadges = (e: BadgeEvidence): BadgeId[] => {
  if (!e.won) return [];
  const earned: BadgeId[] = [];
  if (e.time < SPRINT_LIMIT_SECONDS) earned.push('sprint');
  if (e.minimumCommands !== null && e.commands === e.minimumCommands) earned.push('efficiency');
  if (e.resilient) earned.push('resilient');
  return earned;
};

export const isBadgeId = (value: unknown): value is BadgeId =>
  typeof value === 'string' && (BADGE_IDS as readonly string[]).includes(value);
