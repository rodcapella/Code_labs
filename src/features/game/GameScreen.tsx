import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pause, AlertCircle, Lightbulb } from 'lucide-react';
import { Grid } from './components/Grid';
import { parseProgram } from './engine/program';
import { GameHeader } from './components/GameHeader';
import { ArcadeLoader } from '../../shared/components/ArcadeLoader';
import { LevelTimer } from './components/LevelTimer';
import { LevelIntroModal } from './components/LevelIntroModal';
import { Modal } from '../../shared/components/Modal';
import { useSettings } from '../../shared/components/SettingsContext';
import { contextualHint, blockedCellAhead } from './engine/hints';
import { previewPath, PreviewStep } from './engine/preview';
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
import { level8 } from './levels/level8';
import { level9 } from './levels/level9';
import { level10 } from './levels/level10';
import { UserConfig, TRANSLATIONS } from '../../shared/i18n/translations';
import { useProgramRunner, StepEvent } from './hooks/useProgramRunner';
import { submitEntry, fetchAttempt, fetchLeaderboard, AttemptTicket, AttemptContext } from '../leaderboard/leaderboardApi';
import { starsFor } from '../../shared/config/rules';
import { qualifiesForTop, formatPlayerName } from '../leaderboard/domain/leaderboard';
import { validatePlayerName } from '../leaderboard/domain/leaderboardRules';
import { RankingNameEntry } from '../leaderboard/RankingNameEntry';
import { useVictory, rankingMessages } from './hooks/useVictory';
import { useAttempt } from './hooks/useAttempt';
import { useAvisos } from './hooks/useAvisos';
import { ShareSolution } from '../share/ShareSolution';
import { scoreOf } from '../../shared/config/rules';
import { useCronometro } from './hooks/useCronometro';
import { TutorialOverlay } from './components/TutorialOverlay';
import { structureBonusFor } from './engine/structures';
import { useAccount } from '../auth/AccountContext';
import { generateLayout } from './levels/generator';
import { MAX_ERRORS_BY_LEVEL } from '../../shared/config/rules';
import { playMoveSound, playTurnSound, playPickSound, playErrorSound, playVictorySound, playClickSound, playBeepBoopSound } from '../../shared/utils/audio';

const LEVELS = [level1, level2, level3, level4, level5, level6, level7, level8, level9, level10];

interface GameScreenProps {
  onBack: () => void;
  userConfig: UserConfig;
  onUpdateConfig: (config: Partial<UserConfig>) => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({ onBack, userConfig, onUpdateConfig }) => {
  const t = TRANSLATIONS[userConfig.language];
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  // Tentativa do nível (semente, layout, janela de conceito): ver hooks/useAttempt.ts.
  const { level, round, ready, attemptId, newAttempt, introOpen, closeIntro } = useAttempt(LEVELS, currentLevelIdx);
  const [code, setCode] = useState('');
  const [tutorialDone, setTutorialDone] = useState(() => Boolean(localStorage.getItem('tutorial_completed')));

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

  const { robotMessage, fallNotice, speak, showFall } = useAvisos(userConfig.language);
  const [bumpKey, setBumpKey] = useState(0);
  const [previewSteps, setPreviewSteps] = useState<PreviewStep[] | null>(null);
  const [errorOpen, setErrorOpen] = useState(false);

  // Sons e falas reagem a cada passo da execução, fora de qualquer atualizador de estado.
  const handleStepEvent = (event: StepEvent) => {
    switch (event) {
      case 'fall':
        // Queda com reinício automático: treme o robô e mostra um aviso breve (sem janela).
        playErrorSound();
        setBumpKey(k => k + 1);
        showFall();
        break;
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
  const { seconds: timer, reset: resetTimer } = useCronometro(
    started && !isPaused && !gameState.victory,
    `${currentLevelIdx}-${round}`,
  );

  useEffect(() => {
    speak('idle');
  }, [currentLevelIdx]);

  // Ao mudar de nível ou de tentativa, o hook repõe o robô; aqui repomos o resto da UI.
  useEffect(() => {
    setHintsRemaining(getInitialHints());
    setActiveHint(null);
  }, [currentLevelIdx, round]);

  // Reiniciar: zera o robô, os erros, o tempo e a consola (mantém o layout da tentativa).
  const resetGame = () => {
    runner.reset();
    setErrorOpen(false);
    setCode('');
    resetTimer();
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

  // Editar o código invalida a pré-visualização.
  useEffect(() => {
    setPreviewSteps(null);
  }, [code]);

  const togglePreview = () => {
    if (previewSteps) return setPreviewSteps(null);
    const layout = {
      gridSize: level.gridSize,
      initialRobotPosition: level.initialRobotPosition,
      initialRobotDirection: level.initialRobotDirection,
      boxes: level.boxes,
      walls: level.walls,
      holes: level.holes,
      wood: level.wood,
      portals: level.portals,
    };
    const result = previewPath(layout, parseProgram(code), userConfig.language, { allowLoops, allowConditionals }, maxErrors);
    setPreviewSteps(result.steps);
  };

  const runCode = () => {
    setErrorOpen(false);
    setPreviewSteps(null);
    if (ready) runner.run(code);
  };

  // Nova partida: layout novo (nova tentativa no servidor).

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

  const { account } = useAccount();
  const { openSettings } = useSettings();
  // Vitória: estrelas, progresso e ranking (ver hooks/useVictory.ts).
  const { earnedStars, rankStatus, rankName, setRankName, confirmRanking } = useVictory({
    victory: gameState.victory,
    commandCount: gameState.commandCount,
    errors,
    timer,
    level,
    runs,
    attemptId,
    userConfig,
    onUpdateConfig,
    accountUsername: account ? account.username : null,
  });

  const finishTutorial = () => {
    localStorage.setItem('tutorial_completed', 'true');
    setTutorialDone(true);
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
      {/* Tutorial de primeira utilização (monta-se só enquanto não foi concluído) */}
      <AnimatePresence>
        {!tutorialDone && <TutorialOverlay
            t={t}
            userConfig={userConfig}
            onUpdateConfig={onUpdateConfig}
            robotColors={robotColors}
            onFinish={finishTutorial}
            playClick={playClickSound}
          />}
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
          openSettings();
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
            holes={gameState.holes}
            wood={gameState.wood}
            portals={gameState.portals}
            commandCount={gameState.commandCount}
            previewSteps={previewSteps}
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
            {started && !gameState.victory && (
              <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={togglePreview}
                  disabled={isExecuting}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-navy border border-brand-cyan/50 text-brand-cyan hover:bg-brand-blue/15 disabled:opacity-40"
                >
                  {previewSteps ? t.previewHide : t.previewShow}
                </button>
                {previewSteps && (
                  <p className="text-[11px] text-brand-cyan/90 bg-brand-ink/85 rounded px-2 py-1">
                    {t.previewSteps(previewSteps.length)}
                  </p>
                )}
              </div>
            )}

            {fallNotice && (
              <p role="status" className="absolute top-14 left-1/2 -translate-x-1/2 z-20 max-w-[90%] text-center text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-900/90 border border-amber-400/60 text-amber-200">
                {t.errorHole}
              </p>
            )}

            {runner.lastCheck && started && (
              <p
                role="status"
                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 max-w-[90%] text-center text-xs font-mono px-3 py-1.5 rounded-lg bg-brand-ink/90 border border-brand-violet/60 text-brand-violet"
              >
                {t.condResult(parseProgram(code)[runner.lastCheck.line] ?? '', runner.lastCheck.result)}
              </p>
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
                description={`${t.victoryDesc(gameState.commandCount, timer)} ${t.victoryStars}: ${'★'.repeat(earnedStars)}${'☆'.repeat(3 - earnedStars)}`}
                playAgainLabel={t.playAgain}
                nextLabel={currentLevelIdx < LEVELS.length - 1 ? t.nextLevel : t.back}
                shareSlot={
                  runs.length > 0 ? (
                    <ShareSolution
                      level={level}
                      winningLines={runs[runs.length - 1]}
                      lang={userConfig.language}
                      opts={{ allowLoops, allowConditionals }}
                      robotColor={userConfig.robotColor}
                      levelNumber={level.id}
                      score={scoreOf(gameState.commandCount, errors, timer, structureBonusFor(runs[runs.length - 1], userConfig.language))}
                      stars={earnedStars}
                    />
                  ) : undefined
                }
                rankingSlot={
                  <RankingNameEntry
                    status={rankStatus}
                    name={rankName}
                    locked={account !== null}
                    onNameChange={setRankName}
                    onConfirm={confirmRanking}
                    messages={rankingMessages(t)}
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
          showBreak={level.id >= 8}
        />
      </main>
    </div>
  );
};
