import React, { useState } from 'react';
import { useAccount } from './AccountContext';
import { validateUsername, validatePassword } from './domain/authRules';
import { requestPasswordReset, deleteAccount, resetPassword } from './authApi';

export interface AccountMessages {
  login: string;
  register: string;
  logout: string;
  username: string;
  password: string;
  email: string;
  emailOptional: string;
  rules: string;
  hint: string;
  loggedIn: (name: string) => string;
  badCredentials: string;
  taken: string;
  emailTaken: string;
  invalid: string;
  unavailable: string;
  forgot: string;
  forgotSent: string;
  forgotHelp: string;
  sendLink: string;
  myResults: string;
  addEmail: string;
  emailOnAccount: (email: string) => string;
  noEmail: string;
  deleteAccount: string;
  deleteConfirm: string;
  deleteDone: string;
  wrongPassword: string;
  back: string;
}

interface AccountPanelProps {
  messages: AccountMessages;
  onResults: () => void;
}

const btn = 'px-3 py-1 rounded-lg border border-white/15 hover:border-brand-cyan/50 text-xs';
const field = 'w-full px-3 py-2 rounded-xl bg-brand-ink border border-white/15 text-brand-ice text-sm';

/** Conta opcional: entrar, criar, recuperar palavra-passe, email, resultados e apagar conta. */
export const AccountPanel: React.FC<AccountPanelProps> = ({ messages: m, onResults }) => {
  const { configured, account, loading, signIn, signUp, signOut, linkEmail, clearAccount } = useAccount();
  const [mode, setMode] = useState<'closed' | 'auth' | 'forgot'>('closed');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmailInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (loading || !configured) return null;

  if (account) {
    const addEmail = async () => {
      setBusy(true); setError(null);
      const r = await linkEmail(email);
      setBusy(false);
      if (r.ok) { setEmailInput(''); setNotice(m.emailOnAccount(email.trim())); }
      else setError(r.error === 'esse email já está ligado a outra conta' ? m.emailTaken : m.invalid);
    };
    const doDelete = async () => {
      setBusy(true); setError(null);
      const r = await deleteAccount(password);
      setBusy(false);
      if (r.ok) { clearAccount(); setConfirming(false); setPassword(''); setNotice(m.deleteDone); }
      else setError(r.error === 'palavra-passe incorreta' ? m.wrongPassword : m.unavailable);
    };
    return (
      <div className="mx-auto max-w-sm space-y-3 text-center text-xs text-brand-ice/80">
        <p>{m.loggedIn(account.username)}</p>
        <p className="text-brand-ice/60">{account.email ? m.emailOnAccount(account.email) : m.noEmail}</p>
        {!account.email && (
          <div className="flex gap-2">
            <input value={email} onChange={e => setEmailInput(e.target.value)} placeholder={m.email} aria-label={m.email} className={field} />
            <button onClick={() => void addEmail()} disabled={busy || email.trim() === ''} className={btn}>{m.addEmail}</button>
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={onResults} className={btn}>{m.myResults}</button>
          <button onClick={() => void signOut()} className={btn}>{m.logout}</button>
          <button onClick={() => setConfirming(c => !c)} className={`${btn} text-red-300`}>{m.deleteAccount}</button>
        </div>
        {confirming && (
          <div className="space-y-2">
            <p className="text-red-300">{m.deleteConfirm}</p>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={m.password} aria-label={m.password} className={field} />
            <button onClick={() => void doDelete()} disabled={busy || password === ''} className={`${btn} text-red-300`}>{m.deleteAccount}</button>
          </div>
        )}
        {notice && <p className="text-brand-cyan">{notice}</p>}
        {error && <p className="text-red-400">{error}</p>}
      </div>
    );
  }

  if (mode === 'closed') {
    return (
      <div className="flex justify-center">
        <button onClick={() => setMode('auth')} className="text-xs text-brand-cyan underline underline-offset-4">
          {m.login} / {m.register}
        </button>
      </div>
    );
  }

  if (mode === 'forgot') {
    const send = async () => {
      setBusy(true); setError(null);
      const r = await requestPasswordReset(email);
      setBusy(false);
      if (r.ok) setNotice(m.forgotSent);
      else setError(m.unavailable);
    };
    return (
      <div className="mx-auto max-w-sm space-y-3">
        <p className="text-[11px] text-brand-ice/70 text-center">{m.forgotHelp}</p>
        <input type="email" value={email} onChange={e => setEmailInput(e.target.value)} placeholder={m.email} aria-label={m.email} className={field} />
        <div className="flex gap-2">
          <button onClick={() => void send()} disabled={busy || email.trim() === ''} className="flex-1 py-2 rounded-xl bg-brand-blue text-white text-sm font-bold disabled:opacity-40">{m.sendLink}</button>
          <button onClick={() => { setMode('auth'); setNotice(null); setError(null); }} className="flex-1 py-2 rounded-xl bg-brand-navy text-brand-ice text-sm border border-white/15">{m.back}</button>
        </div>
        {notice && <p className="text-brand-cyan text-xs text-center">{notice}</p>}
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
      </div>
    );
  }

  const submit = async (kind: 'login' | 'register') => {
    const u = validateUsername(username);
    const p = validatePassword(password);
    if (u === null || p === null) { setError(m.invalid); return; }
    setBusy(true); setError(null);
    const r = kind === 'login' ? await signIn(u, p) : await signUp(u, p, email.trim() || undefined);
    setBusy(false);
    if (!r.ok) {
      setError(
        r.error === 'esse nome já existe' ? m.taken
          : r.error === 'esse email já está ligado a outra conta' ? m.emailTaken
          : r.error === 'nome ou palavra-passe inválidos' ? m.badCredentials
          : r.error === 'email inválido' ? m.invalid
          : m.unavailable,
      );
    }
  };

  return (
    <form className="mx-auto max-w-sm space-y-3 text-left" onSubmit={e => { e.preventDefault(); void submit('login'); }}>
      <p className="text-[11px] text-brand-ice/70 text-center">{m.hint}</p>
      <input value={username} onChange={e => setUsername(e.target.value)} placeholder={m.username} aria-label={m.username} maxLength={10} className={field} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={m.password} aria-label={m.password} maxLength={128} className={field} />
      <input type="email" value={email} onChange={e => setEmailInput(e.target.value)} placeholder={m.emailOptional} aria-label={m.emailOptional} className={field} />
      <p className="text-[10px] text-brand-ice/60">{m.rules}</p>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="flex-1 py-2 rounded-xl bg-brand-blue text-white text-sm font-bold disabled:opacity-40">{m.login}</button>
        <button type="button" disabled={busy} onClick={() => void submit('register')} className="flex-1 py-2 rounded-xl bg-brand-navy text-brand-ice text-sm font-bold border border-white/15 disabled:opacity-40">{m.register}</button>
      </div>
      <div className="flex justify-between text-[11px]">
        <button type="button" onClick={() => { setMode('forgot'); setError(null); setNotice(null); }} className="text-brand-cyan underline">{m.forgot}</button>
        <button type="button" onClick={() => setMode('closed')} className="text-brand-ice/60 underline">{m.back}</button>
      </div>
    </form>
  );
};

/** Ecrã de redefinição, aberto pelo link do email (?reset=token). */
export const ResetPasswordPanel: React.FC<{
  token: string;
  messages: { title: string; password: string; save: string; done: string; invalid: string; expired: string; rules: string };
  onDone: () => void;
}> = ({ token, messages: m, onDone }) => {
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async () => {
    const p = validatePassword(password);
    if (p === null) { setError(m.invalid); setState('error'); return; }
    setState('busy');
    const r = await resetPassword(token, p);
    if (r.ok) setState('done');
    else { setError(m.expired); setState('error'); }
  };

  return (
    <div className="mx-auto max-w-sm space-y-3 rounded-2xl border border-brand-cyan/40 p-4">
      <p className="text-sm font-bold text-brand-ice">{m.title}</p>
      {state === 'done' ? (
        <>
          <p className="text-brand-cyan text-xs">{m.done}</p>
          <button onClick={onDone} className="w-full py-2 rounded-xl bg-brand-blue text-white text-sm font-bold">OK</button>
        </>
      ) : (
        <>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={m.password} aria-label={m.password} maxLength={128} className={field} />
          <p className="text-[10px] text-brand-ice/60">{m.rules}</p>
          {state === 'error' && <p className="text-red-400 text-xs">{error}</p>}
          <button onClick={() => void submit()} disabled={state === 'busy' || password === ''} className="w-full py-2 rounded-xl bg-brand-blue text-white text-sm font-bold disabled:opacity-40">{m.save}</button>
        </>
      )}
    </div>
  );
};
