import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BadgesPanel, BadgesStrip } from './BadgesPanel';
import { TRANSLATIONS } from '../../shared/i18n/translations';

const t = TRANSLATIONS.pt;

describe('distintivos', () => {
  afterEach(() => cleanup());

  it('mostra os três distintivos e marca os que estão por desbloquear', () => {
    render(<BadgesPanel t={t} unlocked={['sprint']} />);
    expect(screen.getByText(t.badgeSprint)).toBeTruthy();
    expect(screen.getByText(t.badgeEfficiency)).toBeTruthy();
    expect(screen.getByText(t.badgeResilient)).toBeTruthy();
    expect(screen.getAllByText(t.badgesLocked)).toHaveLength(2);
  });

  it('a faixa de vitória só aparece quando há distintivos ganhos', () => {
    const { container, rerender } = render(<BadgesStrip t={t} earned={[]} />);
    expect(container.textContent).toBe('');
    rerender(<BadgesStrip t={t} earned={['efficiency']} />);
    expect(screen.getByText(t.badgesNew)).toBeTruthy();
    expect(screen.getByText(t.badgeEfficiency)).toBeTruthy();
  });
});
