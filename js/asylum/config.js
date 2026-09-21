// ============ Last Asylum: Plague — konfigurasi & balancing ============
// Satu tempat untuk semua angka (konvensi repo). Waktu dalam detik, jarak dalam
// pixel dunia. Angka bertanda [spec] diambil dari dokumen spesifikasi arsitektur
// (docs/ASYLUM_SPEC.md) — kamera §1, gerak §2, rigging §3, UI §4, core loop §5.
//
// Game ini adalah game KEDUA di repo ini (sebelahnya: Driftholm/Last Harbor).
// Ia memakai fondasi mesin yang sama: proyeksi miring, input joystick, WebAudio,
// partikel — tapi dunia, loop, dan HUD-nya sendiri.

export const ACFG = {
  SAVE_KEY: 'last-asylum-save-v1',

  // KAMERA — [spec §1.1] Steep Perspective Rig:
  //   Perspective, FOV 28°–32° (telephoto), Pitch 58°, Yaw 0°, Roll 0°,
  //   offset (0, 15, -9.3).
  // Terjemahan ke proyeksi 2.5D repo (bahasa yang sama dengan js/camera.js):
  //   offset (0,15,-9.3) -> sudut pandang atan2(15, 9.3) = 58.2° => TILT = cos(58°)
  //   FOV sempit (telephoto, edge distortion minimal) => skala kedalaman NARROW
  CAM: {
    TILT: Math.cos(58 * Math.PI / 180),  // ≈ 0.5299 — tanah terpotong 47%
    LIFT: 0.07,        // pemain duduk sedikit di bawah tengah: dunia di depan lebih banyak
    PERSP: 0.00042,    // telephoto: perubahan ukuran per px kedalaman sangat kecil
    PERSP_MIN: 0.90,
    PERSP_MAX: 1.12,
    SMOOTH_TIME: 0.18, // [spec §1.2] damped spring
    LOOK_AHEAD: 1.2,   // [spec §1.2] forward look-ahead
    MAX_SPEED: 2400,   // guard SmoothDamp (px/s) — bukan limit kecepatan
  },

  // DOKTER — [spec §2] inersia putar + penapakan kaki terkunci
  DOCTOR: {
    RADIUS: 12,
    SPEED: 132,                        // kecepatan linier maksimum (px/s)
    MAX_TURN: 720 * Math.PI / 180,     // [spec §2.1] 720°/s = 12.566 rad/s
    TURN_PENALTY_AT: Math.PI / 2,      // [spec §2.1] |Δsudut| > 90° => penalty
    TURN_PENALTY: 0.6,                 // [spec §2.1] kecepatan dipotong ke 60%
    ACCEL_T: 0.10,                     // [spec §2.2] 0 -> MaxSpeed
    DECEL_T: 0.15,                     // [spec §2.2] MaxSpeed -> 0 (1 langkah penutup)
    STRIDE_PX: 48,                     // jarak per siklus langkah penuh (sinkron animasi)
  },

  // RIG — [spec §3] secondary motion
  RIG: {
    CLOAK_STIFF: 0.35,   // [spec §3.2] stiffness jubah
    CLOAK_DAMP: 0.45,    // [spec §3.2] damping
    CLOAK_DRAG: 0.20,    // [spec §3.2] drag
    CLOAK_CHAINS: 3,     // [spec §3.1] Cloak_Chain L / Mid / R
    CLOAK_BONES: 3,      // [spec §3.1] 3 bone per chain
    CLOAK_BONE: 6,       // panjang 1 bone (px)
    CLOAK_GRAV: 220,     // gravitasi kain menuju kamera (px/s²)
    LANTERN_LIMIT: 25 * Math.PI / 180, // [spec §3.2] hinge ±25°
    LANTERN_LEN: 15,
    LANTERN_K: 46,       // konstanta pegas pendulum
    LANTERN_D: 3.4,      // damping pendulum
    LANTERN_DRIVE: 30,   // dorongan ritmis mengikuti langkah (rad/s²)
  },

  // DUNIA — pelataran rumah sakit wabah (px dunia; +y = selatan = ke kamera)
  WORLD: {
    BOUNDS: { x0: -400, x1: 400, y0: -170, y1: 640 },
    GATE: { x: 0, y: -120 },           // gerbang utara: pasien masuk dari sini
    QUEUE: [                            // 3 slot antre di depan gerbang
      { x: -36, y: -58 }, { x: 0, y: -44 }, { x: 36, y: -58 },
    ],
    NODES: {
      TICK: 0.5,      // 1 unit per 0.5s saat berdiri di depan node
      STOCK: 5,       // stok per node (kayu lebih besar, di world.js)
      REGROW: 6,      // detik untuk tumbuh kembali
      RADIUS: 40,     // radius berdiri untuk memanen
    },
  },

  // SUMBER DAYA — [spec §4.1.1] top dashboard: Gandum, Daun Herbal, Kayu (+ koin)
  RES: {
    wheat: { label: 'Gandum',      short: 'GDM', color: '#e0b95a', deep: '#8a6a24' },
    herb:  { label: 'Daun Herbal', short: 'HRB', color: '#7cb45e', deep: '#3d6b2a' },
    wood:  { label: 'Kayu',        short: 'KAY', color: '#a06a35', deep: '#573517' },
  },

  // PASIEN — [spec §5] core loop: masuk -> kasur -> treat -> koin
  PATIENT: {
    SPAWN_MIN: 12, SPAWN_MAX: 20,   // detik antar pasien (idle pacing)
    FIRST_SPAWN: 4,                 // pasien pertama cepat (onboarding)
    QUEUE_CAP: 3,
    WALK_SPEED: 46,
    TREAT_HERB: 12,                 // herbal per pasien
    TREAT_WHEAT: 2,                 // gandum per pasien (makanan)
    TREAT_TICK: 0.22,               // detik per unit (≈ 3.1s treatment)
    REWARD_MIN: 8, REWARD_MAX: 14,  // koin per pasien sembuh
    CONDITION_DRAIN: 100 / 90,      // %/s saat mengantre di gerbang
    BED_DRAIN: 100 / 240,           // %/s saat di kasur menunggu ditangani
  },

  // BANGSAL — [spec §5.1] ghost tile: ikon + biaya, transfer per tick 0.05s
  WARD: {
    BEDS: 3,
    COST_COINS: 60,
    COST_WOOD: 16,
    BUILD_TICK: 0.05,   // [spec §5.1] 1 koin per 0.05 detik
    RADIUS: 46,         // radius zona build
  },

  // MISI — [spec §4.1.2] quest tracker capsule. metric dibaca dari stats/aksi.
  QUESTS: [
    { id: 'q_walk',    label: 'Jelajahi pelataran',      icon: 'walk',  metric: 'walkPx',      target: 150, reward: 5 },
    { id: 'q_herb',    label: 'Panen 4 Daun Herbal',      icon: 'herb',  metric: 'harvestHerb', target: 4,   reward: 8 },
    { id: 'q_wheat',   label: 'Panen 3 Gandum',           icon: 'wheat', metric: 'harvestWheat',target: 3,   reward: 8 },
    { id: 'q_treat1',  label: 'Tangani pasien pertama',   icon: 'bed',   metric: 'cured',       target: 1,   reward: 15 },
    { id: 'q_wood',    label: 'Ambil 6 Kayu',             icon: 'wood',  metric: 'harvestWood', target: 6,   reward: 10 },
    { id: 'q_ward1',   label: 'Bangun Bangsal II',        icon: 'build', metric: 'wardsBuilt',  target: 1,   reward: 25 },
    { id: 'q_treat6',  label: 'Tangani 6 pasien',         icon: 'bed',   metric: 'cured',       target: 6,   reward: 30 },
    { id: 'q_ward2',   label: 'Bangun Bangsal III',       icon: 'build', metric: 'wardsBuilt',  target: 2,   reward: 35 },
    { id: 'q_treat12', label: 'Tangani 12 pasien',        icon: 'bed',   metric: 'cured',       target: 12,  reward: 45 },
    { id: 'q_final',   label: 'Rumah sakit ini hidup',    icon: 'cross', metric: 'cured',       target: 18,  reward: 60 },
  ],

  // CERITA PEMBUKA — [spec §4.1.4] dialog box: ilustrasi kanan bawah, teks kiri bawah
  DIALOGUE: [
    'Kota lumpuh oleh wabah. Dokter-dokter lain sudah pergi — kau yang terakhir di rumah sakit ini.',
    'Di barat laut, ladang gandum. Di timur laut, taman herbal. Di barat daya, tumpukan kayu untuk bangunan.',
    'Pasien datang lewat gerbang utara. Berdirilah di samping kasurnya untuk menangani mereka — herbal berpindah ke tubuh mereka.',
    'Setiap pasien yang sembuh, koin berpindah ke tanganmu. Koin dan kayu membangun bangsal baru.',
    'Jangan biarkan mereka menunggu terlalu lama. Itu tugasmu. Itu saja.',
  ],
};
