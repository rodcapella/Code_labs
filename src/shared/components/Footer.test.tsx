import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer', () => {
  afterEach(() => cleanup());

  it('mostra copyright com o ano atual e a autoria', () => {
    const year = new Date().getFullYear();
    render(<Footer rights={y => `© ${y} Sapiente AI.`} developedBy="Projeto desenvolvido pela Sapiente AI" />);
    expect(screen.getByText(`© ${year} Sapiente AI.`)).toBeTruthy();
    expect(screen.getByText('Projeto desenvolvido pela Sapiente AI')).toBeTruthy();
  });

  it('tem um link para sapienteai.com que abre numa nova aba', () => {
    const { container } = render(<Footer rights={() => ''} developedBy="" />);
    const link = container.querySelector('a[href="https://sapienteai.com"]');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toContain('noopener');
  });
});
