// Short synthesized sounds (Web Audio, no audio files), shared by the board scene and
// the page. Off until the player turns them on; the choice is kept on this device.
// The button that turns them on is a tap, which is what browsers need before audio
// can start.
const KEY = 'critter-connect:sound:v1';

let on = false;
let loaded = false;
let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null;
  try {
    context ??= new AudioContext();
  } catch {
    return null;
  }
  return context;
}

export function isSoundOn(): boolean {
  if (!loaded && typeof window !== 'undefined') {
    loaded = true;
    try { on = window.localStorage.getItem(KEY) === 'on'; } catch { on = false; }
  }
  return on;
}

export function setSoundOn(value: boolean): void {
  on = value;
  loaded = true;
  try { window.localStorage.setItem(KEY, value ? 'on' : 'off'); } catch { /* kept for this visit only */ }
  if (value) void audio()?.resume().catch(() => undefined);
}

/**
 * Browsers start audio only inside a tap or key press (iOS Safari strictly). When sound was left on, wake it on the
 * page's first one. Returns a cleanup for React.
 */
export function wakeOnFirstGesture(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const wake = () => {
    if (isSoundOn()) void audio()?.resume().catch(() => undefined);
    window.removeEventListener('pointerdown', wake, true);
    window.removeEventListener('keydown', wake, true);
  };
  window.addEventListener('pointerdown', wake, true);
  window.addEventListener('keydown', wake, true);
  return () => {
    window.removeEventListener('pointerdown', wake, true);
    window.removeEventListener('keydown', wake, true);
  };
}

/** One soft note that fades out; `slide` bends it toward that frequency. */
function tone(frequency: number, { duration = 0.12, type = 'sine' as OscillatorType, volume = 0.1, delay = 0, slide = 0 } = {}): void {
  if (!isSoundOn()) return;
  const ctx = audio();
  if (!ctx) return;
  if (ctx.state !== 'running') { void ctx.resume().catch(() => undefined); return; }
  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (slide) oscillator.frequency.exponentialRampToValueAtTime(slide, start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export const sfx = {
  /** A match popping; each link of a chain pops a step higher. */
  pop(chain: number): void { tone(392 * 2 ** (Math.min(chain - 1, 8) * 2 / 12), { type: 'triangle', duration: 0.09 }); },
  /** A big match leaves a toy. */
  toy(): void { tone(660, { duration: 0.08 }); tone(990, { duration: 0.12, delay: 0.07 }); },
  /** A toy goes off. */
  blast(): void { tone(260, { type: 'sawtooth', duration: 0.22, volume: 0.05, slide: 90 }); },
  /** A swap that makes no match slides back. */
  swapBack(): void { tone(180, { duration: 0.06, volume: 0.05 }); },
  /** An answer: up for Yes, down for No (neither one is a mistake). */
  answer(yes: boolean): void { tone(yes ? 587 : 494, { duration: 0.1 }); tone(yes ? 880 : 392, { duration: 0.14, delay: 0.09 }); },
  /** A wrong guess. */
  wrong(): void { tone(220, { type: 'triangle', duration: 0.25, slide: 150 }); },
  /** The mystery is named. */
  solve(): void { [523, 659, 784, 1047].forEach((frequency, i) => tone(frequency, { duration: 0.16, delay: i * 0.08 })); },
};
