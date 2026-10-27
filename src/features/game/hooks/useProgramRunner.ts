import { useCallback, useEffect, useRef, useState } from 'react';
import { GameState, Language, LevelConfig } from '../../../shared/types/game';
import { executeCommand } from '../engine/interpreter';
import {
  createInitialState, parseProgram, compileProgram, compileErrorMessage, hasBoxHere, Instruction,
} from '../engine/program';

export { createInitialState, parseProgram };

export type StepEvent = 'move' | 'turn' | 'pick' | 'step' | 'error' | 'victory' | 'gameover';
type Status = 'idle' | 'running' | 'paused';

interface Snapshot {
  state: GameState;
  pc: number;
}

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
 * Executa o programa uma instrução de cada vez, com limite de erros por tentativa.
 *
 * O programa é compilado antes de começar (ver compileProgram): `repetir` é expandido,
 * por isso aqui só há instruções lineares. Erros de compilação não começam a execução
 * e não contam como erros de jogo.
 *
 * Erros acumulam entre execuções até ao reset do nível. Ao atingir `maxErrors`,
 * `isGameOver` fica verdadeiro e não se pode executar mais até reiniciar.
 */
export function useProgramRunner(
  level: LevelConfig,
  language: Language,
  maxErrors: number,
  onEvent: (event: StepEvent) => void,
  allowLoops = false,
  allowConditionals = false,
) {
  const [state, setState] = useState<GameState>(() => createInitialState(level));
  const [program, setProgram] = useState<Instruction[]>([]);
  // Cada execução iniciada (sem contar retomas): o servidor re-executa-as para validar.
  const [runs, setRuns] = useState<string[][]>([]);
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
    setRuns([]);
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

    const instr = program[pc];
    const id = setTimeout(() => {
      if (instr.kind === 'check') {
        // Teste de se_caixa: não é um comando, não conta e não gasta erros.
        setHistory(h => [...h, { state, pc }]);
        setPc(hasBoxHere(state) ? pc + 1 : instr.skipTo);
        setState({ ...state, currentLine: instr.sourceLine });
        return;
      }
      const next = executeCommand(state, instr.text, language);
      const event = classify(state, next);

      if (!next.error) {
        setHistory(h => [...h, { state, pc }]);
        setPc(pc + 1);
      } else {
        setErrors(e => e + 1);
      }
      // A linha destacada é a do editor (não a instrução expandida).
      setState({ ...next, currentLine: instr.sourceLine });
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

      const compiled = compileProgram(lines, language, { allowLoops, allowConditionals });
      if (compiled.ok === false) {
        setState({
          ...createInitialState(level),
          error: compileErrorMessage(compiled.error, language),
          currentLine: compiled.error.line,
        });
        setStatus('idle');
        return;
      }

      // Cada execução começa o robô de novo; os erros da tentativa mantêm-se.
      setState(createInitialState(level));
      setProgram(compiled.instructions);
      setRuns(r => [...r, lines]);
      setPc(0);
      setHistory([]);
      setStarted(true);
      setStatus('running');
    },
    [status, level, isGameOver, language, allowLoops, allowConditionals],
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
    runs,
    run,
    pause,
    undo,
    reset,
  };
}
