import React from 'react';
import { motion } from 'motion/react';
import { Trophy, ArrowLeft, Medal, Timer, Hash, User } from 'lucide-react';
import { LeaderboardEntry } from '../types/game';
import { TRANSLATIONS, UserConfig } from '../constants/translations';
import { loadLeaderboard, compareEntries } from '../engine/leaderboard';

interface LeaderboardScreenProps {
  onBack: () => void;
  userConfig: UserConfig;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onBack, userConfig }) => {
  const t = TRANSLATIONS[userConfig.language];
  
  const [entries] = React.useState<LeaderboardEntry[]>(() => loadLeaderboard());

  const sortedEntries = [...entries].sort(compareEntries);

  return (
    <div className="min-h-screen bg-brand-ink text-white p-6 brand-page overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex items-center justify-between mb-12">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-brand-cyan hover:text-brand-cyan transition-colors text-[10px]"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </button>
          <h1 className="text-xl md:text-3xl text-brand-blue brand-glow animate-pulse">
            {t.hallOfFame}
          </h1>
          <div className="w-12" />
        </div>

        <div className="bg-brand-navy/50 border-4 border-brand-navy rounded-none p-4 md:p-8 shadow-[0_0_30px_rgba(30,58,138,0.5)]">
          <div className="grid grid-cols-5 gap-4 mb-8 pb-4 border-b-2 border-brand-navy text-[8px] md:text-[10px] text-brand-cyan">
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
                  index === 0 ? 'text-yellow-400' : index === 1 ? 'text-brand-ice/40' : index === 2 ? 'text-amber-600' : 'text-brand-cyan'
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
            <div className="text-center py-12 text-brand-ice/75 animate-pulse text-[10px]">
              {t.noData}
            </div>
          )}
        </div>

        <div className="mt-12 text-center">
          <p className="text-[8px] md:text-[10px] text-brand-ice animate-bounce">
            {t.insertCoin}
          </p>
        </div>
      </motion.div>
    </div>
  );
};
