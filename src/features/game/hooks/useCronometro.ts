import { useCallback, useEffect, useState } from 'react';

/**
 * Cronómetro do nível: conta segundos enquanto `running` é verdadeiro (não pausado, não concluído)
 * e repõe-se a zero quando `resetKey` muda (novo nível ou nova tentativa).
 */
export function useCronometro(running: boolean, resetKey: string) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setSeconds(0);
  }, [resetKey]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const reset = useCallback(() => setSeconds(0), []);
  return { seconds, reset };
}
