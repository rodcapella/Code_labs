import React, { useState } from 'react';
import { motion } from 'motion/react';
import { TRANSLATIONS, UserConfig } from '../../../shared/i18n/translations';
import { Language } from '../../../shared/types/game';

type Translations = (typeof TRANSLATIONS)['pt'];

interface TutorialOverlayProps {
  t: Translations;
  userConfig: UserConfig;
  onUpdateConfig: (patch: Partial<UserConfig>) => void;
  /** Cores de robô oferecidas no passo de configuração. */
  robotColors: { name: string; value: string }[];
  onFinish: () => void;
  playClick: () => void;
}

/**
 * Tutorial de primeira utilização: 8 passos. Monta-se só enquanto não foi concluído
 * (o pai guarda essa informação em localStorage).
 */
export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ t, userConfig, onUpdateConfig, robotColors, onFinish, playClick }) => {
  const [step, setStep] = useState(0);
  return (
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
                    animate={{ width: `${((step + 1) / 8) * 100}%` }}
                  />
                </div>
  
                <h3 className="text-xl font-bold text-brand-ice mb-4 flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-blue/20 text-brand-cyan text-sm">
                    {step + 1}
                  </span>
                  {t.tutorialTitle}
                </h3>
  
                <div className="text-brand-ice/75 mb-8 min-h-[80px]">
                  {step === 0 && <p>{t.tutorialWelcome}</p>}
                  {step === 1 && (
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
                  {step === 2 && (
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
                  {step === 3 && <p>{t.tutorialMove}</p>}
                  {step === 4 && <p>{t.tutorialPick}</p>}
                  {step === 5 && <p>{t.tutorialError}</p>}
                  {step === 6 && <p>{t.tutorialExecute}</p>}
                  {step === 7 && <p>{t.tutorialFinish}</p>}
                </div>
  
                <div className="flex gap-3">
                  {step > 0 && (
                    <button
                      onClick={() => {
                        playClick();
                        setStep(s => s - 1);
                      }}
                      className="flex-1 py-3 bg-brand-navy text-brand-ice/75 font-bold rounded-2xl hover:bg-white/10 transition-all"
                    >
                      {t.back}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      playClick();
                      if (step < 7) setStep(s => s + 1);
                      else onFinish();
                    }}
                    className="flex-[2] py-3 bg-brand-blue text-white font-bold rounded-2xl shadow-lg shadow-brand-blue/20 hover:bg-brand-blue transition-all"
                  >
                    {step < 7 ? t.continue : t.start}
                  </button>
                </div>
              </motion.div>
            </motion.div>
  );
};
