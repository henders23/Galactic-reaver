/* Galactic Reaver — static game data: hulls, weapons, orders, missions, store */
'use strict';

const DATA = {};

DATA.WORLD = { w: 1400, h: 900 };

/* ---------------- weapon templates ----------------
   type: 'lance' (beam), 'battery' (shells), 'torp' (ordnance salvo)
   arc:  'fore' | 'side'
*/
DATA.weapon = (over) => Object.assign({
  name: 'BATTERY', type: 'battery', arc: 'side',
  range: 320, acc: 0.6, dmg: [2, 3],
  salvo: 0, reloadTime: 0, reload: 0, target: null
}, over);

/* ---------------- ship classes ---------------- */
DATA.CLASSES = {
  /* --- player hulls --- */
  corvette: {
    cls: 'corvette', label: 'KESTREL-CLASS CORVETTE', short: 'CORVETTE',
    w: 110, h: 44, hull: 26, sh: { F: 2, S: 1, A: 1 },
    speed: 170, maxTurn: 90, turrets: 1, pts: 160,
    desc: 'Fast, agile line ship. Fore lance, side batteries, one torpedo tube.',
    weapons: [
      { name: 'LANCE BATTERY', type: 'lance', arc: 'fore', range: 430, acc: 0.75, dmg: [3, 5] },
      { name: 'FLANK BATTERIES', type: 'battery', arc: 'side', range: 320, acc: 0.60, dmg: [2, 4] },
      { name: 'MK-II TORPEDOES', type: 'torp', arc: 'fore', range: 560, acc: 0, dmg: [3, 5], salvo: 2, reloadTime: 2 }
    ]
  },
  frigate: {
    cls: 'frigate', label: 'TEMPEST-CLASS FRIGATE', short: 'FRIGATE',
    w: 122, h: 48, hull: 34, sh: { F: 2, S: 2, A: 1 },
    speed: 150, maxTurn: 60, turrets: 2, pts: 220,
    desc: 'Tough gun platform. Heavy broadsides, light fore lance.',
    weapons: [
      { name: 'LIGHT LANCE', type: 'lance', arc: 'fore', range: 380, acc: 0.70, dmg: [2, 4] },
      { name: 'HEAVY BROADSIDE', type: 'battery', arc: 'side', range: 360, acc: 0.65, dmg: [3, 5] }
    ]
  },
  lcruiser: {
    cls: 'lcruiser', label: 'RESOLUTE-CLASS LIGHT CRUISER', short: 'LT CRUISER',
    w: 150, h: 58, hull: 48, sh: { F: 3, S: 2, A: 1 },
    speed: 125, maxTurn: 45, turrets: 3, pts: 340,
    desc: 'Ship of the line. Lance decks, massed batteries, triple torpedo tubes.',
    weapons: [
      { name: 'LANCE DECK', type: 'lance', arc: 'side', range: 420, acc: 0.75, dmg: [4, 6] },
      { name: 'GUN BATTERIES', type: 'battery', arc: 'side', range: 380, acc: 0.60, dmg: [3, 6] },
      { name: 'TORPEDO TUBES', type: 'torp', arc: 'fore', range: 560, acc: 0, dmg: [3, 5], salvo: 3, reloadTime: 2 }
    ]
  },
  /* --- civilian --- */
  freighter: {
    cls: 'freighter', label: 'PELICAN-CLASS FREIGHTER', short: 'FREIGHTER',
    w: 130, h: 56, hull: 30, sh: { F: 1, S: 1, A: 1 },
    speed: 110, maxTurn: 30, turrets: 1, pts: 0,
    desc: 'Unarmed bulk hauler. Keep it alive.',
    weapons: []
  },
  /* --- Dominion hulls --- */
  jackal: {
    cls: 'jackal', label: 'JACKAL-CLASS ESCORT', short: 'ESCORT',
    w: 80, h: 34, hull: 13, sh: { F: 1, S: 0, A: 0 },
    speed: 210, maxTurn: 90, turrets: 1, pts: 90,
    desc: 'Fast attack craft. Weak alone, deadly in packs at your stern.',
    weapons: [
      { name: 'AUTOGUNS', type: 'battery', arc: 'fore', range: 280, acc: 0.50, dmg: [1, 3] }
    ]
  },
  ravager: {
    cls: 'ravager', label: 'RAVAGER-CLASS RAIDER', short: 'RAIDER',
    w: 120, h: 50, hull: 22, sh: { F: 1, S: 1, A: 0 },
    speed: 150, maxTurn: 45, turrets: 1, pts: 150,
    desc: 'Dominion raider. Closes fast and hammers with flak cannon.',
    weapons: [
      { name: 'FLAK CANNON', type: 'battery', arc: 'fore', range: 380, acc: 0.55, dmg: [2, 4] }
    ]
  },
  marauder: {
    cls: 'marauder', label: 'MARAUDER-CLASS DESTROYER', short: 'DESTROYER',
    w: 135, h: 54, hull: 32, sh: { F: 2, S: 1, A: 1 },
    speed: 130, maxTurn: 45, turrets: 2, pts: 250,
    desc: 'Destroyer with heavy broadsides and torpedo tubes.',
    weapons: [
      { name: 'HEAVY BATTERY', type: 'battery', arc: 'side', range: 370, acc: 0.60, dmg: [3, 5] },
      { name: 'TORPEDO TUBES', type: 'torp', arc: 'fore', range: 560, acc: 0, dmg: [3, 5], salvo: 2, reloadTime: 2 }
    ]
  },
  dreadmaw: {
    cls: 'dreadmaw', label: 'DREADMAW-CLASS HEAVY CRUISER', short: 'HEAVY CRUISER',
    w: 175, h: 66, hull: 60, sh: { F: 3, S: 2, A: 1 },
    speed: 100, maxTurn: 30, turrets: 4, pts: 500,
    desc: 'Dominion flagship of the Drift. Kill it and the line breaks.',
    weapons: [
      { name: 'LANCE SPINE', type: 'lance', arc: 'side', range: 440, acc: 0.70, dmg: [4, 6] },
      { name: 'MASS BATTERIES', type: 'battery', arc: 'side', range: 380, acc: 0.60, dmg: [3, 6] },
      { name: 'TORPEDO MAW', type: 'torp', arc: 'fore', range: 560, acc: 0, dmg: [3, 5], salvo: 3, reloadTime: 2 }
    ]
  }
};

/* ---------------- helm orders ----------------
   range/minMove computed from ship speed at battle time
*/
DATA.orders = (ship) => {
  const spd = Game.effSpeed(ship);
  const brg = ship.sys['BRIDGE'];
  const all = [
    { id: 'heading', name: 'NEW HEADING', range: spd, minMove: 30, maxTurn: ship.maxTurn,
      desc: 'move · turn ≤' + ship.maxTurn + '°', accMod: 0, dodge: 0 },
    { id: 'full', name: 'ALL AHEAD FULL', range: spd * 1.55, minMove: spd * 0.75, maxTurn: Math.min(22.5, ship.maxTurn),
      desc: 'long move · shallow turn · −10% acc', accMod: -0.10, dodge: 0.05 },
    { id: 'about', name: 'COME ABOUT', range: spd * 0.55, minMove: 0, maxTurn: 180,
      desc: 'short move · any facing', accMod: 0, dodge: 0 },
    { id: 'evasive', name: 'EVASIVE PATTERN', range: spd * 0.8, minMove: 30, maxTurn: Math.min(45, ship.maxTurn),
      desc: '+20% dodge · own fire −15%', accMod: -0.15, dodge: 0.20 },
    { id: 'hold', name: 'HOLD & LOCK', range: 0, minMove: 0, maxTurn: 0,
      desc: 'no move · +15% acc', accMod: 0.15, dodge: -0.05 },
    { id: 'brace', name: 'BRACE FOR IMPACT', range: spd * 0.5, minMove: 0, maxTurn: Math.min(30, ship.maxTurn),
      desc: 'incoming dmg halved · own fire −25% · no torpedoes', accMod: -0.25, dodge: 0.10, brace: true }
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

/* ---------------- store ---------------- */
DATA.STORE_SHIPS = [
  { cls: 'frigate', cost: 220 },
  { cls: 'lcruiser', cost: 380 }
];
DATA.UPGRADES = [
  { id: 'uplink', name: 'TARGETING UPLINK', cost: 140, desc: '+10% accuracy, all ships, all weapons' },
  { id: 'shields', name: 'REINFORCED EMITTERS', cost: 120, desc: '+1 fore shield on every fleet ship' },
  { id: 'crews', name: 'VETERAN DAMAGE CREWS', cost: 100, desc: 'Repairs succeed on 4+ instead of 5+' }
];
DATA.MAX_FLEET = 3;
DATA.SHIP_NAMES = ['VSS TEMPEST', 'VSS RESOLUTE', 'VSS ORION', 'VSS DAUNTLESS', 'VSS HARRIER', 'VSS VIGIL'];

/* ---------------- missions ---------------- */
DATA.MISSIONS = [
  {
    id: 'm1', name: 'FIRST BLOOD', sub: 'KESSEL DRIFT · OUTER MARKER',
    briefing: [
      'Two Dominion raiders are picking apart the Kessel relay buoys.',
      'Voss: "Simple gunnery problem, Captain. Cross their bows, keep your stern out of their teeth, and put lances through anything flying a DKV transponder."',
      'OBJECTIVE — Destroy all hostile ships.'
    ],
    reward: 140,
    terrain: 'light',
    playerSpawn: { x: 240, y: 470 },
    enemies: [
      { cls: 'ravager', name: 'DKV RAVAGER', role: 'brawler', x: 1050, y: 220, angle: 165 },
      { cls: 'jackal', name: 'DKV JACKAL', role: 'raider', x: 1130, y: 520, angle: 180 }
    ],
    win: (b) => Game.sideDead(b, 'enemy') ? 'Sector clear. Voss: "Good gunnery. Log it and move on."' : null,
    lose: (b) => Game.sideDead(b, 'player') ? 'Escape pods away. The Verge keeps what it takes.' : null
  },
  {
    id: 'm2', name: 'THE CONVOY', sub: 'KESSEL DRIFT · HAULAGE LANE 7',
    briefing: [
      'The freighter PELICAN is inbound with reactor cores for the station — and a Dominion wolfpack is vectoring on her.',
      'Voss: "She can\'t dodge and she can\'t shoot. That makes her yours. Escorts hunt sterns — don\'t let them slip past you."',
      'OBJECTIVE — The PELICAN must reach the far jump marker (right edge). If she dies, we lose the station.'
    ],
    reward: 180,
    terrain: 'light',
    playerSpawn: { x: 300, y: 560 },
    allies: [{ cls: 'freighter', name: 'VSS PELICAN', role: 'convoy', x: 150, y: 420, angle: 0 }],
    enemies: [
      { cls: 'jackal', name: 'DKV JACKAL', role: 'hunter', x: 1180, y: 180, angle: 170 },
      { cls: 'jackal', name: 'DKV HYENA', role: 'hunter', x: 1240, y: 620, angle: 180 },
      { cls: 'ravager', name: 'DKV RAVAGER', role: 'hunter', x: 1280, y: 400, angle: 180 }
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
  {
    id: 'm3', name: 'AMBUSH AT THE ANVIL', sub: 'KESSEL DRIFT · ASTEROID SHOAL',
    briefing: [
      'A Dominion destroyer is laid up in the Anvil shoal, guns cold, escorts prowling the rocks.',
      'Voss: "The rocks eat lance fire and they\'ll eat your hull if you get greedy. Use the shadows, then hit them before the MARAUDER gets her batteries lit."',
      'OBJECTIVE — Destroy all hostile ships. Asteroids block line of fire and grind hulls that pass through.'
    ],
    reward: 220,
    terrain: 'heavy',
    playerSpawn: { x: 240, y: 450 },
    enemies: [
      { cls: 'marauder', name: 'DKV MARAUDER', role: 'sniper', x: 1130, y: 430, angle: 180 },
      { cls: 'jackal', name: 'DKV CUR', role: 'raider', x: 1000, y: 180, angle: 160 },
      { cls: 'jackal', name: 'DKV WHELP', role: 'raider', x: 1060, y: 700, angle: -160 }
    ],
    win: (b) => Game.sideDead(b, 'enemy') ? 'The Anvil falls silent. Salvage crews are already counting the wrecks.' : null,
    lose: (b) => Game.sideDead(b, 'player') ? 'The shoal keeps your bones. The Dominion keeps the Drift.' : null
  },
  {
    id: 'm4', name: 'THE HUNT', sub: 'KESSEL DRIFT · DEEP FIELD',
    briefing: [
      'The courier VULTURE is carrying the Dominion fleet codes home. She runs for the jump point on turn 3.',
      'Voss: "If that ship jumps, every ambush for a year is already planned. I don\'t care what it costs — the VULTURE burns."',
      'OBJECTIVE — Destroy the VULTURE before she escapes off the far edge. Her escort will try to make you blink.'
    ],
    reward: 260,
    terrain: 'medium',
    playerSpawn: { x: 220, y: 450 },
    enemies: [
      { cls: 'marauder', name: 'DKV VULTURE', role: 'flee', x: 680, y: 380, angle: 0, vip: true },
      { cls: 'ravager', name: 'DKV BUTCHER', role: 'brawler', x: 900, y: 560, angle: 180 },
      { cls: 'jackal', name: 'DKV STRAY', role: 'raider', x: 860, y: 200, angle: 170 }
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
  {
    id: 'm5', name: 'THE DREADMAW', sub: 'KESSEL DRIFT · DOMINION LINE',
    briefing: [
      'There she is. The DREADMAW — the heavy cruiser that broke the Coalition line at Meridian. Her escorts have never lost her.',
      'Voss: "No clever speech, Captain. That ship is the Dominion\'s claim on the Drift. Take her spine off and the rest of them will remember they\'re mortal."',
      'OBJECTIVE — Destroy the DREADMAW. Break her and her escorts rout.'
    ],
    reward: 400,
    terrain: 'medium',
    playerSpawn: { x: 220, y: 470 },
    enemies: [
      { cls: 'dreadmaw', name: 'DKV DREADMAW', role: 'sniper', x: 1180, y: 430, angle: 180, vip: true },
      { cls: 'marauder', name: 'DKV FLENSER', role: 'brawler', x: 1020, y: 220, angle: 165 },
      { cls: 'jackal', name: 'DKV GNASH', role: 'raider', x: 990, y: 620, angle: -170 },
      { cls: 'jackal', name: 'DKV MAUL', role: 'raider', x: 1090, y: 720, angle: -160 }
    ],
    win: (b) => {
      const v = b.ships.find(s => s.vip);
      return (v && !v.alive) ? 'The DREADMAW folds in on her own fires. Across the Drift, Dominion transponders go dark and running.' : null;
    },
    lose: (b) => Game.sideDead(b, 'player') ? 'The line holds — theirs, not ours. The Verge keeps what it takes.' : null
  }
];

/* Skirmish enemy pool: [cls, role] weighted by points budget */
DATA.SKIRMISH_POOL = [
  { cls: 'jackal', role: 'raider' },
  { cls: 'jackal', role: 'brawler' },
  { cls: 'ravager', role: 'brawler' },
  { cls: 'ravager', role: 'raider' },
  { cls: 'marauder', role: 'sniper' },
  { cls: 'marauder', role: 'brawler' },
  { cls: 'dreadmaw', role: 'sniper' }
];
DATA.DKV_NAMES = ['DKV CARRION', 'DKV LOCUST', 'DKV GRIM', 'DKV HOWL', 'DKV KNIFE', 'DKV PYRE', 'DKV SHRIKE', 'DKV FANG', 'DKV OMEN', 'DKV RUIN'];

window.DATA = DATA;
