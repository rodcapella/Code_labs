import React, { useEffect, useRef } from 'react';
import { Portal } from './Portal';
import { Settings, ThemeSetting } from '../config/settings';
import { TRANSLATIONS } from '../i18n/translations';
import { ROBOT_PALETTE } from '../config/robotPalette';

/** Campos do perfil editáveis no menu (vêm do onboarding). */
export interface ProfileSettings {
  robotColor: string;
  language: 'pt' | 'en';
}

interface SettingsModalProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
  /** Idioma da interface (o menu segue o idioma do perfil; por defeito português). */
  lang?: 'pt' | 'en';
  profile?: ProfileSettings;
  onProfileChange?: (patch: Partial<ProfileSettings>) => void;
}

const Switch: React.FC<{ id: string; label: string; hint: string; checked: boolean; onToggle: () => void }> = ({
  id, label, hint, checked, onToggle,
}) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-white/10 last:border-0">
    <div>
      <p id={`${id}-label`} className="text-sm font-bold text-brand-ice">{label}</p>
      <p id={`${id}-hint`} className="text-xs text-brand-ice/70 mt-1">{hint}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      aria-describedby={`${id}-hint`}
      onClick={onToggle}
      className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
        checked ? 'bg-brand-blue border-brand-blue' : 'bg-brand-ink border-white/20'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-6' : 'left-0.5'}`}
      />
    </button>
  </div>
);

/** Menu de definições: acessibilidade (daltónicos, movimento, texto grande) e som. */
export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onChange, onClose, lang = 'pt', profile, onProfileChange }) => {
  const t = TRANSLATIONS[lang];
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <Portal>
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-brand-ink/85 p-4 backdrop-blur-sm">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-brand-cyan/40 bg-brand-navy p-6 shadow-2xl"
        >
          <h2 id="settings-title" className="text-lg font-bold text-brand-ice">{t.settingsTitle}</h2>

          <section className="mt-4" aria-labelledby="settings-look">
            <h3 id="settings-look" className="text-[11px] font-bold uppercase tracking-widest text-brand-cyan">
              {t.settingsLook}
            </h3>
            <p id="settings-theme-label" className="mt-3 text-sm font-bold text-brand-ice">{t.settingsTheme}</p>
            <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-labelledby="settings-theme-label">
              {(['auto', 'day', 'night'] as ThemeSetting[]).map(opt => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={settings.theme === opt}
                  onClick={() => onChange({ theme: opt })}
                  className={`rounded-xl py-2 text-xs font-bold border ${
                    settings.theme === opt ? 'bg-brand-blue border-brand-blue text-white' : 'bg-brand-ink border-white/15 text-brand-ice/80'
                  }`}
                >
                  {opt === 'auto' ? t.themeAuto : opt === 'day' ? t.themeDay : t.themeNight}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-4" aria-labelledby="settings-a11y">
            <h3 id="settings-a11y" className="text-[11px] font-bold uppercase tracking-widest text-brand-cyan">
              {t.settingsA11y}
            </h3>
            <Switch
              id="cvd"
              label={t.settingsColorblind}
              hint={t.settingsColorblindHint}
              checked={settings.colorblind}
              onToggle={() => onChange({ colorblind: !settings.colorblind })}
            />
            <Switch
              id="motion"
              label={t.settingsReduceMotion}
              hint={t.settingsReduceMotionHint}
              checked={settings.reduceMotion}
              onToggle={() => onChange({ reduceMotion: !settings.reduceMotion })}
            />
            <Switch
              id="text"
              label={t.settingsLargeText}
              hint={t.settingsLargeTextHint}
              checked={settings.largeText}
              onToggle={() => onChange({ largeText: !settings.largeText })}
            />
          </section>

          <section className="mt-6" aria-labelledby="settings-audio">
            <h3 id="settings-audio" className="text-[11px] font-bold uppercase tracking-widest text-brand-cyan">
              {t.settingsAudio}
            </h3>
            <Switch
              id="sound"
              label={t.settingsSound}
              hint={t.settingsSoundHint}
              checked={settings.sound}
              onToggle={() => onChange({ sound: !settings.sound })}
            />
          </section>

          {profile && onProfileChange && (
            <section className="mt-6" aria-labelledby="settings-profile">
              <h3 id="settings-profile" className="text-[11px] font-bold uppercase tracking-widest text-brand-cyan">
                {t.settingsProfile}
              </h3>

              <p id="settings-language-label" className="mt-3 text-sm font-bold text-brand-ice">{t.settingsLanguage}</p>
              <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-labelledby="settings-language-label">
                {(['pt', 'en'] as const).map(code => (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={profile.language === code}
                    onClick={() => onProfileChange({ language: code })}
                    className={`rounded-xl py-2 text-sm font-bold border transition-all ${
                      profile.language === code
                        ? 'bg-brand-blue border-brand-blue text-white'
                        : 'bg-brand-ink border-white/15 text-brand-ice/80 hover:border-brand-cyan/50'
                    }`}
                  >
                    {code === 'pt' ? 'Português' : 'English'}
                  </button>
                ))}
              </div>

              <p id="settings-robot-label" className="mt-4 text-sm font-bold text-brand-ice">{t.settingsRobotColor}</p>
              <div className="mt-2 grid grid-cols-4 gap-3" role="radiogroup" aria-labelledby="settings-robot-label">
                {ROBOT_PALETTE.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={profile.robotColor === c.value}
                    aria-label={t[c.key]}
                    onClick={() => onProfileChange({ robotColor: c.value })}
                    className={`aspect-square rounded-xl border-4 transition-all ${
                      profile.robotColor === c.value ? 'border-white scale-110' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </section>
          )}

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-2xl bg-brand-blue py-3 font-bold text-white shadow-lg shadow-brand-blue/20"
          >
            {t.settingsClose}
          </button>
        </div>
      </div>
    </Portal>
  );
};
