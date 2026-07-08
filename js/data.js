/* Galactic Reaver — static game data: hulls, weapons, orders, sector map, store */
'use strict';

const DATA = {};

DATA.WORLD = { w: 2600, h: 1720 };

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
    { id: 'heading', name: 'NEW HEADING', range: spd, minMove: Math.max(40, spd * 0.25), maxTurn: Math.min(45, ship.maxTurn),
      desc: 'advance · turn ≤' + Math.min(45, ship.maxTurn) + '°', accShift: 0, dodgeShift: 0 },
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
DATA.PLANET_TYPE_LIST = ['Rocky', 'Ocean', 'Desert', 'Ice', 'Gas', 'Volcanic', 'Barren'];
DATA.PLANET_NUMERALS = ['II', 'III', 'IV', 'V'];

/* ---------------- galaxy (sector map) ----------------
   Systems on the galaxy, tinted by their owning faction and joined by lanes.
   x/y are percentages on the galaxy screen. `type` drives the system dossier and
   its strategic value. The front is wherever Terran space meets another power;
   the player may only engage a system that borders Terran-held space. */
/* `diff` is the 1..5 difficulty rating drawn as the red dash meter under each
   system on the sector map — outposts are soft, enemy capitals are the hardest. */
DATA.SYSTEM_TYPES = {
  capital: { name: 'CAPITAL', value: 'CRITICAL', planets: 4, diff: 5 },
  majorhub: { name: 'MAJOR HUB', value: 'HIGH', planets: 4, diff: 4 },
  minorhub: { name: 'MINOR HUB', value: 'MODERATE', planets: 4, diff: 2 },
  shipyard: { name: 'SHIPYARD', value: 'HIGH', planets: 4, diff: 3 },
  resource: { name: 'RESOURCE', value: 'MODERATE', planets: 4, diff: 2 },
  outpost: { name: 'OUTPOST', value: 'LOW', planets: 4, diff: 1 }
};
DATA.GALAXY = {
  systems: [
    // --- Terran Alliance (west) ---
    { id: 'aegis', name: 'AEGIS PRIME', type: 'capital', owner: 'terran', x: 12, y: 44, links: ['celestia', 'providence', 'horizon', 'vanguard'] },
    { id: 'vanguard', name: 'VANGUARD', type: 'majorhub', owner: 'terran', x: 22, y: 22, links: ['aegis', 'northwatch', 'celestia'] },
    { id: 'northwatch', name: 'NORTHWATCH', type: 'outpost', owner: 'terran', x: 12, y: 19, links: ['vanguard'] },
    { id: 'celestia', name: 'CELESTIA', type: 'minorhub', owner: 'terran', x: 23, y: 37, links: ['aegis', 'vanguard', 'horizon'] },
    { id: 'providence', name: 'PROVIDENCE', type: 'resource', owner: 'terran', x: 14, y: 58, links: ['aegis', 'valoris', 'fortitude'] },
    { id: 'valoris', name: 'VALORIS', type: 'shipyard', owner: 'terran', x: 11, y: 71, links: ['providence', 'fortitude'] },
    { id: 'fortitude', name: 'FORTITUDE', type: 'outpost', owner: 'terran', x: 25, y: 64, links: ['providence', 'valoris', 'horizon'] },
    { id: 'horizon', name: 'HORIZON', type: 'minorhub', owner: 'terran', x: 31, y: 45, links: ['aegis', 'celestia', 'fortitude', 'elytra', 'centauri'] },
    // --- Za'Argon Dynasty (centre) ---
    { id: 'centauri', name: 'CENTAURI GATE', type: 'capital', owner: 'zaargon', x: 45, y: 30, links: ['horizon', 'elytra', 'pax', 'reavers'] },
    { id: 'elytra', name: 'ELYTRA JUNCTION', type: 'minorhub', owner: 'zaargon', x: 40, y: 52, links: ['horizon', 'centauri', 'nexus', 'churn'] },
    { id: 'pax', name: 'PAX STATION', type: 'resource', owner: 'zaargon', x: 55, y: 40, links: ['centauri', 'trinity', 'ravagers'] },
    { id: 'nexus', name: 'NEXUS POINT', type: 'outpost', owner: 'zaargon', x: 50, y: 63, links: ['elytra', 'trinity', 'churn'] },
    { id: 'trinity', name: 'TRINITY EXCHANGE', type: 'minorhub', owner: 'zaargon', x: 61, y: 55, links: ['pax', 'nexus', 'ulvor'] },
    // --- Crimson Reach (north-east) ---
    { id: 'reavers', name: "REAVER'S LANDING", type: 'majorhub', owner: 'crimson', x: 62, y: 16, links: ['centauri', 'dreadfall', 'ravagers'] },
    { id: 'dreadfall', name: 'DREADFALL', type: 'capital', owner: 'crimson', x: 76, y: 24, links: ['reavers', 'bloodmoon'] },
    { id: 'bloodmoon', name: 'BLOODMOON HOLD', type: 'outpost', owner: 'crimson', x: 82, y: 37, links: ['dreadfall', 'ravagers'] },
    { id: 'ravagers', name: "RAVAGER'S GULF", type: 'minorhub', owner: 'crimson', x: 71, y: 40, links: ['reavers', 'pax', 'bloodmoon'] },
    // --- The Hive (south) ---
    { id: 'churn', name: 'THE CHURN', type: 'majorhub', owner: 'hive', x: 44, y: 75, links: ['elytra', 'nexus', 'kthrak', 'ulvor'] },
    { id: 'kthrak', name: "K'THRAK NEST", type: 'outpost', owner: 'hive', x: 33, y: 83, links: ['churn'] },
    { id: 'ulvor', name: "UL'VOR BROODWORLD", type: 'capital', owner: 'hive', x: 59, y: 77, links: ['trinity', 'churn', 'vxor'] },
    { id: 'vxor', name: 'VXOR CATACOMBS', type: 'outpost', owner: 'hive', x: 57, y: 91, links: ['ulvor'] }
  ]
};
DATA.system = (id) => DATA.GALAXY.systems.find(s => s.id === id);
DATA.enemyCapitals = () => ['centauri', 'dreadfall', 'ulvor'];
DATA.TERRAN_CAPITAL = 'aegis';

/* Authored set-piece anchors: 'systemId:planetIndex' → mission-def id. These launch
   the hand-built missions in place of a generated one. */
DATA.ANCHORS = {
  'reavers:0': 'm_first',
  'bloodmoon:0': 'm_convoy',
  'ravagers:0': 'm_anvil',
  'dreadfall:1': 'm_hunt',
  'dreadfall:0': 'm_dreadmaw',
  'ulvor:0': 'm_hive'
};
/* Authored anchors that ARE a system's boss finale (must be fought last). */
DATA.BOSS_ANCHORS = ['m_dreadmaw', 'm_hive'];

/* Villain reactions to specific captures. Taking one of these Drift-central systems
   (each fronting the swarm) provokes a Hive surge against your frontier — the Gate
   feeds it. Handled in Game.applyWarResult; keyed by system id. */
DATA.CAPTURE_REACTIONS = { elytra: 'hivesurge', nexus: 'hivesurge', trinity: 'hivesurge' };

/* Story gates on the enemy capitals: a capital's boss finale stays locked (even
   after its other worlds are secured) until its act's key story beat is resolved,
   so the narrative is load-bearing at each climax. Keyed by system id → the beat
   that unlocks it, plus the message shown on the locked finale. */
DATA.FINALE_GATES = {
  centauri: { beat: 'sc_reliquary',
    msg: "The Dynasty throne is sealed behind Exarch Vorun's honour fleet. Seize the reliquary and learn what they are dying to protect before you strike here." },
  ulvor: { beat: 'sc_swarm_stirs',
    msg: 'The Broodworld sleeps behind the swarm. It will not bare its heart until the Hive itself begins to stir — press the war on.' },
  dreadfall: { beat: 'sc_skarr',
    msg: "Skarr keeps the DREADMAW screened deep in the Reach. Blunt the swarm's breakout first — the Butcher's reckoning comes at the end." }
};

/* Every system ends in a boss finale — a capital-ship command battle. Where there
   is no authored boss, one is generated against the owning faction's flagship,
   led by a named commander. The Hive has no commanders; its flagship IS the mind. */
DATA.COMMANDERS = {
  crimson: ['CAPTAIN RAX VAYNE', 'WARLORD SKARR', 'RED JANNAH', 'CAPTAIN MORCANT', 'THE BONE BARON',
    'SAWTOOTH KELL', 'CAPTAIN VOSK', 'DREAD IMOGEN', 'GUTTER-PRINCE HALE', 'CAPTAIN SEVROS'],
  zaargon: ['EXARCH VORUN', 'HIGH PRAETOR KAAL', 'ARCHON SELVANE', 'GRAND VIZIER TESH', 'LORD-REGENT AZMUN',
    'EXARCH DELLWYN', 'PRAETOR IXANDER', 'ARCHON VELL', 'HIEROPHANT SUUN', 'CELESTIANT MORO']
};

/* the mock-up's system-progression track — one stage per planet, then control */
DATA.SYSTEM_STAGES = ['INTEL GATHERING', 'ESTABLISH FOOTHOLD', 'ELIMINATE THREATS', 'SECURE SYSTEM', 'SYSTEM CONTROL'];

/* ---------------- story missions (framework — beats authored later) ----------------
   Ordered plot beats that advance the narrative. The engine surfaces the first
   available beat as a "PRIORITY OPERATION" on the galaxy; completing it advances
   save.story.chapter. Kept EMPTY for now — drop beats in this shape to add plot:

     {
       id: 'sc_intro',                 // unique
       chapter: 1,                     // advances save.story.chapter on completion
       title: 'A FOOTHOLD IN THE VERGE',
       brief: 'One-line hook shown on the galaxy.',
       trigger: (save) => Game.terranSystems().length > 8,   // when it unlocks
       // either an authored mission id …
       anchor: 'm_first',
       // … or a generated-mission context:
       mission: { factionId: 'crimson', archetypeId: 'assault', tierId: 'medium',
                  planet: { name: 'Verge Waypoint', type: 'Barren' }, system: { name: 'THE VERGE' } }
     }

   `trigger` receives the save and may call Game.* helpers.
   Types: 'op' (launches a battle) · 'interstitial' (narrative screen, no battle). */
/* ---------------- acts ----------------
   The three-act spine, surfaced as full-screen title cards (DATA.STORY beats of
   type 'actcard') and as the act badge on the sector-map header. `chapter` maps
   to save.story.chapter. */
DATA.ACTS = [
  { chapter: 1, name: 'ACT I', title: 'FIRST BLOOD',
    tagline: 'The Crimson Reach is bleeding the Verge white — and the ship that broke Meridian is out here somewhere.' },
  { chapter: 2, name: 'ACT II', title: 'THE OLD EMPIRE',
    tagline: "The Za'Argon Dynasty stands between you and the heart of the Drift. Learn what they are dying to protect." },
  { chapter: 3, name: 'ACT III', title: 'THE RECKONING',
    tagline: 'The swarm breaks out, drawn by the waking Gate. Three thrones, one relic, and a debt owed since Meridian.' }
];
DATA.act = (chapter) => DATA.ACTS.find(a => a.chapter === chapter) || DATA.ACTS[0];

DATA.STORY = [
  {
    id: 'sc_prologue', chapter: 1, act: 'I', type: 'interstitial', title: 'THE GHOST OF MERIDIAN',
    brief: 'How you got here.', bg: 'meridian', coldOpen: true,
    trigger: () => true,   // the cold-open — always available, shown first thing
    body: [
      'MERIDIAN. Two years ago.',
      'The Dominion flagship DREADMAW broke the Alliance line in ninety seconds, and Admiral Kade Voss gave the order every captain dreads — hold. You watched the fleet die holding a line that was already gone. Then you disobeyed, and cut your corvette through the enemy escorts to shield the civilian convoys running for the jump point.',
      'Eleven thousand people lived. The fleet did not. You brought one ship out of the fire: the TAS REAVER.',
      'The Alliance could not decide whether you were a hero or the coward who ran while the fleet burned — so they split the difference and sent you here. To the Verge, the dying frontier, with the ragtag 7th Expeditionary Fleet and the name they gave you in the wreckage of Meridian: the Ghost.',
      'Voss came with you. He blames himself, not you. The Kessel Drift is his second chance — and yours.'
    ]
  },
  {
    id: 'act_1', chapter: 1, act: 'I', type: 'actcard', title: 'FIRST BLOOD', name: 'ACT I',
    tagline: 'The Crimson Reach is bleeding the Verge white — and the ship that broke Meridian is out here somewhere.',
    bg: 'starfield', trigger: () => Game.save.story.done.includes('sc_prologue')
  },
  {
    id: 'sc_orders', chapter: 1, act: 'I', type: 'interstitial', title: 'YOUR ORDERS',
    brief: 'Find the ship that broke Meridian.', bg: 'starfield', speaker: 'ADMIRAL KADE VOSS',
    smallPortrait: true,   // dossier rides here now, at a smaller scale
    trigger: () => Game.save.story.done.includes('act_1'),
    body: [
      'Voss lays the sector chart across the table and puts one word at the centre of it: DREADMAW.',
      '"This is the mission, Captain — everything else out here is just how we get to it. Warlord Skarr and the flagship that broke our line at Meridian went to ground somewhere in the Kessel Drift, and the Reach has been bleeding these convoys white to keep him fed and hidden."',
      'WHY HER, AND NOT JUST ANY PIRATE: "The DREADMAW is not one more raider. She is the ship that killed a fleet in ninety seconds and taught the whole Verge that the Alliance can be broken. As long as she flies, every warlord and dynast in the Drift believes the same thing. Put her on the ocean floor and the Reach folds — the swarm and the Dynasty both start doing their own arithmetic. And Meridian gets its answer."',
      'HOW WE FIND HER: "We do not go straight for the throat — we cannot, not yet. We take the Reach apart system by system and squeeze his raiding packs until one of them coughs up where the Butcher sleeps. Every world you take is a lead."',
      'OBJECTIVE — Hunt the DREADMAW. Break the Crimson Reach until Skarr has nowhere left to hide.'
    ]
  },
  {
    id: 'sc_butcher', chapter: 1, act: 'I', type: 'op', title: "THE BUTCHER'S TRAIL",
    brief: 'A lead on the DREADMAW — the ship that broke Meridian.',
    system: 'reavers',
    trigger: () => Game.terranSystems().length > 8,
    mission: {
      factionId: 'crimson', archetypeId: 'assault', tierId: 'medium',
      planet: { name: 'the Reaver anchorage', type: 'Barren' }, system: { name: "REAVER'S LANDING" },
      name: "THE BUTCHER'S TRAIL",
      briefing: [
        'A Crimson raiding pack is stripping a relay convoy in the Drift — and a prize you took last week carried a name in its logs you will never forget: SKARR.',
        'Voss: "Warlord Skarr. The Butcher of Meridian. He flies the DREADMAW — the same ship that put your fleet in the ground. If he is in the Verge, then so is our reckoning. Take these raiders apart and make one of them talk."',
        'OBJECTIVE — Destroy the Crimson raiding pack.'
      ]
    }
  },
  {
    id: 'sc_meridian', chapter: 1, act: 'I', type: 'interstitial', title: 'GHOSTS OF MERIDIAN',
    brief: 'Voss wants a word.', bg: 'starfield', speaker: 'ADMIRAL KADE VOSS',
    trigger: () => Game.save.story.done.includes('sc_butcher') && Game.terranSystems().length > 9,
    body: [
      'Voss finds you on the observation deck, two glasses and a bottle of something that predates the war.',
      '"You know what they call you back at fleet, Captain? The Ghost of Meridian. The one who ran." He does not look at you. "I call you the officer who saved eleven thousand civilians while I got my fleet killed holding a line that was already broken."',
      '"Meridian was mine. Not yours. You did the only thing worth doing that day." He finally turns. "So stop flying like a captain trying to die for it. The Verge does not need another ghost. It needs the REAVER."'
    ]
  },
  {
    id: 'sc_herald', chapter: 1, act: 'I', type: 'op', title: "THE WOLF'S MESSAGE",
    brief: 'Skarr is watching. He wants you to know it.',
    system: 'ravagers',
    trigger: () => Game.save.story.done.includes('sc_meridian') && Game.terranSystems().length > 10,
    mission: {
      factionId: 'crimson', archetypeId: 'interdict', tierId: 'medium',
      planet: { name: 'the Gulf approaches', type: 'Gas' }, system: { name: "RAVAGER'S GULF" },
      name: "THE WOLF'S MESSAGE",
      briefing: [
        "A lone Crimson courier burns into the Drift under a sigil you have learned to hate — Skarr's wolf. It is not here to fight. It is here to be seen.",
        'Voss: "He is taunting you, Captain. That runner is carrying his compliments and nothing else. Kill it if you can — but the Butcher does not send anything he cannot afford to lose."',
        'OBJECTIVE — Destroy the courier before it jumps.'
      ]
    }
  },
  {
    id: 'ev_first_blood', chapter: 1, act: 'I', type: 'interstitial', title: 'THE REACH BLEEDS',
    brief: 'Reaver\'s Landing is yours.', bg: 'starfield', speaker: 'ADMIRAL KADE VOSS',
    trigger: () => !!Game.save.story.flags['captured_reavers:0'],
    body: [
      "Reaver's Landing runs red. The set-piece the Crimson Reach built to bleed our convoys is a debris field now, and the first true blood of your war in the Verge is theirs, not ours.",
      'Voss: "That is the only language the Reach has ever understood, Captain — not treaties, not lines on a chart. Guns. You just taught the whole confederation that the Ghost of Meridian has teeth. Word of that travels faster than any courier."'
    ]
  },
  {
    id: 'act_2', chapter: 2, act: 'II', type: 'actcard', title: 'THE OLD EMPIRE', name: 'ACT II',
    tagline: "The Za'Argon Dynasty stands between you and the heart of the Drift. Learn what they are dying to protect.",
    bg: 'starfield', trigger: () => Game.save.story.done.includes('sc_herald')
  },
  {
    id: 'sc_dynasty', chapter: 2, act: 'II', type: 'op', title: 'THE OLD EMPIRE',
    brief: "The Za'Argon have noticed you.",
    system: 'elytra',
    trigger: () => Game.save.story.done.includes('sc_herald') &&
      DATA.GALAXY.systems.filter(s => s.owner === 'zaargon' && Game.systemOwner(s.id) === 'terran').length >= 2,
    mission: {
      factionId: 'zaargon', archetypeId: 'assault', tierId: 'hard',
      planet: { name: 'the Junction reach', type: 'Ice' }, system: { name: 'ELYTRA JUNCTION' },
      name: 'THE OLD EMPIRE',
      briefing: [
        "You have pushed too close to something the Za'Argon call sacred. A Dynasty battle-line translates in-system, running silent, lances already glowing.",
        'Exarch Vorun (all channels): "Little ghost of a dying empire. You stand upon the threshold of the First Emperor. Turn back — or be scattered like the ash of Meridian."',
        'Voss: "Ignore the sermon. Cross their bows and break their line before those lances warm up."',
        "OBJECTIVE — Break the Za'Argon battle-line."
      ]
    }
  },
  {
    id: 'sc_reliquary', chapter: 2, act: 'II', type: 'op', title: 'THE RELIQUARY',
    brief: 'Seize the star-charts the Dynasty would rather burn.',
    system: 'pax',
    trigger: () => Game.save.story.done.includes('sc_dynasty') &&
      DATA.GALAXY.systems.filter(s => s.owner === 'zaargon' && Game.systemOwner(s.id) === 'terran').length >= 3,
    mission: {
      factionId: 'zaargon', archetypeId: 'assault', tierId: 'hard',
      planet: { name: 'the Reliquary Anchorage', type: 'Rocky' }, system: { name: 'PAX STATION' },
      name: 'THE RELIQUARY',
      briefing: [
        'A Za\'Argon shrine-ship rides at anchor over a dead moon, its holds heavy with star-charts older than the Alliance — and, Voss suspects, the truth about whatever the Dynasty is dying to protect out here.',
        'Voss: "Whatever they are guarding, the answer is in that reliquary. Punch through the honour guard and take it before Vorun scuttles the lot."',
        'OBJECTIVE — Destroy the Za\'Argon guard and seize the reliquary.'
      ]
    }
  },
  {
    id: 'sc_gate', chapter: 2, act: 'II', type: 'interstitial', title: 'THE THRONE GATE',
    brief: 'What the Dynasty is dying for.', bg: 'starfield', speaker: 'ADMIRAL KADE VOSS',
    trigger: () => Game.save.story.done.includes('sc_reliquary') &&
      DATA.GALAXY.systems.filter(s => s.owner === 'zaargon' && Game.systemOwner(s.id) === 'terran').length >= 4,
    body: [
      "Deep in a captured Za'Argon vault, your survey teams find it on the oldest star-charts: a structure at the very heart of the Kessel Drift the Dynasty calls the THRONE GATE — a jump-gate older than the Alliance, older than the Dynasty itself, dormant, and bleeding a slow and colourless light.",
      'Voss goes quiet when you bring it to him. Too quiet.',
      '"Command already knows, Captain. A working long-range gate could stitch the whole Verge back together — or be the largest gun anyone has ever pointed at anyone." A long pause. "They want it intact. I am telling you that now so you hear it from me, and not from them, when the time comes."'
    ]
  },
  {
    id: 'sc_swarm_stirs', chapter: 2, act: 'II', type: 'interstitial', title: 'THE SWARM STIRS',
    brief: 'Something in the south is growing.', bg: 'starfield', speaker: 'ADMIRAL KADE VOSS',
    trigger: () => Game.save.story.done.includes('sc_gate') &&
      (Game.factionStrength('hive') >= 11 || Game.terranSystems().length >= 13),
    body: [
      'The pickets in the south keep going dark with the same last words: contacts, small, fast, everywhere.',
      'Voss overlays the sector map. Where there was a smear of purple at the edge of the Drift, there is now a bruise spreading inward — the Hive, swallowing system after system while the rest of you fight over the middle.',
      '"It is the Gate. That light we found — the swarm is drinking it, and it is waking up hungry." He exhales. "We are running out of war to fight before there is only one enemy left. And it will not be the pirates."'
    ]
  },
  {
    id: 'act_3', chapter: 3, act: 'III', type: 'actcard', title: 'THE RECKONING', name: 'ACT III',
    tagline: 'The swarm breaks out, drawn by the waking Gate. Three thrones, one relic, and a debt owed since Meridian.',
    bg: 'starfield', trigger: () => Game.save.story.done.includes('sc_swarm_stirs')
  },
  {
    id: 'sc_breakout', chapter: 3, act: 'III', type: 'op', title: 'THE SWARM BREAKS',
    brief: 'The Hive is coming for everyone.',
    system: 'churn',
    trigger: () => Game.save.story.done.includes('sc_swarm_stirs') &&
      (DATA.enemyCapitals().filter(c => Game.systemOwner(c) === 'terran').length >= 2 || Game.terranSystems().length >= 15),
    mission: {
      factionId: 'hive', archetypeId: 'defense', tierId: 'hard',
      planet: { name: 'the Churn picket', type: 'Ocean' }, system: { name: 'THE CHURN' },
      name: 'THE SWARM BREAKS',
      briefing: [
        'It is happening. The thing in the Drift is awake, and the Hive is pouring out of the south in numbers the pickets cannot count. Kessel Station is directly in their path.',
        'Voss: "Whatever the Throne Gate is, it is feeding them — and they are done waiting. Hold the station, Captain. If Kessel falls, the swarm has the whole Drift and everyone still fighting over it."',
        'OBJECTIVE — Hold the line: keep the station alive and break the swarm.'
      ]
    }
  },
  {
    id: 'sc_skarr', chapter: 3, act: 'III', type: 'interstitial', title: "THE BUTCHER'S DEBT",
    brief: 'The DREADMAW has stopped running.', bg: 'starfield', speaker: 'ADMIRAL KADE VOSS',
    trigger: () => Game.save.story.done.includes('sc_breakout'),
    body: [
      'The intercepts are unmistakable now. Warlord Skarr has pulled the DREADMAW back to Dreadfall, the rotten heart of the Crimson Reach — the ship that broke Meridian, sitting still, daring you to come.',
      'Voss studies the plot for a long time. "He knows the swarm is coming. He knows we know exactly where he is. This is not a hiding place, Captain. It is an invitation."',
      '"So take it. Whatever else burns out here before the end — that debt gets paid at Dreadfall. For Meridian. For every good crew we put in the ground holding a line that was already lost."'
    ]
  },
  {
    id: 'sc_lastlight', chapter: 3, act: 'III', type: 'interstitial', title: 'THE LAST LIGHT',
    brief: 'One decision left in the whole of the Verge.', bg: 'starfield', speaker: 'ADMIRAL KADE VOSS',
    trigger: () => Game.save.story.done.includes('sc_skarr'),
    body: [
      'The Drift has become a graveyard of fleets, and at its heart the Throne Gate burns brighter with every ship that dies near it — as if the war itself were pouring into that ancient light and waking it further.',
      'Voss finds you one last time before the end. "When the final throne falls, that Gate is yours to answer for. Command wants it. The Dynasty worshipped it. The swarm is drinking it. You will have to decide what it actually is."',
      '"Whatever you choose down there, Captain — you already did the hardest thing anyone ever asked of you, a long time ago, at Meridian. The rest of it is just gunnery."'
    ]
  },
  {
    id: 'ev_dreadmaw', chapter: 3, act: 'III', type: 'interstitial', title: 'MERIDIAN AVENGED',
    brief: 'The DREADMAW burns.', bg: 'victory', speaker: 'ADMIRAL KADE VOSS',
    trigger: () => !!Game.save.story.flags['captured_dreadfall:0'],
    body: [
      'The DREADMAW — the ship that broke the Alliance line at Meridian, that put your fleet and Voss\'s command in the ground — comes apart over Dreadfall under your guns. Warlord Skarr dies with her, still firing to the last.',
      'Voss watches the plot until the final trace of her signature is gone. For a long while he says nothing at all.',
      '"Two years, Captain. Two years I have carried Meridian like a stone behind the ribs." His voice is not quite steady. "It is paid. Every crew we buried holding that broken line — it is paid. Whatever else this war takes from us before the end, we did this. You did this."'
    ]
  },
  {
    id: 'ev_hive_heart', chapter: 3, act: 'III', type: 'interstitial', title: 'THE MIND GOES DARK',
    brief: 'The swarm\'s heart stops.', bg: 'starfield', speaker: 'ADMIRAL KADE VOSS',
    trigger: () => !!Game.save.story.flags['captured_ulvor:0'],
    body: [
      "At Ul'Vor Broodworld the Hive Heart — the single vast mind the whole swarm answered to — dies in a light that whites out every sensor in the fleet. Across the southern Drift, in the same heartbeat, ten thousand lesser things go suddenly and terribly still.",
      'Voss: "That is it. That is the mind. Everything still twitching down there is just meat drifting without it now." He exhales slowly. "Let the Gate bleed all the light it wants — there is nothing left in the dark to drink it. Log it, Captain. We just killed a god."'
    ]
  }
];

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
