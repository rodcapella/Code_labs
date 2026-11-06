import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings, saveSettings, applySettings, DEFAULT_SETTINGS } from './settings';

describe('preferências', () => {
  beforeEach(() => localStorage.clear());

  it('sem nada guardado, usa os valores por defeito (som ligado)', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.sound).toBe(true);
  });

  it('guarda e lê de volta', () => {
    saveSettings({ theme: 'auto', colorblind: true, reduceMotion: true, largeText: false, sound: false });
    expect(loadSettings()).toEqual({ theme: 'auto', colorblind: true, reduceMotion: true, largeText: false, sound: false });
  });

  it('valores inválidos ou em falta caem para o padrão', () => {
    localStorage.setItem('codebot_settings', JSON.stringify({ colorblind: 'sim', sound: 0 }));
    const s = loadSettings();
    expect(s.colorblind).toBe(false);
    expect(s.sound).toBe(true);
  });

  it('JSON corrompido não quebra a aplicação', () => {
    localStorage.setItem('codebot_settings', '{não é json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('aplica as opções ao documento através de atributos data-*', () => {
    const root = document.createElement('html');
    applySettings({ theme: 'auto', colorblind: true, reduceMotion: true, largeText: true, sound: true }, root);
    expect(root.dataset.cvd).toBe('on');
    expect(root.dataset.reduceMotion).toBe('on');
    expect(root.style.fontSize).toBe('112%');
    applySettings(DEFAULT_SETTINGS, root);
    expect(root.dataset.cvd).toBe('off');
    expect(root.style.fontSize).toBe('');
  });
});
