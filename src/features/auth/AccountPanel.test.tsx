import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { AccountPanel } from './AccountPanel';
import { AccountProvider } from './AccountContext';
import { fetchSession } from './authApi';

vi.mock('./authApi', () => ({
  fetchSession: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(async () => {}),
  googleStartUrl: () => '/api/auth?action=google-start',
  requestPasswordReset: vi.fn(),
  deleteAccount: vi.fn(),
  resetPassword: vi.fn(),
  setEmail: vi.fn(),
}));

const messages = {
  login: 'Entrar', register: 'Criar conta', logout: 'Sair', username: 'Nome', password: 'Palavra-passe',
  rules: 'regras', hint: 'dica', loggedIn: (n: string) => `Sessão: ${n}`, badCredentials: 'bad',
  taken: 'taken', invalid: 'invalid', unavailable: 'indisponível',
  email: 'Email', emailOptional: 'Email opcional', emailTaken: 'taken email', forgot: 'Esqueci', forgotSent: 'ok', forgotHelp: 'ajuda',
  sendLink: 'Enviar', myResults: 'Resultados', addEmail: 'Ligar', emailOnAccount: (e: string) => e, noEmail: 'sem email',
  deleteAccount: 'Apagar conta', deleteConfirm: 'confirma', deleteDone: 'apagada', wrongPassword: 'errada', back: 'Voltar',
  googleLogin: 'Entrar com Google', googleError: 'erro google', emailRequired: 'email obrigatório', registerSent: 'enviado',
};
const noop = () => {};

describe('AccountPanel', () => {
  afterEach(() => cleanup());

  it('sem servidor de contas não mostra nada (o jogo fica anónimo)', async () => {
    vi.mocked(fetchSession).mockResolvedValue({ configured: false, account: null });
    const { container } = render(<AccountProvider><AccountPanel messages={messages} onResults={noop} /></AccountProvider>);
    await waitFor(() => expect(vi.mocked(fetchSession)).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('com sessão ativa mostra o nome da conta e o botão de sair', async () => {
    vi.mocked(fetchSession).mockResolvedValue({ configured: true, account: { username: 'rui', email: null } });
    render(<AccountProvider><AccountPanel messages={messages} onResults={noop} /></AccountProvider>);
    expect(await screen.findByText('Sessão: rui')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeTruthy();
  });

  it('sem sessão mostra o convite para entrar ou criar conta', async () => {
    vi.mocked(fetchSession).mockResolvedValue({ configured: true, account: null });
    render(<AccountProvider><AccountPanel messages={messages} onResults={noop} /></AccountProvider>);
    expect(await screen.findByRole('button', { name: /Entrar/ })).toBeTruthy();
  });

  it('mostra o botão Google quando o servidor o tem configurado', async () => {
    vi.mocked(fetchSession).mockResolvedValue({ configured: true, googleEnabled: true, account: null });
    render(<AccountProvider><AccountPanel messages={messages} onResults={noop} /></AccountProvider>);
    fireEvent.click(await screen.findByRole('button', { name: /Entrar/ }));
    const link = await screen.findByRole('link', { name: 'Entrar com Google' });
    expect(link.getAttribute('href')).toBe('/api/auth?action=google-start');
  });
});
