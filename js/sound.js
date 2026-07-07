/* Galactic Reaver — procedural WebAudio sound */
'use strict';

const Snd = {
  ctx: null, master: null, muted: false,

  init() {
    if (Snd.ctx) return;
    try {
      Snd.ctx = new (window.AudioContext || window.webkitAudioContext)();
      Snd.master = Snd.ctx.createGain();
      Snd.master.gain.value = 0.5;
      Snd.master.connect(Snd.ctx.destination);
    } catch (e) { Snd.ctx = null; }
  },

  resume() { if (Snd.ctx && Snd.ctx.state === 'suspended') Snd.ctx.resume(); },

  toggleMute() {
    Snd.muted = !Snd.muted;
    if (Snd.master) Snd.master.gain.value = Snd.muted ? 0 : 0.5;
    return Snd.muted;
  },

  _noise(dur) {
    const ctx = Snd.ctx;
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  },

  _env(gainNode, t0, peak, dur) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.012);
    g.exponentialRampToValueAtTime(0.0001, t0 + dur);
  },

  _osc(type, f0, f1, dur, peak, delay) {
    if (!Snd.ctx || Snd.muted) return;
    const ctx = Snd.ctx, t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    Snd._env(g, t0, peak, dur);
    o.connect(g); g.connect(Snd.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  },

  _boom(dur, peak, cutoff, delay) {
    if (!Snd.ctx || Snd.muted) return;
    const ctx = Snd.ctx, t0 = ctx.currentTime + (delay || 0);
    const src = Snd._noise(dur);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cutoff, t0);
    f.frequency.exponentialRampToValueAtTime(60, t0 + dur);
    const g = ctx.createGain();
    Snd._env(g, t0, peak, dur);
    src.connect(f); f.connect(g); g.connect(Snd.master);
    src.start(t0);
  },

  click() { Snd._osc('square', 900, 700, 0.045, 0.10); },
  select() { Snd._osc('square', 500, 760, 0.07, 0.11); },
  deny() { Snd._osc('square', 220, 140, 0.12, 0.12); },
  lock() { Snd._osc('sine', 640, 640, 0.05, 0.14); Snd._osc('sine', 960, 960, 0.06, 0.12, 0.06); },

  laser() { Snd._osc('sawtooth', 880, 130, 0.22, 0.16); Snd._osc('sawtooth', 1240, 180, 0.16, 0.08); },
  cannon() { Snd._boom(0.16, 0.22, 1400); Snd._osc('square', 190, 70, 0.1, 0.1); },
  torp() {
    if (!Snd.ctx || Snd.muted) return;
    const ctx = Snd.ctx, t0 = ctx.currentTime;
    const src = Snd._noise(0.55);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 2.2;
    f.frequency.setValueAtTime(220, t0);
    f.frequency.exponentialRampToValueAtTime(1500, t0 + 0.5);
    const g = ctx.createGain();
    Snd._env(g, t0, 0.2, 0.55);
    src.connect(f); f.connect(g); g.connect(Snd.master);
    src.start(t0);
  },
  shield() { Snd._osc('sine', 980, 620, 0.24, 0.14); Snd._osc('sine', 1470, 930, 0.2, 0.07); },
  hit() { Snd._boom(0.24, 0.26, 2200); },
  crit() { Snd._boom(0.3, 0.24, 2600); Snd._osc('sawtooth', 300, 60, 0.32, 0.14, 0.03); },
  explosion(big) {
    Snd._boom(big ? 1.1 : 0.6, big ? 0.55 : 0.4, big ? 900 : 1300);
    Snd._osc('sine', big ? 110 : 90, 30, big ? 1.0 : 0.55, 0.3);
  },
  alarm() { Snd._osc('square', 660, 660, 0.13, 0.09); Snd._osc('square', 500, 500, 0.13, 0.09, 0.16); },
  repair() { Snd._osc('sine', 520, 780, 0.08, 0.1); Snd._osc('sine', 780, 1040, 0.08, 0.09, 0.09); },
  victory() { [392, 523, 659, 784].forEach((f, i) => Snd._osc('triangle', f, f, 0.34, 0.16, i * 0.13)); },
  defeat() { [330, 262, 208, 165].forEach((f, i) => Snd._osc('triangle', f, f * 0.97, 0.42, 0.15, i * 0.17)); }
};

if (typeof window !== 'undefined') window.Snd = Snd;
