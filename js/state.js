// ============ State global game (shared singleton) ============
import { emptyBag } from './inventory.js';

export const G = {
  state: 'harbor',      // 'harbor' | 'sea' | 'land' | 'gameover'
  time: 0,              // total waktu berjalan (animasi)
  runActive: false,     // sedang dalam run (meninggalkan dermaga)?
  runTime: 0,           // detik sejak meninggalkan harbor

  // dunia
  worldSeed: 1,
  islands: [],          // pulau-pulau di kepulauan (persisten)
  boat: null,           // { x,y,vx,vy,angle }
  land: null,           // state daratan saat mendarat
  harbor: null,         // state dermaga (walkable)
  nearIsland: null,     // { island, dist }
  fishing: null,        // { t, dur }
  anchored: false,
  cam: { x: 0, y: 0, zoom: 1 },
  target: null,         // pulau yang dipilih di peta -> jadi penunjuk arah

  // ---- dipersist ke localStorage ----
  refit: 0,             // jumlah tingkat refit yang selesai (0..6) = progresi tunggal
  hull: 100,            // hull = nyawa. Dipakai bersama perahu & karakter darat.
  carried: emptyBag(),  // hasil run yang belum dibongkar (BISA HILANG)
  banked: emptyBag(),   // gudang di dermaga (AMAN)
  totalRuns: 0,
  salvages: [],         // [{ islandId, x, y, cargo }] pelampung bekas kematian
  surveyed: {},         // islandId -> true (sudah pernah dipijak / terlihat dekat)
  tabbed: {},           // islandId -> jumlah unit yang sudah diambil dari pulau itu
  muted: false,

  // ---- flags internal ----
  hurtFlash: 0,
  hurtDir: null,        // { angle, t } indikator arah serangan
  pendingDeath: false,
  deathInfo: null,
  saveDirty: false,
  bankBeat: 0,          // 0..1 animasi pembongkaran muatan
  bankedLast: null,     // muatan yang baru dibongkar (untuk animasi)
};

export function resetTransient() {
  G.land = null;
  G.fishing = null;
  G.anchored = false;
  G.target = null;
  G.runTime = 0;
  G.runActive = false;
  G.cam.zoom = 1;
}
