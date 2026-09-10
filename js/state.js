// ============ State global game (shared singleton) ============
export const G = {
  state: 'dashboard',   // 'dashboard' | 'sea' | 'land' | 'gameover'
  time: 0,              // total waktu berjalan (animasi)
  runActive: false,     // sedang dalam run (sail)?
  runTime: 0,           // detik survival run sekarang

  boat: null,           // { x,y,vx,vy,angle }
  islands: [],          // pulau-pulau di laut
  land: null,           // state daratan saat explore
  nearIsland: null,     // { island, dist } terdekat dari perahu
  autopilotTarget: null,// island yang dituju otomatis
  fishing: null,        // { t, dur } saat memancing
  anchored: false,
  cam: { x: 0, y: 0 },

  // ---- data yang dipersist ke localStorage ----
  boatHP: 100,          // HP dipakai bareng perahu & karakter daratan
  resources: { fuel: 0, wood: 0, food: 0, medicine: 0 },
  upgrades: { storage: 0, speed: 0, defense: 0 }, // level 0-2
  totalRuns: 0,
  bestTime: 0,          // detik

  // ---- flags internal ----
  hpFlash: 0,           // efek layar merah saat kena hit
  pendingDeath: false,
  saveDirty: false,
  deathInfo: null,
};
