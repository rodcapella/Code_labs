import React from 'react';
import { motion } from 'motion/react';
import { Play, Code2, LogOut, CheckCircle2, Trophy } from 'lucide-react';

import { UserConfig, TRANSLATIONS } from '../../shared/i18n/translations';
import { Logo } from '../../shared/components/Logo';
import { AccountPanel, ResetPasswordPanel, ConfirmSignupPanel } from '../auth/AccountPanel';
import { useSettings } from '../../shared/components/SettingsContext';
import { BadgesPanel } from '../badges/BadgesPanel';
import { DailyCard } from '../daily/DailyCard';
import { useAccount } from '../auth/AccountContext';
import { LEVEL_IDS } from '../../shared/config/rules';

interface HomeScreenProps {
  onStart: () => void;
  onStartDaily: () => void;
  /** Mensagem do desafio (sem conta, ou já jogado hoje). */
  dailyMessage: string | null;
  onLeaderboard: () => void;
  onResults: () => void;
  userConfig: UserConfig;
  onReset: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onStart, onStartDaily, dailyMessage, onLeaderboard, onResults, userConfig, onReset }) => {
  const { openSettings } = useSettings();
  const { account } = useAccount();
  // Link de recuperação do email: ?reset=token abre o ecrã de nova palavra-passe.
  // Links do email usam o fragmento (#reset= / #confirm=): não vão ao servidor nem aos registos de acesso.
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const [resetToken, setResetToken] = React.useState<string | null>(() => fragment.get('reset'));
  const [confirmToken, setConfirmToken] = React.useState<string | null>(() => fragment.get('confirm'));
  const finishReset = () => {
    window.history.replaceState({}, '', window.location.pathname);
    setResetToken(null);
  };
  const finishConfirm = () => {
    window.history.replaceState({}, '', window.location.pathname);
    setConfirmToken(null);
  };

  const t = TRANSLATIONS[userConfig.language];

  return (
    <div className="brand-page min-h-screen flex flex-col items-center justify-center p-6 bg-radial-[at_50%_50%] from-brand-ink to-brand-navy">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center w-full max-w-lg"
      >
        <div className="flex justify-center mb-8">
          <div 
            className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-blue/20 rotate-12"
            style={{ backgroundColor: userConfig.robotColor }}
          >
            <Code2 className="w-12 h-12 text-white -rotate-12" />
          </div>
        </div>

        <div className="mb-4">
          <span className="text-xs font-bold text-brand-cyan uppercase tracking-[0.3em]">
            {t.welcome} {userConfig.name}
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-brand-ice mb-4">
          CodeBot <span className="text-brand-cyan">Lab</span>
        </h1>
        
        <p className="text-brand-ice/60 text-lg mb-12 max-w-md mx-auto">
          {t.labDescription}
        </p>

        <div className="flex flex-col gap-4 items-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStart}
            className="group relative inline-flex items-center gap-3 px-12 py-4 bg-brand-navy text-white rounded-2xl font-semibold text-lg shadow-xl hover:bg-brand-navy transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            {t.start}
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-blue to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLeaderboard}
            className="group relative inline-flex items-center gap-3 px-12 py-4 bg-brand-blue text-white rounded-2xl font-semibold text-lg shadow-xl hover:bg-brand-blue transition-all brand-page text-[10px]"
          >
            <Trophy className="w-5 h-5" />
            {t.leaderboard}
          </motion.button>

          <button
            onClick={onReset}
            className="flex items-center gap-2 text-brand-ice/50 hover:text-red-500 transition-colors text-sm font-bold uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" />
            {t.resetProfile}
          </button>
        </div>

        {/* Level Progress */}
        <div className="mt-16 p-8 bg-brand-navy rounded-[32px] border border-white/10 shadow-sm">
          <h3 className="text-xs font-bold text-brand-ice/50 uppercase tracking-widest mb-6">
            {t.labProgress}
          </h3>
          <div className="flex items-center gap-4 justify-center">
            {LEVEL_IDS.map(lvlId => (
              <div 
                key={lvlId}
                className={`relative w-14 h-14 rounded-2xl flex items-center justify-center font-bold transition-all ${
                  userConfig.completedLevels.includes(lvlId)
                    ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200'
                    : 'bg-brand-ink text-brand-ice/40 border-2 border-white/10'
                }`}
              >
                {lvlId}
                {(userConfig.stars?.[lvlId] ?? 0) > 0 && (
                  <span className="absolute -bottom-5 left-0 right-0 text-center text-[10px] text-amber-300" aria-label={`${userConfig.stars?.[lvlId]} estrelas`}>
                    {'★'.repeat(userConfig.stars?.[lvlId] ?? 0)}
                  </span>
                )}
                {userConfig.completedLevels.includes(lvlId) && (
                  <div className="absolute -top-2 -right-2 bg-brand-navy rounded-full p-0.5 shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10">
          {confirmToken && (
            <div className="mb-6">
              <ConfirmSignupPanel
                token={confirmToken}
                onDone={finishConfirm}
                messages={{ title: t.confirmTitle, done: t.confirmDone, expired: t.confirmExpired, busy: t.confirmBusy }}
              />
            </div>
          )}
          {resetToken && (
            <div className="mb-6">
              <ResetPasswordPanel
                token={resetToken}
                onDone={finishReset}
                messages={{
                  title: t.resetTitle,
                  password: t.accountPassword,
                  save: t.resetSave,
                  done: t.resetDone,
                  invalid: t.accountInvalid,
                  expired: t.resetExpired,
                  rules: t.accountRules,
                }}
              />
            </div>
          )}
          <div className="mb-4">
            <DailyCard
              t={t}
              loggedIn={account !== null}
              streak={account?.streak?.count ?? 0}
              doneToday={account?.dailyDoneToday === true}
              message={dailyMessage}
              onPlay={onStartDaily}
            />
          </div>
          <div className="mb-4">
            <BadgesPanel
              t={t}
              unlocked={[...new Set([...(userConfig.badges ?? []), ...(account?.badges ?? [])])]}
            />
          </div>
          <div className="mb-4 flex justify-center">
            <button
              type="button"
              onClick={openSettings}
              className="text-xs text-brand-cyan underline underline-offset-4"
            >
              {t.settingsTitle}
            </button>
          </div>
          <AccountPanel
            onResults={onResults}
            messages={{
              login: t.accountLogin,
              register: t.accountRegister,
              logout: t.accountLogout,
              username: t.accountUsername,
              password: t.accountPassword,
              rules: t.accountRules,
              hint: t.accountHint,
              loggedIn: name => t.accountLoggedIn(name),
              badCredentials: t.accountBadCredentials,
              taken: t.accountTaken,
              invalid: t.accountInvalid,
              unavailable: t.accountUnavailable,
              email: t.accountEmail,
              emailOptional: t.accountEmailOptional,
              emailTaken: t.accountEmailTaken,
              forgot: t.accountForgot,
              forgotSent: t.accountForgotSent,
              forgotHelp: t.accountForgotHelp,
              sendLink: t.accountSendLink,
              myResults: t.accountMyResults,
              addEmail: t.accountAddEmail,
              emailOnAccount: (e: string) => t.accountEmailOn(e),
              noEmail: t.accountNoEmail,
              deleteAccount: t.accountDelete,
              deleteConfirm: t.accountDeleteConfirm,
              deleteDone: t.accountDeleted,
              wrongPassword: t.accountWrongPassword,
              back: t.back,
              googleLogin: t.accountGoogle,
              googleError: t.accountGoogleError,
              emailRequired: t.accountEmailRequired,
              registerSent: t.accountRegisterSent,
            }}
          />
        </div>

      </motion.div>
    </div>
  );
};
