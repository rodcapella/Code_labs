import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SettingsProvider } from '../shared/components/SettingsContext';
import { HomeScreen } from '../features/home/HomeScreen';
import { GameScreen } from '../features/game/GameScreen';
import { OnboardingScreen } from '../features/onboarding/OnboardingScreen';
import { LeaderboardScreen } from '../features/leaderboard/LeaderboardScreen';
import { MyResultsScreen } from '../features/auth/MyResultsScreen';
import { TRANSLATIONS } from '../shared/i18n/translations';
import { UserConfig } from '../shared/i18n/translations';
import { AccountProvider } from '../features/auth/AccountContext';
import { Footer } from '../shared/components/Footer';

type Screen = 'ONBOARDING' | 'HOME' | 'GAME' | 'LEADERBOARD' | 'RESULTS';

const STORAGE_KEY = 'codebot_lab_user_config';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('ONBOARDING');
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load config from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem(STORAGE_KEY);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        // Versão 2 dos níveis: os números mudaram de tema, por isso o progresso antigo não se aplica.
        const migrated = parsed.levelsVersion === 2 ? parsed : { ...parsed, completedLevels: [], levelsVersion: 2 };
        setUserConfig(migrated);
        setCurrentScreen('HOME');
      } catch (e) {
        console.error('Failed to parse saved config', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save config to localStorage whenever it changes
  useEffect(() => {
    if (userConfig) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userConfig));
    }
  }, [userConfig]);

  const handleOnboardingComplete = (config: UserConfig) => {
    setUserConfig(config);
    setCurrentScreen('HOME');
  };

  const updateUserConfig = (newConfig: Partial<UserConfig>) => {
    setUserConfig(prev => prev ? { ...prev, ...newConfig } : null);
  };

  const handleResetProfile = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUserConfig(null);
    setCurrentScreen('ONBOARDING');
  };

  if (!isLoaded) return null;

  return (
    <SettingsProvider
      lang={userConfig?.language ?? 'pt'}
      profile={userConfig ? { robotColor: userConfig.robotColor, language: userConfig.language } : undefined}
      onProfileChange={patch => setUserConfig(prev => (prev ? { ...prev, ...patch } : prev))}
    >
    <AccountProvider>
    <div className="min-h-screen overflow-hidden">
      <AnimatePresence mode="wait">
        {currentScreen === 'ONBOARDING' && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full"
          >
            <OnboardingScreen onComplete={handleOnboardingComplete} />
          </motion.div>
        )}

        {currentScreen === 'HOME' && userConfig && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full"
          >
            <HomeScreen 
              onStart={() => setCurrentScreen('GAME')} 
              onLeaderboard={() => setCurrentScreen('LEADERBOARD')}
              onResults={() => setCurrentScreen('RESULTS')}
              userConfig={userConfig}
              onReset={handleResetProfile}
            />
          </motion.div>
        )}

        {currentScreen === 'GAME' && userConfig && (
          <motion.div
            key="game"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="h-full"
          >
            <GameScreen 
              onBack={() => setCurrentScreen('HOME')} 
              userConfig={userConfig}
              onUpdateConfig={updateUserConfig}
            />
          </motion.div>
        )}

        {currentScreen === 'RESULTS' && userConfig && (
          <MyResultsScreen
            onBack={() => setCurrentScreen('HOME')}
            messages={myResultsMessages(userConfig.language)}
          />
        )}
        {currentScreen === 'LEADERBOARD' && userConfig && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="h-full"
          >
            <LeaderboardScreen 
              onBack={() => setCurrentScreen('HOME')} 
              userConfig={userConfig}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <Footer
        rights={TRANSLATIONS[userConfig?.language ?? 'pt'].footerRights}
        developedBy={TRANSLATIONS[userConfig?.language ?? 'pt'].footerDeveloped}
      />
    </div>
    </AccountProvider>
    </SettingsProvider>
  );
}

const myResultsMessages = (lang: 'pt' | 'en') => {
  const t = TRANSLATIONS[lang];
  return {
    title: t.myResultsTitle, back: t.back, empty: t.myResultsEmpty, loading: t.loadingRanking,
    unavailable: t.myResultsUnavailable, level: t.level, points: t.points, commands: t.cmds,
    errors: t.errorsLabel, time: t.time, date: t.myResultsDate, status: t.myResultsStatus,
    inRanking: t.myResultsIn, notInRanking: t.myResultsOut, rank: t.myResultsRank,
  };
};
