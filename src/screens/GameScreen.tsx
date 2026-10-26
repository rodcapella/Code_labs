import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, ChevronLeft, AlertCircle, Trophy, Terminal, Undo2, Timer, Gauge, Settings, Lightbulb, Hash, ChevronUp, RotateCw, Hand, Eraser } from 'lucide-react';
import { Grid } from '../components/Grid';
import { CodeEditor } from '../components/CodeEditor';
import { Tooltip } from '../components/Tooltip';
import { Language, LeaderboardEntry } from '../types/game';
import { level1 } from '../levels/level1';
import { level2 } from '../levels/level2';
import { level3 } from '../levels/level3';
import { UserConfig, TRANSLATIONS } from '../constants/translations';
import { useProgramRunner, StepEvent } from '../hooks/useProgramRunner';
import { addEntry, formatPlayerName, loadLeaderboard, saveLeaderboard } from '../engine/leaderboard';
import { MAX_ERRORS_BY_LEVEL } from '../engine/rules';
import { playMoveSound, playTurnSound, playPickSound, playErrorSound, playVictorySound, playClickSound, playBeepBoopSound } from '../utils/audio';

const LEVELS = [level1, level2, level3];

interface GameScreenProps {
  onBack: () => void;
  userConfig: UserConfig;
  onUpdateConfig: (config: Partial<UserConfig>) => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({ onBack, userConfig, onUpdateConfig }) => {
  const t = TRANSLATIONS[userConfig.language];
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const level = LEVELS[currentLevelIdx];
  const [code, setCode] = useState('');
  const [tutorialStep, setTutorialStep] = useState<number | null>(() => {
    const completed = localStorage.getItem('tutorial_completed');
    return completed ? null : 0;
  });
  const [timer, setTimer] = useState(0);
  const [robotMessage, setRobotMessage] = useState('');

  const getInitialHints = () => {
    const baseHints = level.hints.length;
    if (userConfig.level === 'beginner') return baseHints;
    if (userConfig.level === 'intermediate') return Math.max(1, Math.floor(baseHints * 0.6));
    return Math.max(0, Math.floor(baseHints * 0.3));
  };

  const [hintsRemaining, setHintsRemaining] = useState(getInitialHints);
  const [activeHint, setActiveHint] = useState<string | null>(null);

  // Robot commentary: a fala é escolhida aleatoriamente de uma lista traduzida.
  const speak = (type: 'idle' | 'success' | 'error' | 'victory') => {
    const messages = t[`robot${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof t] as string[];
    if (messages && messages.length > 0) {
      const msg = messages[Math.floor(Math.random() * messages.length)];
      setRobotMessage(msg);
      playBeepBoopSound();
      setTimeout(() => setRobotMessage(''), 3000);
    }
  };

  // Sons e falas reagem a cada passo da execução, fora de qualquer atualizador de estado.
  const handleStepEvent = (event: StepEvent) => {
    switch (event) {
      case 'error':
        playErrorSound();
        speak('error');
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
  const runner = useProgramRunner(level, userConfig.language, maxErrors, handleStepEvent);
  const {
    state: gameState, errors, isGameOver, isExecuting, isPaused, started,
    speed: executionSpeed, historyLength,
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
  }, [currentLevelIdx]);

  const resetGame = () => {
    runner.reset();
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

  const runCode = () => runner.run(code);

  const pauseGame = () => {
    runner.pause();
    playClickSound();
  };

  const resumeGame = () => runner.run(code);

  const showHint = () => {
    if (hintsRemaining > 0 && !activeHint) {
      const hintIndex = level.hints.length - hintsRemaining;
      setActiveHint(level.hints[hintIndex]);
      setHintsRemaining(prev => prev - 1);
      playClickSound();

      setTimeout(() => {
        setActiveHint(null);
      }, 8000);
    }
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

    const entry: LeaderboardEntry = {
      id: Date.now().toString(),
      name: formatPlayerName(userConfig.name),
      levelId: level.id,
      commands: gameState.commandCount,
      errors,
      time: timer,
      date: new Date().toISOString().split('T')[0],
      robotColor: userConfig.robotColor,
    };
    saveLeaderboard(addEntry(loadLeaderboard(), entry));
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
      <header className="bg-brand-navy border-b border-white/10 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            aria-label={t.back}
            onClick={() => {
              playClickSound();
              onBack();
            }}
            className="p-2 hover:bg-brand-navy rounded-lg transition-colors text-brand-ice/80"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="font-bold text-brand-ice">{t.level} {level.id}</h2>
            <p className="text-xs text-brand-ice/80 font-medium uppercase tracking-wider">{t.challenge}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-brand-ice/75 uppercase font-bold tracking-widest flex items-center gap-1 justify-end">
              <Timer className="w-3 h-3" />
              {t.timeLabel}
            </p>
            <div className="flex items-center gap-1.5 justify-end">
              <p className="text-lg font-mono font-bold text-brand-ice/85">{timer}s</p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-brand-ice/75 uppercase font-bold tracking-widest flex items-center gap-1 justify-end">
              <Hash className="w-3 h-3" />
              {t.commands}
            </p>
            <p className="text-lg font-mono font-bold text-brand-ice/85">{gameState.commandCount}</p>
          </div>
          <div className="text-right hidden sm:block" title={t.errorPenaltyHint}>
            <p className="text-[10px] text-brand-ice/75 uppercase font-bold tracking-widest flex items-center gap-1 justify-end">
              <AlertCircle className="w-3 h-3" />
              {t.errorsLabel}
            </p>
            <p className={`text-lg font-mono font-bold ${errors >= maxErrors - 1 ? 'text-red-600' : 'text-brand-ice/85'}`}>
              {errors}/{maxErrors}
            </p>
          </div>
          <div className="flex gap-2">
            <Tooltip text={t.tooltipUndo} position="bottom">
              <button
                onClick={() => {
                  playClickSound();
                  undo();
                }}
                disabled={isExecuting || historyLength === 0 || gameState.victory}
                className="flex items-center gap-2 px-4 py-2 text-brand-ice/75 font-semibold hover:bg-brand-navy rounded-xl transition-all disabled:opacity-30"
              >
                <Undo2 className="w-4 h-4" />
                {t.undo}
              </button>
            </Tooltip>
            <Tooltip text={t.tooltipReset} position="bottom">
              <button
                onClick={() => {
                  playClickSound();
                  resetGame();
                }}
                disabled={isExecuting && !isPaused}
                className="flex items-center gap-2 px-4 py-2 text-brand-ice/75 font-semibold hover:bg-brand-navy rounded-xl transition-all disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                {t.reset}
              </button>
            </Tooltip>
            {isExecuting && !isPaused ? (
              <Tooltip text={t.tooltipPause} position="bottom">
                <button
                  onClick={pauseGame}
                  className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all"
                >
                  <Pause className="w-4 h-4 fill-current" />
                  {t.pause}
                </button>
              </Tooltip>
            ) : (
              <Tooltip text={isPaused ? t.tooltipResume : t.tooltipExecute} position="bottom">
                <button
                  onClick={() => {
                    playClickSound();
                    if (isPaused) resumeGame();
                    else runCode();
                  }}
                  disabled={gameState.victory || isGameOver}
                  className="flex items-center gap-2 px-6 py-2 bg-brand-blue text-white font-bold rounded-xl shadow-lg shadow-brand-blue/20 hover:bg-brand-blue transition-all disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {isPaused ? t.resume : t.execute}
                </button>
              </Tooltip>
            )}
            <Tooltip text={t.tooltipHint} position="bottom">
              <button
                onClick={showHint}
                disabled={hintsRemaining === 0 || gameState.victory}
                className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 font-bold rounded-xl border border-amber-200 hover:bg-amber-100 transition-all disabled:opacity-30"
                title={t.hintsRemaining(hintsRemaining)}
              >
                <Lightbulb className={`w-4 h-4 ${hintsRemaining > 0 ? 'fill-amber-400' : ''}`} />
                <span className="hidden md:inline">{t.hintLabel} ({hintsRemaining})</span>
              </button>
            </Tooltip>
            <Tooltip text={t.tooltipSettings} position="bottom">
              <button
                aria-label={t.tooltipSettings}
                onClick={() => {
                  playClickSound();
                  setTutorialStep(0);
                }}
                className="p-2 hover:bg-brand-navy rounded-xl transition-all text-brand-ice/75"
              >
                <Settings className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>
        </div>
      </header>

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
            commandCount={gameState.commandCount}
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

            {isGameOver && !gameState.victory && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-brand-navy/80 backdrop-blur-sm p-6"
              >
                <div className="bg-brand-navy p-8 rounded-3xl shadow-2xl border border-white/10 text-center max-w-sm w-full">
                  <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-brand-ice mb-2">{t.gameOverTitle}</h3>
                  <p className="text-brand-ice/80 mb-8">{t.gameOverDesc(maxErrors)}</p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => {
                        playClickSound();
                        resetGame();
                      }}
                      className="w-full py-4 bg-brand-blue text-white font-bold rounded-2xl hover:bg-brand-blue transition-all shadow-lg shadow-brand-blue/20"
                    >
                      {t.retryLevel}
                    </button>
                    <button
                      onClick={() => {
                        playClickSound();
                        onBack();
                      }}
                      className="w-full py-4 bg-brand-navy text-brand-ice/85 font-bold rounded-2xl hover:bg-white/10 transition-all"
                    >
                      {t.back}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {gameState.victory && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-brand-navy/80 backdrop-blur-sm p-6"
              >
                <div className="bg-brand-navy p-8 rounded-3xl shadow-2xl border border-white/10 text-center max-w-sm w-full">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-brand-ice mb-2">{t.victoryTitle}</h3>
                  <p className="text-brand-ice/80 mb-8">{t.victoryDesc(gameState.commandCount, timer)}</p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => {
                        playClickSound();
                        resetGame();
                      }}
                      className="w-full py-4 bg-brand-navy text-brand-ice/85 font-bold rounded-2xl hover:bg-white/10 transition-all"
                    >
                      {t.playAgain}
                    </button>
                    <button
                      onClick={() => {
                        playClickSound();
                        nextLevel();
                      }}
                      className="w-full py-4 bg-brand-blue text-white font-bold rounded-2xl hover:bg-brand-blue transition-all shadow-lg shadow-brand-blue/20"
                    >
                      {currentLevelIdx < LEVELS.length - 1 ? t.nextLevel : t.back}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Editor Area */}
        <div className="w-full lg:w-[450px] bg-brand-navy border-l border-white/10 p-6 flex flex-col gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4 text-brand-ice/75">
              <Terminal className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">{t.consoleTitle}</span>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setCode('');
                }}
                disabled={isExecuting || code === ''}
                className="ml-auto flex items-center gap-1 px-3 py-1 text-xs font-bold text-brand-ice/70 hover:text-brand-cyan border border-white/10 rounded-lg transition-all disabled:opacity-30"
              >
                <Eraser className="w-3 h-3" />
                {t.clearCode}
              </button>
            </div>
            <CodeEditor
              code={code}
              isExecuting={isExecuting}
              currentLine={gameState.currentLine}
              placeholder={t.placeholder}
              error={gameState.error}
            />
          </div>

          <div className="bg-brand-ink rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-brand-ice/75 uppercase tracking-widest flex items-center gap-2">
                <Gauge className="w-3 h-3" />
                {t.speedLabel}
              </h4>
              <span className="text-xs font-mono font-bold text-brand-cyan">{(executionSpeed / 1000).toFixed(1)}s</span>
            </div>
            <div className="flex gap-2">
              {[1000, 600, 300].map(speed => (
                <Tooltip key={speed} text={t.tooltipSpeed} position="top">
                  <button
                    onClick={() => {
                      playClickSound();
                      runner.setSpeed(speed);
                    }}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                      executionSpeed === speed 
                        ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20' 
                        : 'bg-brand-navy text-brand-ice/80 border border-white/10 hover:border-brand-cyan/50'
                    }`}
                  >
                    {(speed / 1000).toFixed(1)}s
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>

          <div className="bg-brand-ink rounded-2xl p-4 border border-white/10">
            <h4 className="text-xs font-bold text-brand-ice/75 uppercase tracking-widest mb-3">{t.availableCommands}</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: t.cmdMove, icon: <ChevronUp className="w-4 h-4" /> },
                { label: t.cmdLeft, icon: <RotateCcw className="w-4 h-4" /> },
                { label: t.cmdRight, icon: <RotateCw className="w-4 h-4" /> },
                { label: t.cmdPick, icon: <Hand className="w-4 h-4" /> },
              ].map(cmd => (
                <button
                  key={cmd.label}
                  onClick={() => addCommand(cmd.label)}
                  className="command-btn flex items-center gap-2 bg-brand-navy px-3 py-2 rounded-xl border border-white/10 font-mono text-xs text-brand-ice/85 hover:border-brand-cyan/60 hover:bg-brand-blue/15 transition-all shadow-sm"
                >
                  <div className="p-1 bg-brand-ink rounded-md text-brand-ice/75 group-hover:text-brand-blue">
                    {cmd.icon}
                  </div>
                  {cmd.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-brand-ice/75 text-center italic">
              {t.commandPaletteHint}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
