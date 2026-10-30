import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SettingsModal } from './SettingsModal';
import { DEFAULT_SETTINGS } from '../config/settings';

describe('menu de definições', () => {
  afterEach(() => cleanup());

  it('cada opção é um interruptor com o estado indicado', () => {
    render(<SettingsModal settings={DEFAULT_SETTINGS} onChange={vi.fn()} onClose={vi.fn()} />);
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(4);
    expect(screen.getByRole('switch', { name: 'Modo para daltónicos' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('switch', { name: 'Efeitos sonoros' }).getAttribute('aria-checked')).toBe('true');
  });

  it('ligar o modo para daltónicos envia só essa alteração', () => {
    const onChange = vi.fn();
    render(<SettingsModal settings={DEFAULT_SETTINGS} onChange={onChange} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Modo para daltónicos' }));
    expect(onChange).toHaveBeenCalledWith({ colorblind: true });
  });

  it('Esc e o botão fecham o menu', () => {
    const onClose = vi.fn();
    render(<SettingsModal settings={DEFAULT_SETTINGS} onChange={vi.fn()} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('com perfil, mostra o idioma e as 12 cores do robô', () => {
    render(
      <SettingsModal settings={DEFAULT_SETTINGS} onChange={vi.fn()} onClose={vi.fn()}
        profile={{ robotColor: '#3B82F6', language: 'pt' }} onProfileChange={vi.fn()} />,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(12);
    expect(screen.getByRole('button', { name: 'Português' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('escolher outra cor do robô atualiza o perfil', () => {
    const onProfileChange = vi.fn();
    render(
      <SettingsModal settings={DEFAULT_SETTINGS} onChange={vi.fn()} onClose={vi.fn()}
        profile={{ robotColor: '#3B82F6', language: 'pt' }} onProfileChange={onProfileChange} />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Vermelho' }));
    expect(onProfileChange).toHaveBeenCalledWith({ robotColor: '#EF4444' });
  });

  it('sem perfil, a secção não aparece (o menu funciona sozinho)', () => {
    render(<SettingsModal settings={DEFAULT_SETTINGS} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });
});
