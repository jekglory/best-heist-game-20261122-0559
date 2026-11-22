// Synthesized sound for Midnight Vault: no audio files at all, every
// effect is a short WebAudio oscillator envelope, so the game ships zero
// assets and makes zero network requests. Mute with M.

let audioCtx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
  return muted;
}

export function isMuted() {
  return muted;
}

function ensureCtx() {
  if (!audioCtx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    } catch {
      audioCtx = null;
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

function tone(freq, dur, type, gain, when) {
  if (muted) return;
  const ac = ensureCtx();
  if (!ac) return;
  const t0 = ac.currentTime + (when || 0);
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain || 0.08, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp);
  amp.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  pickup() {
    tone(880, 0.12, 'sine', 0.07);
    tone(1318, 0.16, 'sine', 0.06, 0.07);
  },
  diamond() {
    tone(523, 0.14, 'triangle', 0.09);
    tone(659, 0.14, 'triangle', 0.09, 0.1);
    tone(784, 0.2, 'triangle', 0.09, 0.2);
    tone(1046, 0.3, 'sine', 0.08, 0.3);
  },
  coin() {
    tone(1567, 0.1, 'square', 0.04);
  },
  spotted() {
    tone(220, 0.22, 'sawtooth', 0.07);
    tone(196, 0.26, 'sawtooth', 0.07, 0.14);
  },
  hack() {
    tone(440, 0.08, 'square', 0.05);
    tone(554, 0.08, 'square', 0.05, 0.09);
    tone(659, 0.12, 'square', 0.05, 0.18);
  },
  caught() {
    tone(330, 0.3, 'sawtooth', 0.09);
    tone(165, 0.5, 'sawtooth', 0.09, 0.2);
  },
  clear() {
    tone(523, 0.14, 'triangle', 0.09);
    tone(784, 0.14, 'triangle', 0.09, 0.12);
    tone(1046, 0.3, 'triangle', 0.09, 0.24);
  },
  win() {
    // Rising arpeggio for the clean getaway.
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.22, 'triangle', 0.08, i * 0.13));
  },
  click() {
    tone(660, 0.05, 'square', 0.03);
  },
};
