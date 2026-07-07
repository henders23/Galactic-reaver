/* Galactic Reaver — static game data: hulls, weapons, orders, sector map, store */
'use strict';

const DATA = {};

DATA.WORLD = { w: 2000, h: 1300 };

/* ---------------- weapon templates ----------------
   type: 'lance' (beam), 'battery' (shells), 'torp' (ordnance salvo),
         'bay' (attack craft: craft = 'bombers' | 'fighters')
   arc:  'fore' | 'side' | 'any'
   Direct fire is a dice pool: roll `dice` D6, each die hits on `need`+,
   each hit deals `dmgPer` hull (shields absorb hits one-for-one).
   Lances hit on 3+ and ignore range penalties; batteries hit on 4+,
   suffer at long range and improve point-blank. */
DATA.weapon = (over) => Object.assign({
  name: 'BATTERY', type: 'battery', arc: 'side',
  range: 320, dice: 4, need: 4, dmgPer: 1,
  salvo: 0, reloadTime: 0, reload: 0, target: null
}, over);

/* ---------------- ship classes ---------------- */
DATA.CLASSES = {
  /* --- player hulls --- */
  corvette: {
    sprite: 'terran-2', cls: 'corvette', shape: 'blade', label: 'KESTREL-CLASS CORVETTE', short: 'CORVETTE',
    w: 110, h: 44, hull: 26, sh: { F: 2, S: 1, A: 1 },
    speed: 190, maxTurn: 90, turrets: 1, pts: 160,
    desc: 'Fast, agile line ship. Fore lance, side batteries, one torpedo tube.',
    weapons: [
      { name: 'LANCE BATTERY', type: 'lance', arc: 'fore', range: 470, dice: 3, need: 3, dmgPer: 2 },
      { name: 'FLANK BATTERIES', type: 'battery', arc: 'side', range: 350, dice: 5, need: 4, dmgPer: 1 },
      { name: 'MK-II TORPEDOES', type: 'torp', arc: 'fore', range: 620, salvo: 2, reloadTime: 2 }
    ]
  },
  frigate: {
    sprite: 'terran-3', cls: 'frigate', shape: 'blade', label: 'TEMPEST-CLASS FRIGATE', short: 'FRIGATE',
    w: 122, h: 48, hull: 34, sh: { F: 2, S: 2, A: 1 },
    speed: 165, maxTurn: 60, turrets: 2, pts: 220,
    desc: 'Tough gun platform. Heavy broadsides, light fore lance.',
    weapons: [
      { name: 'LIGHT LANCE', type: 'lance', arc: 'fore', range: 420, dice: 2, need: 3, dmgPer: 2 },
      { name: 'HEAVY BROADSIDE', type: 'battery', arc: 'side', range: 400, dice: 7, need: 4, dmgPer: 1 }
    ]
  },
  lcruiser: {
    sprite: 'terran-4', cls: 'lcruiser', shape: 'spine', label: 'RESOLUTE-CLASS LIGHT CRUISER', short: 'LT CRUISER',
    w: 150, h: 58, hull: 48, sh: { F: 3, S: 2, A: 1 },
    speed: 140, maxTurn: 45, turrets: 3, pts: 340,
    desc: 'Ship of the line. Lance decks, massed batteries, triple torpedo tubes.',
    weapons: [
      { name: 'LANCE DECK', type: 'lance', arc: 'side', range: 460, dice: 4, need: 3, dmgPer: 2 },
      { name: 'GUN BATTERIES', type: 'battery', arc: 'side', range: 420, dice: 9, need: 4, dmgPer: 1 },
      { name: 'TORPEDO TUBES', type: 'torp', arc: 'fore', range: 620, salvo: 3, reloadTime: 2 }
    ]
  },
  argus: {
    sprite: 'terran-5', cls: 'argus', shape: 'slab', label: 'ARGUS-CLASS ESCORT CARRIER', short: 'CARRIER',
    w: 162, h: 64, hull: 42, sh: { F: 2, S: 2, A: 1 },
    speed: 120, maxTurn: 30, turrets: 3, pts: 380,
    desc: 'Flight decks for bomber strikes and fighter cover. Keep her out of the brawl.',
    weapons: [
      { name: 'DEFENSE BATTERY', type: 'battery', arc: 'side', range: 330, dice: 4, need: 4, dmgPer: 1 },
      { name: 'BOMBER BAY', type: 'bay', craft: 'bombers', arc: 'any', range: 900, salvo: 3, reloadTime: 2 },
      { name: 'FIGHTER BAY', type: 'bay', craft: 'fighters', arc: 'any', range: 900, salvo: 3, reloadTime: 2 }
    ]
  },
  /* --- civilian --- */
  freighter: {
    sprite: 'zaargon-2', cls: 'freighter', shape: 'box', label: 'PELICAN-CLASS FREIGHTER', short: 'FREIGHTER',
    w: 130, h: 56, hull: 30, sh: { F: 1, S: 1, A: 1 },
    speed: 120, maxTurn: 30, turrets: 1, pts: 0,
    desc: 'Unarmed bulk hauler. Keep it alive.',
    weapons: []
  },
  /* --- Dominion hulls --- */
  jackal: {
    sprite: 'crimson-1', cls: 'jackal', shape: 'dart', label: 'JACKAL-CLASS ESCORT', short: 'ESCORT',
    w: 80, h: 34, hull: 13, sh: { F: 1, S: 0, A: 0 },
    speed: 230, maxTurn: 90, turrets: 1, pts: 90,
    desc: 'Fast attack craft. Weak alone, deadly in packs at your stern.',
    weapons: [
      { name: 'AUTOGUNS', type: 'battery', arc: 'fore', range: 300, dice: 3, need: 4, dmgPer: 1 }
    ]
  },
  ravager: {
    sprite: 'crimson-2', cls: 'ravager', shape: 'dart', label: 'RAVAGER-CLASS RAIDER', short: 'RAIDER',
    w: 120, h: 50, hull: 22, sh: { F: 1, S: 1, A: 0 },
    speed: 165, maxTurn: 45, turrets: 1, pts: 150,
    desc: 'Dominion raider. Closes fast and hammers with flak cannon.',
    weapons: [
      { name: 'FLAK CANNON', type: 'battery', arc: 'fore', range: 400, dice: 5, need: 4, dmgPer: 1 }
    ]
  },
  marauder: {
    sprite: 'crimson-3', cls: 'marauder', shape: 'spine', label: 'MARAUDER-CLASS DESTROYER', short: 'DESTROYER',
    w: 135, h: 54, hull: 32, sh: { F: 2, S: 1, A: 1 },
    speed: 145, maxTurn: 45, turrets: 2, pts: 250,
    desc: 'Destroyer with heavy broadsides and torpedo tubes.',
    weapons: [
      { name: 'HEAVY BATTERY', type: 'battery', arc: 'side', range: 410, dice: 7, need: 4, dmgPer: 1 },
      { name: 'TORPEDO TUBES', type: 'torp', arc: 'fore', range: 620, salvo: 2, reloadTime: 2 }
    ]
  },
  hive: {
    sprite: 'hive-4', cls: 'hive', shape: 'slab', label: 'HIVE-CLASS CARRIER', short: 'CARRIER',
    w: 168, h: 66, hull: 45, sh: { F: 2, S: 2, A: 1 },
    speed: 110, maxTurn: 30, turrets: 3, pts: 420,
    desc: 'Dominion carrier. Her bomber waves will grind a fleet down from beyond gun range.',
    weapons: [
      { name: 'DEFENSE FLAK', type: 'battery', arc: 'side', range: 330, dice: 5, need: 4, dmgPer: 1 },
      { name: 'BOMBER CELLS', type: 'bay', craft: 'bombers', arc: 'any', range: 900, salvo: 3, reloadTime: 1 },
      { name: 'FIGHTER CELLS', type: 'bay', craft: 'fighters', arc: 'any', range: 900, salvo: 3, reloadTime: 2 }
    ]
  },
  dreadmaw: {
    sprite: 'crimson-5', cls: 'dreadmaw', shape: 'spine', label: 'DREADMAW-CLASS HEAVY CRUISER', short: 'HEAVY CRUISER',
    w: 175, h: 66, hull: 60, sh: { F: 3, S: 2, A: 1 },
    speed: 110, maxTurn: 30, turrets: 4, pts: 500,
    desc: 'Dominion flagship of the Drift. Kill it and the line breaks.',
    weapons: [
      { name: 'LANCE SPINE', type: 'lance', arc: 'side', range: 480, dice: 4, need: 3, dmgPer: 2 },
      { name: 'MASS BATTERIES', type: 'battery', arc: 'side', range: 420, dice: 12, need: 4, dmgPer: 1 },
      { name: 'TORPEDO MAW', type: 'torp', arc: 'fore', range: 620, salvo: 3, reloadTime: 2 }
    ]
  }
};

/* ---------------- helm orders ----------------
   range/minMove computed from ship speed at battle time
   accShift: added to this ship's own to-hit numbers (+ is worse)
   dodgeShift: added to enemy to-hit numbers when firing at this ship */
DATA.orders = (ship) => {
  const spd = Game.effSpeed(ship);
  const brg = ship.sys['BRIDGE'];
  const all = [
    { id: 'heading', name: 'NEW HEADING', range: spd, minMove: 30, maxTurn: ship.maxTurn,
      desc: 'move · turn ≤' + ship.maxTurn + '°', accShift: 0, dodgeShift: 0 },
    { id: 'full', name: 'ALL AHEAD FULL', range: spd * 1.55, minMove: spd * 0.75, maxTurn: Math.min(22.5, ship.maxTurn),
      desc: 'long move · shallow turn · own guns hit on +1', accShift: 1, dodgeShift: 0 },
    { id: 'about', name: 'COME ABOUT', range: spd * 0.55, minMove: 0, maxTurn: 180,
      desc: 'short move · any facing', accShift: 0, dodgeShift: 0 },
    { id: 'evasive', name: 'EVASIVE PATTERN', range: spd * 0.8, minMove: 30, maxTurn: Math.min(45, ship.maxTurn),
      desc: 'enemies hit you on +1 · own guns +1 · dodges torpedoes', accShift: 1, dodgeShift: 1, evade: true },
    { id: 'hold', name: 'HOLD & LOCK', range: 0, minMove: 0, maxTurn: 0,
      desc: 'no move · own guns hit on −1 · easier to hit', accShift: -1, dodgeShift: -1 },
    { id: 'brace', name: 'BRACE FOR IMPACT', range: spd * 0.5, minMove: 0, maxTurn: Math.min(30, ship.maxTurn),
      desc: 'incoming dmg halved · own guns +2 · no torpedoes', accShift: 2, dodgeShift: 0, brace: true }
  ];
  if (brg >= 1) return all.filter(o => o.id === 'heading' || o.id === 'hold' || o.id === 'brace');
  return all;
};

/* ---------------- critical hits ---------------- */
DATA.SYS = ['WEAPONS', 'ENGINES', 'SHIELD EMITTER', 'BRIDGE'];
DATA.CRIT_TABLE = [
  { roll: 1, sys: 'WEAPONS' },
  { roll: 2, sys: 'ENGINES' },
  { roll: 3, sys: 'SHIELD EMITTER' },
  { roll: 4, sys: 'BRIDGE' },
  { roll: 5, sys: 'FIRE' },
  { roll: 6, sys: 'BREACH' }
];

/* ---------------- difficulty ---------------- */
DATA.DIFFS = [
  { id: 'easy', name: 'PATROL', enemyNeed: 1, morale: 0.5, reqMul: 1.25,
    desc: 'Dominion guns hit on +1 \u00b7 their morale breaks early \u00b7 +25% requisition' },
  { id: 'normal', name: 'LINE DUTY', enemyNeed: 0, morale: 0.4, reqMul: 1,
    desc: 'The war as it is' },
  { id: 'hard', name: 'FORLORN HOPE', enemyNeed: -1, morale: 0.3, reqMul: 0.8,
    desc: 'Dominion guns hit on \u22121 \u00b7 they fight nearly to the last \u00b7 \u221220% requisition' }
];
DATA.diffOf = (id) => DATA.DIFFS.find(d => d.id === id) || DATA.DIFFS[1];

/* ---------------- veterancy ---------------- */
DATA.RANKS = [
  { xp: 0, name: 'GREEN', chev: '', desc: '' },
  { xp: 40, name: 'SEASONED', chev: '›', desc: '+1 point-defense turret' },
  { xp: 100, name: 'VETERAN', chev: '››', desc: 'all guns hit on −1' },
  { xp: 200, name: 'ELITE', chev: '›››', desc: '+1 shields all facings · repairs on 4+' }
];

/* ---------------- boarding ---------------- */
DATA.BOARD_RANGE = 150;

/* ---------------- store ---------------- */
DATA.STORE_SHIPS = [
  { cls: 'frigate', cost: 220 },
  { cls: 'lcruiser', cost: 380 },
  { cls: 'argus', cost: 420 }
];
DATA.UPGRADES = [
  { id: 'uplink', name: 'TARGETING UPLINK', cost: 140, desc: 'All guns hit on −1 (e.g. 4+ becomes 3+), fleet-wide' },
  { id: 'shields', name: 'REINFORCED EMITTERS', cost: 120, desc: '+1 fore shield on every fleet ship' },
  { id: 'crews', name: 'VETERAN DAMAGE CREWS', cost: 100, desc: 'Repairs succeed on 4+ instead of 5+' }
];
DATA.refitCost = (cls) => Math.round(DATA.CLASSES[cls].pts * 0.45 / 10) * 10;
DATA.MAX_FLEET = 4;
DATA.SHIP_NAMES = ['VSS TEMPEST', 'VSS RESOLUTE', 'VSS ARGUS', 'VSS ORION', 'VSS DAUNTLESS', 'VSS HARRIER', 'VSS VIGIL', 'VSS SOVEREIGN'];

/* ---------------- ship livery (Starbase paint) ----------------
   Players can daub blue or yellow markings onto parts of a hull to tell their
   ships apart at a glance. Part geometry is in hull-fraction space shared by the
   canvas renderer and the DOM silhouettes: x runs 0 (stern) → 1 (nose),
   y runs 0 → 1 across the beam (0.5 = centreline). Each part is one or more
   polygons so the paint appears in the same spot on the sprite and the outline. */
DATA.LIVERY_PARTS = [
  { id: 'nose', name: 'NOSE', polys: [[[0.80, 0.34], [1.0, 0.5], [0.80, 0.66]]] },
  { id: 'spine', name: 'SPINE', polys: [[[0.18, 0.45], [0.74, 0.45], [0.74, 0.55], [0.18, 0.55]]] },
  { id: 'flanks', name: 'FLANKS', polys: [
    [[0.30, 0.10], [0.68, 0.10], [0.68, 0.23], [0.30, 0.23]],
    [[0.30, 0.77], [0.68, 0.77], [0.68, 0.90], [0.30, 0.90]]
  ] },
  { id: 'engines', name: 'ENGINES', polys: [[[0.0, 0.34], [0.16, 0.34], [0.16, 0.66], [0.0, 0.66]]] }
];
DATA.LIVERY_COLORS = { blue: '#4cd7ea', yellow: '#ffd465' };
/* click cycle for the paint UI */
DATA.LIVERY_CYCLE = { none: 'blue', blue: 'yellow', yellow: 'none' };
DATA.liveryPart = (id) => DATA.LIVERY_PARTS.find(p => p.id === id);

/* ---------------- missions ---------------- */
DATA.MISSION_DEFS = {
  m_first: {
    name: 'FIRST BLOOD', sub: 'KESSEL DRIFT · OUTER MARKER',
    briefing: [
      'Two Dominion raiders are picking apart the Kessel relay buoys.',
      'Voss: "Simple gunnery problem, Captain. Cross their bows, keep your stern out of their teeth, and put lances through anything flying a DKV transponder."',
      'OBJECTIVE — Destroy all hostile ships.'
    ],
    reward: 140,
    bonus: { desc: 'CLEAN SWEEP: end with every Terran Alliance ship above half hull', reward: 60,
      check: (b) => b.ships.filter(s => s.side === 'player').every(s => s.alive && s.hull > s.maxHull * 0.5) },
    terrain: 'light',
    playerSpawn: { x: 340, y: 680 },
    enemies: [
      { cls: 'ravager', name: 'DKV RAVAGER', role: 'brawler', x: 1500, y: 330, angle: 165 },
      { cls: 'jackal', name: 'DKV JACKAL', role: 'raider', x: 1620, y: 760, angle: 180 }
    ],
    win: (b) => Game.sideDead(b, 'enemy') ? 'Sector clear. Voss: "Good gunnery. Log it and move on."' : null,
    lose: (b) => Game.sideDead(b, 'player') ? 'Escape pods away. The Verge keeps what it takes.' : null
  },
  m_convoy: {
    name: 'THE CONVOY', sub: 'KESSEL DRIFT · HAULAGE LANE 7',
    briefing: [
      'The freighter PELICAN is inbound with reactor cores for the station — and a Dominion wolfpack is vectoring on her.',
      'Voss: "She can\'t dodge and she can\'t shoot. That makes her yours. Escorts hunt sterns — don\'t let them slip past you."',
      'OBJECTIVE — The PELICAN must reach the far jump marker (right edge). If she dies, we lose the station.'
    ],
    reward: 190,
    bonus: { desc: 'NOT A SCRATCH: the PELICAN takes no hull damage', reward: 80,
      check: (b) => { const f = b.ships.find(s => s.role === 'convoy'); return !!(f && f.alive && f.hull === f.maxHull); } },
    terrain: 'light',
    playerSpawn: { x: 430, y: 800 },
    allies: [{ cls: 'freighter', name: 'VSS PELICAN', role: 'convoy', x: 220, y: 600, angle: 0 }],
    enemies: [
      { cls: 'jackal', name: 'DKV JACKAL', role: 'hunter', x: 1690, y: 260, angle: 170 },
      { cls: 'jackal', name: 'DKV HYENA', role: 'hunter', x: 1780, y: 900, angle: 180 },
      { cls: 'jackal', name: 'DKV MONGREL', role: 'raider', x: 1740, y: 560, angle: 180 },
      { cls: 'ravager', name: 'DKV RAVAGER', role: 'hunter', x: 1840, y: 580, angle: 180 }
    ],
    win: (b) => {
      const f = b.ships.find(s => s.role === 'convoy');
      if (f && f.alive && f.exited) return 'The PELICAN makes the jump. Voss: "That\'s a station\'s worth of lights you just kept on."';
      if (f && f.alive && Game.sideDead(b, 'enemy')) return 'Wolfpack destroyed. The lane is open.';
      return null;
    },
    lose: (b) => {
      const f = b.ships.find(s => s.role === 'convoy');
      if (f && !f.alive) return 'The PELICAN breaks up. Reactor cores scatter across the Drift.';
      if (Game.sideDead(b, 'player')) return 'Escape pods away. The convoy is on its own.';
      return null;
    }
  },
  m_anvil: {
    name: 'AMBUSH AT THE ANVIL', sub: 'KESSEL DRIFT · ASTEROID SHOAL',
    briefing: [
      'A Dominion destroyer is laid up in the Anvil shoal, guns cold, escorts prowling the rocks.',
      'Voss: "The rocks eat lance fire and they\'ll eat your hull if you get greedy. Use the shadows, then hit them before the MARAUDER gets her batteries lit."',
      'OBJECTIVE — Destroy all hostile ships. Asteroids block line of fire and grind hulls that pass through.'
    ],
    reward: 230,
    bonus: { desc: 'ROCK HOPPER: no Terran Alliance hull grinds through the asteroids', reward: 70,
      check: (b) => !b.stats.playerTransits },
    terrain: 'heavy',
    playerSpawn: { x: 340, y: 650 },
    enemies: [
      { cls: 'marauder', name: 'DKV MARAUDER', role: 'sniper', x: 1620, y: 620, angle: 180 },
      { cls: 'ravager', name: 'DKV FLENSER', role: 'brawler', x: 1500, y: 830, angle: -170 },
      { cls: 'jackal', name: 'DKV CUR', role: 'raider', x: 1430, y: 260, angle: 160 },
      { cls: 'jackal', name: 'DKV WHELP', role: 'raider', x: 1520, y: 1010, angle: -160 }
    ],
    win: (b) => Game.sideDead(b, 'enemy') ? 'The Anvil falls silent. Salvage crews are already counting the wrecks.' : null,
    lose: (b) => Game.sideDead(b, 'player') ? 'The shoal keeps your bones. The Dominion keeps the Drift.' : null
  },
  m_hunt: {
    name: 'THE HUNT', sub: 'KESSEL DRIFT · DEEP FIELD',
    briefing: [
      'The courier VULTURE is carrying the Dominion fleet codes home. She runs for the jump point on turn 3.',
      'Voss: "If that ship jumps, every ambush for a year is already planned. I don\'t care what it costs — the VULTURE burns."',
      'OBJECTIVE — Destroy the VULTURE before she escapes off the far edge. Her escort will try to make you blink.'
    ],
    reward: 270,
    bonus: { desc: 'SWIFT EXECUTION: the VULTURE dies before turn 5', reward: 90,
      check: (b) => b.stats.vipKillTurn > 0 && b.stats.vipKillTurn < 5 },
    terrain: 'medium',
    playerSpawn: { x: 310, y: 650 },
    enemies: [
      { cls: 'marauder', name: 'DKV VULTURE', role: 'flee', x: 950, y: 550, angle: 0, vip: true },
      { cls: 'ravager', name: 'DKV BUTCHER', role: 'brawler', x: 1290, y: 800, angle: 180 },
      { cls: 'jackal', name: 'DKV STRAY', role: 'raider', x: 1230, y: 300, angle: 170 }
    ],
    win: (b) => {
      const v = b.ships.find(s => s.vip);
      return (v && !v.alive) ? 'The VULTURE\'s reactor lights the deep field. The codes die with her.' : null;
    },
    lose: (b) => {
      const v = b.ships.find(s => s.vip);
      if (v && v.alive && v.exited) return 'A jump flare on the scope — the VULTURE is gone, and the codes with her.';
      if (Game.sideDead(b, 'player')) return 'Escape pods away. The VULTURE never even slowed down.';
      return null;
    }
  },
  m_hive: {
    name: 'THE HIVE', sub: 'KESSEL DRIFT · DARKSIDE ANCHORAGE',
    briefing: [
      'Long-range pickets keep dying with the same last words: contacts small, fast, everywhere. The Dominion has brought a carrier into the Drift.',
      'Voss: "The HIVE will stand off and bleed you white with bomber waves. Fighters will thin them, flak will catch some — but the only cure is her flight deck on fire. Get in and gut her."',
      'OBJECTIVE — Destroy the HIVE. Her escorts rout when she dies. Watch for bomber waves — point defense and fighter cover are your friends.'
    ],
    reward: 280,
    bonus: { desc: 'CLEAR SKIES: no Terran Alliance ship is struck by a bomber wave', reward: 90,
      check: (b) => !b.stats.bomberHitsOnPlayer },
    terrain: 'medium',
    playerSpawn: { x: 340, y: 650 },
    enemies: [
      { cls: 'hive', name: 'DKV HIVE', role: 'sniper', x: 1700, y: 650, angle: 180, vip: true },
      { cls: 'ravager', name: 'DKV WARDEN', role: 'brawler', x: 1460, y: 450, angle: 170 },
      { cls: 'jackal', name: 'DKV DRONE', role: 'raider', x: 1400, y: 880, angle: -170 },
      { cls: 'jackal', name: 'DKV STING', role: 'raider', x: 1330, y: 320, angle: 165 }
    ],
    win: (b) => {
      const v = b.ships.find(s => s.vip);
      return (v && !v.alive) ? 'The HIVE burns from the flight deck out. The sky over the Drift is quiet again.' : null;
    },
    lose: (b) => Game.sideDead(b, 'player') ? 'The bombers keep coming long after your guns stop. The Verge keeps what it takes.' : null
  },
  m_dreadmaw: {
    name: 'THE DREADMAW', sub: 'KESSEL DRIFT · DOMINION LINE',
    briefing: [
      'There she is. The DREADMAW — the heavy cruiser that broke the Terran Alliance line at Meridian. Her escorts have never lost her.',
      'Voss: "No clever speech, Captain. That ship is the Dominion\'s claim on the Drift. Take her spine off and the rest of them will remember they\'re mortal."',
      'OBJECTIVE — Destroy the DREADMAW. Break her and her escorts rout.'
    ],
    reward: 400,
    bonus: { desc: 'LET NONE ESCAPE: no Dominion ship leaves the field', reward: 120,
      check: (b) => !b.stats.enemyEscaped },
    terrain: 'medium',
    playerSpawn: { x: 320, y: 680 },
    enemies: [
      { cls: 'dreadmaw', name: 'DKV DREADMAW', role: 'sniper', x: 1690, y: 620, angle: 180, vip: true },
      { cls: 'marauder', name: 'DKV FLAYER', role: 'brawler', x: 1460, y: 320, angle: 165 },
      { cls: 'ravager', name: 'DKV GORGE', role: 'brawler', x: 1540, y: 950, angle: -170 },
      { cls: 'jackal', name: 'DKV GNASH', role: 'raider', x: 1420, y: 760, angle: -170 },
      { cls: 'jackal', name: 'DKV MAUL', role: 'raider', x: 1560, y: 1030, angle: -160 }
    ],
    win: (b) => {
      const v = b.ships.find(s => s.vip);
      return (v && !v.alive) ? 'The DREADMAW folds in on her own fires. Across the Drift, Dominion transponders go dark and running.' : null;
    },
    lose: (b) => Game.sideDead(b, 'player') ? 'The line holds — theirs, not ours. The Verge keeps what it takes.' : null
  }
};

/* ---------------- sector map (branching campaign) ----------------
   x/y are percentages on the sector screen. Edges are one-way, left to right. */
DATA.SECTOR = {
  nodes: [
    { id: 'n1', x: 12, y: 50, mission: 'm_first' },
    { id: 'n2a', x: 38, y: 26, mission: 'm_convoy' },
    { id: 'n2b', x: 38, y: 74, mission: 'm_anvil' },
    { id: 'n3a', x: 64, y: 26, mission: 'm_hunt' },
    { id: 'n3b', x: 64, y: 74, mission: 'm_hive' },
    { id: 'n4', x: 88, y: 50, mission: 'm_dreadmaw', final: true }
  ],
  edges: [
    ['n1', 'n2a'], ['n1', 'n2b'],
    ['n2a', 'n3a'], ['n2a', 'n3b'],
    ['n2b', 'n3a'], ['n2b', 'n3b'],
    ['n3a', 'n4'], ['n3b', 'n4']
  ]
};
DATA.sectorNode = (id) => DATA.SECTOR.nodes.find(n => n.id === id);
DATA.sectorNext = (fromId) => {
  if (!fromId) return ['n1'];
  return DATA.SECTOR.edges.filter(e => e[0] === fromId).map(e => e[1]);
};

/* Skirmish enemy pool */
DATA.SKIRMISH_POOL = [
  { cls: 'jackal', role: 'raider' },
  { cls: 'jackal', role: 'brawler' },
  { cls: 'ravager', role: 'brawler' },
  { cls: 'ravager', role: 'raider' },
  { cls: 'marauder', role: 'sniper' },
  { cls: 'marauder', role: 'brawler' },
  { cls: 'hive', role: 'sniper' },
  { cls: 'dreadmaw', role: 'sniper' }
];
DATA.DKV_NAMES = ['DKV CARRION', 'DKV LOCUST', 'DKV GRIM', 'DKV HOWL', 'DKV KNIFE', 'DKV PYRE', 'DKV SHRIKE', 'DKV FANG', 'DKV OMEN', 'DKV RUIN', 'DKV WORM', 'DKV SPITE'];

if (typeof window !== 'undefined') window.DATA = DATA;
