import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TutorialOverlay } from './TutorialOverlay';
import { TRANSLATIONS, UserConfig } from '../../../shared/i18n/translations';

const t = TRANSLATIONS.pt;
const config: UserConfig = {
  name: 'rui', age: 20, level: 'beginner', language: 'pt', robotColor: '#3B82F6', completedLevels: [],
};

describe('tutorial', () => {
  afterEach(() => cleanup());

  it('avança pelos passos e termina no último', () => {
    const onFinish = vi.fn();
    render(
      <TutorialOverlay t={t} userConfig={config} onUpdateConfig={vi.fn()} robotColors={[]}
        onFinish={onFinish} playClick={vi.fn()} />,
    );
    expect(screen.getByText(t.tutorialWelcome)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.continue }));
    expect(screen.queryByText(t.tutorialWelcome)).toBeNull();
    // Avança até ao último passo, cujo botão é "Começar".
    for (let i = 0; i < 6; i++) fireEvent.click(screen.getByRole('button', { name: t.continue }));
    expect(onFinish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: t.start }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('o botão voltar só aparece depois do primeiro passo', () => {
    render(
      <TutorialOverlay t={t} userConfig={config} onUpdateConfig={vi.fn()} robotColors={[]}
        onFinish={vi.fn()} playClick={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /voltar|back/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.continue }));
    expect(screen.getByRole('button', { name: /voltar|back/i })).toBeTruthy();
  });
});
