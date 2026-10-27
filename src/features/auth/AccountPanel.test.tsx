import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { AccountPanel } from './AccountPanel';
import { AccountProvider } from './AccountContext';
import { fetchSession } from './authApi';

vi.mock('./authApi', () => ({
  fetchSession: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(async () => {}),
}));

const messages = {
  login: 'Entrar', register: 'Criar conta', logout: 'Sair', username: 'Nome', password: 'Palavra-passe',
  rules: 'regras', hint: 'dica', loggedIn: (n: string) => `Sessão: ${n}`, badCredentials: 'bad',
  taken: 'taken', invalid: 'invalid', unavailable: 'indisponível',
};

describe('AccountPanel', () => {
  afterEach(() => cleanup());

  it('sem servidor de contas não mostra nada (o jogo fica anónimo)', async () => {
    vi.mocked(fetchSession).mockResolvedValue({ configured: false, account: null });
    const { container } = render(<AccountProvider><AccountPanel messages={messages} /></AccountProvider>);
    await waitFor(() => expect(vi.mocked(fetchSession)).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('com sessão ativa mostra o nome da conta e o botão de sair', async () => {
    vi.mocked(fetchSession).mockResolvedValue({ configured: true, account: { username: 'rui', email: null } });
    render(<AccountProvider><AccountPanel messages={messages} /></AccountProvider>);
    expect(await screen.findByText('Sessão: rui')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeTruthy();
  });

  it('sem sessão mostra o convite para entrar ou criar conta', async () => {
    vi.mocked(fetchSession).mockResolvedValue({ configured: true, account: null });
    render(<AccountProvider><AccountPanel messages={messages} /></AccountProvider>);
    expect(await screen.findByRole('button', { name: /Entrar/ })).toBeTruthy();
  });
});
