"use client";

/**
 * Synthesized dreamy sound effects for Dreamflect.
 *
 * No assets, no dependencies — just sine waves with slow envelopes and a
 * gentle low-pass for warmth. The AudioContext is created lazily on first
 * call (must be inside a user gesture in modern browsers); subsequent
 * non-gesture calls (e.g. step transitions fired by the agent) work fine
 * because the context stays alive once resumed.
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Klass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Klass) return null;
    try {
      ctx = new Klass();
    } catch {
      return null;
    }
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface NoteOpts {
  freq: number;
  start?: number;
  attack?: number;
  release?: number;
  peakGain?: number;
  type?: OscillatorType;
  filterFreq?: number;
}

function playNote(opts: NoteOpts) {
  const c = getCtx();
  if (!c || !masterGain) return;
  const startAt = c.currentTime + (opts.start ?? 0);
  const attack = opts.attack ?? 0.02;
  const release = opts.release ?? 0.4;
  const peakGain = opts.peakGain ?? 0.06;

  const osc = c.createOscillator();
  osc.type = opts.type ?? "sine";
  osc.frequency.value = opts.freq;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peakGain, startAt + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + attack + release);

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = opts.filterFreq ?? 2400;
  filter.Q.value = 0.7;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  osc.start(startAt);
  osc.stop(startAt + attack + release + 0.05);
}

/** Soft chime for button taps and chip selections. */
export function playChime() {
  playNote({ freq: 880, attack: 0.005, release: 0.22, peakGain: 0.04 });
  playNote({ freq: 1318.51, attack: 0.005, release: 0.16, peakGain: 0.022 });
}

/** Recording starts — soft rising bloom (root + perfect fifth). */
export function playBloom() {
  playNote({ freq: 329.63, attack: 0.35, release: 1.1, peakGain: 0.07 });
  playNote({ freq: 493.88, attack: 0.4, release: 1.0, peakGain: 0.055 });
}

/** Recording stops — gentle settling tone with a downward slide. */
export function playFall() {
  const c = getCtx();
  if (!c || !masterGain) return;
  const startAt = c.currentTime;
  const duration = 0.75;

  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(523.25, startAt);
  osc.frequency.exponentialRampToValueAtTime(329.63, startAt + duration);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.07, startAt + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2000;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

/** Step transition — three rising notes (C major triad arpeggio). */
export function playTransition() {
  playNote({ freq: 523.25, start: 0.0, attack: 0.02, release: 0.55, peakGain: 0.05 });
  playNote({ freq: 659.25, start: 0.09, attack: 0.02, release: 0.55, peakGain: 0.045 });
  playNote({ freq: 783.99, start: 0.18, attack: 0.02, release: 0.7, peakGain: 0.04 });
}

/** Takeaway reveal — sustained Cmaj7 pad. */
export function playReveal() {
  playNote({ freq: 261.63, attack: 0.45, release: 2.2, peakGain: 0.05, filterFreq: 1800 });
  playNote({ freq: 329.63, attack: 0.5, release: 2.2, peakGain: 0.04, filterFreq: 1800 });
  playNote({ freq: 392.0, attack: 0.5, release: 2.2, peakGain: 0.04, filterFreq: 1800 });
  playNote({
    freq: 493.88,
    start: 0.35,
    attack: 0.45,
    release: 2.0,
    peakGain: 0.035,
    filterFreq: 1800,
  });
}
