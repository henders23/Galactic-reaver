/* Galactic Reaver — canvas renderer + effects */
'use strict';

const Rend = {
  cv: null, ctx: null, RS: 1,
  stars: [], fxList: [], shakeMag: 0,
  running: false,
  // camera: cx/cy are the world point at the viewport centre
  cam: { cx: DATA.WORLD.w / 2, cy: DATA.WORLD.h / 2, z: 0.5, minZ: 0.3, maxZ: 1.8 },
  vw: 800, vh: 600, // viewport CSS size

  /* per-class hull silhouettes (normalized 0..1, nose at x=1) */
  SHAPES: {
    blade: [[0, .35], [.55, .20], [.78, 0], [1, .42], [1, .58], [.78, 1], [.55, .80], [0, .65]],
    dart: [[0, .28], [.5, .12], [1, .5], [.5, .88], [0, .72], [.2, .5]],
    spine: [[0, .36], [.18, .22], [.48, .22], [.62, .06], [.82, .3], [1, .44], [1, .56], [.82, .7], [.62, .94], [.48, .78], [.18, .78], [0, .64]],
    slab: [[0, .2], [.6, .1], [.86, .28], [1, .5], [.86, .72], [.6, .9], [0, .8], [.07, .5]],
    box: [[0, .3], [.12, .16], [.72, .16], [1, .5], [.72, .84], [.12, .84], [0, .7]]
  },

  init(canvas) {
    Rend.cv = canvas;
    Rend.RS = Math.min(window.devicePixelRatio || 1, 2);
    Rend.ctx = canvas.getContext('2d');
    Rend.syncSize();
    Rend.fitCamera();
    Rend.makeStars();
    if (!Rend.running) {
      Rend.running = true;
      requestAnimationFrame(Rend.loop);
    }
  },

  syncSize() {
    if (!Rend.cv) return;
    const r = Rend.cv.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    Rend.vw = r.width; Rend.vh = r.height;
    const dw = Math.round(r.width * Rend.RS), dh = Math.round(r.height * Rend.RS);
    if (Rend.cv.width !== dw || Rend.cv.height !== dh) {
      Rend.cv.width = dw; Rend.cv.height = dh;
    }
  },

  fitZoom() { return Math.min(Rend.vw / DATA.WORLD.w, Rend.vh / DATA.WORLD.h) * 0.98; },

  fitCamera() {
    Rend.cam.cx = DATA.WORLD.w / 2;
    Rend.cam.cy = DATA.WORLD.h / 2;
    const fz = Rend.fitZoom();
    Rend.cam.minZ = fz * 0.9;
    Rend.cam.z = fz;
    Rend.clampCam();
  },

  clampCam() {
    const c = Rend.cam;
    c.z = U.clamp(c.z, c.minZ, c.maxZ);
    const hw = Rend.vw / 2 / c.z, hh = Rend.vh / 2 / c.z;
    const mx = 120 / c.z, my = 120 / c.z; // slack beyond the world edge
    if (hw * 2 >= DATA.WORLD.w + mx * 2) c.cx = DATA.WORLD.w / 2;
    else c.cx = U.clamp(c.cx, hw - mx, DATA.WORLD.w - hw + mx);
    if (hh * 2 >= DATA.WORLD.h + my * 2) c.cy = DATA.WORLD.h / 2;
    else c.cy = U.clamp(c.cy, hh - my, DATA.WORLD.h - hh + my);
  },

  zoomAt(clientX, clientY, factor) {
    const before = Rend.toWorld({ clientX, clientY });
    Rend.cam.z = U.clamp(Rend.cam.z * factor, Rend.cam.minZ, Rend.cam.maxZ);
    const after = Rend.toWorld({ clientX, clientY });
    Rend.cam.cx += before.x - after.x;
    Rend.cam.cy += before.y - after.y;
    Rend.clampCam();
  },

  pan(dxCss, dyCss) {
    Rend.cam.cx += dxCss / Rend.cam.z;
    Rend.cam.cy += dyCss / Rend.cam.z;
    Rend.clampCam();
  },

  makeStars() {
    Rend.stars = [];
    for (let i = 0; i < 170; i++) {
      Rend.stars.push({
        x: Math.random() * DATA.WORLD.w, y: Math.random() * DATA.WORLD.h,
        r: Math.random() < 0.85 ? U.frand(0.4, 1.2) : U.frand(1.3, 2.2),
        p: Math.random() * U.TAU, sp: U.frand(0.3, 1.6),
        c: U.pick(['#c8d6e5', '#c8d6e5', '#c8d6e5', '#aac4e8', '#e8d9c0'])
      });
    }
  },

  initBattle() {
    Rend.fxList = [];
    Rend.shakeMag = 0;
    Rend.makeStars();
    Rend.syncSize();
    Rend.fitCamera();
  },

  toWorld(e) {
    const r = Rend.cv.getBoundingClientRect();
    const c = Rend.cam;
    return {
      x: (e.clientX - r.left - r.width / 2) / c.z + c.cx,
      y: (e.clientY - r.top - r.height / 2) / c.z + c.cy
    };
  },
  toScreen(x, y) {
    const r = Rend.cv.getBoundingClientRect();
    const c = Rend.cam;
    return {
      x: r.left + r.width / 2 + (x - c.cx) * c.z,
      y: r.top + r.height / 2 + (y - c.cy) * c.z
    };
  },

  shake(mag) { Rend.shakeMag = Math.max(Rend.shakeMag, mag); },

  /* ---------------- effects API ---------------- */
  fx: {
    add(o) { o.t0 = performance.now(); Rend.fxList.push(o); },

    beam(from, to, hit, color, human) {
      const tx = hit ? to.x : to.x + U.frand(-70, 70), ty = hit ? to.y : to.y + U.frand(-70, 70);
      const ang = Math.atan2(ty - from.y, tx - from.x) / U.D2R;
      Rend.fx.add({ type: 'beam', x1: from.x, y1: from.y, x2: tx, y2: ty, color, dur: 360, sprite: human ? 'beamPlayer' : 'beamEnemy' });
      // muzzle flash at the emitter
      Rend.fx.add({ type: 'imgflash', x: from.x, y: from.y, angle: ang, r: 26, sprite: 'muzzle', dur: 200 });
      if (hit) {
        Rend.fx.add({ type: 'flash', x: tx, y: ty, r: 16, color, dur: 260 });
        Rend.fx.add({ type: 'imgflash', x: tx, y: ty, angle: 0, r: 30, sprite: human ? 'sparkPlayer' : 'sparkEnemy', dur: 300 });
      }
    },

    tracers(from, to, hit, color) {
      for (let i = 0; i < 4; i++) {
        const tx = (hit ? to.x : to.x + U.frand(-90, 90)) + U.frand(-12, 12);
        const ty = (hit ? to.y : to.y + U.frand(-90, 90)) + U.frand(-12, 12);
        Rend.fx.add({
          type: 'tracer', x1: from.x + U.frand(-8, 8), y1: from.y + U.frand(-8, 8),
          x2: tx, y2: ty, color, dur: 380, delay: i * 70
        });
      }
    },

    // one tracer per die in the pool; misses streak wide of the hull
    volley(from, to, dieHits, color, human) {
      const shell = human ? 'shellPlayer' : 'shellEnemy';
      const spark = human ? 'sparkPlayer' : 'sparkEnemy';
      const ma = Math.atan2(to.y - from.y, to.x - from.x) / U.D2R;
      // one muzzle flash at the battery for the salvo
      Rend.fx.add({ type: 'imgflash', x: from.x, y: from.y, angle: ma, r: 30, sprite: 'muzzle', dur: 220 });
      dieHits.forEach((hit, i) => {
        const x1 = from.x + U.frand(-10, 10), y1 = from.y + U.frand(-10, 10);
        const tx = (hit ? to.x + U.frand(-10, 10) : to.x + U.frand(-95, 95));
        const ty = (hit ? to.y + U.frand(-10, 10) : to.y + U.frand(-95, 95));
        Rend.fx.add({
          type: 'tracer', x1, y1, x2: tx, y2: ty, color, dur: 340, delay: i * 55,
          sprite: shell, angle: Math.atan2(ty - y1, tx - x1) / U.D2R
        });
        if (hit) {
          Rend.fx.add({ type: 'flash', x: tx, y: ty, r: 10, color, dur: 200, delay: i * 55 + 280 });
          Rend.fx.add({ type: 'imgflash', x: tx, y: ty, angle: 0, r: 22, sprite: spark, dur: 280, delay: i * 55 + 280 });
        }
      });
    },

    spark(x, y, color, n) {
      for (let i = 0; i < (n || 10); i++) {
        const a = Math.random() * U.TAU, sp = U.frand(30, 160);
        Rend.fx.add({
          type: 'p', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          r: U.frand(1, 2.6), color, dur: U.frand(300, 700)
        });
      }
    },

    ring(x, y, r, color) { Rend.fx.add({ type: 'ring', x, y, r, color, dur: 500 }); },

    flashScreen(color) { Rend.fx.add({ type: 'screen', color, dur: 180 }); },

    boom(x, y, big) {
      const n = big ? 46 : 26;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * U.TAU, sp = U.frand(20, big ? 260 : 190);
        Rend.fx.add({
          type: 'p', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          r: U.frand(1.5, big ? 5 : 3.5),
          color: U.pick(['#ffd9a0', '#ffb454', '#ff8a5c', '#ff6159', '#fff2d8']),
          dur: U.frand(400, big ? 1300 : 900)
        });
      }
      Rend.fx.add({ type: 'ring', x, y, r: big ? 120 : 70, color: 'rgba(255,180,84,.8)', dur: 600 });
      Rend.fx.add({ type: 'ring', x, y, r: big ? 190 : 100, color: 'rgba(255,97,89,.5)', dur: 850 });
      Rend.fx.add({ type: 'flash', x, y, r: big ? 90 : 50, color: '#fff2d8', dur: 300 });
      // animated explosion sprite from the projectiles/explosions pack
      Rend.fx.add({ type: 'anim', set: big ? 'big' : 'small', x, y, r: big ? 170 : 100, dur: big ? 900 : 640 });
    },

    floater(x, y, text, color) {
      Rend.fx.add({ type: 'floater', x, y, text, color, dur: 1400 });
    },

    shieldFlash(ship, arc) {
      Rend.fx.add({ type: 'shield', shipId: ship.id, arc, dur: 550 });
    }
  },

  /* ---------------- main loop ---------------- */
  loop(now) {
    requestAnimationFrame(Rend.loop);
    if (window.Game) Game.tick(now);
    const ctx = Rend.ctx;
    if (!ctx) return;
    Rend.syncSize();
    const W = DATA.WORLD.w, H = DATA.WORLD.h;
    const cam = Rend.cam;

    // screen-space backdrop
    ctx.setTransform(Rend.RS, 0, 0, Rend.RS, 0, 0);
    ctx.fillStyle = '#05080d';
    ctx.fillRect(0, 0, Rend.vw, Rend.vh);

    // shake (screen space)
    let shx = 0, shy = 0;
    if (Rend.shakeMag > 0.3) {
      shx = U.frand(-Rend.shakeMag, Rend.shakeMag);
      shy = U.frand(-Rend.shakeMag, Rend.shakeMag);
      Rend.shakeMag *= 0.88;
    } else Rend.shakeMag = 0;

    // world transform: centre camera, apply zoom
    const z = cam.z;
    ctx.setTransform(
      Rend.RS * z, 0, 0, Rend.RS * z,
      Rend.RS * (Rend.vw / 2 - cam.cx * z + shx),
      Rend.RS * (Rend.vh / 2 - cam.cy * z + shy)
    );
    Rend.labelScale = U.clamp(1 / z, 1, 2.2);

    // space — deep-field photo backdrop with a soft vignette for readability
    const sf = window.ASSETS && ASSETS.starfield;
    if (sf && sf.complete && sf.naturalWidth > 0) {
      ctx.drawImage(sf, -60, -60, W + 120, H + 120);
      const vg = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, W * 0.72);
      vg.addColorStop(0, 'rgba(5,8,13,.15)');
      vg.addColorStop(1, 'rgba(5,8,13,.5)');
      ctx.fillStyle = vg;
      ctx.fillRect(-60, -60, W + 120, H + 120);
    } else {
      const g = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W * 0.7);
      g.addColorStop(0, '#0d1420');
      g.addColorStop(1, '#070b12');
      ctx.fillStyle = g;
      ctx.fillRect(-60, -60, W + 120, H + 120);
    }
    // world boundary
    ctx.strokeStyle = 'rgba(76,215,234,.14)';
    ctx.setLineDash([10, 14]);
    ctx.lineWidth = 1.5 / z;
    ctx.strokeRect(0, 0, W, H);
    ctx.setLineDash([]);

    // stars
    Rend.stars.forEach(st => {
      const tw = 0.55 + 0.45 * Math.sin(now / 900 * st.sp + st.p);
      ctx.globalAlpha = tw * 0.8;
      ctx.fillStyle = st.c;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, U.TAU);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    const b = Game.b;
    if (!b) { Rend.drawIdle(ctx, now); return; }

    Rend.drawTerrain(ctx, b, now);
    Rend.drawPlotting(ctx, b, now);
    Rend.drawFireArcs(ctx, b, now);
    b.ships.forEach(s => { if (s.hulked) Rend.drawHulk(ctx, s, b, now); });
    Rend.drawTorps(ctx, b, now);
    Rend.drawCraft(ctx, b, now);
    b.ships.forEach(s => { if (s.alive && !s.exited) Rend.drawShip(ctx, s, b, now); });
    Rend.drawFx(ctx, now);
  },

  drawIdle(ctx, now) {
    // title screen backdrop: slow drifting capital ship
    ctx.save();
    ctx.translate(DATA.WORLD.w * 0.72 + Math.sin(now / 5200) * 20, DATA.WORLD.h * 0.3 + Math.cos(now / 6100) * 14);
    ctx.rotate(0.4 + Math.sin(now / 9000) * 0.05);
    const img = window.ASSETS && ASSETS.sprite('terran-5');
    if (img) {
      ctx.globalAlpha = 0.22;
      Rend.paintSprite(ctx, img, 340);
    } else {
      ctx.globalAlpha = 0.14;
      Rend.tracePoly(ctx, 320, 128, 'spine');
      ctx.fillStyle = '#17414f';
      ctx.strokeStyle = '#4cd7ea';
      ctx.lineWidth = 2;
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  },

  seededRocks(t) {
    if (t._rocks) return t._rocks;
    let s = t.seed;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const rocks = [];
    const n = Math.round(t.r / 9);
    for (let i = 0; i < n; i++) {
      const a = rnd() * U.TAU, d = Math.sqrt(rnd()) * (t.r - 12);
      rocks.push({ x: t.x + Math.cos(a) * d, y: t.y + Math.sin(a) * d, r: 3 + rnd() * 11, rot: rnd() * U.TAU });
    }
    t._rocks = rocks;
    return rocks;
  },

  drawTerrain(ctx, b, now) {
    b.terrain.forEach(t => {
      if (t.type === 'neb') {
        const g = ctx.createRadialGradient(t.x, t.y, t.r * 0.1, t.x, t.y, t.r);
        g.addColorStop(0, 'rgba(126,88,180,.20)');
        g.addColorStop(0.6, 'rgba(96,64,150,.12)');
        g.addColorStop(1, 'rgba(96,64,150,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(150,110,210,.18)';
        ctx.setLineDash([4, 9]);
        ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, U.TAU); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(170,140,220,.5)';
        ctx.font = '600 ' + (10 * (Rend.labelScale || 1)) + 'px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NEBULA · −ACC INSIDE', t.x, t.y - t.r - 8);
      }
    });
    b.terrain.forEach(t => {
      if (t.type === 'ast') {
        ctx.strokeStyle = 'rgba(160,150,130,.25)';
        ctx.setLineDash([5, 8]);
        ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, U.TAU); ctx.stroke();
        ctx.setLineDash([]);
        Rend.seededRocks(t).forEach(rk => {
          ctx.save();
          ctx.translate(rk.x, rk.y);
          ctx.rotate(rk.rot + now / 60000);
          ctx.fillStyle = '#3a3d42';
          ctx.strokeStyle = '#575b60';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = i / 6 * U.TAU, rr = rk.r * (0.75 + 0.3 * Math.sin(rk.rot * 7 + i * 2.4));
            const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
            i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.restore();
        });
        ctx.fillStyle = 'rgba(180,170,150,.5)';
        ctx.font = '600 ' + (10 * (Rend.labelScale || 1)) + 'px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ASTEROIDS · BLOCKS FIRE', t.x, t.y - t.r - 8);
      }
    });
  },

  shipPos(s, b, now) {
    if (b.phase === 'anim' && s.animFrom && s.plot && b.anim) {
      const t = U.easeInOut(U.clamp((now - b.anim.start) / b.anim.dur, 0, 1));
      const curve = s.animCurve || (s.animCurve = U.curveFn(s.animFrom, s.plot));
      const p = curve(t); // position AND facing follow the inertial arc
      return {
        x: p.x, y: p.y, angle: p.angle, t,
        moving: t < 1 && (Math.abs(s.plot.x - s.animFrom.x) + Math.abs(s.plot.y - s.animFrom.y) > 4)
      };
    }
    return { x: s.x, y: s.y, angle: s.angle, moving: false };
  },

  tracePoly(ctx, w, h, shape) {
    ctx.beginPath();
    (Rend.SHAPES[shape] || Rend.SHAPES.blade).forEach((p, i) => {
      const px = (p[0] - 0.5) * w, py = (p[1] - 0.5) * h;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.closePath();
  },

  /* faction sprite for a ship, or null while it loads */
  spriteOf(s) {
    const c = DATA.CLASSES[s.cls];
    return (c && c.sprite && window.ASSETS) ? ASSETS.sprite(c.sprite) : null;
  },

  /* draw a nose-up sprite pointing along local +x, centred at the origin.
     ctx must already be rotated to the ship's heading. */
  paintSprite(ctx, img, len) {
    const beam = len * (img.width / img.height);
    ctx.save();
    ctx.rotate(Math.PI / 2); // sprite art faces up; heading is +x
    ctx.drawImage(img, -beam / 2, -len / 2, beam, len);
    ctx.restore();
  },

  sector(ctx, x, y, r, centerDeg, halfDeg, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, (centerDeg - halfDeg) * U.D2R, (centerDeg + halfDeg) * U.D2R);
    ctx.closePath();
    ctx.fill();
  },

  sideSectors(ctx, x, y, r, angleDeg, fill) {
    Rend.sector(ctx, x, y, r, angleDeg + 90, 40, fill);
    Rend.sector(ctx, x, y, r, angleDeg - 90, 40, fill);
  },

  weaponArc(ctx, ship, pos, w, fill) {
    if (w.arc === 'fore') Rend.sector(ctx, pos.x, pos.y, w.range, pos.angle, 50, fill);
    else Rend.sideSectors(ctx, pos.x, pos.y, w.range, pos.angle, fill);
  },

  drawPlotting(ctx, b, now) {
    if (b.phase !== 'move') return;
    const s = Game.ship(b.sel);

    // move envelope for current order
    if (s && b.curOrder && b.curOrder.range > 0 && (b.plotStep === 'dest' || b.plotStep === 'angle')) {
      const o = b.curOrder;
      ctx.save();
      if (o.maxTurn >= 180) {
        ctx.fillStyle = 'rgba(76,215,234,.05)';
        ctx.beginPath(); ctx.arc(s.x, s.y, o.range, 0, U.TAU); ctx.fill();
      } else {
        Rend.sector(ctx, s.x, s.y, o.range, s.angle, o.maxTurn, 'rgba(76,215,234,.06)');
      }
      ctx.strokeStyle = 'rgba(76,215,234,.4)';
      ctx.setLineDash([5, 7]);
      ctx.beginPath(); ctx.arc(s.x, s.y, o.range, 0, U.TAU); ctx.stroke();
      if (o.minMove > 1) {
        ctx.strokeStyle = 'rgba(255,97,89,.35)';
        ctx.beginPath(); ctx.arc(s.x, s.y, o.minMove, 0, U.TAU); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    }

    // committed plots: faint ghosts + paths
    Game.playerShips(b).forEach(ps => {
      if (!ps.plotted || !ps.plot) return;
      Rend.drawPath(ctx, ps, ps.plot, 'rgba(76,215,234,.35)');
      Rend.drawGhost(ctx, ps, ps.plot, 0.4);
    });

    // active ghost
    if (s && b.ghost) {
      Rend.drawPath(ctx, s, b.ghost, 'rgba(76,215,234,.7)');
      Rend.drawGhost(ctx, s, b.ghost, 1);
      // preview firing arcs at ghost
      s.weapons.forEach(w => {
        if (w.type === 'torp') return;
        Rend.weaponArc(ctx, s, b.ghost, w, w.arc === 'fore' ? 'rgba(255,180,84,.05)' : 'rgba(76,215,234,.04)');
      });
    }
  },

  // dashed preview of the inertial arc the ship will actually fly
  drawPath(ctx, from, to, color) {
    const pts = U.sampleCurve(
      { x: from.x, y: from.y, angle: from.angle },
      { x: to.x, y: to.y, angle: to.angle !== undefined ? to.angle : from.angle },
      22);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  },

  drawGhost(ctx, ship, plot, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(plot.x, plot.y);
    ctx.rotate(plot.angle * U.D2R);
    const sprite = Rend.spriteOf(ship);
    if (sprite) {
      ctx.globalAlpha = alpha * 0.55;
      Rend.paintSprite(ctx, sprite, ship.w);
      ctx.globalAlpha = alpha;
      Rend.tracePoly(ctx, ship.w, ship.h, ship.shape);
      ctx.strokeStyle = 'rgba(76,215,234,.9)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      Rend.tracePoly(ctx, ship.w, ship.h, ship.shape);
      ctx.fillStyle = 'rgba(76,215,234,.13)';
      ctx.strokeStyle = 'rgba(76,215,234,.9)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.2;
      ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  },

  drawFireArcs(ctx, b, now) {
    if (b.phase === 'fire' && b.armed) {
      const s = Game.ship(b.armed.shipId);
      const w = s && s.weapons[b.armed.wIdx];
      if (s && w) {
        const pulse = 0.10 + 0.045 * Math.sin(now / 220);
        Rend.weaponArc(ctx, s, s, w, 'rgba(255,180,84,' + pulse + ')');
      }
    } else if (b.phase === 'fire' && b.sel) {
      const s = Game.ship(b.sel);
      if (s) s.weapons.forEach(w => {
        if (w.reload > 0) return;
        Rend.weaponArc(ctx, s, s, w, w.arc === 'fore' ? 'rgba(255,180,84,.045)' : 'rgba(76,215,234,.04)');
      });
    }
    // inspected ship arcs
    if (b.inspect) {
      const s = Game.ship(b.inspect);
      if (s && s.alive) s.weapons.forEach(w => {
        Rend.weaponArc(ctx, s, s, w, s.side === 'enemy' ? 'rgba(255,97,89,.08)' : 'rgba(76,215,234,.06)');
      });
    }
  },

  drawTorps(ctx, b, now) {
    b.torps.forEach(tp => {
      let x = tp.x, y = tp.y;
      if (b.phase === 'anim' && tp.from && tp.to && b.anim) {
        const t = U.easeInOut(U.clamp((now - b.anim.start) / b.anim.dur, 0, 1));
        x = U.lerp(tp.from.x, tp.to.x, t);
        y = U.lerp(tp.from.y, tp.to.y, t);
      }
      const rad = tp.angle * U.D2R;
      const hostile = tp.side === 'enemy';
      const col = hostile ? '#ff8a5c' : '#ffd465';
      const torpImg = ASSETS.projectile(hostile ? 'torpEnemy' : 'torpPlayer');
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rad);
      // exhaust trail
      const tg = ctx.createLinearGradient(-46, 0, 0, 0);
      tg.addColorStop(0, 'rgba(255,180,84,0)');
      tg.addColorStop(1, hostile ? 'rgba(255,138,92,.5)' : 'rgba(255,180,84,.5)');
      ctx.fillStyle = tg;
      ctx.fillRect(-46, -2, 46, 4);
      if (torpImg) {
        // one torpedo sprite per fish in the salvo, fanned out
        for (let i = 0; i < tp.count; i++) {
          const oy = (i - (tp.count - 1) / 2) * 11;
          const ar = torpImg.width / torpImg.height || 0.3;
          const h = 34, w = h * ar;
          ctx.save();
          ctx.translate(0, oy);
          ctx.rotate(U.D2R * 90);   // sprite faces up → align to +X travel
          ctx.drawImage(torpImg, -w / 2, -h / 2, w, h);
          ctx.restore();
        }
      } else {
        // procedural fallback
        for (let i = 0; i < tp.count; i++) {
          const oy = (i - (tp.count - 1) / 2) * 8;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(8, oy);
          ctx.lineTo(-5, oy - 3);
          ctx.lineTo(-5, oy + 3);
          ctx.closePath();
          ctx.fill();
          const fl = 0.6 + 0.4 * Math.sin(now / 60 + i * 2);
          ctx.fillStyle = 'rgba(255,220,150,' + fl + ')';
          ctx.fillRect(-9, oy - 1.2, 4, 2.4);
        }
      }
      ctx.restore();
      const tls = Rend.labelScale || 1;
      ctx.fillStyle = hostile ? 'rgba(255,138,92,.85)' : 'rgba(255,212,101,.85)';
      ctx.font = '600 ' + (9 * tls) + 'px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText((hostile ? '⚠ ' : '') + 'TORPEDOES ×' + tp.count, x, y - 16 * tls);
    });
  },

  drawHulk(ctx, s, b, now) {
    const ls = Rend.labelScale || 1;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle * U.D2R);
    const sprite = Rend.spriteOf(s);
    if (sprite) {
      const prevFilter = ctx.filter;
      ctx.filter = 'grayscale(80%) brightness(0.45)';
      Rend.paintSprite(ctx, sprite, s.w);
      ctx.filter = prevFilter || 'none';
      if (s.captured) {
        Rend.tracePoly(ctx, s.w, s.h, s.shape);
        ctx.strokeStyle = 'rgba(255,212,101,.75)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    } else {
      Rend.tracePoly(ctx, s.w, s.h, s.shape);
      ctx.fillStyle = '#181a1f';
      ctx.strokeStyle = s.captured ? 'rgba(255,212,101,.75)' : 'rgba(120,120,130,.5)';
      ctx.lineWidth = 1.2;
      ctx.fill(); ctx.stroke();
      // scorch marks
      ctx.strokeStyle = 'rgba(60,60,68,.9)';
      ctx.beginPath();
      ctx.moveTo(-s.w * 0.3, -s.h * 0.15); ctx.lineTo(s.w * 0.1, s.h * 0.2);
      ctx.moveTo(s.w * 0.05, -s.h * 0.25); ctx.lineTo(s.w * 0.3, 0);
      ctx.stroke();
    }
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = 'rgba(255,' + Math.floor(U.frand(90, 150)) + ',50,' + U.frand(0.08, 0.3) + ')';
      ctx.beginPath();
      ctx.arc(U.frand(-s.w * 0.3, s.w * 0.3), U.frand(-s.h * 0.2, s.h * 0.2), U.frand(1.5, 4), 0, U.TAU);
      ctx.fill();
    }
    ctx.restore();
    // boarding-range hint while a boarding party is picking a target
    if (b.boardMode && !s.captured) {
      const boarder = Game.ship(b.boardMode);
      if (boarder && U.dist(boarder, s) <= DATA.BOARD_RANGE) {
        ctx.strokeStyle = 'rgba(255,212,101,.8)';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 10, 0, U.TAU); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.font = '600 ' + (9 * ls) + 'px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = s.captured ? '#ffd465' : '#7a828e';
    ctx.fillText(s.captured ? '⚑ PRIZE — ' + s.name.replace('DKV ', '') : 'HULK — ' + s.name.replace('DKV ', '') + ' (boardable)', s.x, s.y + s.h / 2 + 16 * ls);
  },

  drawCraft(ctx, b, now) {
    const ls = Rend.labelScale || 1;
    b.craft.forEach(c => {
      let x = c.x, y = c.y;
      if (b.phase === 'anim' && c.from && c.to && b.anim) {
        const t = U.easeInOut(U.clamp((now - b.anim.start) / b.anim.dur, 0, 1));
        x = U.lerp(c.from.x, c.to.x, t);
        y = U.lerp(c.from.y, c.to.y, t);
      }
      const hostile = c.side === 'enemy';
      const bombers = c.kind === 'bombers';
      const col = bombers ? (hostile ? '#ff8a5c' : '#ffd465') : '#7ce8f7';
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(c.angle * U.D2R);
      for (let i = 0; i < c.count; i++) {
        const oy = (i - (c.count - 1) / 2) * 10;
        const wob = Math.sin(now / 160 + i * 2.1) * 2;
        ctx.fillStyle = col;
        ctx.beginPath();
        if (bombers) {
          ctx.moveTo(7, oy + wob);
          ctx.lineTo(-4, oy + wob - 4);
          ctx.lineTo(-1.5, oy + wob);
          ctx.lineTo(-4, oy + wob + 4);
        } else {
          ctx.moveTo(6, oy + wob);
          ctx.lineTo(-4, oy + wob - 2.6);
          ctx.lineTo(-4, oy + wob + 2.6);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.85;
      ctx.font = '600 ' + (9 * ls) + 'px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText((hostile && bombers ? '⚠ ' : '') + (bombers ? 'BOMBERS' : 'FIGHTERS') + ' ×' + c.count, x, y - 16 * ls);
      ctx.globalAlpha = 1;
    });
  },

  drawShip(ctx, s, b, now) {
    const pos = Rend.shipPos(s, b, now);
    const ally = s.side !== 'enemy';
    const sel = b.sel === s.id;
    const armedHover = b.phase === 'fire' && b.armed && s.side === 'enemy' && b.hover === s.id;

    // engine wake along the arc already flown — mass takes a while to answer the helm
    if (pos.moving && s.animCurve) {
      const t0 = Math.max(0, (pos.t || 0) - 0.24);
      ctx.save();
      ctx.lineCap = 'round';
      const trailCol = ally ? '150,220,255' : '255,150,110';
      const SEGS = 7;
      for (let i = 0; i < SEGS; i++) {
        const pa = s.animCurve(U.lerp(t0, pos.t, i / SEGS));
        const pb = s.animCurve(U.lerp(t0, pos.t, (i + 1) / SEGS));
        ctx.strokeStyle = 'rgba(' + trailCol + ',' + (0.02 + 0.055 * i) + ')';
        ctx.lineWidth = s.h * 0.3 * (i / SEGS + 0.15);
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(pos.x, pos.y);

    // selection / hover rings (unrotated)
    if (sel && (b.phase === 'move' || b.phase === 'fire')) {
      ctx.strokeStyle = 'rgba(76,215,234,.7)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, s.r + 14, now / 700 % U.TAU, now / 700 % U.TAU + U.TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (armedHover) {
      ctx.strokeStyle = '#ffb454';
      ctx.lineWidth = 1.6;
      const rr = s.r + 12 + 3 * Math.sin(now / 150);
      ctx.setLineDash([10, 7]);
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, U.TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    // targeted marker
    const targeted = b.phase === 'fire' && Game.playerShips(b).some(ps => ps.weapons.some(w => w.target === s.id));
    if (targeted) {
      ctx.strokeStyle = 'rgba(255,180,84,.85)';
      ctx.lineWidth = 1.4;
      const rr = s.r + 10;
      [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(q => {
        ctx.beginPath();
        ctx.moveTo(q[0] * rr, q[1] * (rr - 8));
        ctx.lineTo(q[0] * rr, q[1] * rr);
        ctx.lineTo(q[0] * (rr - 8), q[1] * rr);
        ctx.stroke();
      });
    }

    // shield arcs (unrotated ring segments around ship, oriented by facing)
    const shieldCol = ally ? '76,215,234' : '255,97,89';
    const segs = [
      { arc: 'F', a0: -55, a1: 55 },
      { arc: 'S', a0: 60, a1: 115 }, { arc: 'S', a0: -115, a1: -60 },
      { arc: 'A', a0: 130, a1: 230 }
    ];
    segs.forEach(seg => {
      const v = s.sh[seg.arc];
      if (v <= 0) return;
      ctx.strokeStyle = 'rgba(' + shieldCol + ',' + (0.22 + 0.16 * v) + ')';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, s.r + 7, (pos.angle + seg.a0) * U.D2R, (pos.angle + seg.a1) * U.D2R);
      ctx.stroke();
    });

    // hull
    ctx.rotate(pos.angle * U.D2R);
    // engine flare while moving
    if (pos.moving) {
      const fl = U.frand(0.6, 1);
      const eg = ctx.createLinearGradient(-s.w * 0.5 - 30, 0, -s.w * 0.42, 0);
      eg.addColorStop(0, 'rgba(120,200,255,0)');
      eg.addColorStop(1, 'rgba(150,220,255,' + 0.5 * fl + ')');
      ctx.fillStyle = eg;
      ctx.fillRect(-s.w * 0.5 - 30, -s.h * 0.16, 30, s.h * 0.32);
    }
    const sprite = Rend.spriteOf(s);
    if (sprite) {
      ctx.shadowColor = ally ? 'rgba(76,215,234,.45)' : 'rgba(255,97,89,.4)';
      ctx.shadowBlur = 18;
      Rend.paintSprite(ctx, sprite, s.w);
      ctx.shadowBlur = 0;
    } else {
      Rend.tracePoly(ctx, s.w, s.h, s.shape);
      const grad = ctx.createLinearGradient(-s.w / 2, -s.h / 2, s.w / 2, s.h / 2);
      if (ally) { grad.addColorStop(0, '#17414f'); grad.addColorStop(1, '#0f2833'); }
      else { grad.addColorStop(0, '#35181c'); grad.addColorStop(1, '#22101a'); }
      ctx.fillStyle = grad;
      ctx.shadowColor = ally ? 'rgba(76,215,234,.4)' : 'rgba(255,97,89,.32)';
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = ally ? 'rgba(76,215,234,.9)' : (b.armed && b.phase === 'fire' ? '#ffb454' : 'rgba(255,97,89,.7)');
      ctx.lineWidth = 1.3;
      ctx.stroke();
      // spine detail
      ctx.strokeStyle = ally ? 'rgba(120,220,240,.25)' : 'rgba(255,130,120,.2)';
      ctx.beginPath();
      ctx.moveTo(-s.w * 0.4, 0); ctx.lineTo(s.w * 0.34, 0);
      ctx.stroke();
    }
    // vip marker
    if (s.vip) {
      ctx.fillStyle = '#ffd465';
      ctx.font = '700 12px Rajdhani, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('◆', 0, -s.h / 2 - 4);
    }

    // fires
    if (s.fires > 0) {
      for (let i = 0; i < s.fires; i++) {
        const fx = U.frand(-s.w * 0.3, s.w * 0.3), fy = U.frand(-s.h * 0.2, s.h * 0.2);
        ctx.fillStyle = 'rgba(255,' + Math.floor(U.frand(100, 190)) + ',60,' + U.frand(0.25, 0.6) + ')';
        ctx.beginPath(); ctx.arc(fx, fy, U.frand(2, 5), 0, U.TAU); ctx.fill();
      }
    }
    ctx.restore();

    // boarding-mode target highlight
    if (b.boardMode && s.side === 'enemy') {
      const boarder = Game.ship(b.boardMode);
      if (boarder && U.dist(boarder, s) <= DATA.BOARD_RANGE) {
        ctx.strokeStyle = 'rgba(255,212,101,.85)';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, s.r + 12, 0, U.TAU); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // label (zoom-compensated so it stays readable when zoomed out)
    const ls = Rend.labelScale || 1;
    const chev = DATA.RANKS[s.rank] ? DATA.RANKS[s.rank].chev : '';
    const nm = s.name.replace('TAS ', '').replace('DKV ', '');
    ctx.font = '600 ' + (10 * ls) + 'px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = s.routing ? '#c9a86a' : (ally ? (s.side === 'ally' ? '#8fd8a8' : '#4cd7ea') : '#ff6159');
    const ly = pos.y + s.h / 2 + 18 * ls;
    ctx.fillText((s.routing ? '⚑ ' : '') + (chev ? chev + ' ' : '') + nm +
      (s.routing ? ' — FLEEING' : '') +
      (b.phase === 'move' && s.side === 'player' && s.plotted ? ' ✓' : ''), pos.x, ly);
    // hull bar
    const bw = Math.max(44, s.w * 0.6);
    ctx.fillStyle = 'rgba(20,30,45,.8)';
    ctx.fillRect(pos.x - bw / 2, ly + 4 * ls, bw, 3 * ls);
    const hp = s.hull / s.maxHull;
    ctx.fillStyle = hp > 0.55 ? (ally ? '#4cd7ea' : '#ff6159') : (hp > 0.25 ? '#ffb454' : '#ff6159');
    ctx.fillRect(pos.x - bw / 2, ly + 4 * ls, bw * hp, 3 * ls);
  },

  /* draw a nose-up projectile/impact sprite centred at (x,y), rotated so its nose
     points along angleDeg (0 = +X), scaled to `size` px on its long edge */
  drawSpriteAt(ctx, img, x, y, angleDeg, size) {
    const ar = img.width / img.height || 1;
    const h = size, w = size * ar;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angleDeg + 90) * U.D2R);   // sprites face up; +90 aligns up→+X
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  },

  drawFx(ctx, now) {
    Rend.fxList = Rend.fxList.filter(f => {
      const delay = f.delay || 0;
      const age = now - f.t0 - delay;
      if (age < 0) return true;
      const t = age / f.dur;
      if (t >= 1) return false;
      switch (f.type) {
        case 'beam': {
          const img = f.sprite && ASSETS.projectile(f.sprite);
          ctx.save();
          if (img) {
            // stretch the beam sprite along the shot, with a bright core line over it
            const dx = f.x2 - f.x1, dy = f.y2 - f.y1;
            const len = Math.hypot(dx, dy) || 1;
            const ang = Math.atan2(dy, dx);
            ctx.globalAlpha = 1 - t;
            ctx.translate(f.x1, f.y1);
            ctx.rotate(ang);
            const bw = (img.width / img.height) * 18;
            ctx.drawImage(img, 0, -bw / 2, len, bw);
            ctx.restore();
            ctx.save();
          }
          ctx.globalAlpha = (1 - t) * (img ? 0.85 : 1);
          ctx.strokeStyle = f.color;
          ctx.lineWidth = 3.2 * (1 - t) + 0.6;
          ctx.shadowColor = f.color;
          ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
          ctx.restore();
          break;
        }
        case 'imgflash': {
          const img = f.sprite && ASSETS.projectile(f.sprite);
          if (img) {
            const sc = 0.7 + t * 0.6;
            ctx.save();
            ctx.globalAlpha = (1 - t) * 0.95;
            Rend.drawSpriteAt(ctx, img, f.x, f.y, (f.angle || 0), f.r * 2 * sc);
            ctx.restore();
          } else {
            ctx.globalAlpha = (1 - t) * 0.7;
            ctx.fillStyle = '#fff2d8';
            ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 - t * 0.5), 0, U.TAU); ctx.fill();
            ctx.globalAlpha = 1;
          }
          break;
        }
        case 'anim': {
          const rec = ASSETS.explosion(f.set);
          if (rec) {
            const fi = Math.min(rec.frames - 1, Math.floor(t * rec.frames));
            const col = fi % rec.cols, row = Math.floor(fi / rec.cols);
            const fs = rec.frame;
            ctx.save();
            ctx.globalAlpha = 1;
            ctx.drawImage(rec.img, col * fs, row * fs, fs, fs, f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
            ctx.restore();
          }
          break;
        }
        case 'tracer': {
          const px = U.lerp(f.x1, f.x2, t), py = U.lerp(f.y1, f.y2, t);
          const bx = U.lerp(f.x1, f.x2, Math.max(0, t - 0.08)), by = U.lerp(f.y1, f.y2, Math.max(0, t - 0.08));
          // glowing streak behind the round
          ctx.strokeStyle = f.color;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(px, py); ctx.stroke();
          const img = f.sprite && ASSETS.projectile(f.sprite);
          if (img) Rend.drawSpriteAt(ctx, img, px, py, f.angle, 26);
          break;
        }
        case 'p': {
          const dt = age / 1000;
          const px = f.x + f.vx * dt, py = f.y + f.vy * dt;
          ctx.globalAlpha = 1 - t;
          ctx.fillStyle = f.color;
          ctx.beginPath(); ctx.arc(px, py, f.r * (1 - t * 0.6), 0, U.TAU); ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }
        case 'ring': {
          ctx.globalAlpha = 1 - t;
          ctx.strokeStyle = f.color;
          ctx.lineWidth = 2.2 * (1 - t) + 0.5;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.2 + t * 0.8) + 4, 0, U.TAU); ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case 'flash': {
          ctx.globalAlpha = (1 - t) * 0.9;
          const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
          g.addColorStop(0, f.color);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, U.TAU); ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }
        case 'floater': {
          ctx.globalAlpha = t < 0.7 ? 1 : (1 - t) / 0.3;
          ctx.fillStyle = f.color;
          ctx.font = '700 13px "IBM Plex Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(f.text, f.x, f.y - t * 34);
          ctx.globalAlpha = 1;
          break;
        }
        case 'shield': {
          const s = Game.ship(f.shipId);
          if (!s || !s.alive) return false;
          const pos = Rend.shipPos(s, Game.b, now);
          const segs = { F: [-60, 60], S: [60, 120], A: [120, 240] };
          const seg = segs[f.arc] || segs.F;
          ctx.globalAlpha = 1 - t;
          ctx.strokeStyle = '#9fe8ff';
          ctx.lineWidth = 4 * (1 - t) + 1;
          ctx.shadowColor = '#9fe8ff';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, s.r + 9, (pos.angle + seg[0]) * U.D2R, (pos.angle + seg[1]) * U.D2R);
          if (f.arc === 'S') {
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, s.r + 9, (pos.angle - seg[1]) * U.D2R, (pos.angle - seg[0]) * U.D2R);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
          break;
        }
        case 'screen': {
          ctx.globalAlpha = (1 - t) * 0.18;
          ctx.fillStyle = f.color;
          ctx.fillRect(-40, -40, DATA.WORLD.w + 80, DATA.WORLD.h + 80);
          ctx.globalAlpha = 1;
          break;
        }
      }
      return true;
    });
  }
};

if (typeof window !== 'undefined') window.Rend = Rend;
