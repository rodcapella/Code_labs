/** Sons ligados ou desligados (definições). */
let soundsOn = true;
export const setSoundsOn = (on: boolean): void => {
  soundsOn = on;
};

// Criado de forma tolerante: ambientes sem Web Audio (testes) não podem falhar ao importar.
const audioCtx: AudioContext | null = (() => {
  try {
    const Ctor = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : undefined;
    return Ctor ? new Ctor() : null;
  } catch {
    return null;
  }
})();

const playTone = (freq: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
  if (!audioCtx) return;
  
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

  gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration);
};

export const playMoveSound = () => {
  if (!soundsOn) return;
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
  
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(now + 0.1);
};

export const playTurnSound = () => {
  if (!soundsOn) return;
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
  
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(now + 0.1);
};

export const playPickSound = () => {
  if (!soundsOn) return;
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  
  // Note 1
  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.frequency.setValueAtTime(523.25, now); // C5
  gain1.gain.setValueAtTime(0.1, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
  osc1.connect(gain1);
  gain1.connect(audioCtx.destination);
  osc1.start();
  osc1.stop(now + 0.2);
  
  // Note 2
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5
  gain2.gain.setValueAtTime(0.1, now + 0.1);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
  osc2.connect(gain2);
  gain2.connect(audioCtx.destination);
  osc2.start(now + 0.1);
  osc2.stop(now + 0.3);
};



export const playClickSound = () => {
  if (!soundsOn) return;
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
  
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(now + 0.05);
};

export const playBeepBoopSound = () => {
  if (!soundsOn) return;
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  
  // Beep
  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.type = 'square';
  osc1.frequency.setValueAtTime(800, now);
  gain1.gain.setValueAtTime(0.05, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
  osc1.connect(gain1);
  gain1.connect(audioCtx.destination);
  osc1.start();
  osc1.stop(now + 0.1);
  
  // Boop
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(400, now + 0.15);
  gain2.gain.setValueAtTime(0.05, now + 0.15);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
  osc2.connect(gain2);
  gain2.connect(audioCtx.destination);
  osc2.start(now + 0.15);
  osc2.stop(now + 0.25);
};

/* ------------------------------------------------------------------ *
 * Efeitos contextuais (superfície, queda, erro, encorajamento).
 * ------------------------------------------------------------------ */

/** Uma nota com início atrasado e, opcionalmente, deslize de frequência. */
const note = (freq: number, duration: number, delay = 0, volume = 0.08, type: OscillatorType = 'triangle', to?: number) => {
  if (!audioCtx || !soundsOn) return;
  const t0 = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(to, t0 + duration);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + duration);
};

/** Passo numa casa normal: um tique suave. */
export const playStepFloor = () => note(660, 0.05, 0, 0.03, 'sine');

/** Entrada num portal: varrimento ascendente, a sensação de transporte. */
export const playStepPortal = () => {
  note(300, 0.3, 0, 0.08, 'sine', 1400);
  note(900, 0.25, 0.1, 0.03, 'sine', 1800);
};

/** Partir madeira: estalido curto e grave. */
export const playStepWood = () => note(220, 0.12, 0, 0.07, 'square', 90);

/** Queda num buraco: varrimento descendente, mais longo. */
export const playFall = () => note(520, 0.7, 0, 0.12, 'triangle', 110);

/** Erro: dois tons em dissonância e um terceiro mais grave, para se perceber bem que correu mal. */
export const playErrorSound = () => {
  note(220, 0.18, 0, 0.07, 'sawtooth');
  note(233, 0.18, 0, 0.07, 'sawtooth');
  note(165, 0.3, 0.18, 0.08, 'sawtooth');
};

/** Vitória: arpejo ascendente (dó-mi-sol-dó), uma pequena melodia de encorajamento. */
export const playVictorySound = () => {
  note(523, 0.18, 0, 0.09);
  note(659, 0.18, 0.12, 0.09);
  note(784, 0.18, 0.24, 0.09);
  note(1047, 0.45, 0.36, 0.1);
};

/** Evento do motor -> tipo de som. Função pura (sem áudio), para ser testável. */
export type SoundKey = 'floor' | 'portal' | 'wood' | 'fall' | 'pick' | 'turn' | 'error' | 'victory';

export const soundForEvent = (event: string): SoundKey | null => {
  switch (event) {
    case 'move':
    case 'step':
      return 'floor';
    case 'portal':
      return 'portal';
    case 'break':
      return 'wood';
    case 'fall':
      return 'fall';
    case 'pick':
      return 'pick';
    case 'turn':
      return 'turn';
    case 'error':
    case 'gameover':
      return 'error';
    case 'victory':
      return 'victory';
    default:
      return null;
  }
};

/** Toca o som de um tipo. Retoma o contexto de áudio se o navegador o tiver suspenso. */
export const playSound = (key: SoundKey): void => {
  if (!soundsOn) return;
  if (audioCtx && audioCtx.state === 'suspended') void audioCtx.resume();
  switch (key) {
    case 'floor': return playStepFloor();
    case 'portal': return playStepPortal();
    case 'wood': return playStepWood();
    case 'fall': return playFall();
    case 'pick': return playPickSound();
    case 'turn': return playTurnSound();
    case 'error': return playErrorSound();
    case 'victory': return playVictorySound();
  }
};
