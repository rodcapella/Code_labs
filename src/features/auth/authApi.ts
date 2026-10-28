const API_URL = '/api/auth';

export interface Account {
  username: string;
  email: string | null;
}

export interface SessionState {
  configured: boolean;
  googleEnabled?: boolean;
  account: Account | null;
}

export interface AuthResult {
  ok: boolean;
  account: Account | null;
  error?: string;
}

export interface AccountResult {
  levelId: number;
  score: number;
  commands: number;
  errors: number;
  time: number;
  date: string;
  structureBonus?: number;
  qualified: boolean;
  rank?: number;
  createdAt: string;
}

/** Arranca o login com Google: o servidor redireciona para o Google. */
export const googleStartUrl = (): string => `${API_URL}?action=google-start`;

/** Resposta genérica das ações de conta: ok ou a razão da recusa. */
export interface ActionResult {
  ok: boolean;
  error?: string;
}

const post = async (action: string, body?: unknown): Promise<{ status: number; data: Record<string, unknown> }> => {
  const res = await fetch(`${API_URL}?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, data };
};

/** Estado da sessão. Sem servidor, o jogo funciona como anónimo. */
export const fetchSession = async (): Promise<SessionState> => {
  try {
    const res = await fetch(`${API_URL}?action=me`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as SessionState;
  } catch {
    return { configured: false, account: null };
  }
};

const authPost = async (action: 'register' | 'login', username: string, password: string, email?: string): Promise<AuthResult> => {
  try {
    const { status, data } = await post(action, { username, password, ...(email ? { email } : {}) });
    const account = data.account as Account | undefined;
    if (status >= 400 || !account) return { ok: false, account: null, error: String(data.error ?? 'erro') };
    return { ok: true, account };
  } catch {
    return { ok: false, account: null, error: 'sem ligação' };
  }
};

export const register = (username: string, password: string, email?: string) => authPost('register', username, password, email);
export const login = (username: string, password: string) => authPost('login', username, password);

export const logout = async (): Promise<void> => {
  try {
    await post('logout');
  } catch {
    // Sem ligação, a sessão expira pelo próprio cookie.
  }
};

const act = async (action: string, body?: unknown): Promise<ActionResult> => {
  try {
    const { status, data } = await post(action, body);
    if (status >= 400) return { ok: false, error: String(data.error ?? 'erro') };
    return { ok: true };
  } catch {
    return { ok: false, error: 'sem ligação' };
  }
};

export const setEmail = (email: string) => act('set-email', { email });
export const requestPasswordReset = (email: string) => act('forgot', { email });
export const resetPassword = (token: string, password: string) => act('reset', { token, password });
export const deleteAccount = (password: string) => act('delete', { password });

export const fetchResults = async (): Promise<AccountResult[] | null> => {
  try {
    const res = await fetch(`${API_URL}?action=results`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { results: AccountResult[] };
    return data.results;
  } catch {
    return null;
  }
};
