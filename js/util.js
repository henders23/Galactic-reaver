/* Vanguard — math & misc helpers */
'use strict';

const U = {
  TAU: Math.PI * 2,
  D2R: Math.PI / 180,

  /* ---- RNG: Math.random by default, deterministic when seeded (tests/replays) ---- */
  _rng: null,
  setSeed(seed) {
    let s = (seed >>> 0) || 1;
    U._rng = function () {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  },
  clearSeed() { U._rng = null; },
  random() { return U._rng ? U._rng() : Math.random(); },

  rand(a, b) { return a + Math.floor(U.random() * (b - a + 1)); },
  frand(a, b) { return a + U.random() * (b - a); },
  pick(arr) { return arr[Math.floor(U.random() * arr.length)]; },
  clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); },
  lerp(a, b, t) { return a + (b - a) * t; },
  easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },

  // normalize angle to (-180, 180]
  norm180(a) { return ((a + 180) % 360 + 360) % 360 - 180; },

  lerpAngle(a, b, t) { return a + U.norm180(b - a) * t; },

  dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); },

  angleTo(from, to) { return Math.atan2(to.y - from.y, to.x - from.x) / U.D2R; },

  // bearing of point (x,y) relative to ship's facing: 0 = dead ahead
  bearingFrom(ship, x, y) {
    return U.norm180(U.angleTo(ship, { x, y }) - ship.angle);
  },

  // which weapon arc a bearing falls in
  arcOf(bearing) {
    const a = Math.abs(bearing);
    return a <= 50 ? 'fore' : (a >= 130 ? 'aft' : 'side');
  },

  // which shield facing is struck when attacked from (ax, ay)
  shieldArcHit(target, ax, ay) {
    const a = Math.abs(U.bearingFrom(target, ax, ay));
    return a <= 60 ? 'F' : (a >= 120 ? 'A' : 'S');
  },

  // Final facing must stay within ±mt of BOTH the start heading and the travel course
  clampFacing(desired, base, pos, mt, startPos) {
    let lo = -mt, hi = mt;
    const dx = pos.x - startPos.x, dy = pos.y - startPos.y;
    if (Math.hypot(dx, dy) > 2) {
      const travel = U.norm180(Math.atan2(dy, dx) / U.D2R - base);
      lo = Math.max(lo, travel - mt);
      hi = Math.min(hi, travel + mt);
    }
    if (lo > hi) { const mid = (lo + hi) / 2; lo = hi = mid; }
    const delta = Math.max(lo, Math.min(hi, U.norm180(desired - base)));
    return base + delta;
  },

  // does segment a->b cross circle c (radius r), with both endpoints outside?
  segHitsCircle(a, b, c, r) {
    const insideA = U.dist(a, c) < r, insideB = U.dist(b, c) < r;
    if (insideA || insideB) return false; // endpoints inside handled separately
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return false;
    let t = ((c.x - a.x) * dx + (c.y - a.y) * dy) / len2;
    t = U.clamp(t, 0, 1);
    const px = a.x + dx * t, py = a.y + dy * t;
    return Math.hypot(c.x - px, c.y - py) < r;
  },

  /* ---- movement curves (inertia) ----
     Cubic Bézier whose tangents match the start heading and the final facing,
     so a ship swings through a smooth arc and settles onto its new heading. */
  curveFn(from, to) {
    const d = U.dist(from, to);
    if (d < 4) {
      // rotation in place
      return (t) => ({ x: from.x, y: from.y, angle: U.lerpAngle(from.angle, to.angle, t) });
    }
    const k = d * 0.42;
    const a0 = from.angle * U.D2R, a1 = to.angle * U.D2R;
    const p0 = { x: from.x, y: from.y };
    const p1 = { x: from.x + Math.cos(a0) * k, y: from.y + Math.sin(a0) * k };
    const p2 = { x: to.x - Math.cos(a1) * k, y: to.y - Math.sin(a1) * k };
    const p3 = { x: to.x, y: to.y };
    return (t) => {
      const u = 1 - t;
      const x = u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x;
      const y = u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y;
      // derivative for the facing along the arc
      const dx = 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
      const dy = 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
      const angle = (Math.abs(dx) + Math.abs(dy) > 0.001) ? Math.atan2(dy, dx) / U.D2R : to.angle;
      return { x, y, angle };
    };
  },

  sampleCurve(from, to, n) {
    const f = U.curveFn(from, to);
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push(f(i / n));
    return pts;
  },

  fmtPct(p) { return Math.round(p * 100) + '%'; },
  padTurn(n) { return String(n).padStart(2, '0'); },

  el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  },

  esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
};

if (typeof window !== 'undefined') window.U = U;
