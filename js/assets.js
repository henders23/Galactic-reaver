/* Galactic Reaver — image assets: faction ship sprites + backgrounds +
   planet portraits, weapon projectiles and animated explosion spritesheets. */
'use strict';

const ASSETS = {
  /* nose-up ship sprites cut from the faction sheet:
     terran (blue) · hive = Xil'Thar (purple) · zaargon (green) · crimson (red)
     sizes 1..5 = fighter, corvette, frigate, cruiser, dreadnought */
  SHIP_KEYS: [
    'terran-1', 'terran-2', 'terran-3', 'terran-4', 'terran-5',
    'hive-1', 'hive-2', 'hive-3', 'hive-4', 'hive-5',
    'zaargon-1', 'zaargon-2', 'zaargon-3', 'zaargon-4', 'zaargon-5',
    'crimson-1', 'crimson-2', 'crimson-3', 'crimson-4', 'crimson-5'
  ],
  BG: {
    start: 'assets/bg-start.jpg',
    victory: 'assets/bg-victory.jpg',
    repair: 'assets/bg-repair.jpg',
    starfield: 'assets/bg-starfield.jpg'
  },

  /* planet portraits sliced from the planets pack, grouped by dressing type so the
     system map can pick a fitting world. Indices are files assets/planets/planet-NN.png */
  PLANET_IMAGES: {
    Ocean: [0, 4, 9, 13, 17, 23],
    Ice: [5, 21, 3],
    Desert: [12, 19, 22, 8],
    Rocky: [6, 8, 18],
    Gas: [2, 10, 11, 14, 16, 20],
    Volcanic: [1, 6],
    Barren: [3, 7, 18]
  },

  /* weapon projectile / impact sprites from the projectiles pack (nose-up) */
  PROJECTILE_KEYS: {
    // direct-fire battery shells (broadsides)
    shellPlayer: 'cannon_shell_he_02',
    shellEnemy: 'cannon_shell_ap_01',
    tracerPlayer: 'tracer_bullet_blue_08',
    railPlayer: 'railgun_slug_blue_04',
    railEnemy: 'railgun_slug_red_05',
    // lance beams
    beamPlayer: 'laser_beam_blue_01',
    beamEnemy: 'laser_beam_red_02',
    lancePlayer: 'particle_lance_cyan_05',
    pulseEnemy: 'pulse_laser_red_08',
    // torpedoes
    torpPlayer: 'heavy_torpedo_blue_05',
    torpEnemy: 'heavy_torpedo_red_04',
    missile: 'standard_missile_orange_02',
    plasmaTorp: 'plasma_torpedo_green_09',
    // impacts / flashes
    muzzle: 'muzzle_flash_cannon_orange_01',
    sparkPlayer: 'impact_sparks_blue_06',
    sparkEnemy: 'impact_sparks_red_07',
    shieldHit: 'shield_hit_cyan_08'
  },

  /* animated explosion spritesheets — grid layouts, frames read left-to-right,
     top-to-bottom. cols is derived from sheet width / frame size at load time. */
  EXPLOSION_SETS: {
    small: { src: 'assets/explosions/small_orange_16.png', frames: 16, frame: 256 },
    big: { src: 'assets/explosions/capital_orange_20.png', frames: 20, frame: 320 }
  },

  /* faction crests used as sector-map system icons (from the design file) */
  EMBLEM_KEYS: ['terran', 'zaargon', 'crimson', 'hive'],

  ships: {},
  planets: {},        // 'NN' → Image
  projectiles: {},    // key → Image
  explosions: {},     // name → { img, frames, frame, cols }
  emblems: {},        // faction id → Image
  starfield: null,

  emblemSrc(faction) { return 'assets/emblems/' + faction + '.png'; },

  shipSrc(key) { return 'assets/ships/' + key + '.png'; },

  init() {
    ASSETS.SHIP_KEYS.forEach(k => {
      const img = new Image();
      img.src = ASSETS.shipSrc(k);
      ASSETS.ships[k] = img;
    });
    ASSETS.starfield = new Image();
    ASSETS.starfield.src = ASSETS.BG.starfield;

    // planet portraits 00..23
    for (let i = 0; i < 24; i++) {
      const img = new Image();
      img.src = 'assets/planets/planet-' + String(i).padStart(2, '0') + '.png';
      ASSETS.planets[String(i)] = img;
    }
    // projectile sprites
    Object.entries(ASSETS.PROJECTILE_KEYS).forEach(([k, file]) => {
      const img = new Image();
      img.src = 'assets/projectiles/' + file + '.png';
      ASSETS.projectiles[k] = img;
    });
    // faction emblems
    ASSETS.EMBLEM_KEYS.forEach(f => {
      const img = new Image();
      img.src = ASSETS.emblemSrc(f);
      ASSETS.emblems[f] = img;
    });
    // explosion spritesheets
    Object.entries(ASSETS.EXPLOSION_SETS).forEach(([name, def]) => {
      const img = new Image();
      img.src = def.src;
      const rec = { img, frames: def.frames, frame: def.frame, cols: 0 };
      img.onload = () => { rec.cols = Math.max(1, Math.round(img.naturalWidth / def.frame)); };
      ASSETS.explosions[name] = rec;
    });
  },

  /* returns the sprite Image if it has finished loading, else null */
  sprite(key) {
    const img = ASSETS.ships[key];
    return (img && img.complete && img.naturalWidth > 0) ? img : null;
  },

  /* returns a loaded projectile Image (or null while still loading) */
  projectile(key) {
    const img = ASSETS.projectiles[key];
    return (img && img.complete && img.naturalWidth > 0) ? img : null;
  },

  /* an explosion set record { img, frames, frame, cols } once its sheet has loaded */
  explosion(name) {
    const rec = ASSETS.explosions[name];
    return (rec && rec.img.complete && rec.img.naturalWidth > 0 && rec.cols > 0) ? rec : null;
  },

  /* deterministic planet portrait path for a dressing type + seed */
  planetImageSrc(type, seed) {
    const pool = ASSETS.PLANET_IMAGES[type] || ASSETS.PLANET_IMAGES.Rocky;
    const idx = pool[Math.abs(seed | 0) % pool.length];
    return 'assets/planets/planet-' + String(idx).padStart(2, '0') + '.png';
  }
};

ASSETS.init();

if (typeof window !== 'undefined') window.ASSETS = ASSETS;
