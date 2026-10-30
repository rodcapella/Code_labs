import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { Settings, loadSettings, saveSettings, applySettings } from '../config/settings';
import { SettingsModal, ProfileSettings } from './SettingsModal';

interface SettingsValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  openSettings: () => void;
}

const SettingsContext = createContext<SettingsValue>({
  settings: loadSettings(),
  update: () => {},
  openSettings: () => {},
});

/**
 * Preferências de acessibilidade e som. Aplica-as ao documento e ao MotionConfig,
 * e é dono do menu de definições (aberto de qualquer ecrã).
 */
interface SettingsProviderProps {
  children: React.ReactNode;
  lang?: 'pt' | 'en';
  /** Perfil do jogador (cor do robô e idioma). Vem do onboarding; o menu pode alterá-lo. */
  profile?: ProfileSettings;
  onProfileChange?: (patch: Partial<ProfileSettings>) => void;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children, lang = 'pt', profile, onProfileChange }) => {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    applySettings(settings);
    saveSettings(settings);
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings(s => ({ ...s, ...patch }));
  }, []);

  const openSettings = useCallback(() => setOpen(true), []);
  const closeSettings = useCallback(() => setOpen(false), []);

  const value = useMemo(() => ({ settings, update, openSettings }), [settings, update, openSettings]);

  return (
    <SettingsContext.Provider value={value}>
      <MotionConfig reducedMotion={settings.reduceMotion ? 'always' : 'user'}>
        {children}
        {open && (
          <SettingsModal
            settings={settings}
            onChange={update}
            onClose={closeSettings}
            lang={lang}
            profile={profile}
            onProfileChange={onProfileChange}
          />
        )}
      </MotionConfig>
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsValue => useContext(SettingsContext);
