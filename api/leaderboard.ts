import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import {
  LEADERBOARD_SIZE, LEVEL_IDS, encodeScore, keyFor, validateSubmission,
} from '../src/engine/leaderboardRules';
import { replayAttempt, isTimePlausible } from '../src/engine/replay';
import { LAYOUTS } from '../src/levels/layouts';
import { formatPlayerName } from '../src/engine/leaderboard';
import { scoreOf } from '../src/engine/rules';

/**
 * GET  /api/leaderboard              → top de todos os níveis
 * GET  /api/leaderboard?level=2      → top de um nível
 * POST /api/leaderboard  (JSON)      → submete uma vitória (ver validateSubmission)
 *
 * O POST não aceita comandos ou erros do cliente: re-executa as jogadas com o
 * mesmo motor do jogo e grava o resultado calculado aqui.
 *
 * Credenciais do Redis vêm de variáveis de ambiente do servidor.
 */

const getRedis = (): Redis => Redis.fromEnv();

const clientIp = (req: VercelRequest): string => {
  const fwd = req.headers['x-forwarded-for'];
  const first = Array.isArray(fwd) ? fwd[0] : fwd?.split(',')[0];
  return first?.trim() || 'unknown';
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const redis = getRedis();

    if (req.method === 'GET') {
      const limit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m'), prefix: 'rl:get' });
      const { success } = await limit.limit(clientIp(req));
      if (!success) return res.status(429).json({ error: 'demasiados pedidos' });

      const raw = req.query.level;
      const requested = raw === undefined ? [...LEVEL_IDS] : [Number(raw)];
      if (requested.some(l => !(LEVEL_IDS as readonly number[]).includes(l))) {
        return res.status(400).json({ error: 'nível inválido' });
      }

      const lists = await Promise.all(
        requested.map(levelId => redis.zrange<unknown[]>(keyFor(levelId), 0, LEADERBOARD_SIZE - 1)),
      );
      const entries = lists.flat().map(m => (typeof m === 'string' ? JSON.parse(m) : m));
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ entries });
    }

    if (req.method === 'POST') {
      // Limite de submissões por IP: 5 por minuto.
      const limit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 m'), prefix: 'rl:post' });
      const { success } = await limit.limit(clientIp(req));
      if (!success) return res.status(429).json({ error: 'demasiadas submissões, tenta mais tarde' });

      const parsed = validateSubmission(req.body);
      if (parsed.ok === false) return res.status(400).json({ error: parsed.error });
      const sub = parsed.submission;

      // 1) Re-executar as jogadas com o motor do jogo.
      const replay = replayAttempt(LAYOUTS[sub.levelId], sub.runs, sub.language, sub.knowledgeLevel);
      if (replay.ok === false) return res.status(422).json({ error: replay.reason });

      // 2) O tempo declarado tem de ser possível para os passos executados.
      if (!isTimePlausible(sub.time, replay.steps)) {
        return res.status(422).json({ error: 'tempo impossível para as jogadas enviadas' });
      }

      // 3) Gravar o resultado calculado aqui, nunca o que veio do cliente.
      const entry = {
        id: crypto.randomUUID(),
        name: formatPlayerName(sub.name),
        levelId: sub.levelId,
        commands: replay.commands,
        errors: replay.errors,
        time: sub.time,
        date: sub.date,
        robotColor: sub.robotColor,
      };
      const key = keyFor(sub.levelId);
      await redis.zadd(key, { score: encodeScore(entry), member: JSON.stringify(entry) });
      await redis.zremrangebyrank(key, LEADERBOARD_SIZE, -1);

      return res.status(201).json({ ok: true, score: scoreOf(entry.commands, entry.errors, entry.time) });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'método não permitido' });
  } catch (err) {
    console.error('leaderboard API', err);
    return res.status(500).json({ error: 'erro interno' });
  }
}
