import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { LevelTimer } from './LevelTimer';

describe('LevelTimer', () => {
  afterEach(() => cleanup());

  it('mostra o tempo em mm:ss', () => {
    render(<LevelTimer seconds={75} running label="Tempo" />);
    expect(screen.getByText('01:15')).toBeTruthy();
  });

  it('expõe o tempo a leitores de ecrã por extenso', () => {
    render(<LevelTimer seconds={75} running label="Tempo" />);
    expect(screen.getByRole('timer').getAttribute('aria-label')).toBe('Tempo: 1 min 15 s');
  });

  it('zero segundos mostra 00:00', () => {
    render(<LevelTimer seconds={0} running={false} label="Tempo" />);
    expect(screen.getByText('00:00')).toBeTruthy();
  });
});
