import { useCallback, useEffect, useMemo, useState } from 'react';
import { LevelConfig, LevelMeta } from '../../../shared/types/game';
import { AttemptTicket, fetchAttempt } from '../../leaderboard/leaderboardApi';
import { generateLayout } from '../levels/generator';

/**
 * Ciclo de vida da tentativa de um nível:
 * - pede ao servidor uma tentativa (semente) ao abrir o nível, ao avançar, e ao tentar de novo;
 * - gera o layout com a semente (mesmo gerador do servidor);
 * - controla a janela de conceito, que abre sempre que se entra num nível.
 * Reiniciar não passa por aqui: mantém a tentativa e o layout.
 */
export function useAttempt(levels: LevelMeta[], currentLevelIdx: number) {
  // `round` sobe ao tentar outra vez ou jogar de novo: o layout muda.
  const [round, setRound] = useState(0);
  const [ticket, setTicket] = useState<(AttemptTicket & { levelIdx: number; round: number }) | null>(null);
  const [introOpen, setIntroOpen] = useState(true);

  useEffect(() => {
    setIntroOpen(true);
  }, [currentLevelIdx]);

  useEffect(() => {
    let active = true;
    fetchAttempt(levels[currentLevelIdx].id).then(tk => {
      if (active) setTicket({ ...tk, levelIdx: currentLevelIdx, round });
    });
    return () => {
      active = false;
    };
  }, [currentLevelIdx, round, levels]);

  // Só é válida a tentativa do nível e da rodada atuais; até lá o nível está "a preparar".
  const ready = ticket !== null && ticket.levelIdx === currentLevelIdx && ticket.round === round;
  const seed = ready && ticket ? ticket.seed : 0;

  const level: LevelConfig = useMemo(
    () => ({ ...levels[currentLevelIdx], ...generateLayout(levels[currentLevelIdx].id, seed) }),
    [levels, currentLevelIdx, seed],
  );

  const newAttempt = useCallback(() => setRound(r => r + 1), []);
  const closeIntro = useCallback(() => setIntroOpen(false), []);

  return {
    level,
    round,
    ready,
    /** Id da tentativa no servidor, ou null quando a tentativa é local (sem servidor). */
    attemptId: ready && ticket ? ticket.attemptId : null,
    newAttempt,
    introOpen,
    closeIntro,
  };
}
