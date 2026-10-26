const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

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

export const playErrorSound = () => {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(100, now);
  osc.frequency.linearRampToValueAtTime(50, now + 0.3);
  
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(now + 0.3);
};

export const playVictorySound = () => {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now + i * 0.15);
    gain.gain.setValueAtTime(0.05, now + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now + i * 0.15);
    osc.stop(now + i * 0.15 + 0.3);
  });
};

export const playClickSound = () => {
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
