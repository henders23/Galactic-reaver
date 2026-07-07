/* Galactic Reaver — image assets: faction ship sprites + backgrounds */
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
  ships: {},
  starfield: null,

  shipSrc(key) { return 'assets/ships/' + key + '.png'; },

  init() {
    ASSETS.SHIP_KEYS.forEach(k => {
      const img = new Image();
      img.src = ASSETS.shipSrc(k);
      ASSETS.ships[k] = img;
    });
    ASSETS.starfield = new Image();
    ASSETS.starfield.src = ASSETS.BG.starfield;
  },

  /* returns the sprite Image if it has finished loading, else null */
  sprite(key) {
    const img = ASSETS.ships[key];
    return (img && img.complete && img.naturalWidth > 0) ? img : null;
  }
};

ASSETS.init();

if (typeof window !== 'undefined') window.ASSETS = ASSETS;
