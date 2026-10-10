// Web Audio API synthesized sound generator for K.F.C. Robot Booth
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.warn('AudioContext not supported or blocked:', e);
    return null;
  }
}

export function playRobotBeep() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // ignore
  }
}

export function playCoinInsert() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'square';
    osc2.type = 'square';

    osc1.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
    osc1.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08); // E6

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);

    osc1.connect(gain);
    gain.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.28);
  } catch {
    // ignore
  }
}

export function playClawMotor() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(240, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // ignore
  }
}

export function playClawDrop() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // ignore
  }
}

export function playClawGrab() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(560, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // ignore
  }
}

export function playChuteDrop() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // ignore
  }
}

export function playSpinTick() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600 + Math.random() * 200, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {
    // ignore
  }
}

/**
 * Celebratory Party Horn / Horn Fanfare sound
 * Reproduces the bouncy, joyful party blower sound ("뿌우우우-!")
 */
export function playPartyHornSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // 1. Party Horn (Reed Blower) Synthesizer
    // Uses dual sawtooth oscillators + bandpass acoustic filter + pitch flutter
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const hornGain = ctx.createGain();
    const hornFilter = ctx.createBiquadFilter();

    // LFO for realistic fluttering paper-reed vibrato
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(7.5, now); // 7.5 Hz flutter
    lfoGain.gain.setValueAtTime(14, now); // 14 Hz pitch depth
    lfo.connect(osc1.frequency);
    lfo.connect(osc2.frequency);
    lfo.start(now);
    lfo.stop(now + 1.1);

    // Initial pitch scoop (party horn air blow)
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(420, now);
    osc1.frequency.exponentialRampToValueAtTime(580, now + 0.08); // Scoop to D5
    osc2.frequency.setValueAtTime(424, now);
    osc2.frequency.exponentialRampToValueAtTime(585, now + 0.08);

    // Bandpass filter for brassy / paper horn resonance
    hornFilter.type = 'bandpass';
    hornFilter.frequency.setValueAtTime(1450, now);
    hornFilter.Q.setValueAtTime(2.2, now);

    // Horn volume envelope
    hornGain.gain.setValueAtTime(0.001, now);
    hornGain.gain.linearRampToValueAtTime(0.28, now + 0.04); // Punchy attack
    hornGain.gain.setValueAtTime(0.26, now + 0.65);
    hornGain.gain.exponentialRampToValueAtTime(0.001, now + 1.05); // Fade out

    osc1.connect(hornFilter);
    osc2.connect(hornFilter);
    hornFilter.connect(hornGain);
    hornGain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.05);
    osc2.stop(now + 1.05);

    // 2. High Sparkle Chimes in background
    const chimeNotes = [783.99, 1046.5, 1318.51, 1567.98]; // G5, C6, E6, G6
    chimeNotes.forEach((freq, idx) => {
      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(freq, now + 0.05 + idx * 0.08);
      chimeGain.gain.setValueAtTime(0.12, now + 0.05 + idx * 0.08);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05 + idx * 0.08 + 0.35);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(ctx.destination);
      chimeOsc.start(now + 0.05 + idx * 0.08);
      chimeOsc.stop(now + 0.05 + idx * 0.08 + 0.35);
    });
  } catch (e) {
    console.warn('Failed to play party horn:', e);
  }
}

/**
 * Play celebration sound.
 * Checks for custom uploaded audio in settings / localStorage first,
 * falling back to the synthesized party horn sound.
 */
export function playWinningFanfare(customAudioUrl?: string) {
  // Check custom audio URL if provided or in storage
  const soundUrl =
    customAudioUrl ||
    localStorage.getItem('kfc_custom_sound') ||
    sessionStorage.getItem('kfc_custom_sound');

  if (soundUrl && soundUrl.startsWith('data:audio') || (soundUrl && soundUrl.startsWith('http'))) {
    try {
      const audio = new Audio(soundUrl);
      audio.volume = 0.8;
      audio.play().catch(() => {
        // Fallback to synthesized horn if audio playback failed
        playPartyHornSound();
      });
      return;
    } catch {
      // Fallback
    }
  }

  playPartyHornSound();
}

export function playScanSuccess() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(800, ctx.currentTime);
    osc1.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
    osc2.frequency.setValueAtTime(1000, ctx.currentTime);
    osc2.frequency.setValueAtTime(1500, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.3);
    osc2.stop(ctx.currentTime + 0.3);
  } catch {
    // ignore
  }
}

export function playWarningBuzzer() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    [0, 0.18].forEach(startOffset => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime + startOffset);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startOffset + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + 0.14);
    });
  } catch {
    // ignore
  }
}
