import { useCallback, useEffect, useRef, useState } from 'react';
import { Language } from '../../../shared/types/game';
import { TRANSLATIONS } from '../../../shared/i18n/translations';
import { playBeepBoopSound } from '../../../shared/utils/audio';

export type RobotMood = 'idle' | 'success' | 'error' | 'victory';

/**
 * Avisos do ecrã de jogo: a fala do robô (uma frase escolhida ao acaso, desaparece em 3 s)
 * e o aviso breve de queda num buraco (desaparece em 2 s).
 */
export function useAvisos(lang: Language) {
  const [robotMessage, setRobotMessage] = useState('');
  const [fallNotice, setFallNotice] = useState(false);
  const robotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (robotTimer.current) clearTimeout(robotTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!fallNotice) return;
    const id = setTimeout(() => setFallNotice(false), 2000);
    return () => clearTimeout(id);
  }, [fallNotice]);

  const speak = useCallback((type: RobotMood) => {
    const t = TRANSLATIONS[lang];
    const messages = t[`robot${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof t] as string[];
    if (messages && messages.length > 0) {
      const msg = messages[Math.floor(Math.random() * messages.length)];
      setRobotMessage(msg);
      playBeepBoopSound();
      if (robotTimer.current) clearTimeout(robotTimer.current);
      robotTimer.current = setTimeout(() => setRobotMessage(''), 3000);
    }
  }, [lang]);

  const showFall = useCallback(() => setFallNotice(true), []);

  return { robotMessage, fallNotice, speak, showFall };
}
