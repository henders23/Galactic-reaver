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
  },
  corsair: {
    sprite: 'crimson-4', cls: 'corsair', shape: 'spine', label: 'CORSAIR-CLASS CRUISER', short: 'CRUISER',
    w: 152, h: 60, hull: 44, sh: { F: 2, S: 2, A: 1 },
    speed: 135, maxTurn: 40, turrets: 3, pts: 340,
    desc: 'Crimson Reach cruiser — stolen hulls bolted into a broadside brawler.',
    weapons: [
      { name: 'PLUNDER GUNS', type: 'battery', arc: 'side', range: 410, dice: 9, need: 4, dmgPer: 1 },
      { name: 'RAKING LANCE', type: 'lance', arc: 'fore', range: 440, dice: 3, need: 3, dmgPer: 2 },
      { name: 'TORPEDO TUBES', type: 'torp', arc: 'fore', range: 620, salvo: 2, reloadTime: 2 }
    ]
  },
  /* --- Za'Argon Dynasty: slow imperial battleline, heavy shields & lances --- */
  zsentinel: {
    sprite: 'zaargon-1', cls: 'zsentinel', shape: 'dart', label: 'SENTINEL-CLASS WARDEN', short: 'WARDEN',
    w: 108, h: 46, hull: 20, sh: { F: 2, S: 1, A: 0 },
    speed: 175, maxTurn: 55, turrets: 1, pts: 130,
    desc: "Za'Argon picket. Disciplined escort of the Dynasty line.",
    weapons: [
      { name: 'HALLOWED LANCE', type: 'lance', arc: 'fore', range: 440, dice: 2, need: 3, dmgPer: 2 },
      { name: 'WARD BATTERY', type: 'battery', arc: 'side', range: 340, dice: 4, need: 4, dmgPer: 1 }
    ]
  },
  zpaladin: {
    sprite: 'zaargon-3', cls: 'zpaladin', shape: 'spine', label: 'PALADIN-CLASS CRUISER', short: 'CRUISER',
    w: 154, h: 60, hull: 50, sh: { F: 3, S: 2, A: 1 },
    speed: 130, maxTurn: 38, turrets: 3, pts: 360,
    desc: "Za'Argon cruiser. Lance decks and a wall of shields.",
    weapons: [
      { name: 'JUDGEMENT LANCES', type: 'lance', arc: 'side', range: 470, dice: 4, need: 3, dmgPer: 2 },
      { name: 'CHOIR BATTERIES', type: 'battery', arc: 'side', range: 410, dice: 8, need: 4, dmgPer: 1 }
    ]
  },
  zdominus: {
    sprite: 'zaargon-4', cls: 'zdominus', shape: 'slab', label: 'DOMINUS-CLASS BATTLESHIP', short: 'BATTLESHIP',
    w: 170, h: 66, hull: 60, sh: { F: 3, S: 3, A: 1 },
    speed: 108, maxTurn: 28, turrets: 3, pts: 470,
    desc: "Za'Argon battleship — a cathedral of guns that turns like a moon.",
    weapons: [
      { name: 'SPINE LANCES', type: 'lance', arc: 'side', range: 480, dice: 5, need: 3, dmgPer: 2 },
      { name: 'MASS CHOIR', type: 'battery', arc: 'side', range: 420, dice: 10, need: 4, dmgPer: 1 },
      { name: 'JUDGEMENT TUBES', type: 'torp', arc: 'fore', range: 620, salvo: 3, reloadTime: 2 }
    ]
  },
  zthrone: {
    sprite: 'zaargon-5', cls: 'zthrone', shape: 'spine', label: 'THRONE-CLASS DREADNOUGHT', short: 'DREADNOUGHT',
    w: 182, h: 70, hull: 74, sh: { F: 4, S: 3, A: 2 },
    speed: 92, maxTurn: 24, turrets: 4, pts: 600,
    desc: "Flagship of a Za'Argon war-fleet. Ancient, sacred, and nearly unkillable head-on.",
    weapons: [
      { name: 'GRAND LANCE', type: 'lance', arc: 'side', range: 500, dice: 6, need: 3, dmgPer: 2 },
      { name: 'MASS CATHEDRAL', type: 'battery', arc: 'side', range: 430, dice: 12, need: 4, dmgPer: 1 },
      { name: 'RELIQUARY TUBES', type: 'torp', arc: 'fore', range: 620, salvo: 3, reloadTime: 2 }
    ]
  },
  /* --- The Hive: swarming bio-hulls, little shielding, carriers & bombers --- */
  hdrone: {
    sprite: 'hive-1', cls: 'hdrone', shape: 'dart', label: 'HIVE DRONE', short: 'DRONE',
    w: 84, h: 36, hull: 16, sh: { F: 0, S: 0, A: 0 },
    speed: 215, maxTurn: 90, turrets: 1, pts: 90,
    desc: 'Hive drone. Fragile alone, lethal in a swarm.',
    weapons: [
      { name: 'SPORE GUNS', type: 'battery', arc: 'fore', range: 300, dice: 3, need: 4, dmgPer: 1 }
    ]
  },
  hstalker: {
    sprite: 'hive-2', cls: 'hstalker', shape: 'dart', label: 'HIVE STALKER', short: 'STALKER',
    w: 122, h: 50, hull: 26, sh: { F: 1, S: 0, A: 0 },
    speed: 175, maxTurn: 48, turrets: 1, pts: 160,
    desc: 'Hive raider. Closes fast and rakes with bio-cannon.',
    weapons: [
      { name: 'BIO-CANNON', type: 'battery', arc: 'fore', range: 400, dice: 5, need: 4, dmgPer: 1 }
    ]
  },
  hwarrior: {
    sprite: 'hive-3', cls: 'hwarrior', shape: 'spine', label: 'HIVE WARRIOR', short: 'WARRIOR',
    w: 140, h: 56, hull: 42, sh: { F: 1, S: 1, A: 0 },
    speed: 140, maxTurn: 42, turrets: 2, pts: 280,
    desc: 'Hive warrior-form. Acid lances and a hull that shrugs off fire.',
    weapons: [
      { name: 'ACID LANCE', type: 'lance', arc: 'side', range: 450, dice: 3, need: 3, dmgPer: 2 },
      { name: 'SPORE BATTERIES', type: 'battery', arc: 'side', range: 400, dice: 7, need: 4, dmgPer: 1 }
    ]
  },
  hleviathan: {
    sprite: 'hive-5', cls: 'hleviathan', shape: 'slab', label: 'HIVE LEVIATHAN', short: 'LEVIATHAN',
    w: 184, h: 72, hull: 70, sh: { F: 2, S: 1, A: 1 },
    speed: 100, maxTurn: 24, turrets: 3, pts: 560,
    desc: 'Hive leviathan — a living carrier that births bomber-broods from beyond gun range.',
    weapons: [
      { name: 'BIO-LANCE', type: 'lance', arc: 'side', range: 460, dice: 4, need: 3, dmgPer: 2 },
      { name: 'SPORE MASS', type: 'battery', arc: 'side', range: 420, dice: 10, need: 4, dmgPer: 1 },
      { name: 'BROOD CELLS', type: 'bay', craft: 'bombers', arc: 'any', range: 900, salvo: 3, reloadTime: 1 }
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
/* ---------------- ship name pools (per faction) ----------------
   Terran Alliance ships carry the TAS pennant and stern, disciplined names.
   The Crimson Reach are pirates — evocative, unprefixed hull names. The
   Za'Argon Dynasty names its ships like relics of empire. The Hive does not
   name individual ships; Terran intelligence assigns behavioural codenames. */
DATA.NAME_POOLS = {
  terran: [
    'TAS VANGUARD', 'TAS INVINCIBLE', 'TAS DEFENDER', 'TAS SENTINEL', 'TAS DAUNTLESS',
    'TAS INTREPID', 'TAS INDOMITABLE', 'TAS VALIANT', 'TAS ENDEAVOUR', 'TAS CONQUEROR',
    'TAS LEVIATHAN', 'TAS PERSEVERANCE', 'TAS GIBRALTAR', 'TAS IRON DUKE', 'TAS VICTORY',
    'TAS HORIZON', 'TAS ATLAS', 'TAS ASCENDANT', 'TAS RELIANT', 'TAS PATHFINDER',
    'TAS LONGBOW', 'TAS GUARDIAN', 'TAS SOVEREIGN', 'TAS THUNDERCHILD', 'TAS PHOENIX',
    'TAS ODYSSEY', 'TAS MARATHON', 'TAS BASTION', 'TAS TRIUMPH', 'TAS EXCALIBUR',
    'TAS CONSTITUTION', 'TAS FEARLESS', 'TAS INVICTUS', 'TAS CONCORD', 'TAS ECLIPSE',
    'TAS FRONTIER', 'TAS POLARIS', 'TAS CENTURION', 'TAS LIBERTY', 'TAS PIONEER',
    'TAS COURAGE', 'TAS ENTERPRISE', 'TAS ASCENSION', 'TAS UNITY'
  ],
  crimson: [
    'BLOOD PRICE', 'BLACK WIDOW', 'HELLHOUND', 'WIDOWMAKER', 'RUST DEVIL', 'DEAD RECKONING',
    'BLACK FORTUNE', "KING'S RANSOM", 'LAST LAUGH', 'BONE COLLECTOR', 'RED KNIFE', 'MARAUDER',
    'CUTLASS', 'GRAVE DIGGER', "HANGMAN'S SMILE", 'IRON JACKAL', 'NIGHT REAVER', 'BLACK TIDE',
    'FIREBRAND', 'BROKEN PROMISE', 'WRAITH', 'COLD STEEL', 'SCOURGE', "DEVIL'S DUE",
    'CRIMSON WOLF', 'GHOST CUTLASS', "WIDOW'S KISS", 'BUTCHER BIRD', 'BLACK FANG', 'BLOOD MOON',
    'SILENT PROFIT', 'HELLFIRE', 'ROGUE TIDE', 'RUST CROWN', 'DARK FORTUNE', 'NO QUARTER',
    'GRIM HARVEST', 'OUTLAW', 'BLACK HORIZON', 'RAVAGER', 'VULTURE KING', 'IRON COFFIN',
    'RED SIREN', 'MERCILESS', 'CORSAIR QUEEN', 'CUTTHROAT', 'BLOOD OATH', 'CRIMSON FURY',
    "REAPER'S WAKE"
  ],
  zaargon: [
    'VOICE OF ETERNITY', 'SPEAR OF THE FIRST EMPEROR', 'HAMMER OF JUDGEMENT', 'THRONE OF STARS',
    "LIGHT OF ZA'ARGON", 'CROWN OF AGES', 'HERALD OF SILENCE', 'EYE OF DOMINION', 'SWORD OF HEAVEN',
    'TEMPLE OF FIRE', 'ORACLE OF STONE', 'ETERNAL VIGIL', 'GOLDEN MANDATE', 'HAND OF FATE',
    'CELESTIAL SPEAR', 'CROWN OF DAWN', 'LAST ORACLE', 'VOICE OF THE ANCESTORS', 'PILLAR OF TRUTH',
    'ETERNAL THRONE', 'HERALD OF UNITY', 'BEACON OF EMPIRE', 'SHIELD OF KINGS', 'FIRST ASCENDANT',
    'KEEPER OF ETERNITY', 'CROWN OF WORLDS', 'DIVINE EDICT', 'EYE OF HEAVEN', 'PILLAR OF ORDER',
    'SACRED DOMINION', 'FLAME OF THE DYNASTY', 'STAR CATHEDRAL', 'IMPERIAL COVENANT',
    'RADIANT THRONE', 'ETERNAL CROWN', 'CELESTIAL MANDATE', 'IMPERIAL ORACLE', 'SACRED ASCENDANT',
    'FIRST LIGHT', 'THRONE ETERNAL', 'GOLDEN SPEAR', 'LAST DOMINION'
  ],
  /* Hive: behavioural codename + the translated Hive designation, shown together */
  hive: [
    { code: 'DEVOURER', desig: "Xha'rith" }, { code: 'BROODMOTHER', desig: "Ul'khess" },
    { code: 'HARVESTER', desig: "Kha'veth" }, { code: 'SPINEBREAKER', desig: 'Graxith' },
    { code: 'LEVIATHAN', desig: "Vor'kaan" }, { code: 'FLESH TIDE', desig: "Zha'thul" },
    { code: 'MAW', desig: "Kz'rakk" }, { code: 'BROOD CARRIER', desig: "Xhul'ra" },
    { code: 'SEEDER', desig: "Vesh'karr" }, { code: 'HIVE HEART', desig: 'Xorrath' }
  ]
};
/* commissioned Terran ships draw from the Terran pool */
DATA.SHIP_NAMES = DATA.NAME_POOLS.terran;

/* ---------------- factions ----------------
   The powers contesting the Verge. Each fields a fleet built from its own sprite
   row (escort → capital), names its ships from its pool, and leans on particular
   AI roles. `pool` lists hull classes cheapest-first; `flagship` is its capital.
   Colours match the sector-map legend. */
DATA.FACTIONS = {
  terran: {
    id: 'terran', name: 'TERRAN ALLIANCE', short: 'TERRAN', adj: 'Terran', prefix: 'TAS',
    color: '#4cd7ea', side: 'player', names: 'terran',
    pool: ['corvette', 'frigate', 'lcruiser', 'argus'], flagship: 'lcruiser',
    roles: ['brawler', 'sniper'],
    blurb: 'The Terran Alliance holds the Verge for the worlds behind it. Disciplined line ships, the TAS pennant.'
  },
  crimson: {
    id: 'crimson', name: 'CRIMSON REACH', short: 'CRIMSON REACH', adj: 'Crimson Reach', prefix: '',
    color: '#ff6159', side: 'enemy', names: 'crimson',
    pool: ['jackal', 'ravager', 'marauder', 'corsair', 'dreadmaw'], flagship: 'dreadmaw',
    roles: ['raider', 'brawler', 'raider', 'sniper'],
    blurb: 'A confederation of pirate fleets — fast, vicious, and everywhere the Alliance is weak.'
  },
  zaargon: {
    id: 'zaargon', name: "ZA'ARGON DYNASTY", short: "ZA'ARGON", adj: "Za'Argon", prefix: '',
    color: '#6fe0a8', side: 'enemy', names: 'zaargon',
    pool: ['zsentinel', 'zpaladin', 'zdominus', 'zthrone'], flagship: 'zthrone',
    roles: ['sniper', 'brawler', 'sniper'],
    blurb: 'An ancient empire of the deep Verge. Slow, sacred battleships and an unbending line.'
  },
  hive: {
    id: 'hive', name: 'THE HIVE', short: 'HIVE', adj: 'Hive', prefix: '',
    color: '#b57ff0', side: 'enemy', names: 'hive',
    pool: ['hdrone', 'hstalker', 'hwarrior', 'hive', 'hleviathan'], flagship: 'hleviathan',
    roles: ['raider', 'raider', 'brawler', 'carrier'],
    blurb: 'A spreading bio-swarm that does not negotiate. Drones, warrior-forms and brood-carriers.'
  },
  neutral: {
    id: 'neutral', name: 'NEUTRAL', short: 'NEUTRAL', adj: 'Neutral', prefix: '',
    color: '#ffd465', side: 'ally', names: null, noncombatant: true,
    pool: ['freighter'], flagship: null, roles: ['convoy'],
    blurb: 'Independent worlds and the haulers of the Verge. They fly for whoever keeps the lane open.'
  }
};
DATA.faction = (id) => DATA.FACTIONS[id] || DATA.FACTIONS.crimson;
DATA.enemyFactions = () => ['crimson', 'zaargon', 'hive'];

/* Hive ships aren't named — Terran intel assigns a codename + translated designation */
DATA.hiveName = (rng) => {
  const h = DATA.NAME_POOLS.hive[Math.floor((rng ? rng() : Math.random()) * DATA.NAME_POOLS.hive.length)];
  return h.code + " '" + h.desig + "'";
};

/* ---------------- per-mission difficulty tiers ----------------
   Chosen when the player picks a planet's mission (planet map). Scales the enemy
   fleet's points budget, the requisition paid, and the Verge's gunnery. */
DATA.MISSION_TIERS = [
  { id: 'easy', name: 'EASY', budgetMul: 0.75, reqMul: 0.8, enemyNeed: 1, color: '#6fe0a8', rec: 'Low enemy presence · all fleets' },
  { id: 'medium', name: 'MEDIUM', budgetMul: 1.05, reqMul: 1.0, enemyNeed: 0, color: '#ffb454', rec: 'Moderate resistance · lvl 2+ fleets' },
  { id: 'hard', name: 'HARD', budgetMul: 1.4, reqMul: 1.35, enemyNeed: 0, color: '#ff6159', rec: 'Heavy resistance · lvl 4+ fleets' },
  { id: 'veryhard', name: 'VERY HARD', budgetMul: 1.85, reqMul: 1.8, enemyNeed: -1, color: '#b57ff0', rec: 'Extreme danger · elite fleets' }
];
DATA.tier = (id) => DATA.MISSION_TIERS.find(t => t.id === id) || DATA.MISSION_TIERS[1];

/* ---------------- mission archetypes ----------------
   Templates the generator recombines. `build` flags shape the generated mission;
   the win/lose logic is assembled in Game.generateMission from these flags. */
DATA.MISSION_ARCHETYPES = [
  { id: 'patrol', name: 'PATROL', obj: 'Destroy all hostile ships in the sector.',
    terrain: 'light', budgetMul: 0.85, reward: 120, weight: 3 },
  { id: 'assault', name: 'ASSAULT', obj: 'Break the fleet holding this world.',
    terrain: 'medium', budgetMul: 1.15, reward: 170, weight: 3 },
  { id: 'escort', name: 'CONVOY ESCORT', obj: 'The freighter must reach the far jump marker (right edge).',
    terrain: 'light', budgetMul: 1.0, reward: 160, ally: 'convoy', weight: 2 },
  { id: 'defense', name: 'ORBITAL DEFENSE', obj: 'Hold the line — keep the outpost alive and destroy the raiders.',
    terrain: 'light', budgetMul: 1.05, reward: 160, ally: 'station', weight: 2 },
  { id: 'decap', name: 'DECAPITATION', obj: 'Destroy the enemy flagship.',
    terrain: 'medium', budgetMul: 1.1, reward: 190, vip: 'flagship', weight: 2 },
  { id: 'interdict', name: 'INTERDICTION', obj: 'Destroy the courier before it jumps off the far edge.',
    terrain: 'medium', budgetMul: 0.9, reward: 180, vip: 'courier', weight: 2 }
];
DATA.archetype = (id) => DATA.MISSION_ARCHETYPES.find(a => a.id === id) || DATA.MISSION_ARCHETYPES[0];

/* planet dressing → battle terrain density (from the system/planet map) */
DATA.PLANET_TYPES = {
  Rocky: 'heavy', Desert: 'medium', Ice: 'medium', Ocean: 'light', Gas: 'light', Volcanic: 'heavy', Barren: 'light'
};

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
    allies: [{ cls: 'freighter', name: 'TAS PELICAN', role: 'convoy', x: 220, y: 600, angle: 0 }],
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
