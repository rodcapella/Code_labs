import React from 'react';
import { motion } from 'motion/react';
import { Trophy, ArrowLeft, Medal, Timer, Hash, User } from 'lucide-react';
import { LeaderboardEntry } from '../types/game';
import { TRANSLATIONS, UserConfig } from '../constants/translations';

interface LeaderboardScreenProps {
  onBack: () => void;
  userConfig: UserConfig;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onBack, userConfig }) => {
  const t = TRANSLATIONS[userConfig.language];
  
  const [entries] = React.useState<LeaderboardEntry[]>(() => {
    const saved = localStorage.getItem('codebot_leaderboard');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse leaderboard', e);
      }
    }
    // Default mock data for fliperama feel
    return [
      { id: '1', name: 'ROBOT_X', levelId: 1, commands: 12, time: 45, date: '2026-03-20', robotColor: '#3B82F6' },
      { id: '2', name: 'PIXEL_BOT', levelId: 1, commands: 15, time: 52, date: '2026-03-21', robotColor: '#EAB308' },
      { id: '3', name: 'CODE_MASTER', levelId: 1, commands: 18, time: 60, date: '2026-03-22', robotColor: '#22C55E' },
      { id: '4', name: 'VOID_WALKER', levelId: 1, commands: 22, time: 75, date: '2026-03-22', robotColor: '#EC4899' },
    ];
  });

  const sortedEntries = [...entries].sort((a, b) => {
    if (a.commands !== b.commands) return a.commands - b.commands;
    return a.time - b.time;
  });

  return (
    <div className="min-h-screen bg-black text-white p-6 arcade-text overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex items-center justify-between mb-12">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-[10px]"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </button>
          <h1 className="text-xl md:text-3xl text-blue-500 arcade-glow animate-pulse">
            {t.hallOfFame}
          </h1>
          <div className="w-12" />
        </div>

        <div className="bg-slate-900/50 border-4 border-blue-900 rounded-none p-4 md:p-8 shadow-[0_0_30px_rgba(30,58,138,0.5)]">
          <div className="grid grid-cols-5 gap-4 mb-8 pb-4 border-b-2 border-blue-900 text-[8px] md:text-[10px] text-blue-400">
            <div className="flex items-center gap-2"><Hash className="w-3 h-3" /> {t.rank}</div>
            <div className="flex items-center gap-2 col-span-2"><User className="w-3 h-3" /> {t.pilot}</div>
            <div className="flex items-center gap-2"><Trophy className="w-3 h-3" /> {t.cmds}</div>
            <div className="flex items-center gap-2"><Timer className="w-3 h-3" /> {t.time}</div>
          </div>

          <div className="space-y-6">
            {sortedEntries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`grid grid-cols-5 gap-4 items-center text-[8px] md:text-xs ${
                  index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-blue-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {index < 3 ? <Medal className="w-4 h-4" /> : <span className="w-4" />}
                  {index + 1}
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <div 
                    className="w-3 h-3 md:w-4 md:h-4 rounded-sm shadow-[0_0_5px_currentColor]" 
                    style={{ backgroundColor: entry.robotColor }}
                  />
                  <span className="truncate">{entry.name}</span>
                </div>
                <div>{entry.commands}</div>
                <div>{entry.time}s</div>
              </motion.div>
            ))}
          </div>

          {sortedEntries.length === 0 && (
            <div className="text-center py-12 text-slate-600 animate-pulse text-[10px]">
              {t.noData}
            </div>
          )}
        </div>

        <div className="mt-12 text-center">
          <p className="text-[8px] md:text-[10px] text-blue-900 animate-bounce">
            {t.insertCoin}
          </p>
        </div>
      </motion.div>
    </div>
  );
};
