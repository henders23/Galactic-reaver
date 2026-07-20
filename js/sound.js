/* Vanguard — procedural WebAudio sound */
'use strict';

const Snd = {
  ctx: null, master: null, muted: false,
  volume: 0.5,        // master level (0..1); the fully-open gain of the mix bus
  buffers: {},        // name → decoded AudioBuffer (sample pack)
  _loading: false,

  /* effective gain applied to the mix bus (0 while muted) */
  effGain() { return Snd.muted ? 0 : Snd.volume; },
  /* the music target volume, scaled off the master level. Music is silenced
     when the master is muted, when nothing is cued, or when the dedicated
     music on/off toggle is off (SFX keep playing in that case). */
  musicVol() {
    if (Snd.muted || !Music.current) return 0;
    if (typeof Music !== 'undefined' && !Music.enabled) return 0;
    return Snd.volume * 0.84;
  },

  loadVolume() {
    try {
      const v = parseFloat(localStorage.getItem('gr_volume'));
      if (!isNaN(v)) Snd.volume = U.clamp(v, 0, 1);
      Snd.muted = localStorage.getItem('gr_muted') === '1';
    } catch (e) { /* storage unavailable */ }
  },

  /* set the master level (0..1). A level of 0 reads as muted; raising it un-mutes. */
  setVolume(v) {
    Snd.volume = U.clamp(v, 0, 1);
    Snd.muted = Snd.volume <= 0.0001;
    if (Snd.master) Snd.master.gain.value = Snd.effGain();
    if (typeof window !== 'undefined' && window.Music) Music.syncMute();
    try {
      localStorage.setItem('gr_volume', String(Snd.volume));
      localStorage.setItem('gr_muted', Snd.muted ? '1' : '0');
    } catch (e) { /* storage unavailable */ }
  },

  /* mp3 sample pack — real recorded weapon / explosion audio. Falls back to the
     procedural synths below if a sample has not loaded (or fetch is unavailable). */
  SAMPLE_SRC: {
    laserCannon: 'assets/sounds/laser-cannon.mp3',
    laserBeam: 'assets/sounds/laser-beam.mp3',
    blaster: 'assets/sounds/blaster.mp3',
    cannon: 'assets/sounds/cannon.mp3',
    broadside: 'assets/sounds/broadside.mp3',
    explosionSmall: 'assets/sounds/explosion-small.mp3',
    explosionMedium: 'assets/sounds/explosion-medium.mp3',
    torpedoExplosion: 'assets/sounds/torpedo-explosion.mp3',
    shipDestroyedSmall: 'assets/sounds/ship-destroyed-small.mp3',
    shipDestroyedMedium: 'assets/sounds/ship-destroyed-medium.mp3',
    // UI clicks + spoken callouts (all routed through the SFX bus, so they
    // follow the master mute/volume — not the music on/off toggle)
    uiClick: 'assets/sounds/ui-click.mp3',
    weGotThem: 'assets/sounds/we-got-them.mp3',
    enemyInRange: 'assets/sounds/enemy-in-range.mp3'
  },

  init() {
    if (Snd.ctx) return;
    Snd.loadVolume();
    try {
      Snd.ctx = new (window.AudioContext || window.webkitAudioContext)();
      Snd.master = Snd.ctx.createGain();
      Snd.master.gain.value = Snd.effGain();
      Snd.master.connect(Snd.ctx.destination);
      Snd._loadSamples();
    } catch (e) { Snd.ctx = null; }
  },

  _loadSamples() {
    if (Snd._loading || !Snd.ctx || typeof fetch !== 'function') return;
    Snd._loading = true;
    Object.entries(Snd.SAMPLE_SRC).forEach(([name, url]) => {
      fetch(url).then(r => r.arrayBuffer())
        .then(buf => Snd.ctx.decodeAudioData(buf))
        .then(audio => { Snd.buffers[name] = audio; })
        .catch(() => { /* fall back to procedural synth for this sound */ });
    });
  },

  /* play a decoded sample through the master bus; returns true if it fired */
  _sample(name, gain, rate) {
    if (!Snd.ctx || Snd.muted) return false;
    const buf = Snd.buffers[name];
    if (!buf) return false;
    const src = Snd.ctx.createBufferSource();
    src.buffer = buf;
    if (rate) src.playbackRate.value = rate;
    const g = Snd.ctx.createGain();
    g.gain.value = gain == null ? 0.7 : gain;
    src.connect(g); g.connect(Snd.master);
    src.start();
    return true;
  },

  resume() { if (Snd.ctx && Snd.ctx.state === 'suspended') Snd.ctx.resume(); },

  toggleMute() {
    Snd.muted = !Snd.muted;
    if (Snd.master) Snd.master.gain.value = Snd.effGain();
    try { localStorage.setItem('gr_muted', Snd.muted ? '1' : '0'); } catch (e) { /* storage unavailable */ }
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

  // every click / selection effect plays the recorded 'uiClick' sample,
  // falling back to the old procedural blips until it has loaded
  click() { if (Snd._sample('uiClick', 0.7)) return; Snd._osc('square', 900, 700, 0.045, 0.10); },
  select() { if (Snd._sample('uiClick', 0.7)) return; Snd._osc('square', 500, 760, 0.07, 0.11); },
  deny() { Snd._osc('square', 220, 140, 0.12, 0.12); },
  lock() { Snd._osc('sine', 640, 640, 0.05, 0.14); Snd._osc('sine', 960, 960, 0.06, 0.12, 0.06); },

  // selectShip — picking any friendly ship or a movement order
  selectShip() { if (Snd._sample('uiClick', 0.7)) return; Snd.select(); },
  // targetShip — locking a weapon onto an enemy ship to fire on
  targetShip() { if (Snd._sample('uiClick', 0.7)) return; Snd.lock(); },
  // spoken callouts
  weGotThem() { Snd._sample('weGotThem', 0.9); },
  enemyInRange() { Snd._sample('enemyInRange', 0.9); },

  // lance / beam weapons — recorded laser with a procedural fallback
  laser() { if (Snd._sample('laserCannon', 0.5)) return; Snd._osc('sawtooth', 880, 130, 0.22, 0.16); Snd._osc('sawtooth', 1240, 180, 0.16, 0.08); },
  // enemy / generic gun batteries — blaster report
  cannon() { if (Snd._sample('blaster', 0.5)) return; Snd._boom(0.16, 0.22, 1400); Snd._osc('square', 190, 70, 0.1, 0.1); },
  // the human ships' main broadside cannons — the attached 'broadside' track
  broadside() { if (Snd._sample('broadside', 0.75)) return; Snd._boom(0.22, 0.3, 1200); Snd._osc('square', 160, 60, 0.14, 0.14); },
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
    if (Snd._sample(big ? 'explosionMedium' : 'explosionSmall', big ? 0.8 : 0.55)) return;
    Snd._boom(big ? 1.1 : 0.6, big ? 0.55 : 0.4, big ? 900 : 1300);
    Snd._osc('sine', big ? 110 : 90, 30, big ? 1.0 : 0.55, 0.3);
  },
  // a ship breaking apart — heavier than a hit explosion
  shipDestroyed(big) {
    if (Snd._sample(big ? 'shipDestroyedMedium' : 'shipDestroyedSmall', big ? 0.85 : 0.6)) return;
    Snd.explosion(big);
  },
  // a torpedo / ordnance detonation
  torpBoom() {
    if (Snd._sample('torpedoExplosion', 0.7)) return;
    Snd.explosion(false);
  },
  alarm() { Snd._osc('square', 660, 660, 0.13, 0.09); Snd._osc('square', 500, 500, 0.13, 0.09, 0.16); },
  repair() { Snd._osc('sine', 520, 780, 0.08, 0.1); Snd._osc('sine', 780, 1040, 0.08, 0.09, 0.09); },
  victory() { [392, 523, 659, 784].forEach((f, i) => Snd._osc('triangle', f, f, 0.34, 0.16, i * 0.13)); },
  defeat() { [330, 262, 208, 165].forEach((f, i) => Snd._osc('triangle', f, f * 0.97, 0.42, 0.15, i * 0.17)); }
};

if (typeof window !== 'undefined') window.Snd = Snd;

/* ---------------- music (two crossfading tracks) ----------------
   A 'menu' track plays across the title / sector map / fleet screens, and a
   'combat' track plays during battle. Entering combat crossfades menu→combat;
   returning to any out-of-combat screen crossfades combat→menu. Autoplay is
   gated by the browser until the first user gesture, so we arm a one-shot
   gesture listener that kicks the wanted track off. */
const Music = {
  tracks: {
    menu:   { src: 'assets/music/title-theme.mp3',  el: null, gain: 1.0 },
    combat: { src: 'assets/music/combat-theme.mp3', el: null, gain: 1.0 }
  },
  current: null,   // which track should be playing now: 'menu' | 'combat' | null
  enabled: true,   // dedicated music on/off toggle (independent of SFX mute)
  armed: false,

  /* read the persisted music on/off preference (call before first use) */
  loadEnabled() {
    try { Music.enabled = localStorage.getItem('gr_music') !== '0'; } catch (e) { /* storage unavailable */ }
  },

  init() {
    Music.loadEnabled();
    if (Music.armed) return;
    Object.values(Music.tracks).forEach(t => {
      const a = new Audio(t.src);
      a.loop = true;
      a.volume = 0;
      a.preload = 'auto';
      t.el = a;
    });
    // if autoplay was blocked, resume the wanted track on the first user gesture
    const kick = () => {
      const t = Music.current && Music.tracks[Music.current];
      if (t && t.el && t.el.paused) Music._ensurePlaying(Music.current);
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
      window.addEventListener(ev, kick, { passive: true }));
    Music.armed = true;
  },

  _ensurePlaying(key) {
    if (!Music.enabled) return;
    const t = Music.tracks[key];
    if (!t || !t.el || !t.el.paused) return;
    const p = t.el.play();
    if (p && p.catch) p.catch(() => { /* blocked until a gesture — kick handles it */ });
  },

  /* per-element fade with cancellation of any in-flight fade on that element */
  _fadeEl(el, target, onDone) {
    if (!el) return;
    if (el._fadeTimer) { clearTimeout(el._fadeTimer); el._fadeTimer = null; }
    const step = () => {
      const d = target - el.volume;
      if (Math.abs(d) < 0.02) {
        el.volume = Math.max(0, Math.min(1, target));
        el._fadeTimer = null;
        if (onDone) onDone();
        return;
      }
      el.volume = Math.max(0, Math.min(1, el.volume + Math.sign(d) * 0.04));
      el._fadeTimer = setTimeout(step, 40);
    };
    step();
  },

  /* crossfade to the named track (fading every other track out) */
  _switchTo(key) {
    Music.init();
    const prev = Music.current;
    Music.current = key;
    // A track restarts from the top when we first switch onto it, not when it's
    // already playing: the menu track rewinds when we come back from a battle
    // (moving between out-of-combat screens leaves it playing on, since prev is
    // already 'menu'), and the combat track rewinds at the start of each new
    // engagement rather than resuming where the last fight left off.
    if ((key === 'menu' && prev === 'combat') || (key === 'combat' && prev !== 'combat')) {
      const t = Music.tracks[key];
      if (t && t.el) { try { t.el.currentTime = 0; } catch (e) { /* not yet seekable */ } }
    }
    Object.keys(Music.tracks).forEach(k => {
      const t = Music.tracks[k];
      if (!t.el) return;
      if (k === key) {
        Music._ensurePlaying(k);
        Music._fadeEl(t.el, Snd.musicVol() * t.gain);
      } else {
        Music._fadeEl(t.el, 0, () => { if (Music.current !== k) t.el.pause(); });
      }
    });
  },

  /* play the menu / title track (call from any out-of-combat screen) */
  start() { Music._switchTo('menu'); },

  /* play the combat track (call when a battle is joined) */
  startCombat() { Music._switchTo('combat'); },

  /* stop all music (fade out) */
  stop() {
    Music.current = null;
    Object.values(Music.tracks).forEach(t => {
      if (t.el) Music._fadeEl(t.el, 0, () => { if (!Music.current) t.el.pause(); });
    });
  },

  /* turn the music on or off (independent of the SFX mute). Off fades every
     track out and pauses it; On resumes whatever track is currently cued. */
  setEnabled(on) {
    Music.enabled = !!on;
    try { localStorage.setItem('gr_music', Music.enabled ? '1' : '0'); } catch (e) { /* storage unavailable */ }
    if (Music.enabled) {
      if (Music.current) Music._ensurePlaying(Music.current);
      Object.keys(Music.tracks).forEach(k => {
        const t = Music.tracks[k];
        if (t.el) Music._fadeEl(t.el, k === Music.current ? Snd.musicVol() * t.gain : 0);
      });
    } else {
      Object.values(Music.tracks).forEach(t => {
        if (t.el) Music._fadeEl(t.el, 0, () => { if (!Music.enabled) t.el.pause(); });
      });
    }
    return Music.enabled;
  },
  toggleEnabled() { return Music.setEnabled(!Music.enabled); },

  /* keep the live track's volume in step with the mute button / volume slider */
  syncMute() {
    Object.keys(Music.tracks).forEach(k => {
      const t = Music.tracks[k];
      if (!t.el) return;
      // set directly (not a fade) so dragging the volume slider tracks instantly
      t.el.volume = (k === Music.current) ? Snd.musicVol() * t.gain : 0;
    });
  }
};

if (typeof window !== 'undefined') window.Music = Music;
