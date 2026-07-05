/* Galactic Reaver — game state machine, combat resolution, AI, campaign */
'use strict';

const Game = {
  SAVE_KEY: 'galactic-reaver-save',
  mode: 'campaign',       // 'campaign' | 'skirmish'
  save: null,             // campaign persistence
  b: null,                // current battle state

  /* ================= campaign persistence ================= */
  freshSave() {
    return {
      mIdx: 0, req: 0,
      fleet: [{ cls: 'corvette', name: 'VSS KESTREL' }],
      upgrades: {},
      done: false
    };
  },

  loadSave() {
    try {
      const raw = localStorage.getItem(Game.SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && Array.isArray(s.fleet) && typeof s.mIdx === 'number') return s;
      }
    } catch (e) { /* corrupt/blocked storage -> fresh */ }
    return null;
  },

  persist() {
    if (Game.mode !== 'campaign' || !Game.save) return;
    try { localStorage.setItem(Game.SAVE_KEY, JSON.stringify(Game.save)); } catch (e) { }
  },

  wipeSave() { try { localStorage.removeItem(Game.SAVE_KEY); } catch (e) { } },

  /* ================= ship construction ================= */
  mkShip(cls, name, side, role, x, y, angle, opts) {
    const c = DATA.CLASSES[cls];
    const sh = Object.assign({}, c.sh);
    const shMax = Object.assign({}, c.sh);
    const s = {
      id: name.replace(/\W+/g, '_').toLowerCase() + '_' + Math.floor(Math.random() * 1e6),
      cls, name, side, role: role || 'brawler',
      label: c.label, short: c.short,
      x, y, angle, w: c.w, h: c.h, r: Math.max(c.w, c.h) / 2,
      hull: c.hull, maxHull: c.hull,
      sh, shMax,
      sys: { 'WEAPONS': 0, 'ENGINES': 0, 'SHIELD EMITTER': 0, 'BRIDGE': 0 },
      fires: 0,
      speed: c.speed, maxTurn: c.maxTurn, turrets: c.turrets, pts: c.pts,
      weapons: c.weapons.map(w => DATA.weapon(Object.assign({}, w))),
      alive: true, exited: false,
      order: null, plot: null, plotted: false,
      animFrom: null,
      vip: !!(opts && opts.vip)
    };
    if (side === 'player' && Game.mode === 'campaign' && Game.save) {
      if (Game.save.upgrades.shields) { s.shMax.F += 1; s.sh.F += 1; }
    }
    return s;
  },

  effSpeed(ship) {
    const e = ship.sys['ENGINES'];
    return ship.speed * (e >= 2 ? 0.3 : (e === 1 ? 0.6 : 1));
  },

  /* ================= battle setup ================= */
  genTerrain(density) {
    const t = [];
    const counts = { light: [1, 1], medium: [2, 1], heavy: [4, 2] }[density] || [1, 1];
    const W = DATA.WORLD.w, H = DATA.WORLD.h;
    const placed = [];
    const tryPlace = (type, r) => {
      for (let i = 0; i < 40; i++) {
        const x = U.frand(420, W - 420), y = U.frand(170, H - 170);
        if (placed.every(p => Math.hypot(p.x - x, p.y - y) > p.r + r + 60)) {
          const o = { type, x, y, r, seed: Math.floor(Math.random() * 9999) };
          placed.push(o); t.push(o);
          return;
        }
      }
    };
    for (let i = 0; i < counts[0]; i++) tryPlace('ast', U.frand(58, 105));
    for (let i = 0; i < counts[1]; i++) tryPlace('neb', U.frand(110, 170));
    return t;
  },

  fleetSpawn(spawn, fleet) {
    // stack player fleet vertically around the spawn point
    return fleet.map((f, i) => {
      const y = spawn.y + (i - (fleet.length - 1) / 2) * 130;
      return Game.mkShip(f.cls, f.name, 'player', 'player', spawn.x, y, -15 + i * 10);
    });
  },

  startMission(mIdx) {
    Game.mode = 'campaign';
    Game.missionIdx = mIdx;
    const m = DATA.MISSIONS[mIdx];
    const ships = Game.fleetSpawn(m.playerSpawn, Game.save.fleet);
    (m.allies || []).forEach(a => ships.push(Game.mkShip(a.cls, a.name, 'ally', a.role, a.x, a.y, a.angle)));
    m.enemies.forEach(e => ships.push(Game.mkShip(e.cls, e.name, 'enemy', e.role, e.x, e.y, e.angle, { vip: e.vip })));
    Game.beginBattle(m, ships, m.terrain);
  },

  startSkirmish(fleetSel) {
    Game.mode = 'skirmish';
    const fleet = fleetSel.map((cls, i) => ({ cls, name: i === 0 ? 'VSS KESTREL' : DATA.SHIP_NAMES[(i - 1) % DATA.SHIP_NAMES.length] }));
    const ships = Game.fleetSpawn({ x: 240, y: 450 }, fleet);
    let budget = fleet.reduce((a, f) => a + DATA.CLASSES[f.cls].pts, 0) + 60;
    const names = DATA.DKV_NAMES.slice();
    let n = 0;
    while (budget > 80 && n < 5) {
      const affordable = DATA.SKIRMISH_POOL.filter(p => DATA.CLASSES[p.cls].pts <= budget);
      if (!affordable.length) break;
      const p = U.pick(affordable);
      budget -= DATA.CLASSES[p.cls].pts;
      const nm = names.length ? names.splice(Math.floor(Math.random() * names.length), 1)[0] : 'DKV NULL';
      ships.push(Game.mkShip(p.cls, nm, 'enemy', p.role, U.frand(1000, 1280), U.frand(160, 740), 180 + U.frand(-25, 25)));
      n++;
    }
    const m = {
      id: 'skirmish', name: 'SKIRMISH', sub: 'KESSEL DRIFT · CONTESTED VOLUME',
      reward: 0,
      win: (b) => Game.sideDead(b, 'enemy') ? 'Hostiles destroyed. Sector clear.' : null,
      lose: (b) => Game.sideDead(b, 'player') ? 'Escape pods away. The Verge keeps what it takes.' : null
    };
    Game.beginBattle(m, ships, U.pick(['light', 'medium', 'heavy']));
  },

  beginBattle(mission, ships, terrainDensity) {
    Game.b = {
      mission, turn: 1, phase: 'move',
      ships, torps: [],
      terrain: Game.genTerrain(terrainDensity),
      sel: null, plotStep: 'order', curOrder: null, ghost: null,
      armed: null, hover: null, inspect: null,
      log: [], banner: null,
      queue: [], nextShotAt: 0, anim: null,
      killPts: 0
    };
    Game.log('— TURN 01 · MOVEMENT —', '#4cd7ea');
    Game.autoSelect();
    if (window.Rend) Rend.initBattle();
    if (window.UI) UI.refresh();
  },

  /* ================= helpers ================= */
  ship(id) { return Game.b ? Game.b.ships.find(s => s.id === id) : null; },
  active(b) { return (b || Game.b).ships.filter(s => s.alive && !s.exited); },
  playerShips(b) { return Game.active(b).filter(s => s.side === 'player'); },
  enemyShips(b) { return Game.active(b).filter(s => s.side === 'enemy'); },
  sideDead(b, side) { return !b.ships.some(s => s.side === side && s.alive && !s.exited); },

  log(t, c, extra) {
    const e = Object.assign({ t, c: c || '#8ba0b8' }, extra || {});
    Game.b.log.push(e);
    if (window.UI) UI.pushLog(e);
  },

  nose(ship) {
    const rad = ship.angle * U.D2R;
    return { x: ship.x + Math.cos(rad) * ship.w * 0.5, y: ship.y + Math.sin(rad) * ship.w * 0.5 };
  },

  inNebula(pt) {
    return Game.b.terrain.some(t => t.type === 'neb' && Math.hypot(t.x - pt.x, t.y - pt.y) < t.r);
  },

  losBlocked(a, b) {
    return Game.b.terrain.some(t => t.type === 'ast' &&
      (U.segHitsCircle(a, b, t, t.r) && U.dist(a, t) > t.r && U.dist(b, t) > t.r));
  },

  /* ================= firing solution ================= */
  solution(shooter, w, target) {
    const d = U.dist(shooter, target);
    if (w.reload > 0) return { ok: false, why: 'RELOADING' };
    if (shooter.sys['WEAPONS'] >= 2) return { ok: false, why: 'WEAPONS DESTROYED' };
    if (d > w.range) return { ok: false, why: 'OUT OF RANGE' };
    const arc = U.arcOf(U.bearingFrom(shooter, target.x, target.y));
    if (w.arc === 'fore' && arc !== 'fore') return { ok: false, why: 'NOT IN FORE ARC' };
    if (w.arc === 'side' && arc !== 'side') return { ok: false, why: 'NOT IN SIDE ARC' };
    if (w.type !== 'torp' && Game.losBlocked(shooter, target)) return { ok: false, why: 'LINE OF FIRE BLOCKED' };
    if (w.type === 'torp' && shooter.order && shooter.order.brace) return { ok: false, why: 'CREWS BRACED' };

    const sArc = U.shieldArcHit(target, shooter.x, shooter.y);
    if (w.type === 'torp') {
      return { ok: true, pct: 100, dist: Math.round(d), sArc, stern: sArc === 'A', torp: true };
    }
    let pct = w.acc;
    if (shooter.order) pct += shooter.order.accMod;
    if (shooter.side === 'player' && Game.mode === 'campaign' && Game.save.upgrades.uplink) pct += 0.10;
    pct -= shooter.sys['WEAPONS'] * 0.10;
    if (shooter.sys['BRIDGE'] >= 2) pct -= 0.15;
    if (d > 0.7 * w.range) pct -= 0.15;
    if (target.order) pct -= target.order.dodge;
    if (Game.inNebula(target)) pct -= 0.15;
    if (Game.inNebula(shooter)) pct -= 0.10;
    pct = U.clamp(pct, 0.05, 0.95);
    return { ok: true, pct: Math.round(pct * 100), dist: Math.round(d), sArc, stern: sArc === 'A', torp: false };
  },

  /* ================= movement phase: player plotting ================= */
  autoSelect() {
    const b = Game.b;
    const next = Game.playerShips(b).find(s => !s.plotted);
    b.sel = next ? next.id : null;
    b.plotStep = 'order'; b.curOrder = null; b.ghost = null;
  },

  selectShip(id) {
    const b = Game.b, s = Game.ship(id);
    if (!b || !s || !s.alive) return;
    if (b.phase === 'move' && s.side === 'player') {
      if (s.plotted) { // re-plot
        s.plotted = false; s.plot = null; s.order = null;
      }
      b.sel = id; b.plotStep = 'order'; b.curOrder = null; b.ghost = null;
      Snd.select();
    } else if (b.phase === 'fire' && s.side === 'player') {
      b.sel = id; b.armed = null;
      Snd.select();
    }
    if (window.UI) UI.refresh();
  },

  selectOrder(o) {
    const b = Game.b;
    const s = Game.ship(b.sel);
    if (!b || b.phase !== 'move' || !s) return;
    b.curOrder = o;
    Snd.click();
    if (o.range === 0) {
      // hold: instant plot at current position
      Game.commitPlot(s, { x: s.x, y: s.y, angle: s.angle }, o);
    } else {
      b.plotStep = 'dest'; b.ghost = null;
      if (window.UI) UI.refresh();
    }
  },

  commitPlot(s, ghost, order) {
    const b = Game.b;
    s.plot = { x: ghost.x, y: ghost.y, angle: ghost.angle };
    s.order = order;
    s.plotted = true;
    b.ghost = null; b.curOrder = null; b.plotStep = 'order';
    Snd.lock();
    Game.autoSelect();
    if (window.UI) UI.refresh();
  },

  shipAt(x, y) {
    // topmost active ship near the point
    let best = null, bd = 1e9;
    Game.active(Game.b).forEach(s => {
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < s.r + 12 && d < bd) { best = s; bd = d; }
    });
    return best;
  },

  mapClick(x, y) {
    const b = Game.b;
    if (!b || b.banner) return;
    if (b.inspect) { b.inspect = null; if (window.UI) UI.refresh(); return; }
    const hit = Game.shipAt(x, y);

    if (b.phase === 'move') {
      const s = Game.ship(b.sel);
      // map clicks only re-select before an order is chosen; while aiming,
      // every click is a destination (switch ships via roster or number keys)
      const reselect = hit && hit.side === 'player' && (!s || hit.id !== s.id) && b.plotStep === 'order';
      if (reselect) { Game.selectShip(hit.id); return; }
      if (!s) { if (hit) { b.inspect = hit.id; if (window.UI) UI.refresh(); } return; }
      if (b.plotStep === 'dest' && b.curOrder) {
        const o = b.curOrder;
        let d = Math.hypot(x - s.x, y - s.y) || 1;
        let dir = U.angleTo(s, { x, y });
        const dd = U.clamp(U.norm180(dir - s.angle), -o.maxTurn, o.maxTurn);
        dir = s.angle + dd;
        d = U.clamp(d, o.minMove, o.range);
        const rad = dir * U.D2R;
        b.ghost = { x: s.x + Math.cos(rad) * d, y: s.y + Math.sin(rad) * d, angle: dir };
        b.plotStep = 'angle';
        Snd.click();
        if (window.UI) UI.refresh();
      } else if (b.plotStep === 'angle' && b.ghost) {
        Game.commitPlot(s, b.ghost, b.curOrder);
      } else if (hit && hit.side !== 'player') {
        b.inspect = hit.id; if (window.UI) UI.refresh();
      }
      return;
    }

    if (b.phase === 'fire') {
      if (b.armed && hit && hit.side === 'enemy') {
        const s = Game.ship(b.armed.shipId);
        const w = s && s.weapons[b.armed.wIdx];
        if (s && w) {
          const sol = Game.solution(s, w, hit);
          if (sol.ok) {
            w.target = hit.id;
            b.armed = null; b.hover = null;
            Snd.lock();
            if (window.UI) UI.refresh();
            return;
          } else { Snd.deny(); }
        }
      }
      if (hit && hit.side === 'player') { Game.selectShip(hit.id); return; }
      if (hit) { b.inspect = hit.id; if (window.UI) UI.refresh(); return; }
      if (b.armed) { b.armed = null; if (window.UI) UI.refresh(); }
      return;
    }

    if (hit) { b.inspect = hit.id; if (window.UI) UI.refresh(); }
  },

  mapMove(x, y) {
    const b = Game.b;
    if (!b) return;
    b.mouse = { x, y };
    if (b.phase === 'move' && b.plotStep === 'angle' && b.ghost) {
      const s = Game.ship(b.sel);
      if (!s) return;
      const desired = U.angleTo(b.ghost, { x, y });
      const mt = b.curOrder ? b.curOrder.maxTurn : 45;
      b.ghost.angle = U.clampFacing(desired, s.angle, b.ghost, mt, s);
    }
    if (b.phase === 'fire') {
      const hit = Game.shipAt(x, y);
      b.hover = (hit && hit.side === 'enemy') ? hit.id : null;
    }
  },

  cancel() {
    const b = Game.b;
    if (!b) return;
    if (b.inspect) { b.inspect = null; }
    else if (b.phase === 'move' && b.plotStep === 'angle') { b.plotStep = 'dest'; b.ghost = null; }
    else if (b.phase === 'move' && b.plotStep === 'dest') { b.plotStep = 'order'; b.curOrder = null; }
    else if (b.phase === 'fire' && b.armed) { b.armed = null; }
    if (window.UI) UI.refresh();
  },

  allPlotted() {
    return Game.playerShips(Game.b).every(s => s.plotted);
  },

  /* ================= engage: AI plots + simultaneous animation ================= */
  engage() {
    const b = Game.b;
    if (b.phase !== 'move' || !Game.allPlotted()) return;
    // AI plots
    Game.active(b).filter(s => s.side !== 'player').forEach(s => AI.plot(s, b));
    // stage animation
    Game.active(b).forEach(s => {
      s.animFrom = { x: s.x, y: s.y, angle: s.angle };
      if (!s.plot) s.plot = { x: s.x, y: s.y, angle: s.angle };
    });
    // torpedo paths (against destination positions)
    Game.stageTorpedoes(b);
    b.phase = 'anim';
    b.anim = { start: performance.now(), dur: 1150 };
    b.sel = null; b.ghost = null; b.curOrder = null;
    Snd.click();
    if (window.UI) UI.refresh();
  },

  stageTorpedoes(b) {
    b.torps.forEach(tp => {
      tp.from = { x: tp.x, y: tp.y };
      const rad = tp.angle * U.D2R;
      let travel = tp.speed;
      let hitShip = null, hitAst = null;
      // step along path, test against ships' PLOTTED positions
      const step = 8;
      for (let t = step; t <= tp.speed; t += step) {
        const px = tp.x + Math.cos(rad) * t, py = tp.y + Math.sin(rad) * t;
        const sh = Game.active(b).find(s =>
          s.id !== tp.launcher &&
          Math.hypot((s.plot ? s.plot.x : s.x) - px, (s.plot ? s.plot.y : s.y) - py) < s.r * 0.8 + 10);
        if (sh) { hitShip = sh; travel = t; break; }
        const ast = b.terrain.find(a => a.type === 'ast' && Math.hypot(a.x - px, a.y - py) < a.r);
        if (ast) { hitAst = ast; travel = t; break; }
      }
      tp.to = { x: tp.x + Math.cos(rad) * travel, y: tp.y + Math.sin(rad) * travel };
      tp.strike = hitShip ? hitShip.id : null;
      tp.splashAst = !!hitAst;
      tp.fuel--;
      if (tp.to.x < -40 || tp.to.x > DATA.WORLD.w + 40 || tp.to.y < -40 || tp.to.y > DATA.WORLD.h + 40) tp.expired = true;
      if (tp.fuel <= 0) tp.expired = true;
    });
  },

  finishAnim() {
    const b = Game.b;
    // asteroid transit damage: test start -> destination segment before finalizing
    Game.active(b).forEach(s => {
      if (!s.animFrom || !s.plot) return;
      const from = s.animFrom, to = s.plot;
      const grazed = b.terrain.some(a => a.type === 'ast' &&
        (U.segHitsCircle(from, to, a, a.r) || U.dist(from, a) < a.r || U.dist(to, a) < a.r));
      if (grazed) {
        const dmg = U.rand(1, 3);
        s.hull -= dmg;
        Rend.fx.spark(to.x, to.y, '#c8b89a', 12);
        Rend.fx.floater(to.x, to.y - s.h / 2 - 14, '-' + dmg + ' ROCKS', '#c8b89a');
        Game.log(s.name + ' grinds through the asteroid shoal — ' + dmg + ' hull', '#c8b89a');
        if (s.hull <= 0) Game.killShip(s);
      }
    });
    // finalize ship positions
    Game.active(b).forEach(s => {
      if (s.plot) { s.x = s.plot.x; s.y = s.plot.y; s.angle = s.plot.angle; }
      s.animFrom = null;
    });
    // exits (convoy / fleeing vip)
    Game.active(b).forEach(s => {
      if ((s.role === 'convoy' || s.role === 'flee') && s.x > DATA.WORLD.w - 55) {
        s.exited = true;
        Game.log((s.side === 'enemy' ? '⚠ ' : '★ ') + s.name + ' has left the field', s.side === 'enemy' ? '#ff8a84' : '#6fe0a8', { big: true });
      }
      s.plot = null; s.plotted = false;
    });
    // torpedo strikes
    b.torps.forEach(tp => {
      tp.x = tp.to.x; tp.y = tp.to.y;
      if (tp.strike) {
        const target = Game.ship(tp.strike);
        if (target && target.alive && !target.exited) Game.resolveTorpedoStrike(tp, target);
        tp.expired = true;
      } else if (tp.splashAst) {
        Rend.fx.boom(tp.x, tp.y, false);
        Game.log('Torpedo salvo detonates in the asteroid shoal', '#5c7089');
        tp.expired = true;
      } else if (tp.expired) {
        Rend.fx.ring(tp.x, tp.y, 26, 'rgba(120,180,220,.5)');
        Game.log('Torpedo salvo runs dry and self-destructs', '#5c7089');
      }
    });
    b.torps = b.torps.filter(tp => !tp.expired);

    if (Game.checkEnd()) return;
    b.phase = 'fire';
    b.sel = null;
    const first = Game.playerShips(b).find(s => s.weapons.some(w => w.reload === 0));
    b.sel = first ? first.id : (Game.playerShips(b)[0] || {}).id || null;
    b.armed = null;
    Game.log('— TURN ' + U.padTurn(b.turn) + ' · FIRING —', '#ffb454');
    if (window.UI) UI.refresh();
  },

  /* ================= fire phase ================= */
  armWeapon(shipId, wIdx) {
    const b = Game.b;
    if (b.phase !== 'fire') return;
    const s = Game.ship(shipId);
    const w = s && s.weapons[wIdx];
    if (!s || !w) return;
    if (w.reload > 0 || s.sys['WEAPONS'] >= 2) { Snd.deny(); return; }
    if (w.type === 'torp' && s.order && s.order.brace) { Snd.deny(); return; }
    if (w.target) { w.target = null; b.armed = null; Snd.click(); if (window.UI) UI.refresh(); return; }
    if (b.armed && b.armed.shipId === shipId && b.armed.wIdx === wIdx) b.armed = null;
    else b.armed = { shipId, wIdx };
    Snd.select();
    if (window.UI) UI.refresh();
  },

  anyAssigned() {
    return Game.playerShips(Game.b).some(s => s.weapons.some(w => w.target));
  },

  openFire() {
    const b = Game.b;
    if (b.phase !== 'fire') return;
    b.queue = [];
    // player shots
    Game.playerShips(b).forEach(s => {
      s.weapons.forEach((w, i) => {
        if (w.target && w.reload === 0) b.queue.push({ shooterId: s.id, wIdx: i, targetId: w.target });
      });
    });
    // enemy shots (assigned now)
    Game.enemyShips(b).forEach(s => {
      AI.assignFire(s, b).forEach(q => b.queue.push(q));
    });
    if (!b.queue.length) {
      Game.log('All batteries silent this turn.', '#5c7089');
      Game.finishFiring();
      return;
    }
    b.phase = 'firing';
    b.armed = null; b.hover = null;
    b.nextShotAt = performance.now() + 150;
    if (window.UI) UI.refresh();
  },

  processShot(q) {
    const b = Game.b;
    const s = Game.ship(q.shooterId);
    if (!s || !s.alive) return;
    const w = s.weapons[q.wIdx];
    const target = Game.ship(q.targetId);
    w.target = null;
    if (!target || !target.alive || target.exited) {
      Game.log(s.name + ' ' + w.name + ' — target lost', '#5c7089');
      return;
    }
    const sol = Game.solution(s, w, target);
    if (!sol.ok) {
      Game.log(s.name + ' ' + w.name + ' — no firing solution (' + sol.why + ')', '#5c7089');
      return;
    }

    if (w.type === 'torp') {
      w.reload = w.reloadTime + 1; // ticks down at end of this turn
      const ang = U.angleTo(s, target);
      const rad = ang * U.D2R;
      Game.b.torps.push({
        id: 'tp' + Math.floor(Math.random() * 1e9),
        x: s.x + Math.cos(rad) * (s.w * 0.55 + 14),
        y: s.y + Math.sin(rad) * (s.w * 0.55 + 14),
        angle: ang, speed: 250, fuel: 3,
        count: w.salvo, dmg: w.dmg.slice(),
        side: s.side, launcher: s.id
      });
      Snd.torp();
      Rend.fx.ring(s.x, s.y, 30, 'rgba(255,180,84,.6)');
      Game.log(s.name + ' — TORPEDOES AWAY (' + w.salvo + ' fish, running toward ' + target.name + ')', '#ffb454');
      return;
    }

    // direct fire
    const isLance = w.type === 'lance';
    const roll = U.rand(1, 100);
    const hit = roll <= sol.pct;
    if (isLance) {
      Snd.laser();
      Rend.fx.beam(s, target, hit, s.side === 'player' ? '#7ce8f7' : '#ff7a72');
    } else {
      Snd.cannon();
      Rend.fx.tracers(s, target, hit, s.side === 'player' ? '#ffd9a0' : '#ff9a92');
    }
    if (!hit) {
      Game.log(s.name + ' ' + w.name + ' → ' + target.name + ' — MISS (' + sol.pct + '% · rolled ' + roll + ')', '#5c7089');
      return;
    }
    // shields
    if (sol.sArc !== 'A' && target.sh[sol.sArc] > 0 && target.sys['SHIELD EMITTER'] < 2) {
      target.sh[sol.sArc]--;
      target.tookFire = true;
      Snd.shield();
      Rend.fx.shieldFlash(target, sol.sArc);
      Game.log(s.name + ' hits ' + target.name + ' — absorbed by ' + (sol.sArc === 'F' ? 'fore' : 'side') + ' shield', '#7ba8b8');
      return;
    }
    let dmg = U.rand(w.dmg[0], w.dmg[1]);
    Game.applyDamage(target, dmg, { shooter: s, sol, wname: w.name, roll });
  },

  applyDamage(target, dmg, opts) {
    const b = Game.b;
    const sol = opts.sol || {};
    if (target.order && target.order.brace) {
      dmg = Math.ceil(dmg / 2);
    }
    target.hull -= dmg;
    target.tookFire = true;
    Snd.hit();
    Rend.fx.spark(target.x, target.y, target.side === 'enemy' ? '#ffd9a0' : '#ff9a92', 14);
    Rend.fx.floater(target.x, target.y - target.h / 2 - 14, '-' + dmg, sol.stern ? '#ff8a84' : '#e8c9a0');
    Rend.shake(Math.min(9, 2 + dmg));
    const braced = target.order && target.order.brace ? ' (braced)' : '';
    if (opts.shooter) {
      Game.log(opts.shooter.name + ' ' + (opts.wname || '') + ' hits ' + target.name + (sol.stern ? ' STERN' : '') +
        ' — ' + dmg + ' hull' + braced + (opts.roll ? ' (' + sol.pct + '% · rolled ' + opts.roll + ')' : ''), '#e8c9a0');
    }
    // critical roll
    const die = U.rand(1, 6);
    const need = sol.stern ? 5 : 6;
    if (die >= need) {
      Game.rollCrit(target, die);
    } else if (!opts.quiet) {
      Game.log('no system damage — hull absorbs the hit', '#43536a', { die, crit: false });
    }
    if (target.hull <= 0) Game.killShip(target);
  },

  rollCrit(target, die) {
    const c = U.rand(1, 6);
    let entry = DATA.CRIT_TABLE[c - 1];
    let sysName = entry.sys;
    if (DATA.SYS.includes(sysName) && target.sys[sysName] >= 2) sysName = 'FIRE';
    Snd.crit();
    if (sysName === 'FIRE') {
      target.fires++;
      Rend.fx.floater(target.x, target.y - target.h / 2 - 30, 'FIRE!', '#ff8a84');
      Game.log('CRITICAL — fire breaks out aboard ' + target.name + ' (burns each turn until contained)', '#ff8a84', { die, crit: true });
    } else if (sysName === 'BREACH') {
      const extra = U.rand(1, 3);
      target.hull -= extra;
      Rend.fx.floater(target.x, target.y - target.h / 2 - 30, 'BREACH -' + extra, '#ff8a84');
      Game.log('CRITICAL — hull breach on ' + target.name + ' (' + extra + ' extra damage)', '#ff8a84', { die, crit: true });
      if (target.hull <= 0) { Game.killShip(target); return; }
    } else {
      target.sys[sysName]++;
      const lvl = target.sys[sysName] >= 2 ? 'DESTROYED' : 'DAMAGED';
      if (sysName === 'SHIELD EMITTER' && target.sys[sysName] >= 2) { target.sh = { F: 0, S: 0, A: 0 }; }
      Rend.fx.floater(target.x, target.y - target.h / 2 - 30, sysName + ' ' + lvl, '#ff8a84');
      Game.log('CRITICAL — ' + target.name + ' ' + sysName + ' ' + lvl, '#ff8a84', { die, crit: true });
      if (target.side === 'player') Snd.alarm();
    }
  },

  killShip(target) {
    const b = Game.b;
    if (!target.alive) return;
    target.alive = false; target.hull = 0;
    target.weapons.forEach(w => { w.target = null; });
    // clear anyone targeting it handled at shot time
    const big = target.r > 60;
    Snd.explosion(big);
    Rend.fx.boom(target.x, target.y, big);
    Rend.shake(big ? 16 : 10);
    Game.log('✸ ' + target.name + ' DESTROYED', target.side === 'enemy' ? '#6fe0a8' : '#ff6159', { big: true });
    if (target.side === 'enemy') b.killPts += target.pts;
    if (b.sel === target.id) b.sel = null;
    if (b.inspect === target.id) b.inspect = null;
  },

  resolveTorpedoStrike(tp, target) {
    const b = Game.b;
    let torps = tp.count;
    // point defense
    let shot = 0;
    for (let i = 0; i < target.turrets && torps > 0; i++) {
      if (U.rand(1, 6) >= 4) { torps--; shot++; }
    }
    if (shot > 0) {
      Rend.fx.spark(tp.x, tp.y, '#ffd9a0', 8);
      Game.log(target.name + ' point defense — ' + shot + ' torpedo' + (shot > 1 ? 'es' : '') + ' shot down', '#7ba8b8');
    }
    // evasion
    if (torps > 0 && target.order && target.order.dodge >= 0.15) {
      let dodged = 0;
      for (let i = 0; i < torps; i++) if (Math.random() < 0.35) dodged++;
      torps -= dodged;
      if (dodged > 0) Game.log(target.name + ' evasive pattern — ' + dodged + ' torpedo' + (dodged > 1 ? 'es' : '') + ' run wide', '#7ba8b8');
    }
    if (torps <= 0) {
      Game.log(target.name + ' rides out the salvo untouched', '#7ba8b8');
      return;
    }
    Snd.explosion(false);
    Rend.fx.boom(tp.x, tp.y, false);
    Rend.shake(12);
    for (let i = 0; i < torps; i++) {
      if (!target.alive) break;
      const dmg = U.rand(tp.dmg[0], tp.dmg[1]);
      Game.log('Torpedo strikes ' + target.name + ' — ' + dmg + ' hull (shields bypassed)', '#ffb454');
      Game.applyDamage(target, dmg, { sol: { stern: true, pct: 100 }, quiet: true });
    }
  },

  finishFiring() {
    const b = Game.b;
    if (Game.checkEnd()) return;
    b.phase = 'resolve';
    Game.log('— TURN ' + U.padTurn(b.turn) + ' · RESOLUTION — press END TURN', '#8ba0b8');
    if (window.UI) UI.refresh();
  },

  /* ================= end phase ================= */
  endTurn() {
    const b = Game.b;
    if (b.phase !== 'resolve' || b.banner) return;
    const repairTarget = (Game.mode === 'campaign' && Game.save.upgrades.crews) ? 4 : 5;
    Game.active(b).forEach(s => {
      // fires burn
      if (s.fires > 0) {
        const burn = s.fires;
        s.hull -= burn;
        Game.log('Fires burn aboard ' + s.name + ' — ' + burn + ' hull', '#ff8a84');
        Rend.fx.floater(s.x, s.y - s.h / 2 - 14, '-' + burn + ' FIRE', '#ff8a84');
        if (s.hull <= 0) { Game.killShip(s); return; }
        // contain
        let out = 0;
        for (let i = 0; i < s.fires; i++) if (U.rand(1, 6) >= 4) out++;
        if (out > 0) {
          s.fires -= out;
          Game.log(s.name + ' damage crews contain ' + out + ' fire' + (out > 1 ? 's' : ''), '#6fe0a8');
        }
      }
      // repairs
      const tgt = s.side === 'player' ? repairTarget : 5;
      DATA.SYS.forEach(n => {
        if (s.sys[n] > 0 && U.rand(1, 6) >= tgt) {
          s.sys[n]--;
          if (s.side !== 'enemy') Snd.repair();
          Game.log(s.name + ' repairs ' + n + (s.sys[n] > 0 ? ' (partial)' : ' (restored)'), '#6fe0a8');
        }
      });
      // shield regen — emitters only recharge if the ship wasn't under fire this turn
      if (s.sys['SHIELD EMITTER'] === 0 && !s.tookFire) {
        for (const a of ['F', 'S', 'A']) {
          if (s.sh[a] < s.shMax[a]) { s.sh[a]++; break; }
        }
      }
      s.tookFire = false;
      // reload
      s.weapons.forEach(w => { if (w.reload > 0) w.reload--; w.target = null; });
      // clear order
      s.order = null;
    });

    if (Game.checkEnd()) return;
    b.turn++;
    b.phase = 'move';
    b.armed = null; b.hover = null; b.inspect = null;
    Game.log('— TURN ' + U.padTurn(b.turn) + ' · MOVEMENT —', '#4cd7ea');
    Game.autoSelect();
    Snd.click();
    if (window.UI) UI.refresh();
  },

  /* ================= end conditions ================= */
  checkEnd() {
    const b = Game.b;
    if (b.banner) return true;
    const loseMsg = b.mission.lose(b);
    if (loseMsg) {
      b.banner = { win: false, msg: loseMsg };
      b.phase = 'over';
      Snd.defeat();
      if (window.UI) UI.onBattleEnd(false);
      return true;
    }
    const winMsg = b.mission.win(b);
    if (winMsg) {
      b.banner = { win: true, msg: winMsg };
      b.phase = 'over';
      // rout survivors on vip kill
      Snd.victory();
      if (window.UI) UI.onBattleEnd(true);
      return true;
    }
    return false;
  },

  earnings() {
    const b = Game.b;
    return (b.banner && b.banner.win ? (b.mission.reward || 0) : 0) + Math.round(b.killPts * 0.5);
  },

  /* ================= per-frame tick (called from render loop) ================= */
  tick(now) {
    const b = Game.b;
    if (!b) return;
    if (b.phase === 'anim' && b.anim && now - b.anim.start >= b.anim.dur) {
      b.anim = null;
      Game.finishAnim();
    }
    if (b.phase === 'firing' && now >= b.nextShotAt) {
      const q = b.queue.shift();
      if (q) {
        Game.processShot(q);
        b.nextShotAt = now + 420;
        if (window.UI) UI.refresh();
      }
      if (!b.queue.length && b.phase === 'firing') {
        b.nextShotAt = now + 600;
        b.phase = 'firewait';
        b.fireDoneAt = now + 500;
      }
    }
    if (b.phase === 'firewait' && now >= b.fireDoneAt) {
      Game.finishFiring();
    }
  }
};

/* ================= enemy / ally AI ================= */
const AI = {
  pickTarget(s, b) {
    const foes = s.side === 'enemy' ? Game.active(b).filter(x => x.side !== 'enemy') : Game.enemyShips(b);
    if (!foes.length) return null;
    if (s.role === 'hunter') {
      const convoy = foes.find(f => f.role === 'convoy');
      if (convoy) return convoy;
    }
    // prefer nearest, nudged toward wounded targets
    let best = null, bs = 1e9;
    foes.forEach(f => {
      const score = U.dist(s, f) * (0.6 + 0.4 * (f.hull / f.maxHull));
      if (score < bs) { bs = score; best = f; }
    });
    return best;
  },

  desired(s, b, target) {
    const W = DATA.WORLD.w;
    if (s.role === 'convoy') {
      return { pt: { x: W + 120, y: s.y }, face: 0 };
    }
    if (s.role === 'flee' && b.turn >= 3) {
      return { pt: { x: W + 160, y: s.y + U.frand(-40, 40) }, face: 0 };
    }
    if (!target) return { pt: { x: s.x, y: s.y }, face: s.angle };
    const dToT = U.angleTo(s, target);
    const hasSide = s.weapons.some(w => w.arc === 'side' && w.type !== 'torp');
    const mainRange = Math.max(...s.weapons.filter(w => w.type !== 'torp').map(w => w.range), 250);

    if (s.role === 'raider') {
      // aim for a point behind the target's stern
      const rad = target.angle * U.D2R;
      const pt = { x: target.x - Math.cos(rad) * (target.r + 170), y: target.y - Math.sin(rad) * (target.r + 170) };
      return { pt, face: U.angleTo({ x: pt.x, y: pt.y }, target) };
    }
    if (s.role === 'sniper') {
      const keep = mainRange * 0.75;
      const d = U.dist(s, target);
      const rad = dToT * U.D2R;
      const pt = d > keep + 40
        ? { x: target.x - Math.cos(rad) * keep, y: target.y - Math.sin(rad) * keep }
        : (d < keep - 60
          ? { x: s.x - Math.cos(rad) * (keep - d), y: s.y - Math.sin(rad) * (keep - d) }
          : { x: s.x, y: s.y });
      let face = dToT;
      if (hasSide) {
        const a1 = dToT + 90, a2 = dToT - 90;
        face = Math.abs(U.norm180(a1 - s.angle)) < Math.abs(U.norm180(a2 - s.angle)) ? a1 : a2;
      }
      return { pt, face };
    }
    // brawler / hunter: close to weapons range
    const keep = Math.min(mainRange * 0.6, 240);
    const d = U.dist(s, target);
    const rad = dToT * U.D2R;
    const travel = Math.max(0, d - keep);
    const pt = { x: s.x + Math.cos(rad) * travel, y: s.y + Math.sin(rad) * travel };
    let face = dToT;
    if (hasSide) {
      const a1 = dToT + 90, a2 = dToT - 90;
      face = Math.abs(U.norm180(a1 - s.angle)) < Math.abs(U.norm180(a2 - s.angle)) ? a1 : a2;
    }
    return { pt, face };
  },

  chooseOrder(s, b, want) {
    const orders = DATA.orders(s);
    const find = id => orders.find(o => o.id === id) || orders[0];
    if (s.role === 'convoy') return find('heading');
    if (s.role === 'flee' && b.turn >= 3) return find('full');
    // threatened by incoming torpedoes?
    const torpNear = b.torps.some(tp => tp.side !== s.side && U.dist(tp, s) < tp.speed * 1.4);
    if (torpNear && s.hull < s.maxHull * 0.6 && orders.some(o => o.id === 'brace') && Math.random() < 0.5) return find('brace');
    if (s.hull < s.maxHull * 0.35 && orders.some(o => o.id === 'evasive')) return find('evasive');
    const d = U.dist(s, want.pt);
    if (d > Game.effSpeed(s) * 1.2) {
      const turnNeeded = Math.abs(U.norm180(U.angleTo(s, want.pt) - s.angle));
      if (turnNeeded < 25) return find('full');
    }
    if (d < 30 && s.role === 'sniper') return find('hold');
    if (d < 30) return find('hold');
    return find('heading');
  },

  plot(s, b) {
    const target = AI.pickTarget(s, b);
    const want = AI.desired(s, b, target);
    const o = AI.chooseOrder(s, b, want);
    s.order = o;
    if (o.range === 0) {
      s.plot = { x: s.x, y: s.y, angle: s.angle };
      s.plotted = true;
      return;
    }
    const dWant = U.dist(s, want.pt);
    const course = s.angle + U.clamp(U.norm180(U.angleTo(s, want.pt) - s.angle), -o.maxTurn, o.maxTurn);
    let travel = U.clamp(dWant, o.minMove, o.range);
    const rad = course * U.D2R;
    // avoid ending inside an asteroid: shorten travel if needed
    for (let t = travel; t >= 0; t -= 10) {
      const px = s.x + Math.cos(rad) * t, py = s.y + Math.sin(rad) * t;
      const inAst = b.terrain.some(a => a.type === 'ast' && Math.hypot(a.x - px, a.y - py) < a.r + 24);
      if (!inAst) { travel = t; break; }
      if (t < 10) travel = 0;
    }
    if (travel < o.minMove) travel = Math.min(o.minMove, travel + 0); // accept short stop near rocks
    const nx = U.clamp(s.x + Math.cos(rad) * travel, 40, DATA.WORLD.w + (s.role === 'flee' || s.role === 'convoy' ? 200 : -40));
    const ny = U.clamp(s.y + Math.sin(rad) * travel, 40, DATA.WORLD.h - 40);
    const pos = { x: nx, y: ny };
    const face = U.clampFacing(want.face, s.angle, pos, o.maxTurn, s);
    s.plot = { x: pos.x, y: pos.y, angle: face };
    s.plotted = true;
  },

  assignFire(s, b) {
    const out = [];
    if (s.sys['WEAPONS'] >= 2) {
      Game.log(s.name + ' — weapons offline, holds fire', '#5c7089');
      return out;
    }
    const foes = Game.active(b).filter(x => (s.side === 'enemy' ? x.side !== 'enemy' : x.side === 'enemy'));
    s.weapons.forEach((w, i) => {
      if (w.reload > 0) return;
      let best = null, bestScore = -1;
      foes.forEach(f => {
        if (s.role === 'hunter' && f.role !== 'convoy' && foes.some(x => x.role === 'convoy')) {
          // hunters strongly prefer the convoy but will take other shots
          const sol = Game.solution(s, w, f);
          if (sol.ok) {
            const score = (f.role === 'convoy' ? 3 : 1) * (w.type === 'torp' ? 60 : sol.pct);
            if (score > bestScore) { bestScore = score; best = f; }
          }
          return;
        }
        const sol = Game.solution(s, w, f);
        if (!sol.ok) return;
        let score = w.type === 'torp' ? 60 : sol.pct;
        if (f.vip) score += 5;
        if (f.hull < f.maxHull * 0.4) score += 15;
        if (score > bestScore) { bestScore = score; best = f; }
      });
      if (w.type === 'torp' && best && U.dist(s, best) < 170) best = null; // don't waste fish point-blank
      if (best) out.push({ shooterId: s.id, wIdx: i, targetId: best.id });
    });
    return out;
  }
};

window.Game = Game;
window.AI = AI;
