/* Galactic Reaver — rules-engine tests. Run: node tests/rules.test.js */
'use strict';
const fs = require('fs');
const path = require('path');

/* ---- minimal browser shims so the game scripts load in Node ---- */
global.window = global;
global.performance = global.performance || { now: () => Date.now() };
global.localStorage = { getItem: () => null, setItem: () => { }, removeItem: () => { } };
global.requestAnimationFrame = () => { };

['js/util.js', 'js/data.js', 'js/sound.js', 'js/game.js', 'js/render.js'].forEach(f => {
  (0, eval)(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));
});

/* ---- tiny test harness ---- */
let passed = 0, failed = 0;
function ok(cond, name) {
  if (cond) { passed++; }
  else { failed++; console.error('  ✗ FAIL:', name); }
}
function eq(a, b, name) { ok(Object.is(a, b), name + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }
function near(a, b, tol, name) { ok(Math.abs(a - b) <= tol, name + ' (got ' + a + ', want ~' + b + ')'); }

/* ---- battle scaffolding ---- */
function freshBattle(ships) {
  Game.mode = 'skirmish';
  Game.skirmishDiff = 'normal';
  Game.b = {
    mission: { name: 'TEST', win: () => null, lose: () => null },
    turn: 1, phase: 'fire',
    ships, torps: [], craft: [], terrain: [],
    sel: null, plotStep: 'order', curOrder: null, ghost: null,
    armed: null, boardMode: null, hover: null, inspect: null,
    log: [], banner: null, queue: [], nextShotAt: 0, anim: null,
    killPts: 0,
    stats: { playerTransits: 0, vipKillTurn: 0, bomberHitsOnPlayer: 0, enemyEscaped: 0 }
  };
  return Game.b;
}
function mk(cls, side, x, y, angle, opts) {
  return Game.mkShip(cls, (side === 'player' ? 'VSS ' : 'DKV ') + 'TEST' + Math.floor(U.random() * 1e6), side, 'brawler', x, y, angle, opts);
}

/* ================= math ================= */
console.log('math');
eq(U.norm180(190), -170, 'norm180 wraps positive');
eq(U.norm180(-190), 170, 'norm180 wraps negative');
eq(U.norm180(180), -180, 'norm180 maps 180 to -180 (same heading)');
eq(U.arcOf(0), 'fore', 'arcOf dead ahead');
eq(U.arcOf(50), 'fore', 'arcOf fore edge');
eq(U.arcOf(90), 'side', 'arcOf abeam');
eq(U.arcOf(150), 'aft', 'arcOf astern');
const tgt = { x: 0, y: 0, angle: 0 };
eq(U.shieldArcHit(tgt, 100, 0), 'F', 'shield hit from ahead strikes fore');
eq(U.shieldArcHit(tgt, -100, 0), 'A', 'shield hit from astern strikes aft');
eq(U.shieldArcHit(tgt, 0, 100), 'S', 'shield hit from abeam strikes side');
{
  const start = { x: 0, y: 0 };
  const face = U.clampFacing(120, 0, { x: 100, y: 0 }, 45, start);
  ok(Math.abs(U.norm180(face - 0)) <= 45.001, 'clampFacing stays within ±45 of heading');
}

/* ================= movement curves ================= */
console.log('curves');
{
  const from = { x: 0, y: 0, angle: 0 }, to = { x: 200, y: 120, angle: 60 };
  const f = U.curveFn(from, to);
  const p0 = f(0), p1 = f(1);
  near(p0.x, 0, 0.01, 'curve starts at origin');
  near(p1.x, 200, 0.01, 'curve ends at destination x');
  near(p1.y, 120, 0.01, 'curve ends at destination y');
  near(U.norm180(p0.angle - 0), 0, 1, 'curve tangent starts on heading');
  near(U.norm180(p1.angle - 60), 0, 1, 'curve tangent ends on final facing');
}

/* ================= seeded RNG ================= */
console.log('rng');
{
  U.setSeed(1234);
  const a = [U.rand(1, 6), U.rand(1, 6), U.frand(0, 1)];
  U.setSeed(1234);
  const b = [U.rand(1, 6), U.rand(1, 6), U.frand(0, 1)];
  ok(a[0] === b[0] && a[1] === b[1] && a[2] === b[2], 'same seed → same sequence');
  U.setSeed(99);
  const counts = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 6000; i++) counts[U.rand(1, 6) - 1]++;
  ok(counts.every(c => c > 800 && c < 1200), 'd6 roughly uniform (' + counts.join(',') + ')');
  U.clearSeed();
}

/* ================= firing solutions ================= */
console.log('solutions');
{
  U.setSeed(7);
  const s = mk('corvette', 'player', 0, 0, 0);   // lance fore need 3, battery side need 4
  const e = mk('jackal', 'enemy', 300, 0, 180);
  freshBattle([s, e]);
  // the side battery is now split into PORT/STARBOARD broadsides; targets in this
  // block sit off the ship's starboard beam (facing +x, target at +y)
  const lance = s.weapons.find(w => w.type === 'lance');
  const battery = s.weapons.find(w => w.type === 'battery' && w.arc === 'starboard');
  const torp = s.weapons.find(w => w.type === 'torp');

  let sol = Game.solution(s, lance, e);
  ok(sol.ok, 'lance ahead in arc');
  eq(sol.need, 3, 'lance base to-hit 3+');

  sol = Game.solution(s, battery, e);
  ok(!sol.ok && sol.why === 'NOT IN BROADSIDE ARC', 'broadside cannot fire ahead');

  // move target abeam at 320 → starboard broadside arc, long range for a 350 battery
  e.x = 0; e.y = 320;
  sol = Game.solution(s, battery, e);
  ok(sol.ok, 'battery abeam in arc');
  eq(sol.need, 5, 'battery long-range penalty (4+ → 5+)');

  e.y = 100; // point-blank (< 0.35 * 350)
  sol = Game.solution(s, battery, e);
  eq(sol.need, 3, 'battery point-blank bonus (4+ → 3+)');

  // orders shift the dice
  e.y = 200;
  s.order = { accShift: -1, dodgeShift: 0 };       // hold & lock
  eq(Game.solution(s, battery, e).need, 3, 'HOLD & LOCK steadies guns');
  s.order = null;
  e.order = { accShift: 0, dodgeShift: 1 };        // target evading
  eq(Game.solution(s, battery, e).need, 5, 'evasive target is harder');
  e.order = null;

  // nebula conceals the target
  Game.b.terrain.push({ type: 'neb', x: e.x, y: e.y, r: 80 });
  eq(Game.solution(s, battery, e).need, 5, 'nebula hides the target');
  Game.b.terrain.length = 0;

  // asteroids block line of fire
  e.x = 400; e.y = 0;
  Game.b.terrain.push({ type: 'ast', x: 200, y: 0, r: 60 });
  ok(Game.solution(s, lance, e).why === 'LINE OF FIRE BLOCKED', 'asteroid blocks lances');
  ok(Game.solution(s, torp, e).ok, 'torpedoes ignore the rocks at launch');
  Game.b.terrain.length = 0;

  // out of range
  e.x = 5000;
  ok(Game.solution(s, lance, e).why === 'OUT OF RANGE', 'range limit enforced');

  // veterancy: VETERAN guns hit on −1
  const v = mk('corvette', 'player', 0, 0, 0, { xp: 100 });
  eq(v.rank, 2, 'xp 100 → VETERAN');
  freshBattle([v, e]);
  e.x = 300; e.y = 0;
  eq(Game.solution(v, v.weapons[0], e).need, 2, 'veteran lance hits on 2+');

  // difficulty: easy shifts enemy gunnery worse
  const foe = mk('ravager', 'enemy', 0, 300, -90);
  freshBattle([v, foe]);
  Game.skirmishDiff = 'easy';
  const easyNeed = Game.solution(foe, foe.weapons[0], v).need;
  Game.skirmishDiff = 'hard';
  const hardNeed = Game.solution(foe, foe.weapons[0], v).need;
  eq(easyNeed - hardNeed, 2, 'easy vs hard shifts enemy to-hit by 2');
  Game.skirmishDiff = 'normal';
}

/* ================= volley resolution ================= */
console.log('volleys');
{
  U.setSeed(42);
  const s = mk('lcruiser', 'player', 0, 0, 90);   // broadside ship facing "down"
  const e = mk('marauder', 'enemy', 300, 0, 180); // abeam of s
  freshBattle([s, e]);
  // e is off the ship's port beam; 9d6 base batteries are split + uprated to 11d6
  const gunsIdx = s.weapons.findIndex(w => w.type === 'battery' && w.arc === 'port');
  const guns = s.weapons[gunsIdx];
  const sol = Game.solution(s, guns, e);
  ok(sol.ok, 'broadside has solution');
  eq(guns.dice, 11, 'broadside uprated to 11d6 (9 base + 2)');
  const hull0 = e.hull, shF0 = e.sh.F;
  guns.target = e.id;
  Game.processShot({ shooterId: s.id, wIdx: gunsIdx, targetId: e.id });
  const absorbed = shF0 - e.sh.F;
  const dmg = hull0 - e.hull;
  ok(absorbed >= 0 && absorbed <= shF0, 'shields absorbed within capacity');
  ok(dmg >= 0, 'no negative damage');
  ok(absorbed + dmg > 0, 'seeded 11d6 volley connects');
  ok(Game.b.log.some(l => /11d6 \[/.test(l.t)), 'log shows the dice');

  // brace halves damage
  const braced = mk('marauder', 'enemy', 300, 0, 180);
  freshBattle([mk('lcruiser', 'player', 0, 0, 90), braced]);
  braced.order = { brace: true, accShift: 0, dodgeShift: 0 };
  braced.sh = { F: 0, S: 0, A: 0 };
  const h0 = braced.hull;
  Game.applyDamage(braced, 8, { quiet: true, sol: {} });
  eq(h0 - braced.hull, 4, 'brace halves an 8-damage volley');
}

/* ================= broadsides: port + starboard ================= */
console.log('broadsides');
{
  U.setSeed(11);
  const s = mk('lcruiser', 'player', 0, 0, 0);        // facing +x
  const portFoe = mk('jackal', 'enemy', 0, -300, 0);  // off the port beam (bearing -90)
  const stbdFoe = mk('jackal', 'enemy', 0, 300, 0);   // off the starboard beam (bearing +90)
  freshBattle([s, portFoe, stbdFoe]);
  const port = s.weapons.find(w => w.type === 'battery' && w.arc === 'port');
  const stbd = s.weapons.find(w => w.type === 'battery' && w.arc === 'starboard');
  ok(port && stbd, 'a broadside ship carries both a port and a starboard battery');
  ok(Game.solution(s, port, portFoe).ok, 'port broadside bears on the port foe');
  ok(!Game.solution(s, port, stbdFoe).ok, 'port broadside cannot reach the starboard foe');
  ok(Game.solution(s, stbd, stbdFoe).ok, 'starboard broadside bears on the starboard foe');
  // both broadsides can be laid on a target in the same turn — one per flank
  port.target = portFoe.id; stbd.target = stbdFoe.id;
  ok(port.target && stbd.target && port.target !== stbd.target, 'both broadsides engage, one per flank');
}

/* ================= free-aim torpedoes ================= */
console.log('free-aim torpedoes');
{
  const s = mk('corvette', 'player', 0, 0, 0);
  const e = mk('jackal', 'enemy', 0, 400, 0);   // abeam — outside the torp's fore arc
  freshBattle([s, e]);
  const tIdx = s.weapons.findIndex(w => w.type === 'torp');
  ok(!Game.solution(s, s.weapons[tIdx], e).ok, 'a locked torpedo shot abeam is refused (fore arc)');
  const aim = { x: 0, y: 400, free: true };
  s.weapons[tIdx].target = aim;
  const n0 = Game.b.torps.length;
  Game.processShot({ shooterId: s.id, wIdx: tIdx, targetId: aim });
  eq(Game.b.torps.length, n0 + 1, 'a free-aimed torpedo launches along any bearing');
  near(Game.b.torps[Game.b.torps.length - 1].angle, 90, 1, 'torpedo runs toward the free-aim point');
}

/* ================= helm orders ================= */
console.log('helm orders');
{
  const fast = mk('corvette', 'player', 0, 0, 0);     // nimble hull, maxTurn 90
  const orders = DATA.orders(fast);
  eq(orders.find(o => o.id === 'heading').maxTurn, 45, 'NEW HEADING caps a nimble hull at 45°');
  ok(orders.find(o => o.id === 'heading').minMove > 0, 'NEW HEADING forces some forward motion');
  ok(orders.find(o => o.id === 'about').maxTurn > 45, 'COME ABOUT still allows the hard turn');
}

/* ================= courier breaks on turn 1 ================= */
console.log('courier flees turn 1');
{
  const courier = Game.mkShip('jackal', 'DKV RUNNER', 'enemy', 'flee', 0, 0, 0, { vip: true, runTurn: 1 });
  eq(courier.runTurn, 1, 'the courier carries runTurn 1');
  const b = freshBattle([mk('corvette', 'player', 300, 0, 180), courier]);
  b.turn = 1;
  const want = AI.desired(courier, b, null);
  ok(want.pt.x > DATA.WORLD.w, 'on turn 1 the courier already runs for the far jump edge');
  eq(AI.chooseOrder(courier, b, want).id, 'full', 'courier goes ALL AHEAD FULL on turn 1');
  // a courier with no runTurn still holds until turn 3 (preserves THE HUNT)
  const vulture = Game.mkShip('marauder', 'DKV VULTURE', 'enemy', 'flee', 0, 0, 0, { vip: true });
  ok(!vulture.runTurn, 'a courier without runTurn defaults to the turn-3 break');
  const b2 = freshBattle([mk('corvette', 'player', 300, 0, 180), vulture]);
  b2.turn = 1;
  ok(AI.chooseOrder(vulture, b2, AI.desired(vulture, b2, null)).id !== 'full', 'default courier holds before turn 3');
}

/* ================= morale & routing ================= */
console.log('morale');
{
  const p = mk('corvette', 'player', 0, 0, 0);
  const e1 = mk('jackal', 'enemy', 500, 0, 180);
  const e2 = mk('jackal', 'enemy', 600, 0, 180);
  const b = freshBattle([p, e1, e2]);
  Game.routShip(e1, 'test');
  ok(e1.routing && e1.role === 'rout', 'routShip flags the ship');
  ok(!Game.sideDead(b, 'enemy'), 'one standing enemy keeps the fight on');
  Game.routShip(e2, 'test');
  ok(Game.sideDead(b, 'enemy'), 'battle ends when every enemy routs');
  // vip never routs
  const vip = mk('dreadmaw', 'enemy', 700, 0, 180, { vip: true });
  freshBattle([p, vip]);
  Game.routShip(vip, 'test');
  ok(!vip.routing, 'flagship refuses to rout');
}

/* ================= boarding ================= */
console.log('boarding');
{
  // elite crew (+3) captures a hulk on any die ≥ 2 — find a seed that rolls one
  let captured = false;
  for (let seed = 1; seed <= 10 && !captured; seed++) {
    U.setSeed(seed);
    const p = mk('corvette', 'player', 0, 0, 0, { xp: 200 });
    const h = mk('ravager', 'enemy', 80, 0, 0);
    h.alive = false; h.hulked = true;
    freshBattle([p, h]);
    Game.tryBoard(p, h);
    captured = h.captured;
  }
  ok(captured, 'elite crew captures a hulk within a few seeds');

  // out of range refuses
  U.setSeed(5);
  const p2 = mk('corvette', 'player', 0, 0, 0);
  const far = mk('ravager', 'enemy', 900, 0, 0);
  freshBattle([p2, far]);
  const before = p2.boarded;
  Game.tryBoard(p2, far);
  ok(!p2.boarded && !before, 'boarding out of range does not commit parties');
}

/* ================= magazine detonation ================= */
console.log('magazine');
{
  U.setSeed(3);
  const a = mk('marauder', 'enemy', 0, 0, 0);
  const near1 = mk('jackal', 'enemy', 90, 0, 0);
  const far1 = mk('jackal', 'enemy', 1200, 0, 0);
  freshBattle([mk('corvette', 'player', 0, 900, 0), a, near1, far1]);
  const h0 = near1.hull, f0 = far1.hull;
  Game.magazineDetonation(a);
  ok(near1.hull < h0, 'blast wave damages adjacent ship');
  eq(far1.hull, f0, 'blast wave spares distant ship');
}

/* ================= end conditions & bonus objectives ================= */
console.log('objectives');
{
  const m = DATA.MISSION_DEFS.m_anvil;
  const p = mk('corvette', 'player', 0, 0, 0);
  const b = freshBattle([p]);
  ok(m.bonus.check(b), 'ROCK HOPPER passes with no transits');
  b.stats.playerTransits = 1;
  ok(!m.bonus.check(b), 'ROCK HOPPER fails after grinding the rocks');
  const m4 = DATA.MISSION_DEFS.m_hunt;
  b.stats.vipKillTurn = 4;
  ok(m4.bonus.check(b), 'SWIFT EXECUTION passes on turn 4');
  b.stats.vipKillTurn = 6;
  ok(!m4.bonus.check(b), 'SWIFT EXECUTION fails on turn 6');
}

/* ================= procedural mission generator (P0) ================= */
console.log('generator');
{
  Game.save = Game.freshSave();
  const ctx = { factionId: 'crimson', archetypeId: 'decap', tierId: 'hard',
    planet: { name: 'Bloodmoon Hold', type: 'Rocky' }, system: { name: "REAVER'S LANDING" },
    seed: 4242, playerFleetPts: 400 };
  const a = Game.generateMission(ctx);
  const b = Game.generateMission(ctx);
  const sig = m => m.enemies.map(e => e.cls + ':' + e.name + ':' + e.vip).join('|');
  eq(sig(a), sig(b), 'same seed → identical enemy order of battle');
  eq(U._rng, null, 'generator restores unseeded RNG for the battle');
  eq(a.terrain, 'heavy', 'Rocky planet → heavy terrain');

  // every faction × archetype × tier yields a valid, launchable mission
  let allValid = true, vipOk = true, allyOk = true;
  let n = 0;
  DATA.enemyFactions().forEach(fid => DATA.MISSION_ARCHETYPES.forEach(arch => DATA.MISSION_TIERS.forEach(t => {
    const m = Game.generateMission({ factionId: fid, archetypeId: arch.id, tierId: t.id,
      planet: { name: 'Testworld', type: 'Ice' }, system: { name: 'TEST' }, seed: ++n, playerFleetPts: 350 });
    if (!m.enemies.length || typeof m.win !== 'function' || typeof m.lose !== 'function') allValid = false;
    if (m.enemies.some(e => !DATA.CLASSES[e.cls])) allValid = false;
    if (arch.vip && !m.enemies.some(e => e.vip)) vipOk = false;
    if (arch.ally && !(m.allies && m.allies.length)) allyOk = false;
  })));
  ok(allValid, 'all ' + n + ' faction×archetype×tier missions are valid');
  ok(vipOk, 'every VIP archetype spawns a priority target');
  ok(allyOk, 'every ally archetype spawns a protected ship');

  // tier scales the enemy fleet up
  const pts = m => m.enemies.reduce((s, e) => s + DATA.CLASSES[e.cls].pts, 0);
  const easy = Game.generateMission({ factionId: 'zaargon', archetypeId: 'assault', tierId: 'easy', seed: 9, playerFleetPts: 400 });
  const vh = Game.generateMission({ factionId: 'zaargon', archetypeId: 'assault', tierId: 'veryhard', seed: 9, playerFleetPts: 400 });
  ok(pts(vh) > pts(easy), 'VERY HARD fields more enemy points than EASY');

  // faction fleets only draw from their own pool
  const hive = Game.generateMission({ factionId: 'hive', archetypeId: 'patrol', tierId: 'medium', seed: 5, playerFleetPts: 500 });
  ok(hive.enemies.every(e => DATA.FACTIONS.hive.pool.includes(e.cls)), 'Hive mission fields only Hive hulls');
  Game.mode = 'skirmish'; Game.b = null;
}

/* ================= galaxy & the war (P1) ================= */
console.log('galaxy & war');
{
  Game.mode = 'war';
  Game.save = Game.freshSave();
  Game.galaxyInit(Game.save);
  eq(Game.systemOwner('aegis'), 'terran', 'Aegis Prime starts Terran');
  eq(Game.systemOwner('centauri'), 'zaargon', "Centauri Gate starts Za'Argon");
  ok(Game.isEngageable('centauri'), "Za'Argon system bordering Terran is engageable");
  ok(Game.isEngageable('elytra'), 'Elytra Junction bordering Terran is engageable');
  ok(!Game.isEngageable('dreadfall'), 'deep Crimson capital is not engageable at the start');
  ok(!Game.isEngageable('aegis'), 'a Terran-held system is not engageable');

  const planets = Game.systemPlanets('reavers');
  ok(planets.length >= 2 && planets.length <= 4, 'a system holds 2 to 4 planets');
  eq(Game.systemPlanets('centauri').length, 4, 'a capital system holds a full four planets');
  eq(planets[0].anchor, 'm_first', "Reaver's Landing planet 1 anchors FIRST BLOOD");
  eq(Game.systemPlanets('dreadfall')[0].anchor, 'm_dreadmaw', 'Dreadfall planet 1 anchors the DREADMAW finale');
  eq(Game.systemPlanets('ulvor')[0].anchor, 'm_hive', "Ul'Vor Broodworld anchors THE HIVE");
  eq(planets[1].name, Game.systemPlanets('reavers')[1].name, 'planet layout is deterministic');

  Game.save.galaxy.cleared['centauri'] = [0, 1, 2, 3];
  ok(Game.isSystemTaken('centauri'), 'four cleared planets = system taken');

  // a front can be lost: a faction hemmed in by Terran space must attack it
  {
    const g = Game.save.galaxy;
    Object.keys(g.owner).forEach(id => g.owner[id] = 'terran');
    g.owner['dreadfall'] = 'crimson';   // borders reavers + bloodmoon, both Terran now
    g.siege = {}; g.siegeBy = {};
    let terranLost = false;
    for (let i = 0; i < 40 && !terranLost; i++) {
      const flips = Game.warTick(false);
      if (flips.some(f => f.from === 'terran')) terranLost = true;
    }
    ok(terranLost, 'the front can be lost — sustained pressure flips a Terran frontier system');
    eq(Game.systemOwner('aegis'), 'terran', 'the Terran capital never falls to siege');
  }
  Game.mode = 'skirmish'; Game.save = null; Game.warContext = null;
}

/* ================= boss finales & gating (P2) ================= */
console.log('finales & gating');
{
  Game.mode = 'war';
  Game.save = Game.freshSave();
  Game.galaxyInit(Game.save);

  // authored boss anchors are the finale
  const dread = Game.systemPlanets('dreadfall');
  eq(dread.filter(p => p.finale).length, 1, 'a system has exactly one finale');
  ok(dread[0].finale, 'Dreadfall finale is the DREADMAW anchor (planet 1)');
  ok(Game.systemPlanets('ulvor')[0].finale, "Ul'Vor finale is THE HIVE anchor");

  // a generated boss finale for a system with no boss anchor
  const cen = Game.systemPlanets('centauri');
  const fin = cen.find(p => p.finale);
  ok(fin && fin.generatedBoss, "Centauri (no boss anchor) gets a generated boss finale");
  eq(fin.archetype, 'decap', 'a generated finale is a decapitation');
  ok(!!fin.commander, "the Za'Argon finale names a commander");
  ok(DATA.COMMANDERS.zaargon.includes(fin.commander), 'commander comes from the faction pool');

  // the finale is locked until the other planets are cleared
  const fi = cen.findIndex(p => p.finale);
  ok(Game.isPlanetLocked('centauri', fi), 'finale starts locked');
  const others = [0, 1, 2, 3].filter(i => i !== fi);
  Game.save.galaxy.cleared['centauri'] = others.slice(0, 2);
  ok(Game.isPlanetLocked('centauri', fi), 'finale still locked with planets remaining');
  Game.save.galaxy.cleared['centauri'] = others;
  // Phase D: the capital finale is also story-gated — worlds secured is necessary
  // but not sufficient; its act beat must resolve too
  ok(Game.isPlanetLocked('centauri', fi), 'the capital finale stays story-locked after the worlds fall');
  Game.save.story.done.push(DATA.FINALE_GATES['centauri'].beat);
  ok(!Game.isPlanetLocked('centauri', fi), 'finale unlocks once the worlds are secured AND the gate beat resolves');
  ok(!Game.isPlanetLocked('centauri', others[0]), 'non-finale planets are never locked');

  // the generated finale mission actually fields the flagship + commander
  const m = Game.generateMission({ factionId: 'zaargon', archetypeId: 'decap', tierId: 'hard',
    planet: { name: 'Centauri Gate V', type: 'Ice' }, system: { name: 'CENTAURI GATE' },
    seed: 77, playerFleetPts: 400, commander: 'EXARCH VORUN', finale: true });
  ok(m.finale, 'generated finale is flagged');
  ok(/SYSTEM FINALE/.test(m.name), 'finale mission is labelled');
  const boss = m.enemies.find(e => e.vip);
  ok(boss && boss.commander === 'EXARCH VORUN', 'the boss ship carries the commander');
  ok(m.briefing.some(b => b.includes('EXARCH VORUN')), 'the briefing names the commander');
  Game.mode = 'skirmish'; Game.save = null; Game.warContext = null;
}

/* ================= the living war (P3) ================= */
console.log('living war');
{
  Game.mode = 'war';
  Game.save = Game.freshSave();
  Game.galaxyInit(Game.save);

  // faction strength weights systems by type
  ok(Game.factionStrength('terran') > 0, 'Terran holds territory at the start');
  ok(Game.siegeThreshold('centauri') > Game.siegeThreshold('vxor'), 'a capital holds out longer than an outpost');

  // enemies fight each other, not only Terran — the whole galaxy shifts
  let enemyVsEnemy = false;
  for (let i = 0; i < 60 && !enemyVsEnemy; i++) {
    const flips = Game.warTick(false);
    if (flips.some(f => f.from !== 'terran' && f.faction !== 'terran')) enemyVsEnemy = true;
  }
  ok(enemyVsEnemy, 'enemy factions seize systems from each other (living galaxy)');
  ok(Game.save.galaxy.events.length > 0, 'war events are recorded for the feed');

  // player momentum relieves siege on Terran frontier systems
  Game.save = Game.freshSave();
  const g = Game.save.galaxy;
  g.siege['horizon'] = 3; g.siegeBy['horizon'] = 'zaargon';
  Game.warTick(true);   // a win should push the siege back
  ok((g.siege['horizon'] || 0) < 3, 'a Terran victory relieves siege on the frontier');

  // victory / defeat arcs
  Game.save = Game.freshSave();
  DATA.enemyCapitals().forEach(c => Game.save.galaxy.owner[c] = 'terran');
  eq(Game.warStatus(), 'win', 'holding all enemy capitals wins the war');
  Game.save = Game.freshSave();
  DATA.GALAXY.systems.forEach(s => { if (s.id !== DATA.TERRAN_CAPITAL) Game.save.galaxy.owner[s.id] = 'crimson'; });
  eq(Game.warStatus(), 'lose', 'reduced to the capital alone loses the war');

  ok(typeof Game.vossWarLine() === 'string' && Game.vossWarLine().length > 0, 'Voss reacts to the war state');

  // story framework: a beat surfaces, launches, completes, advances the chapter
  DATA.STORY.push({ id: 'test_beat', chapter: 1, title: 'TEST OPERATION', trigger: () => true });
  Game.save = Game.freshSave();
  // clear the authored spine so the injected beat is the one left to surface
  Game.save.story.done = DATA.STORY.filter(b => b.id !== 'test_beat').map(b => b.id);
  const avail = Game.storyBeatAvailable();
  ok(avail && avail.id === 'test_beat', 'an available story beat surfaces');
  Game.completeStoryBeat('test_beat');
  eq(Game.save.story.chapter, 1, 'completing a beat advances the chapter');
  ok(!Game.storyBeatAvailable(), 'a completed beat no longer surfaces');
  DATA.STORY.pop();

  Game.mode = 'skirmish'; Game.save = null; Game.warContext = null;
}

/* ================= story beats (P4) ================= */
console.log('story beats');
{
  Game.mode = 'war';
  // every authored beat is well-formed
  let wellFormed = true;
  DATA.STORY.forEach(b => {
    if (!b.id || !b.title || !b.type || typeof b.trigger !== 'function') wellFormed = false;
    if (b.type === 'op' && !b.mission) wellFormed = false;
    if (b.type === 'interstitial' && !(b.body && b.body.length)) wellFormed = false;
  });
  ok(wellFormed, 'all ' + DATA.STORY.length + ' story beats are well-formed');
  ok(DATA.STORY.some(b => b.id === 'sc_butcher') && DATA.STORY.some(b => b.id === 'sc_breakout'),
    'the authored spine is present');

  // at campaign start the prologue cold-open surfaces first thing
  Game.save = Game.freshSave();
  const opener = Game.storyBeatAvailable();
  ok(opener && opener.id === 'sc_prologue', 'the prologue surfaces at campaign start');

  // after the prologue + Act I card, the explicit orders briefing surfaces next
  Game.completeStoryBeat('sc_prologue');
  Game.completeStoryBeat('act_1');
  const orders = Game.storyBeatAvailable();
  ok(orders && orders.id === 'sc_orders', 'the Act I orders briefing surfaces after the act card');

  // then, with orders read, taking the first system surfaces the Act I opener op
  Game.completeStoryBeat('sc_orders');
  Game.save.galaxy.owner['centauri'] = 'terran';
  const first = Game.storyBeatAvailable();
  ok(first && first.id === 'sc_butcher', 'taking a system surfaces THE BUTCHER\'S TRAIL');

  // an op beat generates its mission with the authored name + briefing
  const m = Game.generateMission(Object.assign({ story: true, seed: 1, playerFleetPts: 300 }, first.mission));
  eq(m.name, "THE BUTCHER'S TRAIL", 'story op keeps its authored title');
  ok(m.briefing.some(b => b.includes('SKARR')), 'story op keeps its authored briefing');
  ok(m.enemies.every(e => DATA.FACTIONS.crimson.pool.includes(e.cls)), 'THE BUTCHER\'S TRAIL fields the Crimson Reach');

  // beats surface strictly in authored order, one at a time — none jumps ahead
  Game.save = Game.freshSave();
  DATA.GALAXY.systems.forEach(s => { if (s.owner !== 'terran') Game.save.galaxy.owner[s.id] = 'terran'; });
  // set the capture flags too, so the reactive capture-triggered beats also surface
  ['captured_reavers:0', 'captured_dreadfall:0', 'captured_ulvor:0'].forEach(f => Game.save.story.flags[f] = true);
  const seq = [];
  for (let guard = 0; guard < DATA.STORY.length + 3; guard++) {
    const b = Game.storyBeatAvailable();
    if (!b) break;
    seq.push(b.id);
    Game.completeStoryBeat(b.id);
  }
  eq(seq.join(','), DATA.STORY.map(b => b.id).join(','), 'all beats surface in authored order, one per step');
  eq(Game.save.story.chapter, 3, 'the final chapter is reached');

  Game.mode = 'skirmish'; Game.save = null; Game.warContext = null;
}

/* ================= capture events (P4 — Phase C) ================= */
console.log('capture events');
{
  // a minimal won-battle stub so applyWarResult's earnings/results calls resolve
  const stubWin = () => { Game.b = { banner: { win: true }, mission: { reward: 0 }, killPts: 0, ships: [] }; };

  Game.mode = 'war';
  Game.save = Game.freshSave();
  stubWin();

  // winning a planet writes a per-planet capture flag that a beat can trigger on
  Game.warContext = { sysId: 'reavers', planetIdx: 0, tierId: 'medium', anchor: 'm_first' };
  Game.applyWarResult(true);
  ok(Game.save.story.flags['captured_reavers:0'], 'clearing a planet writes its capture flag');
  const evb = DATA.STORY.find(b => b.id === 'ev_first_blood');
  ok(evb && evb.trigger(Game.save), 'the FIRST BLOOD capture beat now triggers');

  // taking every planet flips the system and writes the system-taken flag
  const n = Game.systemPlanetCount('reavers');
  for (let i = 1; i < n; i++) {
    stubWin();
    Game.warContext = { sysId: 'reavers', planetIdx: i, tierId: 'medium', anchor: null };
    Game.applyWarResult(true);
  }
  eq(Game.systemOwner('reavers'), 'terran', 'clearing every planet flips the system to Terran');
  ok(Game.save.story.flags['systaken_reavers'], 'taking a whole system writes its systaken flag');

  // the boss-kill capture beats trigger on their anchor planet flags
  Game.save.story.flags['captured_dreadfall:0'] = true;
  Game.save.story.flags['captured_ulvor:0'] = true;
  ok(DATA.STORY.find(b => b.id === 'ev_dreadmaw').trigger(Game.save), 'killing the DREADMAW triggers MERIDIAN AVENGED');
  ok(DATA.STORY.find(b => b.id === 'ev_hive_heart').trigger(Game.save), 'killing the Hive Heart triggers THE MIND GOES DARK');

  // a Hive-surge reaction fires when a Drift-central system is taken
  Game.save = Game.freshSave();
  const g2 = Game.save.galaxy;
  const en = Game.systemPlanetCount('elytra');
  let res;
  for (let i = 0; i < en; i++) {
    stubWin();
    Game.warContext = { sysId: 'elytra', planetIdx: i, tierId: 'medium', anchor: null };
    res = Game.applyWarResult(true);
  }
  eq(DATA.CAPTURE_REACTIONS['elytra'], 'hivesurge', 'Elytra Junction is flagged for a Hive surge');
  ok(res.hiveSurge && Object.values(g2.siegeBy).includes('hive'), 'taking Elytra surges the Hive against the frontier');

  Game.b = null; Game.mode = 'skirmish'; Game.save = null; Game.warContext = null;
}

/* ================= story gates on capital finales (P4 — Phase D) ================= */
console.log('finale gates');
{
  Game.mode = 'war';
  Game.save = Game.freshSave();

  // secure every non-finale world of the Za'Argon capital
  const planets = Game.systemPlanets('centauri');
  const finaleIdx = planets.findIndex(p => p.finale);
  ok(finaleIdx >= 0, 'the capital has a finale planet');
  Game.save.galaxy.cleared['centauri'] = planets.map((p, i) => i).filter(i => i !== finaleIdx);

  // the finale stays locked by its story gate even though the worlds are secured
  eq(Game.planetLockReason('centauri', finaleIdx), 'story', 'a capital finale is story-locked after its worlds fall');
  ok(Game.isPlanetLocked('centauri', finaleIdx), 'the story-gated finale reads as locked');

  // resolving the gate beat opens the throne
  Game.save.story.done.push(DATA.FINALE_GATES['centauri'].beat);
  eq(Game.planetLockReason('centauri', finaleIdx), null, 'resolving the gate beat unlocks the finale');
  ok(!Game.isPlanetLocked('centauri', finaleIdx), 'the unlocked finale reads as open');

  // a non-capital system finale is never story-gated
  const rp = Game.systemPlanets('reavers');
  const rf = rp.findIndex(p => p.finale);
  Game.save.galaxy.cleared['reavers'] = rp.map((p, i) => i).filter(i => i !== rf);
  eq(Game.planetLockReason('reavers', rf), null, 'a non-capital finale carries no story gate');

  Game.mode = 'skirmish'; Game.save = null;
}

U.clearSeed();
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
