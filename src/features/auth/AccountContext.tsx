import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Account, fetchSession, login, logout, register, AuthResult, setEmail as apiSetEmail } from './authApi';

interface AccountValue {
  /** false quando o servidor não tem contas configuradas: o jogo fica só anónimo. */
  configured: boolean;
  account: Account | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<AuthResult>;
  signUp: (username: string, password: string, email?: string) => Promise<AuthResult>;
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
  account: null,
  loading: false,
  signIn: noop,
  signUp: noop,
  signOut: async () => {},
  linkEmail: async () => ({ ok: false, error: 'sem conta' }),
  clearAccount: () => {},
});

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [configured, setConfigured] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchSession().then(s => {
      if (!active) return;
      setConfigured(s.configured);
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

  const signUp = useCallback(async (u: string, p: string, email?: string) => {
    const r = await register(u, p, email);
    if (r.ok) setAccount(r.account);
    return r;
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
    () => ({ configured, account, loading, signIn, signUp, signOut, linkEmail, clearAccount }),
    [configured, account, loading, signIn, signUp, signOut, linkEmail, clearAccount],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
};

export const useAccount = (): AccountValue => useContext(AccountContext);
