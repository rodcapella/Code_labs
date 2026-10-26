import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';
import {
  LEADERBOARD_SIZE, LEVEL_IDS, encodeScore, keyFor, validateEntry,
} from '../src/engine/leaderboardRules';

/**
 * GET  /api/leaderboard              → top de todos os níveis
 * GET  /api/leaderboard?level=2      → top de um nível
 * POST /api/leaderboard  (JSON)      → submete uma vitória
 *
 * Credenciais do Redis vêm de variáveis de ambiente do servidor
 * (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN), nunca do cliente.
 */

const getRedis = (): Redis => Redis.fromEnv();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const redis = getRedis();

    if (req.method === 'GET') {
      const raw = req.query.level;
      const requested = raw === undefined ? [...LEVEL_IDS] : [Number(raw)];
      if (requested.some(l => !(LEVEL_IDS as readonly number[]).includes(l))) {
        return res.status(400).json({ error: 'nível inválido' });
      }

      const lists = await Promise.all(
        requested.map(levelId =>
          redis.zrange<unknown[]>(keyFor(levelId), 0, LEADERBOARD_SIZE - 1),
        ),
      );

      // O Upstash pode devolver membros já desserializados ou como string.
      const entries = lists.flat().map(m => (typeof m === 'string' ? JSON.parse(m) : m));
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ entries });
    }

    if (req.method === 'POST') {
      const result = validateEntry(req.body);
      if (result.ok === false) {
        return res.status(400).json({ error: result.error });
      }

      const entry = result.entry;
      const key = keyFor(entry.levelId);
      const member = JSON.stringify({ ...entry, id: crypto.randomUUID() });

      await redis.zadd(key, { score: encodeScore(entry), member });
      // Mantém só os melhores LEADERBOARD_SIZE (rank 0 = melhor).
      await redis.zremrangebyrank(key, LEADERBOARD_SIZE, -1);

      return res.status(201).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'método não permitido' });
  } catch (err) {
    console.error('leaderboard API', err);
    return res.status(500).json({ error: 'erro interno' });
  }
}
