/* Galactic Reaver — game state machine, combat resolution, AI, campaign */
'use strict';

const Game = {
  SAVE_KEY: 'galactic-reaver-save2',
  mode: 'campaign',       // 'campaign' | 'skirmish'
  save: null,             // campaign persistence
  b: null,                // current battle state
  currentNode: null,      // sector node being fought
  speed: 1,               // game tempo multiplier (1/2/3), persisted

  loadSpeed() {
    try { Game.speed = U.clamp(parseInt(localStorage.getItem('gr-speed')) || 1, 1, 3); } catch (e) { }
  },
  cycleSpeed() {
    Game.speed = Game.speed >= 3 ? 1 : Game.speed + 1;
    try { localStorage.setItem('gr-speed', String(Game.speed)); } catch (e) { }
    return Game.speed;
  },

  skirmishDiff: 'normal',
  curTier: null,          // active per-mission difficulty tier (war mode)
  diff() {
    if (Game.mode === 'war' && Game.curTier) {
      const t = Game.curTier;
      return { id: 'war', name: t.name, enemyNeed: t.enemyNeed, morale: 0.4, reqMul: t.reqMul };
    }
    const id = Game.mode === 'campaign' ? (Game.save && Game.save.diff) : Game.skirmishDiff;
    return DATA.diffOf(id);
  },

  /* ================= campaign persistence ================= */
  freshSave() {
    const s = {
      req: 0, diff: 'normal',
      fleet: [{ cls: 'corvette', name: 'TAS REAVER', xp: 0, refit: false }],
      upgrades: {},
      galaxy: null,       // { owner, cleared, siege, turn } — built by galaxyInit
      done: false
    };
    Game.galaxyInit(s);
    return s;
  },

  loadSave() {
    try {
      const raw = localStorage.getItem(Game.SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && Array.isArray(s.fleet)) {
          if (!s.diff) s.diff = 'normal';
          Game.galaxyInit(s);   // migrate older saves / ensure galaxy state
          return s;
        }
      }
    } catch (e) { /* corrupt/blocked storage -> fresh */ }
    return null;
  },

  persist() {
    if ((Game.mode !== 'campaign' && Game.mode !== 'war') || !Game.save) return;
    try { localStorage.setItem(Game.SAVE_KEY, JSON.stringify(Game.save)); } catch (e) { }
  },

  wipeSave() { try { localStorage.removeItem(Game.SAVE_KEY); } catch (e) { } },

  /* ================= veterancy ================= */
  rankOf(xp) {
    let r = 0;
    DATA.RANKS.forEach((rk, i) => { if ((xp || 0) >= rk.xp) r = i; });
    return r;
  },

  /* ================= ship construction ================= */
  mkShip(cls, name, side, role, x, y, angle, opts) {
    opts = opts || {};
    const c = DATA.CLASSES[cls];
    const sh = Object.assign({}, c.sh);
    const shMax = Object.assign({}, c.sh);
    const rank = Game.rankOf(opts.xp || 0);
    const s = {
      id: name.replace(/\W+/g, '_').toLowerCase() + '_' + Math.floor(Math.random() * 1e6),
      cls, name, side, role: role || 'brawler',
      label: c.label, short: c.short,
      x, y, angle, w: c.w, h: c.h, r: Math.max(c.w, c.h) / 2,
      shape: c.shape || 'blade',
      hull: c.hull, maxHull: c.hull,
      sh, shMax,
      sys: { 'WEAPONS': 0, 'ENGINES': 0, 'SHIELD EMITTER': 0, 'BRIDGE': 0 },
      fires: 0,
      speed: c.speed, maxTurn: c.maxTurn, turrets: c.turrets, pts: c.pts,
      // a ship's broadside (a side battery) is split into independent PORT and
      // STARBOARD batteries, so it can rake foes on both flanks in the same turn;
      // each is uprated (+2 dice) to give the broadside real weight
      weapons: c.weapons.flatMap(w => {
        if (w.type === 'battery' && w.arc === 'side') {
          return [
            DATA.weapon(Object.assign({}, w, { name: w.name + ' — PORT', arc: 'port', dice: w.dice + 2 })),
            DATA.weapon(Object.assign({}, w, { name: w.name + ' — STBD', arc: 'starboard', dice: w.dice + 2 }))
          ];
        }
        return [DATA.weapon(Object.assign({}, w))];
      }),
      alive: true, exited: false, hulked: false, captured: false, routing: false,
      order: null, plot: null, plotted: false,
      animFrom: null, animCurve: null,
      boarded: false, lastHitBy: null,
      xp: opts.xp || 0, rank, kills: 0, xpEarned: 0,
      fleetRef: (opts.fleetRef !== undefined) ? opts.fleetRef : null,
      refit: !!opts.refit,
      vip: !!opts.vip,
      commander: opts.commander || null,
      runTurn: opts.runTurn || null   // a fleeing ship breaks for the jump on this turn (default 3)
    };
    // weapon refit: +1 die on all direct-fire weapons
    if (s.refit) s.weapons.forEach(w => { if (w.type === 'lance' || w.type === 'battery') w.dice += 1; });
    // veterancy bonuses
    if (rank >= 1) s.turrets += 1;                                      // SEASONED
    if (rank >= 3) { ['F', 'S', 'A'].forEach(a => { s.shMax[a] += 1; s.sh[a] += 1; }); } // ELITE
    if (side === 'player' && Game.mode === 'campaign' && Game.save && Game.save.upgrades.shields) {
      s.shMax.F += 1; s.sh.F += 1;
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
    const counts = { light: [2, 1], medium: [3, 2], heavy: [5, 2] }[density] || [2, 1];
    const W = DATA.WORLD.w, H = DATA.WORLD.h;
    const placed = [];
    const tryPlace = (type, r) => {
      for (let i = 0; i < 40; i++) {
        const x = U.frand(520, W - 520), y = U.frand(220, H - 220);
        if (placed.every(p => Math.hypot(p.x - x, p.y - y) > p.r + r + 70)) {
          const o = { type, x, y, r, seed: Math.floor(Math.random() * 9999) };
          placed.push(o); t.push(o);
          return;
        }
      }
    };
    for (let i = 0; i < counts[0]; i++) tryPlace('ast', U.frand(65, 120));
    for (let i = 0; i < counts[1]; i++) tryPlace('neb', U.frand(120, 190));
    return t;
  },

  fleetSpawn(spawn, fleet) {
    return fleet.map((f, i) => {
      const y = spawn.y + (i - (fleet.length - 1) / 2) * 150;
      return Game.mkShip(f.cls, f.name, 'player', 'player', spawn.x, y, -15 + i * 8,
        { xp: f.xp, refit: f.refit, fleetRef: i });
    });
  },

  startMission(nodeId) {
    Game.mode = 'campaign';
    Game.currentNode = nodeId;
    const node = DATA.sectorNode(nodeId);
    const m = DATA.MISSION_DEFS[node.mission];
    const ships = Game.fleetSpawn(m.playerSpawn, Game.save.fleet);
    (m.allies || []).forEach(a => ships.push(Game.mkShip(a.cls, a.name, 'ally', a.role, a.x, a.y, a.angle)));
    m.enemies.forEach(e => {
      const role = e.cls === 'hive' ? 'carrier' : e.role;
      ships.push(Game.mkShip(e.cls, e.name, 'enemy', role, e.x, e.y, e.angle, { vip: e.vip }));
    });
    Game.beginBattle(m, ships, m.terrain);
  },

  startSkirmish(fleetSel, diffId, factionId) {
    Game.mode = 'skirmish';
    Game.skirmishDiff = diffId || 'normal';
    Game.curTier = null;
    factionId = factionId && DATA.FACTIONS[factionId] && DATA.FACTIONS[factionId].side === 'enemy' ? factionId : 'crimson';
    const F = DATA.faction(factionId);
    const fleet = fleetSel.map((cls, i) => ({
      cls, name: i === 0 ? 'TAS REAVER' : DATA.SHIP_NAMES[(i - 1) % DATA.SHIP_NAMES.length],
      xp: 0, refit: false
    }));
    const W = DATA.WORLD.w, H = DATA.WORLD.h;
    const ships = Game.fleetSpawn({ x: 340, y: H / 2 }, fleet);
    const budget = fleet.reduce((a, f) => a + DATA.CLASSES[f.cls].pts, 0) + 80;
    const specs = Game.rollFleet(factionId, { budget, max: 6 });
    specs.forEach(s => ships.push(Game.mkShip(s.cls, s.name, 'enemy', s.role,
      U.frand(W - 900, W - 480), U.frand(H * 0.16, H * 0.84), 180 + U.frand(-25, 25), { vip: s.vip })));
    const m = {
      name: 'SKIRMISH', sub: 'KESSEL DRIFT · ' + F.short,
      reward: 0,
      win: (b) => Game.sideDead(b, 'enemy') ? F.short + ' force destroyed. Sector clear.' : null,
      lose: (b) => Game.sideDead(b, 'player') ? 'Escape pods away. The Verge keeps what it takes.' : null
    };
    Game.beginBattle(m, ships, U.pick(['light', 'medium', 'heavy']));
  },

  /* ================= procedural fleets & missions (P0) ================= */

  /* allocate a faction-appropriate, unused ship name */
  factionShipName(factionId, used, rng) {
    if (factionId === 'hive') {
      let n, guard = 0;
      do { n = DATA.hiveName(rng); } while (used.has(n) && guard++ < 60);
      used.add(n); return n;
    }
    const F = DATA.faction(factionId);
    const pool = DATA.NAME_POOLS[F.names] || DATA.NAME_POOLS.crimson;
    const avail = pool.filter(n => !used.has(n));
    const src = avail.length ? avail : pool;
    const name = src[Math.floor((rng ? rng() : Math.random()) * src.length)];
    used.add(name);
    return name;
  },

  /* is this hull a carrier (launches bombers)? → gets the 'carrier' AI role */
  isCarrierClass(cls) {
    const c = DATA.CLASSES[cls];
    return !!(c && c.weapons.some(w => w.type === 'bay' && w.craft === 'bombers'));
  },

  /* Build a points-matched fleet for a faction. Returns specs [{cls,role,name,vip}].
     opts: { budget, max, rng, used, flagship, vipFlagship, roles } */
  rollFleet(factionId, opts) {
    opts = opts || {};
    const F = DATA.faction(factionId);
    const rng = opts.rng;
    const rand = () => (rng ? rng() : Math.random());
    const used = opts.used || new Set();
    const roles = opts.roles || F.roles || ['brawler'];
    const max = opts.max || 6;
    let remaining = opts.budget || 300;
    const specs = [];
    let ri = 0;
    const roleFor = (cls) => Game.isCarrierClass(cls) ? 'carrier' : roles[ri++ % roles.length];
    // a requested flagship (e.g. a decapitation target) is always present, even if
    // it overruns the budget — only its escort screen scales with the tier
    if (opts.flagship && F.flagship && DATA.CLASSES[F.flagship]) {
      remaining -= DATA.CLASSES[F.flagship].pts;
      specs.push({ cls: F.flagship, role: 'sniper', name: Game.factionShipName(factionId, used, rng), vip: !!opts.vipFlagship, flagship: true });
    }
    let guard = 0;
    while (specs.length < max && guard++ < 60) {
      const pool = F.pool.filter(c => { const p = DATA.CLASSES[c].pts; return p > 0 && p <= remaining; });
      if (!pool.length) break;
      const cls = pool[Math.floor(rand() * pool.length)];
      remaining -= DATA.CLASSES[cls].pts;
      specs.push({ cls, role: roleFor(cls), name: Game.factionShipName(factionId, used, rng) });
    }
    if (!specs.length) {
      const cheapest = F.pool.slice().sort((a, z) => DATA.CLASSES[a].pts - DATA.CLASSES[z].pts)[0];
      specs.push({ cls: cheapest, role: roles[0], name: Game.factionShipName(factionId, used, rng) });
    }
    return specs;
  },

  playerFleetPts() {
    const fleet = (Game.save && Game.save.fleet) || [{ cls: 'corvette' }];
    return fleet.reduce((a, f) => a + (DATA.CLASSES[f.cls] ? DATA.CLASSES[f.cls].pts : 0), 0);
  },

  /* Generate a full mission from (faction, archetype, tier, planet, system, seed).
     Deterministic under a given seed; the returned object matches DATA.MISSION_DEFS. */
  generateMission(ctx) {
    ctx = ctx || {};
    if (ctx.seed != null) U.setSeed(ctx.seed >>> 0);
    const rng = U.random;
    const F = DATA.faction(ctx.factionId || 'crimson');
    const arch = DATA.archetype(ctx.archetypeId);
    const tier = DATA.tier(ctx.tierId);
    const planet = ctx.planet || { name: 'CONTESTED WORLD', type: 'Barren' };
    const system = ctx.system || { name: 'THE VERGE' };
    const W = DATA.WORLD.w, H = DATA.WORLD.h;

    const base = Math.max(ctx.playerFleetPts || Game.playerFleetPts() || 220, 200);
    const budget = Math.round(base * tier.budgetMul * (arch.budgetMul || 1)) + 60;
    const used = new Set();
    const wantFlagship = arch.vip === 'flagship';
    const wantCourier = arch.vip === 'courier';

    // enemy order of battle
    let roles = F.roles;
    if (arch.id === 'escort') roles = ['hunter', 'raider', 'brawler'];
    const specs = Game.rollFleet(F.id, {
      budget: wantCourier ? Math.round(budget * 0.8) : budget,
      rng, used, roles, max: 6,
      flagship: wantFlagship, vipFlagship: wantFlagship
    });
    const enemies = specs.map((s, i) => {
      const y = 300 + (specs.length > 1 ? i / (specs.length - 1) : 0.5) * (H - 600);
      return { cls: s.cls, name: s.name, role: s.role, x: W - 900 + rng() * 420, y, angle: 180, vip: !!s.vip };
    });
    // courier: a lone fast runner the escorts (far to the right) protect. It spawns
    // just ahead of the player's line and breaks for the jump immediately (runTurn 1),
    // so the player must run it down through the opening exchange.
    if (wantCourier) {
      const runner = F.pool[0];
      enemies.unshift({ cls: runner, name: Game.factionShipName(F.id, used, rng), role: 'flee', runTurn: 1, x: 560 + rng() * 120, y: H / 2 + (rng() * 120 - 60), angle: 0, vip: true });
    }

    const allies = [];
    if (arch.ally === 'convoy') {
      allies.push({ cls: 'freighter', name: 'TAS PELICAN', role: 'convoy', x: 220, y: H / 2, angle: 0 });
    } else if (arch.ally === 'station') {
      allies.push({ cls: 'freighter', name: 'OUTPOST ' + planet.name.toUpperCase().split(' ')[0], role: 'guard', x: 480, y: H / 2, angle: 0 });
    }

    // win / lose logic assembled from archetype flags
    const findVip = (b) => b.ships.find(s => s.vip);
    const findAlly = (b) => b.ships.find(s => s.side === 'ally');
    let win, lose;
    if (arch.ally === 'convoy') {
      win = (b) => { const f = findAlly(b); if (f && f.alive && f.exited) return 'The freighter makes the jump. The lane stays open.'; if (f && f.alive && Game.sideDead(b, 'enemy')) return F.short + ' fleet destroyed. The convoy is safe.'; return null; };
      lose = (b) => { const f = findAlly(b); if (f && !f.alive) return 'The freighter breaks up. The lane is lost.'; return Game.sideDead(b, 'player') ? 'Escape pods away. The convoy is on its own.' : null; };
    } else if (arch.ally === 'station') {
      win = (b) => Game.sideDead(b, 'enemy') ? 'Raiders cleared. The outpost holds.' : null;
      lose = (b) => { const f = findAlly(b); if (f && !f.alive) return 'The outpost is gone. We were too late.'; return Game.sideDead(b, 'player') ? 'The line breaks. The Verge keeps what it takes.' : null; };
    } else if (arch.vip) {
      win = (b) => { const v = findVip(b); return (v && !v.alive) ? (wantCourier ? 'The courier dies with her codes.' : 'The flagship folds in on her own fires — the line breaks.') : null; };
      lose = (b) => { const v = findVip(b); if (wantCourier && v && v.alive && v.exited) return 'A jump flare — the courier is gone, and her codes with her.'; return Game.sideDead(b, 'player') ? 'Escape pods away. The Verge keeps what it takes.' : null; };
    } else {
      win = (b) => Game.sideDead(b, 'enemy') ? 'Sector clear. ' + F.short + ' transponders go dark.' : null;
      lose = (b) => Game.sideDead(b, 'player') ? 'Escape pods away. The Verge keeps what it takes.' : null;
    }

    const contactName = enemies.find(e => e.vip) ? enemies.find(e => e.vip).name : (enemies[0] ? enemies[0].name : F.short);
    // boss finale: name the flagship's commander, if the faction has any
    let bossLine = null;
    if (wantFlagship && ctx.commander) {
      const boss = enemies.find(e => e.vip);
      if (boss) {
        boss.commander = ctx.commander;
        bossLine = ctx.commander + ' commands the defense from the ' + DATA.CLASSES[boss.cls].short +
          ' ' + boss.name + '. Break their flagship and this system\'s command with it.';
      }
    } else if (wantFlagship && ctx.finale) {
      const boss = enemies.find(e => e.vip);
      if (boss) bossLine = 'The ' + F.adj + ' flagship ' + boss.name + ' anchors the last defense of ' + system.name + '.';
    }
    const briefing = [
      F.adj + ' forces contest ' + planet.name + ' in the ' + system.name + ' system. ' + F.blurb,
      'Voss: "' + Game.briefLine(arch, F) + '"'
    ];
    if (bossLine) briefing.push(bossLine);
    briefing.push('OBJECTIVE — ' + arch.obj);

    if (ctx.seed != null) U.clearSeed();

    const rewardMul = ctx.finale ? 1.4 : (ctx.story ? 1.3 : 1);
    return {
      name: ctx.name || (ctx.finale ? arch.name + ' — SYSTEM FINALE' : arch.name),
      sub: system.name + ' · ' + planet.name.toUpperCase(),
      generated: true, faction: F.id, tier: tier.id, archetype: arch.id, finale: !!ctx.finale,
      briefing: ctx.briefing || briefing, reward: Math.round(arch.reward * tier.budgetMul * rewardMul), bonus: null,
      terrain: DATA.PLANET_TYPES[planet.type] || arch.terrain || 'medium',
      playerSpawn: { x: 340, y: H / 2 }, allies, enemies,
      contact: contactName,
      win, lose
    };
  },

  briefLine(arch, F) {
    const lines = {
      patrol: 'Simple gunnery problem, Captain. Cross their bows and clear the sector.',
      assault: 'Break that fleet and the world is ours. Keep your stern out of their teeth.',
      escort: "She can't dodge and she can't shoot. That makes her yours — get her to the marker.",
      defense: "Hold the line. If that outpost dies, so does our foothold here.",
      decap: 'Take the flagship\'s spine off and the rest of them remember they\'re mortal.',
      interdict: "If that courier jumps, every ambush for a year is already planned. Burn her."
    };
    return lines[arch.id] || 'Do your duty, Captain.';
  },

  /* Launch a generated mission as a one-off battle (P0 — no war persistence yet). */
  startProceduralMission(ctx) {
    Game.mode = 'war';
    Game.curTier = DATA.tier(ctx.tierId);
    const m = Game.generateMission(ctx);
    const fleet = (Game.save && Game.save.fleet) || [{ cls: 'corvette', name: 'TAS REAVER', xp: 0, refit: false }];
    const ships = Game.fleetSpawn(m.playerSpawn, fleet);
    (m.allies || []).forEach(a => ships.push(Game.mkShip(a.cls, a.name, 'ally', a.role, a.x, a.y, a.angle)));
    m.enemies.forEach(e => ships.push(Game.mkShip(e.cls, e.name, 'enemy', e.role, e.x, e.y, e.angle, { vip: e.vip, commander: e.commander, runTurn: e.runTurn })));
    Game.beginBattle(m, ships, m.terrain);
    return m;
  },

  /* ================= galaxy & the war (P1) ================= */
  warContext: null,   // { sysId, planetIdx, tierId, anchor } for the active war mission

  hashSeed(v) {
    v = String(v);
    let h = 2166136261;
    for (let i = 0; i < v.length; i++) { h ^= v.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  },

  galaxyInit(save) {
    if (!save) return;
    if (!save.galaxy || !save.galaxy.owner) {
      const owner = {};
      DATA.GALAXY.systems.forEach(s => { owner[s.id] = s.owner; });
      save.galaxy = { owner, cleared: {}, siege: {}, siegeBy: {}, events: [], turn: 0 };
    } else {
      save.galaxy.siegeBy = save.galaxy.siegeBy || {};
      save.galaxy.events = save.galaxy.events || [];
    }
    if (!save.story) save.story = { chapter: 0, done: [], flags: {} };
    else if (!save.story.flags) save.story.flags = {};
  },

  systemOwner(sysId) { return Game.save && Game.save.galaxy ? Game.save.galaxy.owner[sysId] : DATA.system(sysId).owner; },

  /* a system may be engaged if it isn't Terran-held and borders Terran space */
  isEngageable(sysId) {
    if (Game.systemOwner(sysId) === 'terran') return false;
    const sys = DATA.system(sysId);
    return sys.links.some(l => Game.systemOwner(l) === 'terran');
  },

  /* the enemy commander who defends a system's finale (null for the Hive) */
  systemCommander(sysId) {
    const pool = DATA.COMMANDERS[Game.systemOwner(sysId)];
    return (pool && pool.length) ? pool[Game.hashSeed('cmd_' + sysId) % pool.length] : null;
  },

  /* deterministic 4-planet layout for a system (names, types, archetype, anchors).
     Exactly one planet is the boss FINALE — an authored boss anchor if the system
     has one, else a generated decapitation vs the faction flagship, led by a named
     commander. The finale is fought last (see isPlanetLocked). */
  /* how many planets a system holds — 2, 3 or 4. Capitals are always full 4-planet
     systems; the rest vary deterministically so no two neighbours feel alike.
     Anchored worlds (see DATA.ANCHORS) reference indices up to :1, so the floor is 2. */
  systemPlanetCount(sysId) {
    const sys = DATA.system(sysId);
    if (sys && sys.type === 'capital') return 4;
    return 2 + (Game.hashSeed('pcount_' + sysId) % 3);   // 2, 3 or 4
  },

  systemPlanets(sysId) {
    const sys = DATA.system(sysId);
    const count = Game.systemPlanetCount(sysId);
    let s = Game.hashSeed(sysId) || 1;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const types = DATA.PLANET_TYPE_LIST, archs = DATA.MISSION_ARCHETYPES;
    const out = [];
    for (let i = 0; i < count; i++) {
      const anchorId = DATA.ANCHORS[sysId + ':' + i];
      out.push({
        idx: i,
        name: sys.name + ' ' + DATA.PLANET_NUMERALS[i],
        type: types[Math.floor(rnd() * types.length)],
        archetype: archs[Math.floor(rnd() * archs.length)].id,
        anchor: (anchorId && DATA.MISSION_DEFS[anchorId]) ? anchorId : null
      });
    }
    // designate the finale: an authored boss anchor, else the last free planet
    const last = count - 1;
    let finaleIdx = out.findIndex(p => p.anchor && DATA.BOSS_ANCHORS.includes(p.anchor));
    if (finaleIdx < 0) {
      finaleIdx = out[last].anchor ? out.findIndex(p => !p.anchor) : last;
      if (finaleIdx < 0) finaleIdx = last;
      out[finaleIdx].archetype = 'decap';
      out[finaleIdx].generatedBoss = true;
      out[finaleIdx].commander = Game.systemCommander(sysId);
    }
    out[finaleIdx].finale = true;
    return out;
  },

  /* why a planet is locked, or null: 'planets' (other worlds not yet secured) or
     'story' (a capital finale gated behind an unresolved act beat) */
  planetLockReason(sysId, idx) {
    const planets = Game.systemPlanets(sysId);
    if (!planets[idx].finale) return null;
    if (planets.some((q, i) => i !== idx && !Game.isPlanetCleared(sysId, i))) return 'planets';
    const gate = DATA.FINALE_GATES[sysId];
    if (gate && !(Game.save && Game.save.story && Game.save.story.done.includes(gate.beat))) return 'story';
    return null;
  },

  /* the finale is locked until every other planet is secured — and, at an enemy
     capital, until that act's key story beat has been resolved */
  isPlanetLocked(sysId, idx) { return !!Game.planetLockReason(sysId, idx); },

  clearedPlanets(sysId) { return (Game.save.galaxy.cleared[sysId] || []); },
  isPlanetCleared(sysId, idx) { return Game.clearedPlanets(sysId).includes(idx); },
  isSystemTaken(sysId) { return Game.clearedPlanets(sysId).length >= Game.systemPlanetCount(sysId); },
  systemProgress(sysId) { return Game.clearedPlanets(sysId).length; },

  terranSystems() { return DATA.GALAXY.systems.filter(s => Game.systemOwner(s.id) === 'terran'); },
  factionInfluence() {
    const counts = {};
    DATA.GALAXY.systems.forEach(s => { const o = Game.systemOwner(s.id); counts[o] = (counts[o] || 0) + 1; });
    return counts;
  },

  /* launch the mission on a planet — an authored anchor, or a generated battle */
  startPlanetMission(sysId, planetIdx, tierId) {
    const sys = DATA.system(sysId);
    const planet = Game.systemPlanets(sysId)[planetIdx];
    Game.mode = 'war';
    Game.warContext = { sysId, planetIdx, tierId, anchor: planet.anchor };
    if (planet.anchor) {
      // authored set-piece: use its own balance (global campaign difficulty)
      Game.curTier = null;
      const m = DATA.MISSION_DEFS[planet.anchor];
      const ships = Game.fleetSpawn(m.playerSpawn, Game.save.fleet);
      (m.allies || []).forEach(a => ships.push(Game.mkShip(a.cls, a.name, 'ally', a.role, a.x, a.y, a.angle)));
      m.enemies.forEach(e => {
        const role = e.cls === 'hive' ? 'carrier' : e.role;
        ships.push(Game.mkShip(e.cls, e.name, 'enemy', role, e.x, e.y, e.angle, { vip: e.vip }));
      });
      Game.beginBattle(m, ships, m.terrain);
      return m;
    }
    return Game.startProceduralMission({
      factionId: sys.owner, archetypeId: planet.archetype, tierId,
      planet: { name: planet.name, type: planet.type }, system: { name: sys.name },
      seed: Game.hashSeed(sysId + '_' + planetIdx + '_' + tierId), playerFleetPts: Game.playerFleetPts(),
      commander: planet.commander || null, finale: !!planet.finale
    });
  },

  /* launch a story-beat mission (authored anchor or generated) */
  startStoryMission(beat) {
    Game.mode = 'war';
    Game.curTier = beat.mission ? DATA.tier(beat.mission.tierId) : null;
    Game.warContext = { story: beat.id, sysId: null, planetIdx: null, tierId: beat.mission ? beat.mission.tierId : 'medium' };
    if (beat.anchor && DATA.MISSION_DEFS[beat.anchor]) {
      const m = DATA.MISSION_DEFS[beat.anchor];
      const ships = Game.fleetSpawn(m.playerSpawn, Game.save.fleet);
      (m.allies || []).forEach(a => ships.push(Game.mkShip(a.cls, a.name, 'ally', a.role, a.x, a.y, a.angle)));
      m.enemies.forEach(e => {
        const role = e.cls === 'hive' ? 'carrier' : e.role;
        ships.push(Game.mkShip(e.cls, e.name, 'enemy', role, e.x, e.y, e.angle, { vip: e.vip }));
      });
      Game.beginBattle(m, ships, m.terrain);
      return m;
    }
    const ctx = Object.assign({ story: true, playerFleetPts: Game.playerFleetPts(), seed: Game.hashSeed('story_' + beat.id) }, beat.mission || {});
    return Game.startProceduralMission(ctx);
  },

  /* apply the outcome of a war mission to the galaxy; returns a summary */
  applyWarResult(win) {
    const wc = Game.warContext;
    const g = Game.save.galaxy;
    const sys = DATA.system(wc.sysId);
    const defender = Game.systemOwner(wc.sysId);   // faction that held it before this fight
    const res = { win, sysId: wc.sysId, sysName: sys.name, sysType: sys.type, faction: defender,
      taken: false, capital: false, lost: [], earned: 0, report: null, status: null };
    if (win) {
      res.earned = Game.earnings();
      Game.save.req += res.earned;
      res.report = Game.applyBattleResults();
      const set = g.cleared[wc.sysId] || (g.cleared[wc.sysId] = []);
      if (!set.includes(wc.planetIdx)) set.push(wc.planetIdx);
      if (wc.anchor) Game.save.story.flags['done_' + wc.anchor] = true;
      // capture flags drive reactive story beats (DATA.STORY capture triggers)
      Game.save.story.flags['captured_' + wc.sysId + ':' + wc.planetIdx] = true;
      if (Game.isSystemTaken(wc.sysId)) {
        g.owner[wc.sysId] = 'terran';
        g.siege[wc.sysId] = 0;
        res.taken = true;
        res.capital = sys.type === 'capital';
        Game.save.story.flags['systaken_' + wc.sysId] = true;
      }
      const flips = Game.warTick(true);
      res.flips = flips;
      res.lost = flips.filter(f => f.from === 'terran');
      // villain reaction (applied AFTER warTick so its momentum sweep doesn't cancel
      // it): taking a Drift-central system provokes the swarm — the Gate feeds it.
      if (res.taken && DATA.CAPTURE_REACTIONS[wc.sysId] === 'hivesurge') {
        res.hiveSurge = Game.hiveSurge();
      }
    }
    res.status = Game.warStatus();
    Game.persist();
    return res;
  },

  /* ---- the living war ---- */
  SYS_WEIGHT: { capital: 4, majorhub: 3, shipyard: 3, minorhub: 2, resource: 2, outpost: 1 },
  sysWeight(type) { return Game.SYS_WEIGHT[type] || 1; },
  /* how much siege it takes to flip a system — valuable systems hold out longer */
  siegeThreshold(sysId) { return 3 + Game.sysWeight(DATA.system(sysId).type); },
  /* a faction's power = the weighted value of the systems it holds */
  factionStrength(fid) {
    return DATA.GALAXY.systems.reduce((a, s) => a + (Game.systemOwner(s.id) === fid ? Game.sysWeight(s.type) : 0), 0);
  },

  /* the swarm surges: pile fresh Hive siege on a Terran system fronting Hive space
     (or any Terran system if the front hasn't reached them). Returns that system's
     name for the debrief, or null if there is nowhere to push. */
  hiveSurge() {
    const g = Game.save.galaxy;
    const front = DATA.GALAXY.systems.filter(s => Game.systemOwner(s.id) === 'terran' &&
      s.links.some(l => Game.systemOwner(l) === 'hive'));
    const pool = front.length ? front : DATA.GALAXY.systems.filter(s => Game.systemOwner(s.id) === 'terran' && s.id !== DATA.TERRAN_CAPITAL);
    if (!pool.length) return null;
    const t = pool[Game.hashSeed('surge_' + (g.turn || 0) + '_' + pool.length) % pool.length];
    g.siege[t.id] = (g.siege[t.id] || 0) + 2;
    g.siegeBy[t.id] = 'hive';
    return t.name;
  },

  /* Advance the war one turn: every enemy faction mounts an offensive against a
     bordering rival — Terran OR another enemy — so the whole galaxy shifts, not
     just the player's front. A player win pushes the enemy off Terran soil.
     Returns the systems that changed hands this turn. */
  warTick(playerWon) {
    const g = Game.save.galaxy;
    g.turn = (g.turn || 0) + 1;
    const diffMul = { easy: 0.6, normal: 1, hard: 1.5 }[Game.save.diff] || 1;
    const flips = [];
    // momentum: winning shoves besiegers back off Terran frontier systems
    if (playerWon) {
      Object.keys(g.siege).forEach(sid => {
        if (Game.systemOwner(sid) === 'terran') {
          g.siege[sid] = Math.max(0, g.siege[sid] - 2);
          if (g.siege[sid] <= 0) { delete g.siege[sid]; delete g.siegeBy[sid]; }
        }
      });
    }
    DATA.enemyFactions().forEach(fid => {
      const targets = DATA.GALAXY.systems.filter(s =>
        Game.systemOwner(s.id) !== fid && s.id !== DATA.TERRAN_CAPITAL &&
        s.links.some(l => Game.systemOwner(l) === fid));
      if (!targets.length) return;
      // prefer valuable, weakly-defended, already-softened targets
      const scored = targets.map(s => {
        const defStr = Game.factionStrength(Game.systemOwner(s.id));
        const already = g.siegeBy[s.id] === fid ? g.siege[s.id] : 0;
        return { s, sc: Game.sysWeight(s.type) * 2 + already - defStr * 0.12 + U.random() * 2.5 };
      }).sort((a, z) => z.sc - a.sc);
      const target = scored[0].s;
      const gain = (1 + Math.floor(U.random() * 2)) * diffMul;
      g.siege[target.id] = (g.siege[target.id] || 0) + gain;
      g.siegeBy[target.id] = fid;
      if (g.siege[target.id] >= Game.siegeThreshold(target.id)) {
        const from = Game.systemOwner(target.id);
        g.owner[target.id] = fid;
        delete g.siege[target.id]; delete g.siegeBy[target.id];
        g.cleared[target.id] = [];
        const ev = { turn: g.turn, faction: fid, from, sysId: target.id, name: target.name };
        flips.push(ev);
        g.events.unshift(ev);
      }
    });
    // stale sieges cool off
    Object.keys(g.siege).forEach(sid => {
      g.siege[sid] = Math.max(0, g.siege[sid] - 0.25);
      if (g.siege[sid] <= 0) { delete g.siege[sid]; delete g.siegeBy[sid]; }
    });
    g.events = g.events.slice(0, 16);
    return flips;
  },
  /* legacy name kept for callers/tests */
  enemyPressure() { return Game.warTick(false); },

  warStatus() {
    if (DATA.enemyCapitals().every(c => Game.systemOwner(c) === 'terran')) return 'win';
    if (Game.terranSystems().length <= 1) return 'lose';   // reduced to the capital alone
    return null;
  },

  /* a Voss line reacting to how the war is going (shown on the galaxy header) */
  vossWarLine() {
    const held = Game.terranSystems().length;
    const total = DATA.GALAXY.systems.length;
    const caps = DATA.enemyCapitals().filter(c => Game.systemOwner(c) === 'terran').length;
    const rivals = DATA.enemyFactions().map(f => ({ f, s: Game.factionStrength(f) })).sort((a, z) => z.s - a.s);
    const topRival = rivals[0];
    if (held <= 2) return '"The front\'s collapsing, Captain. We hold here or the Verge is theirs."';
    if (caps >= 2) return '"Two thrones down. One more and this war is over — don\'t slow up now."';
    if (Game.factionStrength('terran') >= total * 0.55) return '"We\'ve got them reeling. Keep the pressure on."';
    if (topRival && topRival.s >= total * 0.35) return '"The ' + DATA.faction(topRival.f).short + ' are gorging on this war. Blunt them before they\'re unstoppable."';
    return '"The line holds. Pick your next target and make it count."';
  },

  /* ---- story-mission scaffolding (framework only; beats authored later) ---- */
  storyBeatAvailable() {
    if (!Game.save || !window.DATA || !DATA.STORY) return null;
    const done = (Game.save.story && Game.save.story.done) || [];
    return DATA.STORY.find(b => !done.includes(b.id) && (!b.trigger || b.trigger(Game.save))) || null;
  },
  completeStoryBeat(id) {
    if (!Game.save.story) Game.save.story = { chapter: 0, done: [] };
    if (!Game.save.story.done.includes(id)) Game.save.story.done.push(id);
    const beat = DATA.STORY.find(b => b.id === id);
    if (beat && beat.chapter > Game.save.story.chapter) Game.save.story.chapter = beat.chapter;
    Game.persist();
  },

  beginBattle(mission, ships, terrainDensity) {
    Game.b = {
      mission, turn: 1, phase: 'move',
      ships, torps: [], craft: [],
      terrain: Game.genTerrain(terrainDensity),
      sel: null, plotStep: 'order', curOrder: null, ghost: null,
      armed: null, boardMode: null, hover: null, inspect: null,
      log: [], banner: null,
      queue: [], nextShotAt: 0, anim: null,
      killPts: 0,
      stats: { playerTransits: 0, vipKillTurn: 0, bomberHitsOnPlayer: 0, enemyEscaped: 0 }
    };
    Game.log('— TURN 01 · MOVEMENT —', '#4cd7ea');
    if (window.Music) Music.startCombat();   // crossfade menu → combat music
    Game.autoSelect();
    if (window.Rend) Rend.initBattle();
    if (window.UI) UI.refresh();
  },

  /* ================= helpers ================= */
  ship(id) { return Game.b ? Game.b.ships.find(s => s.id === id) : null; },
  active(b) { return (b || Game.b).ships.filter(s => s.alive && !s.exited); },
  playerShips(b) { return Game.active(b).filter(s => s.side === 'player'); },
  enemyShips(b) { return Game.active(b).filter(s => s.side === 'enemy'); },
  hulks(b) { return (b || Game.b).ships.filter(s => s.hulked); },
  // a routing ship is no longer an effective combatant — battles end when the line breaks
  sideDead(b, side) { return !b.ships.some(s => s.side === side && s.alive && !s.exited && !s.routing); },

  /* ================= morale ================= */
  routShip(s, reason) {
    if (!s || s.routing || s.vip || s.side !== 'enemy' || !s.alive || s.exited) return;
    s.routing = true;
    s.role = 'rout';
    s.weapons.forEach(w => { w.target = null; });
    Game.log('⚑ ' + s.name + ' breaks off — ' + reason, '#ffd465', { big: true });
  },

  checkMorale(b) {
    const standing = Game.enemyShips(b).filter(s => !s.routing);
    if (!standing.length) return;
    const tot = b.ships.filter(s => s.side === 'enemy').reduce((a, s) => a + s.maxHull, 0);
    const cur = Game.enemyShips(b).reduce((a, s) => a + Math.max(0, s.hull), 0);
    const lineBreaking = tot > 0 && cur / tot < Game.diff().morale;
    standing.forEach(s => {
      if (s.vip) return;
      if (lineBreaking && U.rand(1, 6) >= 4) Game.routShip(s, 'the line is breaking');
      else if (s.hull < s.maxHull * 0.25 && U.rand(1, 6) >= 4) Game.routShip(s, 'her crew has had enough');
    });
  },

  log(t, c, extra) {
    const e = Object.assign({ t, c: c || '#8ba0b8' }, extra || {});
    Game.b.log.push(e);
    if (window.UI) UI.pushLog(e);
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
    if (w.arc !== 'any') {
      const brg = U.bearingFrom(shooter, target.x, target.y);
      const arc = U.arcOf(brg);
      if (w.arc === 'fore' && arc !== 'fore') return { ok: false, why: 'NOT IN FORE ARC' };
      if (w.arc === 'side' && arc !== 'side') return { ok: false, why: 'NOT IN SIDE ARC' };
      // a broadside only bears on its own flank (bearing<0 = port, >0 = starboard)
      if (w.arc === 'port' || w.arc === 'starboard') {
        if (arc !== 'side') return { ok: false, why: 'NOT IN BROADSIDE ARC' };
        const side = brg < 0 ? 'port' : 'starboard';
        if (side !== w.arc) return { ok: false, why: 'TARGET TO ' + side.toUpperCase() };
      }
    }
    if (w.type !== 'torp' && w.type !== 'bay' && Game.losBlocked(shooter, target)) return { ok: false, why: 'LINE OF FIRE BLOCKED' };
    if ((w.type === 'torp' || w.type === 'bay') && shooter.order && shooter.order.brace) return { ok: false, why: 'CREWS BRACED' };

    const sArc = U.shieldArcHit(target, shooter.x, shooter.y);
    if (w.type === 'torp' || w.type === 'bay') {
      return { ok: true, dist: Math.round(d), sArc, stern: sArc === 'A', torp: w.type === 'torp', bay: w.type === 'bay' };
    }
    // dice-pool gunnery: roll w.dice D6, each die hits on `need`+
    let need = w.need;
    if (shooter.order) need += shooter.order.accShift;
    if (shooter.side === 'player' && Game.mode === 'campaign' && Game.save.upgrades.uplink) need -= 1;
    if (shooter.rank >= 2) need -= 1;                                  // VETERAN gunnery
    need += shooter.sys['WEAPONS'];
    if (shooter.sys['BRIDGE'] >= 2) need += 1;
    if (w.type === 'battery') {
      if (d > 0.7 * w.range) need += 1;          // shells scatter at long range
      else if (d < 0.35 * w.range) need -= 1;    // point-blank broadside
    }
    if (target.order) need += target.order.dodgeShift;
    if (Game.inNebula(target)) need += 1;
    if (Game.inNebula(shooter)) need += 1;
    if (shooter.side === 'enemy') need += Game.diff().enemyNeed;
    need = U.clamp(need, 2, 6);
    const exp = w.dice * (7 - need) / 6 * w.dmgPer;
    return {
      ok: true, dice: w.dice, need, dmgPer: w.dmgPer,
      exp: Math.round(exp * 10) / 10,
      dist: Math.round(d), sArc, stern: sArc === 'A', torp: false
    };
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
      if (s.plotted) { s.plotted = false; s.plot = null; s.order = null; }
      b.sel = id; b.plotStep = 'order'; b.curOrder = null; b.ghost = null;
      Snd.select();
    } else if (b.phase === 'fire' && s.side === 'player') {
      b.sel = id; b.armed = null; b.boardMode = null;
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

  shipAt(x, y, includeHulks) {
    let best = null, bd = 1e9;
    Game.b.ships.forEach(s => {
      const targetable = (s.alive && !s.exited) || (includeHulks && s.hulked);
      if (!targetable) return;
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < s.r + 12 && d < bd) { best = s; bd = d; }
    });
    return best;
  },

  mapClick(x, y) {
    const b = Game.b;
    if (!b || b.banner) return;
    if (b.inspect) { b.inspect = null; if (window.UI) UI.refresh(); return; }
    const hit = Game.shipAt(x, y, true);

    if (b.phase === 'move') {
      const s = Game.ship(b.sel);
      // map clicks only re-select before an order is chosen; while aiming,
      // every click is a destination (switch ships via roster or number keys)
      const reselect = hit && !hit.hulked && hit.side === 'player' && (!s || hit.id !== s.id) && b.plotStep === 'order';
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
      // boarding mode: click an adjacent enemy or hulk
      if (b.boardMode && hit) {
        const s = Game.ship(b.boardMode);
        if (s && Game.tryBoard(s, hit)) return;
      }
      if (b.armed) {
        const s = Game.ship(b.armed.shipId);
        const w = s && s.weapons[b.armed.wIdx];
        if (s && w && w.reload === 0) {
          if (w.type === 'torp') {
            // torpedoes run along any bearing: lock onto a clicked enemy, or
            // free-aim the salvo at the clicked point in open space
            if (s.order && s.order.brace) { Snd.deny(); }
            else {
              const lock = hit && !hit.hulked && hit.side === 'enemy';
              w.target = lock ? hit.id : { x, y, free: true };
              b.armed = null; b.hover = null;
              Snd.lock();
              if (window.UI) UI.refresh();
              return;
            }
          } else if (hit && !hit.hulked) {
            const isFighters = w.type === 'bay' && w.craft === 'fighters';
            const validSide = isFighters ? hit.side !== 'enemy' : hit.side === 'enemy';
            if (validSide) {
              const sol = isFighters ? { ok: true } : Game.solution(s, w, hit);
              if (sol.ok) {
                w.target = hit.id;
                b.armed = null; b.hover = null;
                Snd.lock();
                if (window.UI) UI.refresh();
                return;
              } else { Snd.deny(); }
            }
          }
        }
      }
      if (hit && !hit.hulked && hit.side === 'player') { Game.selectShip(hit.id); return; }
      if (hit) { b.inspect = hit.id; if (window.UI) UI.refresh(); return; }
      if (b.armed || b.boardMode) { b.armed = null; b.boardMode = null; if (window.UI) UI.refresh(); }
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
    else if (b.phase === 'fire' && (b.armed || b.boardMode)) { b.armed = null; b.boardMode = null; }
    if (window.UI) UI.refresh();
  },

  allPlotted() {
    return Game.playerShips(Game.b).every(s => s.plotted);
  },

  /* ================= boarding ================= */
  canBoard(s) {
    if (!s || s.boarded || s.side !== 'player') return false;
    return Game.boardTargets(s).length > 0;
  },

  boardTargets(s) {
    return Game.b.ships.filter(t =>
      t.id !== s.id && !t.exited &&
      ((t.side === 'enemy' && t.alive) || (t.hulked && !t.captured)) &&
      U.dist(s, t) <= DATA.BOARD_RANGE);
  },

  tryBoard(s, target) {
    const b = Game.b;
    if (!s || s.boarded) return false;
    if (U.dist(s, target) > DATA.BOARD_RANGE) { Snd.deny(); Game.log(s.name + ' — boarding target out of range', '#5c7089'); return false; }
    // valid targets: a living foe (raid), an unclaimed hulk (player capture),
    // or a player-held prize (Dominion scuttling party)
    const raid = target.alive && !target.exited && target.side !== s.side;
    const capture = target.hulked && !target.captured && s.side === 'player';
    const scuttle = target.hulked && target.captured && s.side === 'enemy';
    if (!raid && !capture && !scuttle) return false;
    s.boarded = true;
    b.boardMode = null;
    Rend.fx.ring(s.x, s.y, 26, 'rgba(255,212,101,.7)');
    Rend.fx.ring(target.x, target.y, 26, 'rgba(255,212,101,.7)');
    Snd.lock();
    if (capture) {
      const die = U.rand(1, 6);
      if (die + s.rank >= 5) {
        target.captured = true;
        s.xpEarned += 10;
        Snd.repair();
        Game.log('★ ' + s.name + ' boarding teams secure the wreck of ' + target.name + ' — PRIZE TAKEN', '#ffd465', { big: true });
      } else {
        Game.log(s.name + ' boarding teams pull back from ' + target.name + ' — fire and vacuum below decks (rolled ' + die + ', need 5+)', '#7ba8b8');
      }
    } else if (scuttle) {
      const die = U.rand(1, 6);
      if (die >= 4) {
        target.hulked = false; target.captured = false;
        Snd.explosion(false);
        Rend.fx.boom(target.x, target.y, false);
        Rend.shake(9);
        Game.log('⚠ Dominion boarders scuttle your prize — ' + target.name + ' blooms into wreckage (rolled ' + die + ')', '#ff8a84', { big: true });
      } else {
        Game.log('Your prize crew aboard ' + target.name + ' throws the Dominion scuttling party back into the void (rolled ' + die + ', need 4+)', '#6fe0a8');
      }
    } else {
      const att = U.rand(1, 6) + s.rank + (s.hull > s.maxHull * 0.5 ? 1 : 0);
      const def = U.rand(1, 6) + Math.round(target.hull / target.maxHull * 2) + (target.r > 70 ? 1 : 0);
      if (att > def) {
        s.xpEarned += 6;
        Game.log('⚔ ' + s.name + ' hit-and-run boarding on ' + target.name + ' — charges set (' + att + ' vs ' + def + ')', '#ffd465', { big: true });
        Game.rollCrit(target, 6);
        if (target.alive) Game.applyDamage(target, U.rand(1, 3), { quiet: true, sol: {}, shooterRef: s });
      } else if (att === def) {
        Game.log('⚔ ' + s.name + ' boarding action on ' + target.name + ' — fought to a bloody draw (' + att + ' vs ' + def + ')', '#e8c9a0');
        s.hull -= 1; target.hull -= 1;
        if (s.hull <= 0) Game.killShip(s);
        if (target.hull <= 0) { target.lastHitBy = s.id; Game.killShip(target); }
      } else {
        const dmg = U.rand(1, 3);
        s.hull -= dmg;
        s.tookFire = true;
        Game.log('⚔ ' + s.name + ' boarding parties repelled by ' + target.name + ' — ' + dmg + ' hull lost (' + att + ' vs ' + def + ')', '#ff8a84');
        if (s.hull <= 0) Game.killShip(s);
      }
    }
    if (Game.checkEnd()) return true;
    if (window.UI) UI.refresh();
    return true;
  },

  /* ================= engage: AI plots + simultaneous animation ================= */
  engage() {
    const b = Game.b;
    if (b.phase !== 'move' || !Game.allPlotted()) return;
    Game.active(b).filter(s => s.side !== 'player').forEach(s => AI.plot(s, b));
    Game.active(b).forEach(s => {
      s.animFrom = { x: s.x, y: s.y, angle: s.angle };
      if (!s.plot) s.plot = { x: s.x, y: s.y, angle: s.angle };
      s.animCurve = U.curveFn(s.animFrom, s.plot);
    });
    Game.stageTorpedoes(b);
    Game.stageCraft(b);
    Game.stageIntercepts(b);
    b.phase = 'anim';
    b.anim = { start: performance.now(), dur: 1500 / Game.speed };
    b.sel = null; b.ghost = null; b.curOrder = null; b.boardMode = null;
    Snd.click();
    if (window.UI) UI.refresh();
  },

  stageTorpedoes(b) {
    b.torps.forEach(tp => {
      tp.from = { x: tp.x, y: tp.y };
      const rad = tp.angle * U.D2R;
      let travel = tp.speed;
      let hitShip = null, hitAst = null;
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

  /* ---- attack craft: bombers home on targets, fighters fly cover ---- */
  stageCraft(b) {
    b.craft.forEach(c => {
      c.from = { x: c.x, y: c.y };
      c.strike = null;
      if (c.kind === 'bombers') {
        let t = Game.ship(c.targetId);
        if (!t || !t.alive || t.exited) {
          // retarget nearest foe
          const foes = Game.active(b).filter(x => c.side === 'enemy' ? x.side !== 'enemy' : x.side === 'enemy');
          t = foes.sort((a, z) => U.dist(c, a) - U.dist(c, z))[0];
          c.targetId = t ? t.id : null;
        }
        if (!t) { c.expired = true; c.to = { x: c.x, y: c.y }; return; }
        const dest = t.plot ? { x: t.plot.x, y: t.plot.y } : { x: t.x, y: t.y };
        const d = U.dist(c, dest);
        c.angle = U.angleTo(c, dest);
        if (d <= c.speed) {
          c.to = dest;
          c.strike = t.id;
        } else {
          const rad = c.angle * U.D2R;
          c.to = { x: c.x + Math.cos(rad) * c.speed, y: c.y + Math.sin(rad) * c.speed };
        }
      } else {
        // fighters: orbit their charge
        let e = Game.ship(c.escortId);
        if (!e || !e.alive || e.exited) e = Game.ship(c.launcher);
        if (!e || !e.alive || e.exited) { c.expired = true; c.to = { x: c.x, y: c.y }; return; }
        c.orbit = (c.orbit || 0) + 1;
        const oa = c.orbit * 85 * U.D2R;
        const base = e.plot ? e.plot : e;
        c.to = { x: base.x + Math.cos(oa) * (e.r + 55), y: base.y + Math.sin(oa) * (e.r + 55) };
        c.angle = U.angleTo(c, c.to);
      }
      c.fuel--;
      if (c.fuel <= 0 && !c.strike) c.expired = true;
    });
  },

  /* fighters intercept hostile ordnance whose path ends near them */
  stageIntercepts(b) {
    b.craft.filter(c => c.kind === 'fighters' && !c.expired).forEach(f => {
      if (f.intercepting) return;
      // hostile bomber squadrons first, then torpedoes
      const bomber = b.craft.find(c => c.kind === 'bombers' && c.side !== f.side && !c.expired && !c.intercepted &&
        U.dist(c.to, f.to) < 190);
      if (bomber) { f.intercepting = { type: 'craft', id: bomber.id }; bomber.intercepted = true; return; }
      const torp = b.torps.find(tp => tp.side !== f.side && !tp.expired && !tp.intercepted &&
        U.dist(tp.to, f.to) < 190);
      if (torp) { f.intercepting = { type: 'torp', id: torp.id }; torp.intercepted = true; }
    });
  },

  resolveDogfights(b) {
    b.craft.filter(c => c.kind === 'fighters' && c.intercepting).forEach(f => {
      const iv = f.intercepting;
      f.intercepting = null;
      let kills = 0;
      for (let i = 0; i < f.count; i++) if (U.rand(1, 6) >= 4) kills++;
      if (iv.type === 'torp') {
        const tp = b.torps.find(t => t.id === iv.id);
        if (!tp) return;
        tp.intercepted = false;
        const shot = Math.min(kills, tp.count);
        tp.count -= shot;
        Rend.fx.spark(tp.to.x, tp.to.y, '#9fe8ff', 12);
        Snd.cannon();
        Game.log((f.side === 'player' ? 'TAS' : 'Hostile') + ' fighter screen sweeps the torpedo salvo — ' + shot + ' torpedo' + (shot === 1 ? '' : 'es') + ' destroyed', '#7ce8f7');
        if (tp.count <= 0) { tp.expired = true; tp.strike = null; }
      } else {
        const bo = b.craft.find(c => c.id === iv.id);
        if (!bo) return;
        bo.intercepted = false;
        const shot = Math.min(kills, bo.count);
        bo.count -= shot;
        Rend.fx.spark(bo.to.x, bo.to.y, '#9fe8ff', 14);
        Snd.cannon();
        Game.log('Fighters tangle with the bomber wave — ' + shot + ' bomber' + (shot === 1 ? '' : 's') + ' splashed', '#7ce8f7');
        // bombers' tail guns
        let fLost = 0;
        for (let i = 0; i < bo.count; i++) if (U.rand(1, 6) >= 6) fLost++;
        if (fLost > 0) {
          f.count -= fLost;
          Game.log('Tail guns claim ' + fLost + ' fighter' + (fLost === 1 ? '' : 's'), '#ff8a84');
        }
        if (bo.count <= 0) { bo.expired = true; bo.strike = null; }
        if (f.count <= 0) f.expired = true;
      }
    });
  },

  resolveBomberStrike(b, c) {
    const target = Game.ship(c.strike);
    if (!target || !target.alive || target.exited) return;
    let n = c.count;
    let flak = 0;
    for (let i = 0; i < target.turrets && n > 0; i++) {
      if (U.rand(1, 6) >= 4) { n--; flak++; }
    }
    if (flak > 0) {
      Rend.fx.spark(c.to.x, c.to.y, '#ffd9a0', 10);
      Game.log(target.name + ' flak — ' + flak + ' bomber' + (flak === 1 ? '' : 's') + ' shot down', '#7ba8b8');
    }
    let hits = 0;
    for (let i = 0; i < n; i++) if (U.rand(1, 6) >= 4) hits++;
    if (hits <= 0) {
      Game.log('Bomber run on ' + target.name + ' — all payloads wide', '#5c7089');
      return;
    }
    Snd.explosion(false);
    Rend.fx.boom(c.to.x, c.to.y, false);
    Rend.shake(9);
    if (target.side === 'player') b.stats.bomberHitsOnPlayer++;
    const launcher = Game.ship(c.launcher);
    Game.log('Bombers dive on ' + target.name + ' — ' + hits + ' hit' + (hits === 1 ? '' : 's') + ' · ' + (hits * 2) + ' hull (shields bypassed)', '#ffb454');
    Game.applyDamage(target, hits * 2, { quiet: false, sol: { stern: false }, shooterRef: launcher, hits });
  },

  /* ================= fire phase ================= */
  armWeapon(shipId, wIdx) {
    const b = Game.b;
    if (b.phase !== 'fire') return;
    const s = Game.ship(shipId);
    const w = s && s.weapons[wIdx];
    if (!s || !w) return;
    if (w.reload > 0 || s.sys['WEAPONS'] >= 2) { Snd.deny(); return; }
    if ((w.type === 'torp' || w.type === 'bay') && s.order && s.order.brace) { Snd.deny(); return; }
    b.boardMode = null;
    if (w.target) { w.target = null; b.armed = null; Snd.click(); if (window.UI) UI.refresh(); return; }
    if (b.armed && b.armed.shipId === shipId && b.armed.wIdx === wIdx) b.armed = null;
    else b.armed = { shipId, wIdx };
    Snd.select();
    if (window.UI) UI.refresh();
  },

  toggleBoardMode(shipId) {
    const b = Game.b;
    if (b.phase !== 'fire') return;
    b.armed = null;
    b.boardMode = b.boardMode === shipId ? null : shipId;
    Snd.select();
    if (window.UI) UI.refresh();
  },

  anyAssigned() {
    return Game.playerShips(Game.b).some(s => s.weapons.some(w => w.target));
  },

  /* broadsides at will: point every idle gun at its best target (player adjusts after) */
  autoAssign() {
    const b = Game.b;
    if (!b || b.phase !== 'fire') return 0;
    let n = 0;
    Game.playerShips(b).forEach(s => {
      if (s.sys['WEAPONS'] >= 2) return;
      s.weapons.forEach(w => {
        if (w.reload > 0 || w.target) return;
        if ((w.type === 'torp' || w.type === 'bay') && s.order && s.order.brace) return;
        if (w.type === 'bay' && w.craft === 'fighters') { w.target = s.id; n++; return; }
        let best = null, bp = -1;
        Game.enemyShips(b).forEach(f => {
          const sol = Game.solution(s, w, f);
          if (!sol.ok) return;
          if (w.type === 'torp' && sol.dist < 200) return;
          let p = w.type === 'torp' ? 60 : (w.type === 'bay' ? 55 - f.turrets * 4 : sol.exp * 12);
          if (f.vip) p += 5;
          if (f.hull < f.maxHull * 0.4) p += 10;
          if (f.routing) p -= 8; // let them run, unless they're the only shot
          if (p > bp) { bp = p; best = f; }
        });
        if (best) { w.target = best.id; n++; }
      });
    });
    if (n > 0) Snd.lock(); else Snd.deny();
    b.armed = null; b.boardMode = null;
    if (window.UI) UI.refresh();
    return n;
  },

  openFire() {
    const b = Game.b;
    if (b.phase !== 'fire') return;
    b.queue = [];
    Game.playerShips(b).forEach(s => {
      s.weapons.forEach((w, i) => {
        if (w.target && w.reload === 0) b.queue.push({ shooterId: s.id, wIdx: i, targetId: w.target });
      });
    });
    // the Dominion agrees on a priority target: the most battered player ship
    const prey = Game.active(b).filter(x => x.side !== 'enemy');
    prey.sort((a, z) =>
      (a.hull + (a.sh.F + a.sh.S + a.sh.A) * 2) / a.maxHull -
      (z.hull + (z.sh.F + z.sh.S + z.sh.A) * 2) / z.maxHull);
    b.aiFocus = prey.length ? prey[0].id : null;
    Game.enemyShips(b).forEach(s => {
      AI.assignFire(s, b).forEach(q => b.queue.push(q));
      const board = AI.maybeBoard(s, b);
      if (board) b.queue.push(board);
    });
    if (!b.queue.length) {
      Game.log('All batteries silent this turn.', '#5c7089');
      Game.finishFiring();
      return;
    }
    b.phase = 'firing';
    b.armed = null; b.hover = null; b.boardMode = null;
    b.nextShotAt = performance.now() + 150;
    if (window.UI) UI.refresh();
  },

  processShot(q) {
    const b = Game.b;
    const s = Game.ship(q.shooterId);
    if (!s || !s.alive) return;
    if (q.type === 'board') {
      const t = Game.ship(q.targetId);
      if (t) Game.tryBoard(s, t);
      return;
    }
    const w = s.weapons[q.wIdx];
    // a torpedo may be free-aimed at a bare point/bearing rather than locked to a ship
    const freeAim = q.targetId && typeof q.targetId === 'object';
    const target = freeAim ? null : Game.ship(q.targetId);
    w.target = null;
    if (!freeAim && (!target || !target.alive || target.exited)) {
      Game.log(s.name + ' ' + w.name + ' — target lost', '#5c7089');
      return;
    }
    if (freeAim && w.type !== 'torp') return;   // only torpedoes free-aim
    const isFighters = w.type === 'bay' && w.craft === 'fighters';
    const sol = (freeAim || isFighters) ? { ok: true } : Game.solution(s, w, target);
    if (!sol.ok) {
      Game.log(s.name + ' ' + w.name + ' — no firing solution (' + sol.why + ')', '#5c7089');
      return;
    }

    if (w.type === 'torp') {
      if (s.order && s.order.brace) { Game.log(s.name + ' ' + w.name + ' — crews braced, tubes cold', '#5c7089'); return; }
      w.reload = w.reloadTime + 1;
      const ang = freeAim ? U.angleTo(s, q.targetId) : U.angleTo(s, target);
      const rad = ang * U.D2R;
      Game.b.torps.push({
        id: 'tp' + Math.floor(Math.random() * 1e9),
        x: s.x + Math.cos(rad) * (s.w * 0.55 + 14),
        y: s.y + Math.sin(rad) * (s.w * 0.55 + 14),
        angle: ang, speed: 270, fuel: 3,
        count: w.salvo,
        side: s.side, launcher: s.id
      });
      Snd.torp();
      Rend.fx.ring(s.x, s.y, 30, 'rgba(255,180,84,.6)');
      Game.log(s.name + ' — TORPEDOES AWAY (' + w.salvo + ' fish, ' + (freeAim ? 'running along the plotted bearing' : 'running toward ' + target.name) + ')', '#ffb454');
      return;
    }

    if (w.type === 'bay') {
      w.reload = w.reloadTime + 1;
      const ang = U.angleTo(s, target);
      const rad = ang * U.D2R;
      Game.b.craft.push({
        id: 'cr' + Math.floor(Math.random() * 1e9),
        kind: w.craft, side: s.side,
        x: s.x + Math.cos(rad) * (s.w * 0.55 + 16),
        y: s.y + Math.sin(rad) * (s.w * 0.55 + 16),
        angle: ang, speed: 340, fuel: 4,
        count: w.salvo,
        targetId: w.craft === 'bombers' ? target.id : null,
        escortId: w.craft === 'fighters' ? target.id : null,
        launcher: s.id, orbit: 0
      });
      Snd.torp();
      Rend.fx.ring(s.x, s.y, 26, 'rgba(126,232,247,.6)');
      if (w.craft === 'bombers') Game.log(s.name + ' — BOMBERS AWAY (' + w.salvo + ' craft, vectoring on ' + target.name + ')', '#ffb454');
      else Game.log(s.name + ' — fighter screen launched, flying cover for ' + target.name, '#7ce8f7');
      return;
    }

    // direct fire: roll the dice pool
    const isLance = w.type === 'lance';
    const rolls = [];
    let hits = 0;
    for (let i = 0; i < sol.dice; i++) {
      const r = U.rand(1, 6);
      rolls.push(r);
      if (r >= sol.need) hits++;
    }
    const diceStr = sol.dice + 'd6 [' + rolls.join(' ') + '] need ' + sol.need + '+';
    const human = s.side === 'player';
    if (isLance) {
      Snd.laser();
      for (let i = 0; i < sol.dice; i++) Rend.fx.beam(s, target, rolls[i] >= sol.need, human ? '#7ce8f7' : '#ff7a72', human);
    } else {
      // human ships' main broadside cannons use the recorded broadside track
      if (human) Snd.broadside();
      else { Snd.cannon(); if (sol.dice >= 6) Snd.cannon(); }
      Rend.fx.volley(s, target, rolls.map(r => r >= sol.need), human ? '#ffd9a0' : '#ff9a92', human);
    }
    if (hits === 0) {
      Game.log(s.name + ' ' + w.name + ' → ' + target.name + ' — MISSES · ' + diceStr, '#5c7089');
      return;
    }
    let absorbed = 0;
    if (sol.sArc !== 'A' && target.sys['SHIELD EMITTER'] < 2) {
      absorbed = Math.min(hits, target.sh[sol.sArc]);
      if (absorbed > 0) {
        target.sh[sol.sArc] -= absorbed;
        target.tookFire = true;
        hits -= absorbed;
        Snd.shield();
        Rend.fx.shieldFlash(target, sol.sArc);
      }
    }
    if (hits <= 0) {
      Game.log(s.name + ' ' + w.name + ' → ' + target.name + ' — ' + absorbed + ' hit' + (absorbed > 1 ? 's' : '') +
        ', all absorbed by ' + (sol.sArc === 'F' ? 'fore' : 'side') + ' shield · ' + diceStr, '#7ba8b8');
      return;
    }
    const dmg = hits * sol.dmgPer;
    Game.applyDamage(target, dmg, {
      shooter: s, shooterRef: s, sol, wname: w.name, hits, absorbed, diceStr
    });
  },

  applyDamage(target, dmg, opts) {
    const b = Game.b;
    const sol = opts.sol || {};
    if (target.order && target.order.brace) {
      dmg = Math.ceil(dmg / 2);
    }
    target.hull -= dmg;
    target.tookFire = true;
    if (opts.shooterRef) target.lastHitBy = opts.shooterRef.id;
    Snd.hit();
    Rend.fx.spark(target.x, target.y, target.side === 'enemy' ? '#ffd9a0' : '#ff9a92', 14);
    Rend.fx.floater(target.x, target.y - target.h / 2 - 14, '-' + dmg, sol.stern ? '#ff8a84' : '#e8c9a0');
    Rend.shake(Math.min(9, 2 + dmg));
    const braced = target.order && target.order.brace ? ' (braced)' : '';
    if (opts.shooter) {
      Game.log(opts.shooter.name + ' ' + (opts.wname || '') + ' hits ' + target.name + (sol.stern ? ' STERN' : '') +
        ' — ' + (opts.hits ? opts.hits + ' hit' + (opts.hits > 1 ? 's' : '') + (opts.absorbed ? ' (' + opts.absorbed + ' shielded)' : '') + ' · ' : '') +
        dmg + ' hull' + braced + (opts.diceStr ? ' · ' + opts.diceStr : ''), '#e8c9a0');
    }
    // critical roll — one per damaging volley; stern shots and massed volleys find seams
    const die = U.rand(1, 6);
    let need = sol.stern ? 5 : 6;
    if ((opts.hits || 0) >= 4) need = Math.max(4, need - 1);
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
    // kill credit & XP
    const credit = target.lastHitBy ? Game.ship(target.lastHitBy) : null;
    if (credit && credit.side === 'player' && target.side === 'enemy') {
      credit.kills++;
      credit.xpEarned += Math.max(3, Math.round(target.pts / 10));
    }
    if (target.side === 'enemy') b.killPts += target.pts;
    // hulk or fireball? big overkill vaporizes; otherwise she may break and drift
    const big = target.r > 60;
    if (target.side === 'enemy' && !target.exited && U.rand(1, 6) >= 4) {
      target.hulked = true;
      target.sh = { F: 0, S: 0, A: 0 };
      target.fires = Math.max(1, target.fires);
      Snd.shipDestroyed(false);
      Rend.fx.boom(target.x, target.y, false);
      Rend.shake(8);
      Game.log('✸ ' + target.name + ' breaks — a drifting hulk, ripe for boarding', '#ffd465', { big: true });
    } else {
      Snd.shipDestroyed(big);
      Rend.fx.boom(target.x, target.y, big);
      Rend.shake(big ? 16 : 10);
      Game.log('✸ ' + target.name + ' DESTROYED', target.side === 'enemy' ? '#6fe0a8' : '#ff6159', { big: true });
      // a burning magazine may cook off and hammer everything nearby
      if (U.rand(1, 6) + (target.fires > 0 ? 1 : 0) >= 6) Game.magazineDetonation(target);
    }
    if (target.vip && b.stats) b.stats.vipKillTurn = b.turn;
    if (b.sel === target.id) b.sel = null;
    if (b.inspect === target.id) b.inspect = null;
    // the flagship dying breaks the whole line
    if (target.vip && target.side === 'enemy') {
      b.ships.filter(x => x.side === 'enemy' && x.alive && !x.exited && !x.vip)
        .forEach(x => Game.routShip(x, 'the flagship is gone'));
    }
  },

  magazineDetonation(target) {
    const b = Game.b;
    Game.log('✹ MAGAZINE DETONATION — ' + target.name + "'s munitions cook off", '#ff8a5c', { big: true });
    Snd.explosion(true);
    Rend.fx.boom(target.x, target.y, true);
    Rend.fx.ring(target.x, target.y, target.r + 140, 'rgba(255,138,92,.75)');
    Rend.shake(18);
    const radius = target.r + 120;
    Game.active(b).slice().forEach(s => {
      if (s.id === target.id) return;
      if (U.dist(s, target) > radius) return;
      const dmg = U.rand(2, 5);
      Game.log('Blast wave hammers ' + s.name + ' — ' + dmg + ' hull', '#ff8a5c');
      Game.applyDamage(s, dmg, { quiet: true, sol: { stern: true } });
    });
  },

  resolveTorpedoStrike(tp, target) {
    const b = Game.b;
    let torps = tp.count;
    let shot = 0;
    for (let i = 0; i < target.turrets && torps > 0; i++) {
      if (U.rand(1, 6) >= 4) { torps--; shot++; }
    }
    if (shot > 0) {
      Rend.fx.spark(tp.x, tp.y, '#ffd9a0', 8);
      Game.log(target.name + ' point defense — ' + shot + ' torpedo' + (shot > 1 ? 'es' : '') + ' shot down', '#7ba8b8');
    }
    if (torps > 0 && target.order && target.order.evade) {
      let dodged = 0;
      for (let i = 0; i < torps; i++) if (U.random() < 0.35) dodged++;
      torps -= dodged;
      if (dodged > 0) Game.log(target.name + ' evasive pattern — ' + dodged + ' torpedo' + (dodged > 1 ? 'es' : '') + ' run wide', '#7ba8b8');
    }
    if (torps <= 0) {
      Game.log(target.name + ' rides out the salvo untouched', '#7ba8b8');
      return;
    }
    Snd.torpBoom();
    Rend.fx.boom(tp.x, tp.y, false);
    Rend.shake(12);
    const launcher = Game.ship(tp.launcher);
    for (let i = 0; i < torps; i++) {
      if (!target.alive) break;
      const die = U.rand(1, 6);
      const dmg = Math.max(2, die);
      Game.log('Torpedo strikes ' + target.name + ' — D6 [' + die + '] · ' + dmg + ' hull (shields bypassed)', '#ffb454');
      Game.applyDamage(target, dmg, { sol: { stern: true }, quiet: true, shooterRef: launcher });
    }
  },

  finishAnim() {
    const b = Game.b;
    // asteroid transit damage: sample the actual flight arc before finalizing
    Game.active(b).forEach(s => {
      if (!s.animFrom || !s.plot) return;
      const from = s.animFrom, to = s.plot;
      const path = U.sampleCurve(from, to, 18);
      const grazed = b.terrain.some(a => a.type === 'ast' &&
        path.some(p => Math.hypot(a.x - p.x, a.y - p.y) < a.r));
      if (grazed) {
        const dmg = U.rand(1, 3);
        s.hull -= dmg;
        Rend.fx.spark(to.x, to.y, '#c8b89a', 12);
        Rend.fx.floater(to.x, to.y - s.h / 2 - 14, '-' + dmg + ' ROCKS', '#c8b89a');
        if (s.side === 'player') b.stats.playerTransits++;
        Game.log(s.name + ' grinds through the asteroid shoal — ' + dmg + ' hull', '#c8b89a');
        if (s.hull <= 0) Game.killShip(s);
      }
    });
    // finalize ship positions
    Game.active(b).forEach(s => {
      if (s.plot) { s.x = s.plot.x; s.y = s.plot.y; s.angle = s.plot.angle; }
      s.animFrom = null;
      s.animCurve = null;
    });
    // exits (convoy / fleeing vip / routed ships)
    const WW = DATA.WORLD.w, HH = DATA.WORLD.h;
    Game.active(b).forEach(s => {
      if ((s.role === 'convoy' || s.role === 'flee') && s.x > WW - 60) {
        s.exited = true;
        if (s.side === 'enemy') b.stats.enemyEscaped++;
        Game.log((s.side === 'enemy' ? '⚠ ' : '★ ') + s.name + ' has left the field', s.side === 'enemy' ? '#ff8a84' : '#6fe0a8', { big: true });
      } else if (s.routing && (s.x < 70 || s.x > WW - 70 || s.y < 70 || s.y > HH - 70)) {
        s.exited = true;
        if (s.side === 'enemy') b.stats.enemyEscaped++;
        Game.log('⚑ ' + s.name + ' disengages from the field', '#8ba0b8');
      }
      s.plot = null; s.plotted = false;
    });
    // craft/torps arrive
    b.craft.forEach(c => { c.x = c.to ? c.to.x : c.x; c.y = c.to ? c.to.y : c.y; });
    b.torps.forEach(tp => { tp.x = tp.to.x; tp.y = tp.to.y; });
    // fighters sweep first, then ordnance lands
    Game.resolveDogfights(b);
    b.torps.forEach(tp => {
      if (tp.expired && tp.count <= 0) return; // swept by fighters
      if (tp.strike && !tp.expired) {
        const target = Game.ship(tp.strike);
        if (target && target.alive && !target.exited) Game.resolveTorpedoStrike(tp, target);
        tp.expired = true;
      } else if (tp.splashAst && !tp.expired) {
        Rend.fx.boom(tp.x, tp.y, false);
        Game.log('Torpedo salvo detonates in the asteroid shoal', '#5c7089');
        tp.expired = true;
      } else if (tp.expired) {
        Rend.fx.ring(tp.x, tp.y, 26, 'rgba(120,180,220,.5)');
        Game.log('Torpedo salvo runs dry and self-destructs', '#5c7089');
      }
    });
    b.torps = b.torps.filter(tp => !tp.expired);
    b.craft.forEach(c => {
      if (c.expired) return;
      if (c.strike && c.count > 0) {
        Game.resolveBomberStrike(b, c);
        c.expired = true;
      } else if (c.fuel <= 0) {
        c.expired = true;
        Game.log((c.kind === 'bombers' ? 'Bomber wave' : 'Fighter screen') + ' runs dry and turns for home', '#5c7089');
      }
    });
    b.craft = b.craft.filter(c => !c.expired && c.count > 0);

    if (Game.checkEnd()) return;
    b.phase = 'fire';
    b.sel = null;
    const first = Game.playerShips(b).find(s => s.weapons.some(w => w.reload === 0));
    b.sel = first ? first.id : (Game.playerShips(b)[0] || {}).id || null;
    b.armed = null;
    Game.log('— TURN ' + U.padTurn(b.turn) + ' · FIRING —', '#ffb454');
    if (window.UI) UI.refresh();
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
    const crewUpg = Game.mode === 'campaign' && Game.save.upgrades.crews;
    Game.active(b).forEach(s => {
      if (s.fires > 0) {
        const burn = s.fires;
        s.hull -= burn;
        Game.log('Fires burn aboard ' + s.name + ' — ' + burn + ' hull', '#ff8a84');
        Rend.fx.floater(s.x, s.y - s.h / 2 - 14, '-' + burn + ' FIRE', '#ff8a84');
        if (s.hull <= 0) { Game.killShip(s); return; }
        let out = 0, spread = 0;
        for (let i = 0; i < s.fires; i++) {
          const die = U.rand(1, 6);
          if (die >= 4) out++;
          else if (die === 1) spread++; // a botched containment roll feeds the blaze
        }
        s.fires = s.fires - out + spread;
        if (out > 0) Game.log(s.name + ' damage crews contain ' + out + ' fire' + (out > 1 ? 's' : ''), '#6fe0a8');
        if (spread > 0) Game.log('⚠ Fire spreads through ' + s.name + ' — now burning ×' + s.fires, '#ff8a84');
      }
      // repairs (veteran crews or ELITE rank: 4+)
      const tgt = (s.side === 'player' && (crewUpg || s.rank >= 3)) ? 4 : 5;
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
      s.boarded = false;
      s.weapons.forEach(w => { if (w.reload > 0) w.reload--; w.target = null; });
      s.order = null;
    });

    Game.checkMorale(b);
    if (Game.checkEnd()) return;
    b.turn++;
    b.phase = 'move';
    b.armed = null; b.hover = null; b.inspect = null; b.boardMode = null;
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
      Snd.victory();
      if (window.UI) UI.onBattleEnd(true);
      return true;
    }
    return false;
  },

  earnings() {
    const b = Game.b;
    const base = (b.banner && b.banner.win ? (b.mission.reward || 0) : 0) + Math.round(b.killPts * 0.5);
    return Math.round(base * Game.diff().reqMul);
  },

  /* Apply XP / permadeath / prize results to the campaign fleet after a win.
     Returns a report for the debrief screen. */
  applyBattleResults() {
    const b = Game.b;
    const report = { gains: [], losses: [], prizes: [], salvage: 0 };
    if (Game.mode !== 'campaign' && Game.mode !== 'war') return report;
    if (!Game.save) return report;
    const newFleet = [];
    Game.save.fleet.forEach((f, i) => {
      const ship = b.ships.find(s => s.fleetRef === i);
      if (ship && !ship.alive) {
        report.losses.push(f.name);
        return; // permadeath — the Drift keeps what it takes
      }
      if (ship) {
        const before = Game.rankOf(f.xp);
        const gained = ship.xpEarned + 15;
        f.xp += gained;
        const after = Game.rankOf(f.xp);
        report.gains.push({ name: f.name, xp: gained, kills: ship.kills, rankUp: after > before ? DATA.RANKS[after].name : null });
      }
      newFleet.push(f);
    });
    // uncaptured enemy hulks: scavenger teams strip them for a little requisition
    Game.hulks(b).filter(h => !h.captured).forEach(h => { report.salvage += Math.round(h.pts * 0.2); });
    // captured hulks become prize choices on the debrief screen
    Game.hulks(b).filter(h => h.captured).forEach(h => {
      report.prizes.push({ cls: h.cls, name: h.name, pts: h.pts });
    });
    if (!newFleet.length) {
      newFleet.push({ cls: 'corvette', name: 'TAS REAVER II', xp: 0, refit: false });
      report.replacement = 'TAS REAVER II';
    }
    Game.save.fleet = newFleet;
    Game.save.req += report.salvage;
    return report;
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
        b.nextShotAt = now + 420 / Game.speed;
        if (window.UI) UI.refresh();
      }
      if (!b.queue.length && b.phase === 'firing') {
        b.phase = 'firewait';
        b.fireDoneAt = now + 500 / Game.speed;
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
    if (s.role === 'flee' && b.turn >= (s.runTurn || 3)) {
      return { pt: { x: W + 160, y: s.y + U.frand(-40, 40) }, face: 0 };
    }
    if (s.role === 'rout') {
      // run for the nearest map edge
      const H = DATA.WORLD.h;
      const exits = [{ x: -160, y: s.y }, { x: W + 160, y: s.y }, { x: s.x, y: -160 }, { x: s.x, y: H + 160 }];
      const pt = exits.sort((a, z) => U.dist(s, a) - U.dist(s, z))[0];
      return { pt, face: U.angleTo(s, pt) };
    }
    if (s.role === 'guard') {
      // a defended outpost holds station and keeps its bows to the enemy
      return { pt: { x: s.x, y: s.y }, face: target ? U.angleTo(s, target) : s.angle };
    }
    if (!target) return { pt: { x: s.x, y: s.y }, face: s.angle };
    const dToT = U.angleTo(s, target);
    const hasSide = s.weapons.some(w => (w.arc === 'side' || w.arc === 'port' || w.arc === 'starboard') && w.type !== 'torp' && w.type !== 'bay');
    const gunRanges = s.weapons.filter(w => w.type === 'lance' || w.type === 'battery').map(w => w.range);
    const mainRange = Math.max(...(gunRanges.length ? gunRanges : [250]), 250);
    const d = U.dist(s, target);
    const rad = dToT * U.D2R;

    if (s.role === 'carrier') {
      // stand off beyond gun range and let the bombers work —
      // but a carrier pinned against the map edge turns and fights
      const cornered = (s.x < 180 || s.x > W - 180 || s.y < 180 || s.y > DATA.WORLD.h - 180) && d < 450;
      const keep = cornered ? 300 : 720;
      const pt = d < keep
        ? { x: s.x - Math.cos(rad) * (keep - d), y: s.y - Math.sin(rad) * (keep - d) }
        : { x: s.x, y: s.y };
      let face = dToT;
      if (hasSide) {
        const a1 = dToT + 90, a2 = dToT - 90;
        face = Math.abs(U.norm180(a1 - s.angle)) < Math.abs(U.norm180(a2 - s.angle)) ? a1 : a2;
      }
      return { pt, face };
    }
    if (s.role === 'raider') {
      const trad = target.angle * U.D2R;
      const pt = { x: target.x - Math.cos(trad) * (target.r + 170), y: target.y - Math.sin(trad) * (target.r + 170) };
      return { pt, face: U.angleTo({ x: pt.x, y: pt.y }, target) };
    }
    if (s.role === 'sniper') {
      const keep = mainRange * 0.75;
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
    // brawler / hunter
    const keep = Math.min(mainRange * 0.6, 260);
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
    if (s.role === 'guard') return find('hold');
    if (s.role === 'flee' && b.turn >= (s.runTurn || 3)) return find('full');
    if (s.role === 'rout') {
      const turnNeeded = Math.abs(U.norm180(U.angleTo(s, want.pt) - s.angle));
      return turnNeeded < 25 ? find('full') : find('heading');
    }
    const torpNear = b.torps.some(tp => tp.side !== s.side && U.dist(tp, s) < tp.speed * 1.4);
    if (torpNear && s.hull < s.maxHull * 0.6 && orders.some(o => o.id === 'brace') && U.random() < 0.5) return find('brace');
    if (s.hull < s.maxHull * 0.35 && orders.some(o => o.id === 'evasive')) return find('evasive');
    const d = U.dist(s, want.pt);
    if (d > Game.effSpeed(s) * 1.2) {
      const turnNeeded = Math.abs(U.norm180(U.angleTo(s, want.pt) - s.angle));
      if (turnNeeded < 25) return find('full');
    }
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
    for (let t = travel; t >= 0; t -= 10) {
      const px = s.x + Math.cos(rad) * t, py = s.y + Math.sin(rad) * t;
      const inAst = b.terrain.some(a => a.type === 'ast' && Math.hypot(a.x - px, a.y - py) < a.r + 24);
      if (!inAst) { travel = t; break; }
      if (t < 10) travel = 0;
    }
    const escaping = s.role === 'flee' || s.role === 'convoy' || s.role === 'rout';
    const nx = U.clamp(s.x + Math.cos(rad) * travel, s.role === 'rout' ? -200 : 40, DATA.WORLD.w + (escaping ? 200 : -40));
    const ny = U.clamp(s.y + Math.sin(rad) * travel, s.role === 'rout' ? -200 : 40, DATA.WORLD.h + (s.role === 'rout' ? 200 : -40));
    const pos = { x: nx, y: ny };
    const face = U.clampFacing(want.face, s.angle, pos, o.maxTurn, s);
    s.plot = { x: pos.x, y: pos.y, angle: face };
    s.plotted = true;
  },

  assignFire(s, b) {
    const out = [];
    if (s.routing) return out; // running for the edge, guns silent
    if (s.sys['WEAPONS'] >= 2) {
      Game.log(s.name + ' — weapons offline, holds fire', '#5c7089');
      return out;
    }
    const foes = Game.active(b).filter(x => (s.side === 'enemy' ? x.side !== 'enemy' : x.side === 'enemy'));
    s.weapons.forEach((w, i) => {
      if (w.reload > 0) return;
      if (w.type === 'bay' && w.craft === 'fighters') {
        // carriers fly cover over their own flight deck
        if (!(s.order && s.order.brace)) out.push({ shooterId: s.id, wIdx: i, targetId: s.id });
        return;
      }
      let best = null, bestScore = -1;
      foes.forEach(f => {
        const sol = Game.solution(s, w, f);
        if (!sol.ok) return;
        let score;
        if (w.type === 'torp') score = 60;
        else if (w.type === 'bay') score = 70 - f.turrets * 5;
        else score = sol.exp * 12;
        if (s.role === 'hunter' && f.role === 'convoy' && foes.some(x => x.role === 'convoy')) score *= 3;
        if (f.id === b.aiFocus) score += 18; // concentrate on the fleet's chosen prey
        if (f.vip) score += 5;
        if (f.hull < f.maxHull * 0.4) score += 15;
        if (score > bestScore) { bestScore = score; best = f; }
      });
      if (w.type === 'torp' && best && U.dist(s, best) < 170) best = null;
      if (best) out.push({ shooterId: s.id, wIdx: i, targetId: best.id });
    });
    return out;
  },

  /* boarding parties: raid an adjacent player/ally ship, or scuttle a captured prize */
  maybeBoard(s, b) {
    if (s.boarded || s.routing || !s.alive || s.exited) return null;
    const targets = b.ships.filter(t =>
      t.id !== s.id && !t.exited &&
      ((t.alive && t.side !== 'enemy') || (t.hulked && t.captured)) &&
      U.dist(s, t) <= DATA.BOARD_RANGE);
    if (!targets.length) return null;
    targets.sort((a, z) => (a.hulked ? 1 : 0) - (z.hulked ? 1 : 0) || U.dist(s, a) - U.dist(s, z));
    if (U.random() < 0.7) return { type: 'board', shooterId: s.id, targetId: targets[0].id };
    return null;
  }
};

if (typeof window !== 'undefined') window.Game = Game;
if (typeof window !== 'undefined') window.AI = AI;
