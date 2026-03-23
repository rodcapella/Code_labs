import React from 'react';
import { motion } from 'motion/react';
import { Play, Code2, LogOut, CheckCircle2, Trophy } from 'lucide-react';

import { UserConfig, TRANSLATIONS } from '../constants/translations';

interface HomeScreenProps {
  onStart: () => void;
  onLeaderboard: () => void;
  userConfig: UserConfig;
  onReset: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onStart, onLeaderboard, userConfig, onReset }) => {
  const t = TRANSLATIONS[userConfig.language];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-radial-[at_50%_50%] from-slate-50 to-slate-200">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center w-full max-w-lg"
      >
        <div className="flex justify-center mb-8">
          <div 
            className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-12"
            style={{ backgroundColor: userConfig.robotColor }}
          >
            <Code2 className="w-12 h-12 text-white -rotate-12" />
          </div>
        </div>

        <div className="mb-4">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-[0.3em]">
            {t.welcome} {userConfig.name}
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 mb-4">
          CodeBot <span className="text-blue-600">Lab</span>
        </h1>
        
        <p className="text-slate-500 text-lg mb-12 max-w-md mx-auto">
          {t.labDescription}
        </p>

        <div className="flex flex-col gap-4 items-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStart}
            className="group relative inline-flex items-center gap-3 px-12 py-4 bg-slate-900 text-white rounded-2xl font-semibold text-lg shadow-xl hover:bg-slate-800 transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            {t.start}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLeaderboard}
            className="group relative inline-flex items-center gap-3 px-12 py-4 bg-blue-600 text-white rounded-2xl font-semibold text-lg shadow-xl hover:bg-blue-700 transition-all arcade-text text-[10px]"
          >
            <Trophy className="w-5 h-5" />
            {t.leaderboard}
          </motion.button>

          <button
            onClick={onReset}
            className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors text-sm font-bold uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" />
            {t.resetProfile}
          </button>
        </div>

        {/* Level Progress */}
        <div className="mt-16 p-8 bg-white rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
            {t.labProgress}
          </h3>
          <div className="flex items-center gap-4 justify-center">
            {[1, 2, 3].map(lvlId => (
              <div 
                key={lvlId}
                className={`relative w-14 h-14 rounded-2xl flex items-center justify-center font-bold transition-all ${
                  userConfig.completedLevels.includes(lvlId)
                    ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200'
                    : 'bg-slate-50 text-slate-300 border-2 border-slate-100'
                }`}
              >
                {lvlId}
                {userConfig.completedLevels.includes(lvlId) && (
                  <div className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex items-center justify-center gap-2 text-slate-400 text-sm font-medium uppercase tracking-widest">
          <span>{t.poweredBy}</span>
          <span className="text-slate-600 font-bold">SapienteAI</span>
        </div>
      </motion.div>
    </div>
  );
};
