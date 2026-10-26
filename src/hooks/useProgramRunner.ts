import { useCallback, useEffect, useRef, useState } from 'react';
import { GameState, Language, LevelConfig } from '../types/game';
import { executeCommand } from '../engine/interpreter';

export type StepEvent = 'move' | 'turn' | 'pick' | 'step' | 'error' | 'victory' | 'gameover';
type Status = 'idle' | 'running' | 'paused';

interface Snapshot {
  state: GameState;
  pc: number;
}

export const parseProgram = (code: string): string[] =>
  code.split('\n').map(l => l.trim()).filter(l => l !== '');

export const createInitialState = (level: LevelConfig): GameState => ({
  gridSize: level.gridSize,
  robotPosition: level.initialRobotPosition,
  robotDirection: level.initialRobotDirection,
  boxes: level.boxes.map((p, i) => ({ id: `box-${i}`, position: p, collected: false })),
  currentLine: 0,
  error: null,
  victory: false,
  commandCount: 0,
});

const classify = (prev: GameState, next: GameState): StepEvent => {
  if (next.error) return 'error';
  if (next.victory) return 'victory';
  const picked = next.boxes.filter(b => b.collected).length > prev.boxes.filter(b => b.collected).length;
  if (picked) return 'pick';
  const moved = next.robotPosition.x !== prev.robotPosition.x || next.robotPosition.y !== prev.robotPosition.y;
  if (moved) return 'move';
  if (next.robotDirection !== prev.robotDirection) return 'turn';
  return 'step';
};

/**
 * Executa o programa uma linha de cada vez, com limite de erros por tentativa.
 *
 * Erros acumulam entre execuções até ao reset do nível. Ao atingir `maxErrors`,
 * `isGameOver` fica verdadeiro e não se pode executar mais até reiniciar.
 *
 * O estado de execução fica em React state e cada passo é agendado por um efeito,
 * por isso a velocidade nova aplica-se logo no passo seguinte e não há efeitos
 * colaterais dentro de atualizadores de setState.
 */
export function useProgramRunner(
  level: LevelConfig,
  language: Language,
  maxErrors: number,
  onEvent: (event: StepEvent) => void,
) {
  const [state, setState] = useState<GameState>(() => createInitialState(level));
  const [program, setProgram] = useState<string[]>([]);
  const [pc, setPc] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const [started, setStarted] = useState(false);
  const [speed, setSpeed] = useState(600);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [errors, setErrors] = useState(0);

  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  });

  const isGameOver = errors >= maxErrors;

  const reset = useCallback(() => {
    setState(createInitialState(level));
    setProgram([]);
    setPc(0);
    setStatus('idle');
    setStarted(false);
    setHistory([]);
    setErrors(0);
  }, [level]);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    if (status !== 'running') return;

    if (state.error || state.victory || pc >= program.length) {
      setStatus('idle');
      return;
    }

    const id = setTimeout(() => {
      const next = executeCommand(state, program[pc], language);
      const event = classify(state, next);

      if (!next.error) {
        setHistory(h => [...h, { state, pc }]);
        setPc(pc + 1);
      } else {
        setErrors(e => e + 1);
      }
      setState({ ...next, currentLine: pc });
      onEventRef.current(event);
    }, speed);

    return () => clearTimeout(id);
  }, [status, state, pc, program, speed, language]);

  // Após o último erro permitido, avisa o ecrã (fora de qualquer atualizador).
  const gameOverNotified = useRef(false);
  useEffect(() => {
    if (isGameOver && !gameOverNotified.current) {
      gameOverNotified.current = true;
      onEventRef.current('gameover');
    }
    if (!isGameOver) gameOverNotified.current = false;
  }, [isGameOver]);

  const run = useCallback(
    (code: string) => {
      if (isGameOver || status === 'running') return;
      if (status === 'paused') {
        setStatus('running');
        return;
      }
      const lines = parseProgram(code);
      if (lines.length === 0) return;

      // Cada execução começa o robô de novo; os erros da tentativa mantêm-se.
      setState(createInitialState(level));
      setProgram(lines);
      setPc(0);
      setHistory([]);
      setStarted(true);
      setStatus('running');
    },
    [status, level, isGameOver],
  );

  const pause = useCallback(() => {
    setStatus(s => (s === 'running' ? 'paused' : s));
  }, []);

  const undo = useCallback(() => {
    if (status !== 'idle' || history.length === 0) return;
    const last = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setState(last.state);
    setPc(last.pc);
  }, [status, history]);

  return {
    state,
    errors,
    maxErrors,
    isGameOver,
    isExecuting: status !== 'idle',
    isPaused: status === 'paused',
    started,
    speed,
    setSpeed,
    historyLength: history.length,
    run,
    pause,
    undo,
    reset,
  };
}
