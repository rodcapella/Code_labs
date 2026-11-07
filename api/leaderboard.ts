import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import {
  LEADERBOARD_SIZE, LEVEL_IDS, encodeScore, keyFor, validateSubmission,
  attemptKey, ATTEMPT_TTL_SECONDS, fitsElapsed,
} from '../src/features/leaderboard/domain/leaderboardRules';
import { replayAttempt, isTimePlausible } from '../src/features/game/engine/replay';
import { generateLayout } from '../src/features/game/levels/generator';
import { formatPlayerName } from '../src/features/leaderboard/domain/leaderboard';
import { scoreOf } from '../src/shared/config/rules';
import {
  resolveAccount, recordResult, addBadges, readStreak, writeStreak, dailyRankingKey, dailyDoneKey,
  dailyAttemptKey, DAILY_TTL_SECONDS, DAILY_TOP_SIZE,
} from '../src/features/auth/server/accounts';
import { generateDailySeed } from '../src/features/daily/server/dailySeed';
import { dailyLevelFor, nextStreak, streakBadges, utcDateString, DAILY_POOLS } from '../src/features/daily/dailyRules';
import type { KnowledgeLevel } from '../src/shared/i18n/translations';
import { evaluateBadges } from '../src/features/badges/badgeRules';
import type { ReplayResult } from '../src/features/game/engine/replay';
import type { Submission } from '../src/features/leaderboard/domain/leaderboardRules';

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


/**
 * Valida a tentativa e re-executa as jogadas. Com `consume`, a tentativa é gasta (uma submissão
 * por tentativa). Sem `consume`, só é lida: serve para verificar distintivos sem gastar o direito
 * de submeter o resultado ao ranking.
 */
type Verified =
  | { ok: true; replay: Extract<ReplayResult, { ok: true }>; record: AttemptRecord }
  | { ok: false; status: number; error: string };

interface AttemptRecord {
  levelId: number;
  seed: number;
  createdAt: number;
  isDaily?: boolean;
  dateStr?: string;
  userId?: string;
}

const verifyAttempt = async (redis: Redis, sub: Submission, consume: boolean): Promise<Verified> => {
  const stored = consume
    ? await redis.getdel<unknown>(attemptKey(sub.attemptId))
    : await redis.get<unknown>(attemptKey(sub.attemptId));
  if (!stored) return { ok: false, status: 422, error: 'tentativa inválida ou expirada' };
  const record = (typeof stored === 'string' ? JSON.parse(stored) : stored) as AttemptRecord;
  if (record.levelId !== sub.levelId) return { ok: false, status: 422, error: 'nível não corresponde à tentativa' };
  // O tempo declarado não pode ser maior do que o tempo real desde que a tentativa começou.
  const elapsed = (Date.now() - Number(record.createdAt)) / 1000;
  if (!fitsElapsed(sub.time, elapsed)) {
    return { ok: false, status: 422, error: 'tempo maior do que o decorrido desde o início da tentativa' };
  }
  // Re-executar as jogadas sobre o layout que o servidor gerou para essa semente.
  const layout = generateLayout(record.levelId, record.seed);
  const replay = replayAttempt(layout, sub.runs, sub.language, sub.knowledgeLevel);
  if (replay.ok === false) return { ok: false, status: 422, error: replay.reason };
  // O tempo declarado tem de ser possível para os passos executados.
  if (!isTimePlausible(sub.time, replay.steps)) {
    return { ok: false, status: 422, error: 'tempo impossível para as jogadas enviadas' };
  }
  return { ok: true, replay, record };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const redis = getRedis();

    if (req.method === 'GET' && req.query.daily === 'true') {
      // Desafio diário: uma tentativa por conta e por dia; o nível depende da semente do dia.
      const account = await resolveAccount(redis, req.headers.cookie);
      if (!account) return res.status(401).json({ error: 'desafio diário: entra na tua conta' });
      const knowledge = typeof req.query.knowledge === 'string' ? req.query.knowledge : '';
      if (!(knowledge in DAILY_POOLS)) return res.status(400).json({ error: 'nível de conhecimento inválido' });
      const today = utcDateString(new Date());
      const top = (await redis.zrange<unknown[]>(dailyRankingKey(today), 0, LEADERBOARD_SIZE - 1))
        .map(m => (typeof m === 'string' ? JSON.parse(m) : m));
      const streak = await readStreak(redis, account.userId);
      res.setHeader('Cache-Control', 'no-store');
      if (await redis.get(dailyDoneKey(today, account.userId))) {
        return res.status(200).json({ alreadyPlayed: true, dateStr: today, leaderboard: top, streak });
      }
      let attemptId = await redis.get<string>(dailyAttemptKey(today, account.userId));
      if (!attemptId) {
        attemptId = crypto.randomUUID();
        const seed = generateDailySeed(today);
        const levelId = dailyLevelFor(seed, knowledge as KnowledgeLevel);
        const record: AttemptRecord = { levelId, seed, createdAt: Date.now(), isDaily: true, dateStr: today, userId: account.userId };
        await redis.set(attemptKey(attemptId), JSON.stringify(record), { ex: DAILY_TTL_SECONDS });
        await redis.set(dailyAttemptKey(today, account.userId), attemptId, { ex: DAILY_TTL_SECONDS });
      }
      const raw = await redis.get<unknown>(attemptKey(attemptId));
      const record = raw ? ((typeof raw === 'string' ? JSON.parse(raw) : raw) as AttemptRecord) : null;
      if (!record) return res.status(410).json({ error: 'tentativa expirou, tenta de novo' });
      return res.status(200).json({
        alreadyPlayed: false, attemptId, dateStr: today, levelId: record.levelId, seed: record.seed, leaderboard: top, streak,
      });
    }

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
        await redis.set(attemptKey(attemptId), JSON.stringify({ levelId, seed, createdAt: Date.now() }), { ex: ATTEMPT_TTL_SECONDS });
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

    if (req.method === 'POST' && req.query.action === 'badges') {
      // Verifica distintivos sem gastar a tentativa (o resultado pode ser submetido depois).
      const limit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 m'), prefix: 'rl:badges' });
      if (!(await limit.limit(clientIp(req))).success) return res.status(429).json({ error: 'demasiados pedidos, tenta mais tarde' });
      // O nome não é usado aqui: a validação exige um, por isso usa-se um placeholder.
      const parsed = validateSubmission({ ...(typeof req.body === 'object' && req.body !== null ? req.body : {}), name: 'AA' });
      if (parsed.ok === false) return res.status(400).json({ error: parsed.error });
      const check = await verifyAttempt(redis, parsed.submission, false);
      if (check.ok === false) return res.status(check.status).json({ error: check.error });
      const badges = evaluateBadges({
        won: true,
        time: parsed.submission.time,
        commands: check.replay.commands,
        minimumCommands: check.replay.minimumCommands,
        resilient: check.replay.resilient,
      });
      const account = await resolveAccount(redis, req.headers.cookie);
      if (account) await addBadges(redis, account.userId, badges);
      return res.status(200).json({ ok: true, badges });
    }

    if (req.method === 'POST') {
      // Limite de submissões por IP: 5 por minuto.
      const limit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 m'), prefix: 'rl:post' });
      const { success } = await limit.limit(clientIp(req));
      if (!success) return res.status(429).json({ error: 'demasiadas submissões, tenta mais tarde' });

      const parsed = validateSubmission(req.body);
      if (parsed.ok === false) return res.status(400).json({ error: parsed.error });
      const sub = parsed.submission;

      // 1-3) Validar e re-executar (consome a tentativa: uma só submissão por tentativa).
      const check = await verifyAttempt(redis, sub, true);
      if (check.ok === false) return res.status(check.status).json({ error: check.error });
      const replay = check.replay;

      // Desafio diário: resultado próprio, uma submissão por conta e por dia.
      if (check.record.isDaily) {
        const dateStr = String(check.record.dateStr);
        const ownerId = String(check.record.userId);
        const owner = await resolveAccount(redis, req.headers.cookie);
        if (!owner || owner.userId !== ownerId) return res.status(403).json({ error: 'este desafio pertence a outra conta' });
        // SET NX: só a primeira submissão do dia conta, mesmo com pedidos simultâneos.
        const first = await redis.set(dailyDoneKey(dateStr, ownerId), '1', { nx: true, ex: 2 * DAILY_TTL_SECONDS });
        if (!first) return res.status(409).json({ error: 'já submeteste o desafio de hoje' });

        const entry = {
          id: crypto.randomUUID(),
          name: formatPlayerName(owner.username),
          levelId: sub.levelId,
          commands: replay.commands,
          errors: replay.errors,
          time: sub.time,
          structureBonus: replay.structureBonus,
          date: sub.date,
          robotColor: sub.robotColor,
        };
        const key = dailyRankingKey(dateStr);
        const member = JSON.stringify(entry);
        await redis.zadd(key, { score: encodeScore(entry), member });
        const rank = await redis.zrank(key, member);
        await redis.zremrangebyrank(key, DAILY_TOP_SIZE, -1);
        const qualified = rank !== null && rank < DAILY_TOP_SIZE;

        // Sequência e conquistas: a conclusão do desafio conta para os dias seguidos.
        const streak = nextStreak(await readStreak(redis, ownerId), dateStr);
        await writeStreak(redis, ownerId, streak);
        const badges = [
          ...evaluateBadges({
            won: true, time: sub.time, commands: replay.commands,
            minimumCommands: replay.minimumCommands, resilient: replay.resilient,
          }),
          ...streakBadges(streak.count),
        ];
        await addBadges(redis, ownerId, badges);
        const score = scoreOf(entry.commands, entry.errors, entry.time, entry.structureBonus);
        return res.status(201).json({
          ok: true, qualified, rank: rank === null ? null : rank + 1, score, streak: streak.count, badges,
        });
      }

      // 4) Gravar o resultado calculado aqui, nunca o que veio do cliente.
      // Com sessão válida, o nome é o da conta (o que o cliente envia é ignorado).
      const account = await resolveAccount(redis, req.headers.cookie);
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

      // Distintivos: provas calculadas aqui (mesmo quando o resultado não entra no top).
      const badges = evaluateBadges({
        won: true,
        time: sub.time,
        commands: replay.commands,
        minimumCommands: replay.minimumCommands,
        resilient: replay.resilient,
      });
      if (account) await addBadges(redis, account.userId, badges);

      if (!qualified) return res.status(200).json({ ok: true, qualified: false, score, badges });
      return res.status(201).json({ ok: true, qualified: true, rank: (rank as number) + 1, score, badges });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'método não permitido' });
  } catch (err) {
    console.error('leaderboard API', err);
    return res.status(500).json({ error: 'erro interno' });
  }
}
