import { setSoundsOn } from '../utils/audio';

export interface Settings {
  /** Troca vermelho/verde por laranja/azul e acrescenta padrões às cores de erro. */
  colorblind: boolean;
  /** Desliga animações (além da preferência do sistema). */
  reduceMotion: boolean;
  /** Aumenta o tamanho do texto. */
  largeText: boolean;
  /** Efeitos sonoros. */
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = { colorblind: false, reduceMotion: false, largeText: false, sound: true };

const STORAGE_KEY = 'codebot_settings';

/** Lê as preferências guardadas. Valores em falta ou inválidos caem para o padrão. */
export const loadSettings = (): Settings => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Settings>;
    return {
      colorblind: raw.colorblind === true,
      reduceMotion: raw.reduceMotion === true,
      largeText: raw.largeText === true,
      sound: raw.sound !== false,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (s: Settings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
};

/** Aplica as preferências ao documento (atributos data-* lidos pelo CSS) e ao áudio. */
export const applySettings = (s: Settings, root: HTMLElement = document.documentElement): void => {
  root.dataset.cvd = s.colorblind ? 'on' : 'off';
  root.dataset.reduceMotion = s.reduceMotion ? 'on' : 'off';
  root.style.fontSize = s.largeText ? '112%' : '';
  setSoundsOn(s.sound);
};
