import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Account, fetchSession, login, logout, register, AuthResult, setEmail as apiSetEmail } from './authApi';

interface AccountValue {
  /** false quando o servidor não tem contas configuradas: o jogo fica só anónimo. */
  configured: boolean;
  /** true quando o servidor tem o login com Google configurado. */
  googleEnabled: boolean;
  account: Account | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<AuthResult>;
  signUp: (username: string, password: string, email: string) => Promise<AuthResult>;
  /** Recarrega o estado da sessão (ex.: depois de confirmar o registo). */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Atualiza o email da conta em sessão (sem recarregar a página). */
  linkEmail: (email: string) => Promise<{ ok: boolean; error?: string }>;
  /** Limpa a conta local (após apagar a conta). */
  clearAccount: () => void;
}

const noop = async (): Promise<AuthResult> => ({ ok: false, account: null, error: 'sem conta' });

/** Valor por defeito (sem provider): anónimo. Assim os componentes funcionam sem contexto. */
const AccountContext = createContext<AccountValue>({
  configured: false,
  googleEnabled: false,
  account: null,
  loading: false,
  signIn: noop,
  signUp: noop,
  signOut: async () => {},
  refresh: async () => {},
  linkEmail: async () => ({ ok: false, error: 'sem conta' }),
  clearAccount: () => {},
});

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [configured, setConfigured] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchSession().then(s => {
      if (!active) return;
      setConfigured(s.configured);
      setGoogleEnabled(Boolean(s.googleEnabled));
      setAccount(s.account);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (u: string, p: string) => {
    const r = await login(u, p);
    if (r.ok) setAccount(r.account);
    return r;
  }, []);

  const signUp = useCallback(async (u: string, p: string, email: string) => {
    const r = await register(u, p, email);
    // Com pending, a conta ainda não existe: só se entra depois de confirmar o email.
    if (r.ok && r.account) setAccount(r.account);
    return r;
  }, []);

  const refresh = useCallback(async () => {
    const s = await fetchSession();
    setAccount(s.account);
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    setAccount(null);
  }, []);

  const linkEmail = useCallback(async (email: string) => {
    const r = await apiSetEmail(email);
    if (r.ok) setAccount(a => (a ? { ...a, email: email.trim().toLowerCase() } : a));
    return r;
  }, []);

  const clearAccount = useCallback(() => setAccount(null), []);

  const value = useMemo(
    () => ({ configured, googleEnabled, account, loading, signIn, signUp, signOut, refresh, linkEmail, clearAccount }),
    [configured, googleEnabled, account, loading, signIn, signUp, signOut, refresh, linkEmail, clearAccount],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
};

export const useAccount = (): AccountValue => useContext(AccountContext);
