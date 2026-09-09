// ============ Konfigurasi game ============
export const CFG = {
  SAVE_KEY: 'last-harbor-save-v1',

  BOAT: {
    BASE_HP: 100,       // HP awal perahu
    BASE_STORAGE: 10,   // kapasitas storage awal (slot)
    BASE_SPEED: 1,      // multiplikator speed awal
    ACCEL: 260,         // akselerasi (px/s^2)
    MAX_SPEED: 170,     // kecepatan maksimum dasar (px/s)
    DRAG: 0.985,        // gesekan per frame 60fps (inertia / deceleration)
  },

  PLAYER: {
    RADIUS: 13,
    SPEED: 135,          // px/s
    ATTACK_RANGE: 50,
    ATTACK_DAMAGE: 26,
    ATTACK_COOLDOWN: 0.45,
    PICKUP_RADIUS: 26,   // auto-collect dengan mendekati
    COLLECT_RADIUS: 75,  // radius tombol COLLECT
  },

  SEA: {
    ISLAND_COUNT: 6,
    ISLAND_DIST_MIN: 200, // spawn pulau radius 200-400px dari perahu
    ISLAND_DIST_MAX: 400,
  },

  LAND: {
    BASE_RADIUS: 170,
    RADIUS_PER_DIFF: 30, // pulau makin besar saat difficulty naik
  },

  // 3 tipe zombie: Slow (HP tinggi, lambat), Fast (HP rendah, cepat), Tank (HP sangat tinggi, lambat, damage besar)
  ZOMBIES: {
    slow: { label: 'Slow', hp: 60,  speed: 42,  dmg: 6,  radius: 14, aggro: 130, color: '#9f1d1d', outline: '#5c0f0f' },
    fast: { label: 'Fast', hp: 25,  speed: 100, dmg: 4,  radius: 9,  aggro: 180, color: '#ef4444', outline: '#7f1d1d' },
    tank: { label: 'Tank', hp: 130, speed: 28,  dmg: 14, radius: 20, aggro: 110, color: '#6d28d9', outline: '#3b0764' },
  },

  RESOURCES: {
    fuel:     { label: 'Fuel',     color: '#f59e0b', icon: '⛽' },
    wood:     { label: 'Wood',     color: '#b45309', icon: '🪵' },
    food:     { label: 'Food',     color: '#dc2626', icon: '🍖' },
    medicine: { label: 'Medicine', color: '#e5e7eb', icon: '💊' },
  },

  HEAL: { food: 10, medicine: 30 },

  FISH: { DURATION: 3, CHANCE_FOOD: 0.6, CHANCE_WOOD: 0.15 },

  // Biaya upgrade sesuai tabel spesifikasi
  UPGRADES: {
    storage: { label: 'Storage', desc: '+5 slot per level', levels: [
      { cost: { wood: 10, fuel: 5 } },
      { cost: { wood: 20, fuel: 10 } },
    ]},
    speed: { label: 'Speed', desc: '+20% speed per level', levels: [
      { cost: { fuel: 5, wood: 5 } },
      { cost: { fuel: 10, wood: 10 } },
    ]},
    defense: { label: 'Defense', desc: '+20 HP per level', levels: [
      { cost: { wood: 10, medicine: 5 } },
      { cost: { wood: 20, medicine: 10 } },
    ]},
  },

  ISLAND_NAMES: [
    'Pulau Karang', 'Pulau Hantu', 'Pulau Boneka', 'Pulau Terlarang',
    'Pulau Pasir', 'Pulau Batu', 'Pulau Kelapa', 'Pulau Tengkorak',
    'Pulau Sunyi', 'Pulau Badai', 'Pulau Mutiara', 'Pulau Ular',
    'Pulau Api', 'Pulau Kabut', 'Pulau Garam', 'Pulau Bulan',
  ],
};
