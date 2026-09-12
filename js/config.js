// ============ Konfigurasi & balancing ============
// Satu tempat untuk semua angka. Semua waktu dalam detik, jarak dalam pixel dunia.

export const CFG = {
  SAVE_KEY: 'last-harbor-save-v2',

  // KAMERA — proyeksi miring 3/4, bukan pandangan atas.
  // TILT = cos sudut kamera terhadap tanah (1 = tampak atas, 0.5 = sangat miring).
  //   0.66 ~ 49 derajat, 0.62 ~ 52 derajat, 0.50 ~ 60 derajat (proyeksi dimetrik 2:1,
  //   standar pandangan 3/4 ala Zelda/Stardew — tanah "meresap" ke belakang, bukan peta).
  // Semua sprite memakai atUpright(), jadi benda berdiri tetap tegak; yang berubah saat
  // TILT diturunkan adalah seberapa gepeng TANAH dan seberapa terasa "melihat ke depan".
  CAM: {
    TILT: 0.40,        // ~66 derajat dari datar: foreshortening jelas terlihat, bukan tampak atas
    LIFT: 0.10,        // kamera mengangkat fokus: pemain duduk di bawah-tengah (lebih banyak dunia di depan)
    PERSP: 0.00090,    // perubahan ukuran per px kedalaman (paralaks kuat: depan besar, belakang kecil)
    PERSP_MIN: 0.78,
    PERSP_MAX: 1.32,
  },

  BOAT: {
    BASE_HP: 100,       // hull = nyawa pemain (lihat catatan desain di README)
    BASE_STORAGE: 10,   // kapasitas palka awal
    ACCEL: 285,         // akselerasi px/s^2
    MAX_SPEED: 168,     // kecepatan maksimum dasar px/s — pelayaran yang berat, bukan meluncur
    DRAG: 0.985,        // gesekan per frame 60fps (inersia)
    PARK_OFFSET: 44,    // jarak perahu dari tepi pulau saat bersandar
    SHALLOW_SLOW: 0.62, // perahu melambat di air dangkal dekat pulau
  },

  PLAYER: {
    RADIUS: 13,
    SPEED: 148,
    ACCEL_T: 0.10,          // waktu untuk mencapai kecepatan penuh
    TURN_T: 0.09,           // interpolasi arah hadap
    ATTACK_RANGE: 46,
    ATTACK_DAMAGE: 26,
    WINDUP: 0.10,           // ancang-ancang (tanpa damage)
    ACTIVE: 0.12,           // jendela damage
    RECOVER: 0.23,          // pemulihan (rentan)
    KNOCKBACK: 26,
    INVULN: 0.35,           // kebal singkat setelah terkena
    GATHER_NEAR: 34,        // radius untuk mulai memanen
    GATHER_SMALL: 0.8,
    GATHER_RICH: 1.2,
    GATHER_SALVAGE: 1.4,
    REVEAL: 135,            // radius penglihatan di darat (px dunia)
  },

  // Dunia = kepulauan tetap, jarak dari harbor adalah dial kesulitan.
  SEA: {
    RINGS: [
      { key: 'near',   name: 'Perairan Dekat',  dist: [900, 1600],  count: 5, radius: [360, 405], nodes: 12, zombies: 5,  loot: 1,   tank: 0.00, fast: 0.25 },
      { key: 'mid',    name: 'Perairan Tengah', dist: [2000, 2700], count: 5, radius: [420, 480], nodes: 18, zombies: 8,  loot: 1.5, tank: 0.22, fast: 0.40 },
      { key: 'far',    name: 'Perairan Jauh',   dist: [3100, 3900], count: 5, radius: [490, 560], nodes: 24, zombies: 11, loot: 2,   tank: 0.40, fast: 0.45 },
    ],
    FOG: 940,          // jarak pandang di laut
    HINT: 1400,        // jarak munculnya tanda-tanda pulau (asap, camar)
    CHOP: 26,          // amplitudo gelombang saat pasang
  },

  LAND: {
    ZOOM: 1.58,        // kamera darat: pulau lebih besar dari layar, tidak pernah terlihat utuh
    PLAY_RATIO: 0.94,  // batas gerak dari radius pulau — pantai bisa dijalani sampai garis air
    SAND_RATIO: 0.70,  // di luar rasio ini = pantai (zombie melambat)
    FLOOD: 0.42,       // seberapa jauh air pasang naik ke pantai (0.42 = dari 1.06r ke 0.76r)
    WATER_SLOW: 0.5,   // zombie melambat di pantai
    FOG_CELL: 22,      // ukuran sel kabut eksplorasi (px dunia)
  },

  // KAWANAN: satu zombie yang menangkap pemain saat memanen memanggil yang lain.
  // Ini yang membuat pedalaman berbahaya: makin dalam, makin padat, makin ramai.
  PACK: { CALL_FRAC: 0.55, CALL_MIN: 180, ALERT_T: 6, AGGRO_MUL: 2.3, CALL_CD: 7 },

  ZOMBIES: {
    slow: { label: 'Berjalan', hp: 60,  speed: 42,  dmg: 6,  radius: 14, aggro: 150, color: '#9f1d1d', outline: '#5c0f0f', pitch: 150 },
    fast: { label: 'Pelari',   hp: 25,  speed: 104, dmg: 4,  radius: 9,  aggro: 210, color: '#ef4444', outline: '#7f1d1d', pitch: 320 },
    tank: { label: 'Raksasa',  hp: 130, speed: 30,  dmg: 14, radius: 20, aggro: 130, color: '#6d28d9', outline: '#3b0764', pitch: 90  },
  },

  RESOURCES: {
    fuel:     { label: 'Solar',    short: 'Solar', color: '#f59e0b', deep: '#7c4a03' },
    wood:     { label: 'Kayu',     short: 'Kayu',  color: '#b45309', deep: '#5c2a05' },
    food:     { label: 'Makanan',  short: 'Makan', color: '#dc2626', deep: '#6d1010' },
    medicine: { label: 'Obat',     short: 'Obat',  color: '#e5e7eb', deep: '#5b6472' },
  },

  HEAL: { food: 10, medicine: 30 },

  // Memancing: bukan lagi faucet gratis. Butuh umpan (makanan) dan berisiko waktu.
  FISH: { DURATION: 4, BAIT: 1, CHANCE_FOOD: 0.55, CHANCE_WOOD: 0.2, CHANCE_MED: 0.1 },

  // THE TIDE — satu jam run yang berubah dari ambience -> informasi -> gigi.
  TIDE: {
    PHASES: [
      { key: 'calm',    label: 'Tenang',   until: 150,  tint: 0.00, reinforce: 0,  seaDrain: 0   },
      { key: 'turning', label: 'Berubah',  until: 270,  tint: 0.35, reinforce: 26, seaDrain: 0   },
      { key: 'high',    label: 'Pasang',   until: 1e9,  tint: 0.70, reinforce: 14, seaDrain: 3.5, waveBonus: 1, wade: 0.72 },
    ],
    WADE: 0.78,           // lambat mengarungi air banjir saat pasang
    SEA_SAFE_NEAR: 170,   // aman dari drain jika lebih dekat dari ini ke pulau
    WARNING_AT: 12,       // detik sebelum fase berganti: gulls berhenti, angin naik
    // SATU MALAM. Jam pasang adalah milik malam, bukan milik satu run: ia hanya
    // berjalan saat kau di luar, membeku di dermaga, dan tidak pernah mundur kalau
    // kau tambat lalu berlayar lagi. Fajar memutarnya kembali — sekali, di ujung.
    DAWN_AT: 420,         // detik di laut sebelum fajar (7 menit)
    DAWN_FALL: 10,        // berapa lama air turun saat fajar
  },

  // Tangga refit: SATU jalur, satu tujuan berikutnya yang selalu jelas.
  // Aturan: biaya rung ke-N harus <= kapasitas yang tersedia sebelum rung itu dibeli.
  REFIT: [
    { track: 'storage', lv: 1, label: 'Palka I',    short: 'Palka',  effect: '+6 slot angkut',        desc: 'Peti kayu dipasang di dek. Palka menampung 16 unit.',      cost: { wood: 5,  fuel: 4 } },
    { track: 'speed',   lv: 1, label: 'Layar I',    short: 'Layar',  effect: '+15% kecepatan',        desc: 'Layar tambahan. Perahu lebih cepat mengejar pasang.',      cost: { wood: 8,  fuel: 5 } },
    { track: 'hull',    lv: 1, label: 'Lambung I',  short: 'Lambung',effect: '+40 hull, perbaikan penuh', desc: 'Papan lambung baru. Hull maksimum naik ke 140.',         cost: { wood: 9,  medicine: 5 } },
    { track: 'storage', lv: 2, label: 'Palka II',   short: 'Palka',  effect: '+6 slot angkut',        desc: 'Peti kedua. Palka menampung 22 unit.',                     cost: { wood: 9,  fuel: 5 } },
    { track: 'speed',   lv: 2, label: 'Layar II',   short: 'Layar',  effect: '+15% kecepatan',        desc: 'Layar besar. Perahu menantang perairan jauh.',             cost: { wood: 12, fuel: 8 } },
    { track: 'hull',    lv: 2, label: 'Lambung II', short: 'Lambung',effect: '+45 hull, perbaikan penuh', desc: 'Lambung penuh dan lentera terang. Hull maksimum 185.',   cost: { wood: 11, medicine: 9 } },
  ],

  // Varian pulau: identitas dibaca dari jarak jauh lewat tanda-tanda, bukan angka.
  FLAVORS: {
    quiet: { label: 'Sunyi',      sand: '#dccb96', grass: '#3f8a52', bias: { wood: 2, food: 2 },                          zombieMul: 0.8,  hint: 'Camar tenang' },
    wreck: { label: 'Karam',      sand: '#cdbb8a', grass: '#2f6b40', bias: { wood: 3, fuel: 1 },                          zombieMul: 1.0,  hint: 'Bangkai kapal' },
    ash:   { label: 'Abu',        sand: '#8d8676', grass: '#3a3f38', bias: { fuel: 3 },                                   zombieMul: 1.1,  hint: 'Asap naik' },
    ruins: { label: 'Reruntuhan', sand: '#d6c9a4', grass: '#4a6b45', bias: { medicine: 3 },                               zombieMul: 1.15, hint: 'Menara roboh' },
    reef:  { label: 'Karang',     sand: '#e6d9a8', grass: '#2d7a58', bias: { food: 3 },                                   zombieMul: 0.9,  hint: 'Banyak camar' },
  },

  ISLAND_NAMES: [
    'Pulau Karang', 'Pulau Hantu', 'Pulau Boneka', 'Pulau Terlarang',
    'Pulau Pasir', 'Pulau Batu', 'Pulau Kelapa', 'Pulau Tengkorak',
    'Pulau Sunyi', 'Pulau Badai', 'Pulau Mutiara', 'Pulau Ular',
    'Pulau Api', 'Pulau Kabut', 'Pulau Garam', 'Pulau Bulan',
    'Pulau Randai', 'Pulau Sepuh', 'Pulau Layar', 'Pulau Cermin',
  ],
};
