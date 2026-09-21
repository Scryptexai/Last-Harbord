// ============ Last Asylum: Plague — state global (singleton) ============
// Konvensi repo: satu objek mutable A, transient di sini, persist di save.js.
//
// YANG TIDAK DIPERSIST: pasien yang sedang dalam perjalanan/kasur. Muatannya
// (koin & bahan) aman; pasien yang belum sembuh adalah urusan malam ini —
// reload tidak memutar waktu pasien.

export const A = {
  time: 0,
  paused: false,
  phase: 'dialog',          // 'dialog' | 'play'
  zoom: 1,                  // dihitung saat resize (portrait mobile first)

  doctor: null,             // lihat doctor.js
  rig: null,                // lihat rig.js (jubah + lentera)
  cam: { x: 0, y: -40, vx: { v: 0 }, vy: { v: 0 } },

  res: { wheat: 6, herb: 6, wood: 8, coins: 12 },   // modal awal: cukup untuk bernapas

  wards: [],                // [{ id, name, x, y, built, beds[], trigger, progress }]
  nodes: [],                // [{ id, type, x, y, stock, cool, ht }]
  patients: [],             // lihat patients.js
  nextPatientIn: 0,
  patientSeq: 0,

  quests: { idx: 0, progress: 0 },

  stats: {
    cured: 0, lost: 0, wardsBuilt: 0, walkPx: 0, coinsEarned: 0,
    harvest: { wheat: 0, herb: 0, wood: 0 },
  },

  dialogue: { i: 0 },
  hints: {},                // one-shot hint yang sudah pernah tampil
  saveDirty: false,
  muted: false,
  loaded: false,
};
