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
});
