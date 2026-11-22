// MIDNIGHT VAULT — synthesized sound effects (WebAudio, no audio files).
// Every sound is a few oscillators; the game ships no media at all.

let audioCtx = null;
let muted = false;

function ctx() {
  if (audioCtx) return audioCtx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  } catch {
    return null;
  }
  return audioCtx;
}

function tone(freq, dur, type, gain, when, slideTo) {
  const ac = ctx();
  if (!ac || muted) return;
  try {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime + when);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + when + dur);
    g.gain.setValueAtTime(0.0001, ac.currentTime + when);
    g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + when + dur);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(ac.currentTime + when);
    osc.stop(ac.currentTime + when + dur + 0.05);
  } catch {
    // Audio is decoration; a failure must never break the game.
  }
}

export const sfx = {
  // Call from the first key or click so the browser unlocks audio.
  unlock() {
    const ac = ctx();
    if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
  },
  toggleMute() {
    muted = !muted;
    return muted;
  },
  isMuted() {
    return muted;
  },
  pickup() {
    tone(880, 0.12, 'sine', 0.12, 0);
    tone(1318, 0.18, 'sine', 0.1, 0.07);
  },
  diamond() {
    tone(523, 0.14, 'triangle', 0.14, 0);
    tone(659, 0.14, 'triangle', 0.14, 0.1);
    tone(784, 0.2, 'triangle', 0.14, 0.2);
    tone(1046, 0.3, 'sine', 0.12, 0.3);
  },
  coin() {
    tone(1568, 0.07, 'square', 0.05, 0);
    tone(2093, 0.1, 'square', 0.04, 0.05);
  },
  hack() {
    tone(440, 0.09, 'sawtooth', 0.06, 0);
    tone(587, 0.09, 'sawtooth', 0.06, 0.08);
    tone(880, 0.16, 'sawtooth', 0.06, 0.16);
  },
  alert() {
    tone(220, 0.28, 'sawtooth', 0.09, 0, 440);
  },
  caught() {
    tone(330, 0.5, 'sawtooth', 0.12, 0, 82);
    tone(165, 0.6, 'square', 0.08, 0.05, 55);
  },
  roomClear() {
    tone(523, 0.12, 'triangle', 0.12, 0);
    tone(784, 0.12, 'triangle', 0.12, 0.11);
    tone(1046, 0.22, 'triangle', 0.12, 0.22);
  },
  win() {
    const notes = [523, 659, 784, 1046, 784, 1046, 1318];
    notes.forEach((n, i) => tone(n, 0.2, 'triangle', 0.12, i * 0.13));
  },
  locked() {
    tone(140, 0.14, 'square', 0.07, 0);
    tone(110, 0.18, 'square', 0.07, 0.1);
  },
};
