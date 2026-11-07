import crypto from 'node:crypto';

/**
 * Semente do desafio de um dia: 32 bits derivados da data (YYYY-MM-DD). Calculada só no servidor,
 * que a emite com a tentativa. O cliente nunca a recalcula.
 */
export const generateDailySeed = (dateStr: string): number =>
  crypto.createHash('sha256').update(`codebot_daily_${dateStr}`).digest().readUInt32BE(0);
