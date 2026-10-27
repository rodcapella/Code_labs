import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArcadeLoader } from './ArcadeLoader';

describe('ArcadeLoader', () => {
  it('anuncia o carregamento a leitores de ecrã com o texto dado', () => {
    render(<ArcadeLoader label="A preparar o nível…" />);
    const status = screen.getByRole('status');
    expect(status).toBeTruthy();
    expect(screen.getByText('A preparar o nível…')).toBeTruthy();
  });

  it('desenha a fila de blocos de progresso', () => {
    const { container } = render(<ArcadeLoader label="x" />);
    expect(container.querySelectorAll('.arcade-block')).toHaveLength(10);
  });
});
