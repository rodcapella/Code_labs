import { useEffect, useRef, useState, useCallback } from 'react';
import { LevelConfig } from '../../../shared/types/game';
import { UserConfig, TRANSLATIONS } from '../../../shared/i18n/translations';

type Translations = (typeof TRANSLATIONS)['pt'];
import { starsFor } from '../../../shared/config/rules';
import { submitEntry, fetchLeaderboard, verifyBadges, AttemptContext } from '../../leaderboard/leaderboardApi';
import { qualifiesForTop, formatPlayerName } from '../../leaderboard/domain/leaderboard';
import { validatePlayerName } from '../../leaderboard/domain/leaderboardRules';
import { RankingStatus } from '../../leaderboard/RankingNameEntry';
import { structureBonusFor } from '../engine/structures';

type Base = {
  levelId: number;
  commands: number;
  errors: number;
  time: number;
  structureBonus: number;
  date: string;
  robotColor: string;
};

export interface VictoryInput {
  /** true quando a passagem atual recolheu todas as caixas. */
  victory: boolean;
  /** Desafio diário: o nome é pedido sempre e o servidor decide a posição. */
  daily: boolean;
  commandCount: number;
  errors: number;
  timer: number;
  level: LevelConfig;
  runs: string[][];
  /** Id da tentativa no servidor; null quando não há servidor. */
  attemptId: string | null;
  userConfig: UserConfig;
  onUpdateConfig: (patch: Partial<UserConfig>) => void;
  /** Nome da conta com sessão ativa (bloqueia o campo do nome). */
  accountUsername: string | null;
}

/**
 * Tudo o que acontece na vitória: estrelas e progresso (uma vez por vitória), verificação do top
 * e envio do resultado depois de o jogador confirmar o nome.
 */
export function useVictory(input: VictoryInput) {
  const { victory, daily, commandCount, errors, timer, level, runs, attemptId, userConfig, onUpdateConfig, accountUsername } = input;
  const [earnedStars, setEarnedStars] = useState(0);
  const [rankStatus, setRankStatus] = useState<RankingStatus>('checking');
  const [rankName, setRankName] = useState('');
  const [badges, setBadges] = useState<string[]>([]);
  const pendingRef = useRef<{ base: Base; attempt: AttemptContext } | null>(null);
  const savedRef = useRef(false);

  // Vitória: grava progresso e prepara o ranking uma única vez por vitória.
  useEffect(() => {
    if (!victory) {
      savedRef.current = false;
      return;
    }
    if (savedRef.current) return;
    savedRef.current = true;

    // Estrelas: guarda só a melhor classificação do nível.
    const earned = starsFor(commandCount, errors, level.boxes.length, level.gridSize);
    const previous = userConfig.stars?.[level.id] ?? 0;
    onUpdateConfig({
      completedLevels: userConfig.completedLevels.includes(level.id)
        ? userConfig.completedLevels
        : [...userConfig.completedLevels, level.id],
      stars: { ...(userConfig.stars ?? {}), [level.id]: Math.max(previous, earned) },
    });
    setEarnedStars(earned);

    // O resultado só é enviado depois de o jogador confirmar o nome (e só se entrar no top).
    const base: Base = {
      levelId: level.id,
      commands: commandCount,
      errors,
      time: timer,
      structureBonus: structureBonusFor(runs[runs.length - 1] ?? [], userConfig.language),
      date: new Date().toISOString().split('T')[0],
      robotColor: userConfig.robotColor,
    };
    pendingRef.current = {
      base,
      attempt: {
        knowledgeLevel: userConfig.level,
        language: userConfig.language,
        runs,
        attemptId,
      },
    };
    setRankStatus('checking');
    setRankName(accountUsername ?? userConfig.name);
    if (daily) {
      setRankStatus('enter');
    } else {
      fetchLeaderboard().then(list => {
        setRankStatus(qualifiesForTop(list, base) ? 'enter' : 'out');
      });
    }
    // Distintivos: o servidor verifica as provas (tempo, mínimo de comandos, contratempos).
    setBadges([]);
    verifyBadges(
      { levelId: base.levelId, time: base.time, date: base.date, robotColor: base.robotColor },
      { knowledgeLevel: userConfig.level, language: userConfig.language, runs, attemptId },
    ).then(earned => {
      setBadges(earned);
      if (earned.length > 0) {
        const unlocked = new Set([...(userConfig.badges ?? []), ...earned]);
        onUpdateConfig({ badges: [...unlocked] });
      }
    });
    // Dispara apenas na transição para vitória (como antes da extração).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [victory]);

  const confirmRanking = useCallback(async () => {
    const pending = pendingRef.current;
    const name = validatePlayerName(rankName);
    if (!pending || name === null) return;
    setRankStatus('sending');
    const result = await submitEntry({ ...pending.base, name: formatPlayerName(name) }, pending.attempt);
    // Sem servidor não há submissão: o resultado fica na cópia local.
    if (pending.attempt.attemptId === null) setRankStatus('sent');
    else if (result.qualified === true) setRankStatus('sent');
    else if (result.qualified === false) setRankStatus('rejected');
    else setRankStatus('error');
  }, [rankName]);

  return { earnedStars, rankStatus, rankName, setRankName, confirmRanking, badges };
}

/** Textos do bloco de ranking no ecrã de vitória (a partir das traduções). */
export const rankingMessages = (t: Translations) => ({
  checking: t.rankChecking,
  qualify: t.rankQualify,
  out: t.rankOut,
  rejected: t.rankRejected,
  save: t.rankSave,
  sending: t.rankSending,
  sent: t.rankSent,
  error: t.rankError,
  invalid: t.rankInvalid,
});
