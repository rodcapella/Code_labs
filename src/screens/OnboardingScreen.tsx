import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserConfig, KnowledgeLevel, Language, TRANSLATIONS } from '../constants/translations';
import { User, Globe, BrainCircuit, ArrowRight, Bot } from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: (config: UserConfig) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [language, setLanguage] = useState<Language>('pt');
  const [name, setName] = useState('');
  const [age, setAge] = useState<number>(18);
  const [level, setLevel] = useState<KnowledgeLevel>('beginner');
  const [robotColor, setRobotColor] = useState('#3B82F6');

  const t = TRANSLATIONS[language];

  const robotColors = [
    { name: t.colorBlue, value: '#3B82F6' },
    { name: t.colorYellow, value: '#EAB308' },
    { name: t.colorGreen, value: '#22C55E' },
    { name: t.colorPink, value: '#EC4899' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onComplete({ name, age, level, language, robotColor, completedLevels: [] });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-brand-ink">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-brand-navy rounded-3xl shadow-2xl border border-white/10 p-8"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-brand-blue/20 text-brand-cyan rounded-2xl">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-brand-ice">{t.onboardingTitle}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Language Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-brand-ice/50 uppercase tracking-widest mb-3">
              <Globe className="w-4 h-4" />
              {t.languageLabel}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['pt', 'en'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`py-3 rounded-xl font-semibold transition-all border-2 ${
                    language === lang
                      ? 'bg-brand-blue/15 border-brand-blue text-brand-cyan'
                      : 'bg-brand-navy border-white/10 text-brand-ice/50 hover:border-white/10'
                  }`}
                >
                  {lang === 'pt' ? 'Português' : 'English'}
                </button>
              ))}
            </div>
          </div>

          {/* Name & Age */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-bold text-brand-ice/50 uppercase tracking-widest mb-2">
                {t.nameLabel}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-brand-ink border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                placeholder={t.namePlaceholder}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-ice/50 uppercase tracking-widest mb-2">
                {t.ageLabel}
              </label>
              <input
                type="number"
                required
                min="1"
                max="120"
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-brand-ink border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none transition-all"
              />
            </div>
          </div>

          {/* Knowledge Level */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-brand-ice/50 uppercase tracking-widest mb-3">
              <BrainCircuit className="w-4 h-4" />
              {t.knowledgeLabel}
            </label>
            <div className="grid grid-cols-1 gap-2">
              {(['beginner', 'intermediate', 'advanced'] as KnowledgeLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={`px-4 py-3 rounded-xl font-semibold text-left transition-all border-2 flex items-center justify-between ${
                    level === lvl
                      ? 'bg-brand-blue/15 border-brand-blue text-brand-cyan'
                      : 'bg-brand-navy border-white/10 text-brand-ice/50 hover:border-white/10'
                  }`}
                >
                  {t[lvl]}
                  {level === lvl && <div className="w-2 h-2 bg-brand-blue rounded-full" />}
                </button>
              ))}
            </div>
          </div>

          {/* Robot Color Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-brand-ice/50 uppercase tracking-widest mb-3">
              <Bot className="w-4 h-4" />
              {t.robotColorLabel}
            </label>
            <div className="grid grid-cols-4 gap-3">
              {robotColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setRobotColor(color.value)}
                  className={`aspect-square rounded-xl border-4 transition-all flex items-center justify-center ${
                    robotColor === color.value
                      ? 'border-white/15 scale-110 shadow-lg'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {robotColor === color.value && (
                    <div className="w-2 h-2 bg-brand-navy rounded-full shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full py-4 bg-brand-navy text-white font-bold rounded-2xl shadow-xl hover:bg-brand-navy transition-all flex items-center justify-center gap-2"
          >
            {t.continue}
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};
