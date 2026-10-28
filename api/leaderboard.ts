import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import {
  LEADERBOARD_SIZE, LEVEL_IDS, encodeScore, keyFor, validateSubmission,
  attemptKey, ATTEMPT_TTL_SECONDS,
} from '../src/features/leaderboard/domain/leaderboardRules';
import { replayAttempt, isTimePlausible } from '../src/features/game/engine/replay';
import { generateLayout } from '../src/features/game/levels/generator';
import { formatPlayerName } from '../src/features/leaderboard/domain/leaderboard';
import { scoreOf } from '../src/shared/config/rules';
import { resolveAccount, recordResult } from '../src/features/auth/server/accounts';

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

      // Nova tentativa: o servidor escolhe a semente, o cliente não.
      if (req.query.attempt !== undefined) {
        const levelId = Number(req.query.attempt);
        if (!(LEVEL_IDS as readonly number[]).includes(levelId)) {
          return res.status(400).json({ error: 'nível inválido' });
        }
        const attemptId = crypto.randomUUID();
        const seed = crypto.getRandomValues(new Uint32Array(1))[0];
        await redis.set(attemptKey(attemptId), JSON.stringify({ levelId, seed }), { ex: ATTEMPT_TTL_SECONDS });
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({ attemptId, levelId, seed });
      }

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

      // 1) Consumir a tentativa (uma só submissão por tentativa) e recuperar a semente.
      const stored = await redis.getdel<unknown>(attemptKey(sub.attemptId));
      if (!stored) return res.status(422).json({ error: 'tentativa inválida ou expirada' });
      const record = (typeof stored === 'string' ? JSON.parse(stored) : stored) as { levelId: number; seed: number };
      if (record.levelId !== sub.levelId) return res.status(422).json({ error: 'nível não corresponde à tentativa' });

      // 2) Re-executar as jogadas sobre o layout que o servidor gerou para essa semente.
      const layout = generateLayout(record.levelId, record.seed);
      const replay = replayAttempt(layout, sub.runs, sub.language, sub.knowledgeLevel);
      if (replay.ok === false) return res.status(422).json({ error: replay.reason });

      // 3) O tempo declarado tem de ser possível para os passos executados.
      if (!isTimePlausible(sub.time, replay.steps)) {
        return res.status(422).json({ error: 'tempo impossível para as jogadas enviadas' });
      }

      // 4) Gravar o resultado calculado aqui, nunca o que veio do cliente.
      // Com sessão válida, o nome é o da conta (o que o cliente envia é ignorado).
      const account = await resolveAccount(redis, req.headers.cookie, process.env.AUTH_SECRET);
      const entry = {
        id: crypto.randomUUID(),
        name: formatPlayerName(account ? account.username : sub.name),
        levelId: sub.levelId,
        commands: replay.commands,
        errors: replay.errors,
        time: sub.time,
        structureBonus: replay.structureBonus,
        date: sub.date,
        robotColor: sub.robotColor,
      };
      const key = keyFor(sub.levelId);
      // 5) Decidir se entra no top: grava, vê a posição e retira se ficar fora.
      //    Empates exatos (mesma pontuação e tempo) são desempatados pela ordem do Redis.
      const member = JSON.stringify(entry);
      await redis.zadd(key, { score: encodeScore(entry), member });
      const rank = await redis.zrank(key, member);
      const score = scoreOf(entry.commands, entry.errors, entry.time, entry.structureBonus);

      const qualified = rank !== null && rank < LEADERBOARD_SIZE;
      if (!qualified) await redis.zrem(key, member);
      else await redis.zremrangebyrank(key, LEADERBOARD_SIZE, -1);

      // "Os meus resultados": guarda também os que não entraram, se houver conta.
      if (account) {
        await recordResult(redis, account.userId, {
          levelId: entry.levelId,
          score,
          commands: entry.commands,
          errors: entry.errors,
          time: entry.time,
          date: entry.date,
          structureBonus: entry.structureBonus,
          qualified,
          ...(qualified ? { rank: (rank as number) + 1 } : {}),
          createdAt: new Date().toISOString(),
        });
      }

      if (!qualified) return res.status(200).json({ ok: true, qualified: false, score });
      return res.status(201).json({ ok: true, qualified: true, rank: (rank as number) + 1, score });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'método não permitido' });
  } catch (err) {
    console.error('leaderboard API', err);
    return res.status(500).json({ error: 'erro interno' });
  }
}
