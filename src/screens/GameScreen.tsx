import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, ChevronLeft, AlertCircle, Trophy, Terminal, Undo2, Timer, Gauge, Settings, Lightbulb, Hash, ChevronUp, RotateCw, Hand } from 'lucide-react';
import { Grid } from '../components/Grid';
import { CodeEditor } from '../components/CodeEditor';
import { Tooltip } from '../components/Tooltip';
import { GameState, LevelConfig, Language, LeaderboardEntry } from '../types/game';
import { executeCommand } from '../engine/interpreter';
import { level1 } from '../levels/level1';
import { level2 } from '../levels/level2';
import { level3 } from '../levels/level3';
import { UserConfig, TRANSLATIONS } from '../constants/translations';
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
  const [gameState, setGameState] = useState<GameState>({
    gridSize: level.gridSize,
    robotPosition: level.initialRobotPosition,
    robotDirection: level.initialRobotDirection,
    boxes: level.boxes.map((p, i) => ({ id: `box-${i}`, position: p, collected: false })),
    isExecuting: false,
    currentLine: 0,
    error: null,
    victory: false,
    commandCount: 0,
  });
  const [history, setHistory] = useState<GameState[]>([]);
  const [executionSpeed, setExecutionSpeed] = useState(600);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [robotMessage, setRobotMessage] = useState('');

  const getInitialHints = () => {
    const baseHints = level.hints.length;
    if (userConfig.level === 'beginner') return baseHints;
    if (userConfig.level === 'intermediate') return Math.max(1, Math.floor(baseHints * 0.6));
    return Math.max(0, Math.floor(baseHints * 0.3));
  };

  const [hintsRemaining, setHintsRemaining] = useState(getInitialHints);
  const [activeHint, setActiveHint] = useState<string | null>(null);

  const executionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentLineIdxRef = useRef(0);

  // Robot commentary logic
  const speak = (type: 'idle' | 'success' | 'error' | 'victory') => {
    const messages = t[`robot${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof t] as string[];
    if (messages && messages.length > 0) {
      const msg = messages[Math.floor(Math.random() * messages.length)];
      setRobotMessage(msg);
      playBeepBoopSound();
      // Clear message after 3 seconds
      setTimeout(() => setRobotMessage(''), 3000);
    }
  };

  // Initial greeting
  useEffect(() => {
    speak('idle');
  }, [currentLevelIdx]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && !gameState.victory && !isPaused) {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, gameState.victory, isPaused]);

  const resetGame = () => {
    if (executionIntervalRef.current) clearInterval(executionIntervalRef.current);
    currentLineIdxRef.current = 0;
    setHistory([]);
    setTimer(0);
    setIsTimerRunning(false);
    setIsPaused(false);
    setHintsRemaining(getInitialHints());
    setActiveHint(null);
    setGameState({
      gridSize: level.gridSize,
      robotPosition: level.initialRobotPosition,
      robotDirection: level.initialRobotDirection,
      boxes: level.boxes.map((p, i) => ({ id: `box-${i}`, position: p, collected: false })),
      isExecuting: false,
      currentLine: 0,
      error: null,
      victory: false,
      commandCount: 0,
    });
  };

  const nextLevel = () => {
    if (currentLevelIdx < LEVELS.length - 1) {
      setCurrentLevelIdx(prev => prev + 1);
      setCode('');
    } else {
      onBack();
    }
  };

  // Update game state when level changes
  useEffect(() => {
    resetGame();
  }, [currentLevelIdx]);

  const undo = () => {
    if (history.length === 0 || gameState.isExecuting) return;
    const lastState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setGameState({ ...lastState, isExecuting: false });
  };

  const runCode = (isResume = false) => {
    if (gameState.isExecuting && !isPaused) return;
    
    const lines = code.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length === 0) return;

    if (!isResume) {
      resetGame();
    }
    
    setGameState(prev => ({ ...prev, isExecuting: true }));
    setIsTimerRunning(true);
    setIsPaused(false);

    executionIntervalRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.error || prev.victory || currentLineIdxRef.current >= lines.length) {
          if (executionIntervalRef.current) clearInterval(executionIntervalRef.current);
          return { ...prev, isExecuting: false };
        }

        const nextState = executeCommand(prev, lines[currentLineIdxRef.current], userConfig.language);
        const lineToHighlight = currentLineIdxRef.current;
        
        // Play sounds and speak based on action
        if (nextState.error) {
          playErrorSound();
          speak('error');
        } else if (nextState.victory) {
          playVictorySound();
          speak('victory');
        } else {
          const moved = nextState.robotPosition.x !== prev.robotPosition.x || nextState.robotPosition.y !== prev.robotPosition.y;
          const turned = nextState.robotDirection !== prev.robotDirection;
          const picked = nextState.boxes.filter(b => b.collected).length > prev.boxes.filter(b => b.collected).length;

          if (picked) playPickSound();
          else if (moved) playMoveSound();
          else if (turned) playTurnSound();
          
          // Occasional success commentary
          if (Math.random() > 0.7) speak('success');
        }
        
        if (!nextState.error) {
          setHistory(h => [...h, prev]);
          currentLineIdxRef.current++;
        }

        return {
          ...nextState,
          currentLine: lineToHighlight,
          isExecuting: currentLineIdxRef.current < lines.length && !nextState.error && !nextState.victory
        };
      });
    }, executionSpeed);
  };

  const pauseGame = () => {
    if (executionIntervalRef.current) clearInterval(executionIntervalRef.current);
    setIsPaused(true);
    playClickSound();
  };

  const resumeGame = () => {
    runCode(true);
  };

  const showHint = () => {
    if (hintsRemaining > 0 && !activeHint) {
      const hintIndex = level.hints.length - hintsRemaining;
      setActiveHint(level.hints[hintIndex]);
      setHintsRemaining(prev => prev - 1);
      playClickSound();
      
      // Auto-hide hint after 8 seconds or when user clicks it
      setTimeout(() => {
        setActiveHint(null);
      }, 8000);
    }
  };

  useEffect(() => {
    if (gameState.victory) {
      // Update completed levels
      if (!userConfig.completedLevels.includes(level.id)) {
        onUpdateConfig({
          completedLevels: [...userConfig.completedLevels, level.id]
        });
      }

      // Save to leaderboard
      const saved = localStorage.getItem('codebot_leaderboard');
      let entries: LeaderboardEntry[] = [];
      try {
        entries = saved ? JSON.parse(saved) : [];
      } catch (e) {
        console.error('Failed to parse leaderboard', e);
      }

      const newEntry: LeaderboardEntry = {
        id: Date.now().toString(),
        name: userConfig.name.toUpperCase().slice(0, 10),
        levelId: level.id,
        commands: gameState.commandCount,
        time: timer,
        date: new Date().toISOString().split('T')[0],
        robotColor: userConfig.robotColor
      };

      const updatedEntries = [...entries, newEntry]
        .sort((a, b) => {
          if (a.commands !== b.commands) return a.commands - b.commands;
          return a.time - b.time;
        })
        .slice(0, 10);

      localStorage.setItem('codebot_leaderboard', JSON.stringify(updatedEntries));
    }
  }, [gameState.victory, level.id, userConfig.completedLevels, onUpdateConfig, gameState.commandCount, timer, userConfig.name, userConfig.robotColor]);

  useEffect(() => {
    return () => {
      if (executionIntervalRef.current) clearInterval(executionIntervalRef.current);
    };
  }, []);

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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Tutorial Overlay */}
      <AnimatePresence>
        {tutorialStep !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-slate-100">
                <motion.div 
                  className="h-full bg-blue-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${((tutorialStep + 1) / 8) * 100}%` }}
                />
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm">
                  {tutorialStep + 1}
                </span>
                {t.tutorialTitle}
              </h3>

              <div className="text-slate-600 mb-8 min-h-[80px]">
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
                              ? 'border-blue-600 bg-blue-50 text-blue-600' 
                              : 'border-slate-100 text-slate-400'
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
                              ? 'border-slate-900 scale-110' 
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
                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
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
                  className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
                >
                  {tutorialStep < 7 ? t.continue : t.start}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              playClickSound();
              onBack();
            }}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="font-bold text-slate-900">{t.level} {level.id}</h2>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{t.challenge}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest flex items-center gap-1 justify-end">
              <Timer className="w-3 h-3" />
              {t.timeLabel}
            </p>
            <div className="flex items-center gap-1.5 justify-end">
              <p className="text-lg font-mono font-bold text-slate-700">{timer}s</p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest flex items-center gap-1 justify-end">
              <Hash className="w-3 h-3" />
              {t.commands}
            </p>
            <p className="text-lg font-mono font-bold text-slate-700">{gameState.commandCount}</p>
          </div>
          <div className="flex gap-2">
            <Tooltip text={t.tooltipUndo} position="bottom">
              <button
                onClick={() => {
                  playClickSound();
                  undo();
                }}
                disabled={gameState.isExecuting || history.length === 0 || gameState.victory}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-all disabled:opacity-30"
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
                disabled={gameState.isExecuting && !isPaused}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                {t.reset}
              </button>
            </Tooltip>
            {gameState.isExecuting && !isPaused ? (
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
                  disabled={gameState.victory}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50"
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
                onClick={() => {
                  playClickSound();
                  setTutorialStep(0);
                }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400"
              >
                <Settings className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Grid Area */}
        <div className="flex-1 relative flex items-center justify-center bg-slate-100/50 p-4 min-h-[400px]">
          {/* Robot Speech Bubble */}
          <AnimatePresence>
            {robotMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className="absolute top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl z-[60] border-2 border-slate-800 flex items-center gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                {robotMessage}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 rotate-45 border-r-2 border-b-2 border-slate-800" />
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
                  Clique para fechar
                </div>
              </motion.div>
            )}

            {isPaused && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/20 backdrop-blur-[2px]"
              >
                <div className="bg-white/90 px-6 py-3 rounded-2xl shadow-xl border border-white flex items-center gap-3">
                  <Pause className="w-5 h-5 text-amber-500 fill-current" />
                  <span className="font-bold text-slate-900 uppercase tracking-widest text-sm">{t.pause}</span>
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

            {gameState.victory && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm p-6"
              >
                <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 text-center max-w-sm w-full">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{t.victoryTitle}</h3>
                  <p className="text-slate-500 mb-8">{t.victoryDesc(gameState.commandCount, timer)}</p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => {
                        playClickSound();
                        resetGame();
                      }}
                      className="w-full py-4 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                    >
                      {t.playAgain}
                    </button>
                    <button
                      onClick={() => {
                        playClickSound();
                        nextLevel();
                      }}
                      className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
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
        <div className="w-full lg:w-[450px] bg-white border-l border-slate-200 p-6 flex flex-col gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4 text-slate-400">
              <Terminal className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">{t.consoleTitle}</span>
            </div>
            <CodeEditor
              code={code}
              onChange={setCode}
              isExecuting={gameState.isExecuting}
              currentLine={gameState.currentLine}
              placeholder={t.placeholder}
              error={gameState.error}
            />
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Gauge className="w-3 h-3" />
                {t.speedLabel}
              </h4>
              <span className="text-xs font-mono font-bold text-blue-600">{(executionSpeed / 1000).toFixed(1)}s</span>
            </div>
            <div className="flex gap-2">
              {[1000, 600, 300].map(speed => (
                <Tooltip key={speed} text={t.tooltipSpeed} position="top">
                  <button
                    onClick={() => {
                      playClickSound();
                      setExecutionSpeed(speed);
                    }}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                      executionSpeed === speed 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                        : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {(speed / 1000).toFixed(1)}s
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{t.availableCommands}</h4>
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
                  className="command-btn flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm"
                >
                  <div className="p-1 bg-slate-50 rounded-md text-slate-400 group-hover:text-blue-500">
                    {cmd.icon}
                  </div>
                  {cmd.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-slate-400 text-center italic">
              {t.commandPaletteHint}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
