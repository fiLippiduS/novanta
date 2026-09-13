/* Suoni generati al volo: nessun file audio da scaricare,
   nessun byte in più sul primo caricamento. */

import * as store from './storage.js';

let ctx = null;
let master = null;
let enabled = true;

export function init() {
  enabled = store.get('sound') !== false;
  const unlock = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  };
  ['pointerdown', 'keydown'].forEach((e) =>
    addEventListener(e, unlock, { once: false, passive: true }));
}

export function setEnabled(v) {
  enabled = v;
  store.save({ sound: v });
}

export function isEnabled() { return enabled; }

/* silenzio temporaneo (durante un annuncio): non tocca la preferenza salvata */
let muted = false;
export function setMuted(v) { muted = Boolean(v); }

function tone({ freq = 440, to = null, dur = 0.12, type = 'sine', gain = 1, delay = 0 }) {
  if (!enabled || muted || !ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.18, gain = 0.5, hp = 400, delay = 0 }) {
  if (!enabled || muted || !ctx) return;
  const t0 = ctx.currentTime + delay;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'highpass';
  filt.frequency.value = hp;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(filt).connect(g).connect(master);
  src.start(t0);
}

export const sfx = {
  hit: () => tone({ freq: 620, to: 980, dur: 0.11, type: 'triangle', gain: 0.5 }),
  miss: () => tone({ freq: 180, to: 90, dur: 0.16, type: 'sawtooth', gain: 0.22 }),
  dup: () => tone({ freq: 420, dur: 0.07, type: 'sine', gain: 0.25 }),
  tick: () => tone({ freq: 1200, dur: 0.03, type: 'square', gain: 0.12 }),
  urgent: () => tone({ freq: 1500, dur: 0.05, type: 'square', gain: 0.2 }),
  whistle: () => {
    tone({ freq: 1800, to: 2300, dur: 0.18, type: 'sine', gain: 0.3 });
    tone({ freq: 2100, to: 1700, dur: 0.16, type: 'sine', gain: 0.2, delay: 0.2 });
  },
  kick: () => { noise({ dur: 0.07, gain: 0.7, hp: 800 }); tone({ freq: 140, to: 60, dur: 0.1, type: 'sine', gain: 0.6 }); },
  goal: () => {
    noise({ dur: 0.5, gain: 0.35, hp: 300 });
    [392, 494, 587, 784].forEach((f, i) =>
      tone({ freq: f, dur: 0.34, type: 'triangle', gain: 0.34, delay: i * 0.055 }));
  },
  save: () => { noise({ dur: 0.14, gain: 0.6, hp: 1200 }); tone({ freq: 110, to: 70, dur: 0.2, type: 'square', gain: 0.3 }); },
  /* Il legno (che oggi è metallo) suona come una campana stonata: parziali
     non armoniche che si spengono a velocità diverse, più il colpo sordo
     del cuoio. La traversa è più lunga e più grave, e vibra di più. */
  post: () => {
    noise({ dur: 0.05, gain: 0.8, hp: 1800 });
    tone({ freq: 160, to: 90, dur: 0.12, type: 'sine', gain: 0.5 });
    [[610, 0.5, 0.9], [1675, 0.26, 0.55], [2790, 0.15, 0.35], [4020, 0.08, 0.2]]
      .forEach(([f, g, d]) => tone({ freq: f, to: f * 0.985, dur: d, type: 'sine', gain: g }));
  },
  bar: () => {
    noise({ dur: 0.06, gain: 0.8, hp: 1400 });
    tone({ freq: 140, to: 80, dur: 0.14, type: 'sine', gain: 0.5 });
    [[430, 0.5, 1.3], [1190, 0.3, 0.9], [2050, 0.16, 0.6], [3120, 0.08, 0.35]]
      .forEach(([f, g, d]) => {
        tone({ freq: f, to: f * 0.98, dur: d, type: 'sine', gain: g });
        tone({ freq: f * 1.012, to: f * 0.99, dur: d * 0.8, type: 'sine', gain: g * 0.4 });
      });
  },
  bounce: (k = 1) => { tone({ freq: 120, to: 70, dur: 0.08, type: 'sine', gain: 0.35 * k }); noise({ dur: 0.03, gain: 0.25 * k, hp: 900 }); },
  record: () => [523, 659, 784, 1047].forEach((f, i) =>
    tone({ freq: f, dur: 0.26, type: 'triangle', gain: 0.36, delay: i * 0.075 })),
  over: () => [330, 262, 196].forEach((f, i) =>
    tone({ freq: f, dur: 0.4, type: 'sawtooth', gain: 0.18, delay: i * 0.13 })),
};
