import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HomeScreen } from './screens/HomeScreen';
import { GameScreen } from './screens/GameScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { UserConfig } from './constants/translations';

type Screen = 'ONBOARDING' | 'HOME' | 'GAME' | 'LEADERBOARD';

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
        setUserConfig(parsed);
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
    </div>
  );
}
