import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { LevelIntroModal } from './LevelIntroModal';

describe('LevelIntroModal', () => {
  afterEach(() => cleanup());

  it('é um diálogo modal com o título e o conceito', () => {
    render(<LevelIntroModal kicker="Nível 5" title="Enquanto (while)" body={['Explicação.']} closeLabel="Começar" onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByText('Enquanto (while)')).toBeTruthy();
    expect(screen.getByText('Explicação.')).toBeTruthy();
  });

  it('fecha com o botão e com Esc', () => {
    const onClose = vi.fn();
    render(<LevelIntroModal kicker="k" title="t" body={[]} closeLabel="Começar" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
