import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pause, AlertCircle, Lightbulb } from 'lucide-react';
import { Grid } from './components/Grid';
import { GameHeader } from './components/GameHeader';
import { ArcadeLoader } from '../../shared/components/ArcadeLoader';
import { LevelTimer } from './components/LevelTimer';
import { LevelIntroModal } from './components/LevelIntroModal';
import { Modal } from '../../shared/components/Modal';
import { contextualHint, blockedCellAhead } from './engine/hints';
import { ControlPanel } from './components/ControlPanel';
import { GameOverOverlay } from './components/GameOverOverlay';
import { VictoryOverlay } from './components/VictoryOverlay';
import { CodeEditor } from './components/CodeEditor';
import { Tooltip } from '../../shared/components/Tooltip';
import { Language } from '../../shared/types/game';
import { level1 } from './levels/level1';
import { level2 } from './levels/level2';
import { level3 } from './levels/level3';
import { level4 } from './levels/level4';
import { level5 } from './levels/level5';
import { level6 } from './levels/level6';
import { level7 } from './levels/level7';
import { UserConfig, TRANSLATIONS } from '../../shared/i18n/translations';
import { useProgramRunner, StepEvent } from './hooks/useProgramRunner';
import { submitEntry, fetchAttempt, fetchLeaderboard, AttemptTicket, AttemptContext } from '../leaderboard/leaderboardApi';
import { qualifiesForTop, formatPlayerName } from '../leaderboard/domain/leaderboard';
import { validatePlayerName } from '../leaderboard/domain/leaderboardRules';
import { RankingNameEntry, RankingStatus } from '../leaderboard/RankingNameEntry';
import { structureBonusFor } from './engine/structures';
import { useAccount } from '../auth/AccountContext';
import { generateLayout } from './levels/generator';
import { MAX_ERRORS_BY_LEVEL } from '../../shared/config/rules';
import { playMoveSound, playTurnSound, playPickSound, playErrorSound, playVictorySound, playClickSound, playBeepBoopSound } from '../../shared/utils/audio';

const LEVELS = [level1, level2, level3, level4, level5, level6, level7];

interface GameScreenProps {
  onBack: () => void;
  userConfig: UserConfig;
  onUpdateConfig: (config: Partial<UserConfig>) => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({ onBack, userConfig, onUpdateConfig }) => {
  const t = TRANSLATIONS[userConfig.language];
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  // Cada partida tem uma tentativa: o servidor escolhe a semente, e a semente define o layout.
  // `round` sobe ao tentar outra vez ou jogar de novo, para o layout mudar.
  const [round, setRound] = useState(0);
  // Janela com o conceito do nível: abre sempre que se entra num nível novo.
  const [introOpen, setIntroOpen] = useState(true);
  useEffect(() => {
    setIntroOpen(true);
  }, [currentLevelIdx]);
  const closeIntro = useCallback(() => setIntroOpen(false), []);
  const [ticket, setTicket] = useState<(AttemptTicket & { levelIdx: number; round: number }) | null>(null);
  const ready = ticket !== null && ticket.levelIdx === currentLevelIdx && ticket.round === round;
  const seed = ready && ticket ? ticket.seed : 0;
  const level = useMemo(
    () => ({ ...LEVELS[currentLevelIdx], ...generateLayout(LEVELS[currentLevelIdx].id, seed) }),
    [currentLevelIdx, seed],
  );

  useEffect(() => {
    let active = true;
    fetchAttempt(LEVELS[currentLevelIdx].id).then(tk => {
      if (active) setTicket({ ...tk, levelIdx: currentLevelIdx, round });
    });
    return () => {
      active = false;
    };
  }, [currentLevelIdx, round]);
  const [code, setCode] = useState('');
  const [tutorialStep, setTutorialStep] = useState<number | null>(() => {
    const completed = localStorage.getItem('tutorial_completed');
    return completed ? null : 0;
  });
  const [timer, setTimer] = useState(0);
  const [robotMessage, setRobotMessage] = useState('');

  const getInitialHints = () => {
    const baseHints = level.hints[userConfig.language].length;
    if (userConfig.level === 'beginner') return baseHints;
    if (userConfig.level === 'intermediate') return Math.max(1, Math.floor(baseHints * 0.6));
    return Math.max(0, Math.floor(baseHints * 0.3));
  };

  const [hintsRemaining, setHintsRemaining] = useState(getInitialHints);
  const [activeHint, setActiveHint] = useState<string | null>(null);

  // Timers de dicas e de fala: guardados em refs para poderem ser cancelados.
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const robotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
      if (robotTimer.current) clearTimeout(robotTimer.current);
    };
  }, []);

  // Robot commentary: a fala é escolhida aleatoriamente de uma lista traduzida.
  const speak = (type: 'idle' | 'success' | 'error' | 'victory') => {
    const messages = t[`robot${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof t] as string[];
    if (messages && messages.length > 0) {
      const msg = messages[Math.floor(Math.random() * messages.length)];
      setRobotMessage(msg);
      playBeepBoopSound();
      if (robotTimer.current) clearTimeout(robotTimer.current);
      robotTimer.current = setTimeout(() => setRobotMessage(''), 3000);
    }
  };

  const [bumpKey, setBumpKey] = useState(0);
  const [errorOpen, setErrorOpen] = useState(false);

  // Sons e falas reagem a cada passo da execução, fora de qualquer atualizador de estado.
  const handleStepEvent = (event: StepEvent) => {
    switch (event) {
      case 'error':
        playErrorSound();
        speak('error');
        // Embate do robô e janela com a dica para o erro.
        setBumpKey(k => k + 1);
        setErrorOpen(true);
        break;
      case 'victory':
        playVictorySound();
        speak('victory');
        break;
      case 'pick':
        playPickSound();
        break;
      case 'move':
        playMoveSound();
        break;
      case 'turn':
        playTurnSound();
        break;
    }
    if ((event === 'move' || event === 'turn' || event === 'pick') && Math.random() > 0.7) {
      speak('success');
    }
  };

  const maxErrors = MAX_ERRORS_BY_LEVEL[userConfig.level];
  const allowLoops = userConfig.level !== 'beginner';
  const allowConditionals = userConfig.level === 'advanced';
  const runner = useProgramRunner(level, userConfig.language, maxErrors, handleStepEvent, allowLoops, allowConditionals);
  const {
    state: gameState, errors, isGameOver, isExecuting, isPaused, started,
    speed: executionSpeed, historyLength, runs,
  } = runner;

  useEffect(() => {
    speak('idle');
  }, [currentLevelIdx]);

  // Cronómetro: corre desde a primeira execução até à vitória, pausa com a execução.
  useEffect(() => {
    if (!started || isPaused || gameState.victory) return;
    const id = setInterval(() => setTimer(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [started, isPaused, gameState.victory]);

  // Ao mudar de nível, o hook repõe o robô; aqui repomos o resto do estado da UI.
  useEffect(() => {
    setTimer(0);
    setHintsRemaining(getInitialHints());
    setActiveHint(null);
  }, [currentLevelIdx, round]);

  // Reiniciar: zera o robô, os erros, o tempo e a consola (mantém o layout da tentativa).
  const resetGame = () => {
    runner.reset();
    setErrorOpen(false);
    setCode('');
    setTimer(0);
    setHintsRemaining(getInitialHints());
    setActiveHint(null);
  };

  const nextLevel = () => {
    if (currentLevelIdx < LEVELS.length - 1) {
      setCurrentLevelIdx(prev => prev + 1);
      setCode('');
    } else {
      onBack();
    }
  };

  const undo = () => runner.undo();

  const runCode = () => {
    setErrorOpen(false);
    if (ready) runner.run(code);
  };

  // Nova partida: layout novo (nova tentativa no servidor).
  const newAttempt = () => {
    setRound(r => r + 1);
    setErrorOpen(false);
  };

  const pauseGame = () => {
    runner.pause();
    playClickSound();
  };

  const resumeGame = () => runner.run(code);

  const showHint = () => {
    if (hintsRemaining > 0 && !activeHint) {
      const list = level.hints[userConfig.language];
      const hintIndex = list.length - hintsRemaining;
      setActiveHint(list[hintIndex]);
      setHintsRemaining(prev => prev - 1);
      playClickSound();

      if (hintTimer.current) clearTimeout(hintTimer.current);
      hintTimer.current = setTimeout(() => {
        setActiveHint(null);
      }, 8000);
    }
  };

  // Ranking na vitória: verificar o top, pedir o nome e só então submeter.
  const [rankStatus, setRankStatus] = useState<RankingStatus>('checking');
  const [rankName, setRankName] = useState('');
  const { account } = useAccount();
  const pendingRef = useRef<{
    base: { levelId: number; commands: number; errors: number; time: number; structureBonus: number; date: string; robotColor: string };
    attempt: AttemptContext;
  } | null>(null);

  const confirmRanking = async () => {
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
  };

  // Vitória: grava progresso e ranking uma única vez por vitória.
  const savedRef = useRef(false);
  useEffect(() => {
    if (!gameState.victory) {
      savedRef.current = false;
      return;
    }
    if (savedRef.current) return;
    savedRef.current = true;

    if (!userConfig.completedLevels.includes(level.id)) {
      onUpdateConfig({ completedLevels: [...userConfig.completedLevels, level.id] });
    }

    // O resultado só é enviado depois de o jogador confirmar o nome (e só se entrar no top).
    const base = {
      levelId: level.id,
      commands: gameState.commandCount,
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
        attemptId: ready && ticket ? ticket.attemptId : null,
      },
    };
    setRankStatus('checking');
    setRankName(account ? account.username : userConfig.name);
    fetchLeaderboard().then(list => {
      setRankStatus(qualifiesForTop(list, base) ? 'enter' : 'out');
    });
  }, [gameState.victory]);

  const finishTutorial = () => {
    localStorage.setItem('tutorial_completed', 'true');
    setTutorialStep(null);
    playClickSound();
  };

  const addCommand = (cmd: string) => {
    playClickSound();
    setCode(prev => {
      const lines = prev.split('\n');
      const lastLine = lines[lines.length - 1];
      if (lastLine.trim() === '') {
        return prev + cmd + '\n';
      }
      return prev + '\n' + cmd + '\n';
    });
  };

  const robotColors = [
    { name: t.colorBlue, value: '#3B82F6' },
    { name: t.colorYellow, value: '#EAB308' },
    { name: t.colorGreen, value: '#22C55E' },
    { name: t.colorPink, value: '#EC4899' },
  ];

  return (
    <div
      className="min-h-screen bg-brand-ink flex flex-col bg-cover bg-center bg-fixed"
      style={
        level.backgroundImage
          ? {
              backgroundImage: `linear-gradient(rgba(0,21,71,0.9), rgba(0,21,71,0.96)), url(${level.backgroundImage})`,
            }
          : undefined
      }
    >
      {/* Tutorial Overlay */}
      <AnimatePresence>
        {tutorialStep !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-navy/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-brand-navy rounded-3xl shadow-2xl max-w-md w-full p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-brand-navy">
                <motion.div 
                  className="h-full bg-brand-blue"
                  initial={{ width: 0 }}
                  animate={{ width: `${((tutorialStep + 1) / 8) * 100}%` }}
                />
              </div>

              <h3 className="text-xl font-bold text-brand-ice mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-blue/20 text-brand-cyan text-sm">
                  {tutorialStep + 1}
                </span>
                {t.tutorialTitle}
              </h3>

              <div className="text-brand-ice/75 mb-8 min-h-[80px]">
                {tutorialStep === 0 && <p>{t.tutorialWelcome}</p>}
                {tutorialStep === 1 && (
                  <div className="space-y-4">
                    <p>{t.tutorialLang}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['pt', 'en'] as Language[]).map(lang => (
                        <button
                          key={lang}
                          onClick={() => onUpdateConfig({ language: lang })}
                          className={`py-2 rounded-xl font-bold border-2 transition-all ${
                            userConfig.language === lang 
                              ? 'border-brand-blue bg-brand-blue/15 text-brand-cyan' 
                              : 'border-white/10 text-brand-ice/75'
                          }`}
                        >
                          {lang === 'pt' ? 'Português' : 'English'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {tutorialStep === 2 && (
                  <div className="space-y-4">
                    <p>{t.tutorialRobot}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {robotColors.map(color => (
                        <button
                          key={color.value}
                          onClick={() => onUpdateConfig({ robotColor: color.value })}
                          className={`w-full aspect-square rounded-xl border-4 transition-all ${
                            userConfig.robotColor === color.value 
                              ? 'border-white/15 scale-110' 
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {tutorialStep === 3 && <p>{t.tutorialMove}</p>}
                {tutorialStep === 4 && <p>{t.tutorialPick}</p>}
                {tutorialStep === 5 && <p>{t.tutorialError}</p>}
                {tutorialStep === 6 && <p>{t.tutorialExecute}</p>}
                {tutorialStep === 7 && <p>{t.tutorialFinish}</p>}
              </div>

              <div className="flex gap-3">
                {tutorialStep > 0 && (
                  <button
                    onClick={() => {
                      playClickSound();
                      setTutorialStep(s => s !== null ? s - 1 : null);
                    }}
                    className="flex-1 py-3 bg-brand-navy text-brand-ice/75 font-bold rounded-2xl hover:bg-white/10 transition-all"
                  >
                    {t.back}
                  </button>
                )}
                <button
                  onClick={() => {
                    playClickSound();
                    if (tutorialStep < 7) setTutorialStep(s => s !== null ? s + 1 : null);
                    else finishTutorial();
                  }}
                  className="flex-[2] py-3 bg-brand-blue text-white font-bold rounded-2xl shadow-lg shadow-brand-blue/20 hover:bg-brand-blue transition-all"
                >
                  {tutorialStep < 7 ? t.continue : t.start}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <GameHeader
        t={t}
        levelId={level.id}
        commandCount={gameState.commandCount}
        errors={errors}
        maxErrors={maxErrors}
        boxesCollected={gameState.boxes.filter(b => b.collected).length}
        boxesTotal={gameState.boxes.length}
        isExecuting={isExecuting}
        isPaused={isPaused}
        isGameOver={isGameOver}
        victory={gameState.victory}
        undoDisabled={isExecuting || historyLength === 0 || gameState.victory}
        hintsRemaining={hintsRemaining}
        onBack={() => {
          playClickSound();
          onBack();
        }}
        onUndo={() => {
          playClickSound();
          undo();
        }}
        onReset={() => {
          playClickSound();
          resetGame();
        }}
        onPause={pauseGame}
        onExecuteOrResume={() => {
          playClickSound();
          if (isPaused) resumeGame();
          else runCode();
        }}
        onHint={showHint}
        onSettings={() => {
          playClickSound();
          setTutorialStep(0);
        }}
      />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Grid Area */}
        <div className="flex-1 relative flex items-center justify-center bg-brand-ink/80 backdrop-blur-[2px] p-4 min-h-[400px]">
          {/* Robot Speech Bubble */}
          <AnimatePresence>
            {robotMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className="absolute top-12 left-1/2 -translate-x-1/2 bg-brand-navy text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl z-[60] border-2 border-white/10 flex items-center gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
                {robotMessage}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-brand-navy rotate-45 border-r-2 border-b-2 border-white/10" />
              </motion.div>
            )}
          </AnimatePresence>

          <Grid
            size={gameState.gridSize}
            robotPosition={gameState.robotPosition}
            robotDirection={gameState.robotDirection}
            boxes={gameState.boxes}
            robotColor={userConfig.robotColor}
            boxColor={level.colors.box}
            gridColor={level.colors.grid}
            walls={gameState.walls}
            commandCount={gameState.commandCount}
            bumpKey={bumpKey}
            blockedCell={gameState.error === t.errorWall ? blockedCellAhead(gameState) : null}
            summary={t.boardSummary(
              gameState.robotPosition.x,
              gameState.robotPosition.y,
              t.dirNames[gameState.robotDirection],
              gameState.boxes.filter(b => !b.collected).length,
              gameState.walls.length,
            )}
          />

          {/* Overlays */}
          <AnimatePresence>
            {activeHint && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onClick={() => setActiveHint(null)}
                className="absolute top-8 left-1/2 -translate-x-1/2 z-50 bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl shadow-2xl max-w-md w-full mx-4 cursor-pointer hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-200 rounded-lg text-amber-700">
                    <Lightbulb className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm uppercase tracking-wider mb-1">{t.hintLabel}</h4>
                    <p className="text-amber-800 text-sm leading-relaxed">{activeHint}</p>
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-amber-400 text-right uppercase font-bold tracking-widest">
                  {t.clickToClose}
                </div>
              </motion.div>
            )}

            {isPaused && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 flex items-center justify-center bg-brand-navy/20 backdrop-blur-[2px]"
              >
                <div className="bg-brand-navy/90 px-6 py-3 rounded-2xl shadow-xl border border-white/10 flex items-center gap-3">
                  <Pause className="w-5 h-5 text-amber-500 fill-current" />
                  <span className="font-bold text-brand-ice uppercase tracking-widest text-sm">{t.pause}</span>
                </div>
              </motion.div>
            )}

            {gameState.error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-3 shadow-xl max-w-md w-full mx-4"
              >
                <div className="p-2 bg-red-100 rounded-lg text-red-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <p className="text-red-800 font-medium text-sm">{gameState.error}</p>
              </motion.div>
            )}

            {started && (
              <LevelTimer
                seconds={timer}
                running={!isPaused && !gameState.victory}
                label={t.timeLabel}
              />
            )}
            {introOpen && (
              <LevelIntroModal
                kicker={`${t.level} ${level.id}`}
                title={level.intro[userConfig.language].title}
                body={level.intro[userConfig.language].body}
                closeLabel={t.introStart}
                onClose={closeIntro}
              />
            )}
            {!ready && <ArcadeLoader label={t.preparingLevel} />}
            {errorOpen && !isGameOver && !gameState.victory && gameState.error && (
              <Modal
                kicker={t.errorModalTitle}
                title={gameState.error}
                closeLabel={t.errorModalClose}
                tone="alert"
                onClose={() => setErrorOpen(false)}
              >
                <p>{contextualHint(gameState.error, gameState, userConfig.language)}</p>
              </Modal>
            )}

            {isGameOver && !gameState.victory && (
              <GameOverOverlay
                title={t.gameOverTitle}
                description={t.gameOverDesc(maxErrors)}
                retryLabel={t.retryLevel}
                backLabel={t.back}
                onRetry={() => {
                  playClickSound();
                  newAttempt();
                }}
                onBack={() => {
                  playClickSound();
                  onBack();
                }}
              />
            )}

            {gameState.victory && (
              <VictoryOverlay
                title={t.victoryTitle}
                description={t.victoryDesc(gameState.commandCount, timer)}
                playAgainLabel={t.playAgain}
                nextLabel={currentLevelIdx < LEVELS.length - 1 ? t.nextLevel : t.back}
                rankingSlot={
                  <RankingNameEntry
                    status={rankStatus}
                    name={rankName}
                    locked={account !== null}
                    onNameChange={setRankName}
                    onConfirm={confirmRanking}
                    messages={{
                      checking: t.rankChecking,
                      qualify: t.rankQualify,
                      out: t.rankOut,
                      rejected: t.rankRejected,
                      save: t.rankSave,
                      sending: t.rankSending,
                      sent: t.rankSent,
                      error: t.rankError,
                      invalid: t.rankInvalid,
                    }}
                  />
                }
                onPlayAgain={() => {
                  playClickSound();
                  newAttempt();
                }}
                onNext={() => {
                  playClickSound();
                  nextLevel();
                }}
              />
            )}
          </AnimatePresence>
        </div>

        <ControlPanel
          t={t}
          code={code}
          isExecuting={isExecuting}
          currentLine={gameState.currentLine}
          error={gameState.error}
          executionSpeed={executionSpeed}
          onSpeedChange={speed => {
            playClickSound();
            runner.setSpeed(speed);
          }}
          onClear={() => {
            playClickSound();
            setCode('');
          }}
          onAddCommand={addCommand}
          showLoops={allowLoops}
          showConditionals={allowConditionals}
          showMoveN={level.id >= 2}
        />
      </main>
    </div>
  );
};
