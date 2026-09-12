// ============ Save / Load (localStorage) ============
// Yang disimpan: progresi kapal (refit), hull, gudang (banked), jumlah run,
// pelampung salvage, peta yang sudah disurvei, dan pulau mana yang sudah dikuras.
//
// TIDAK disimpan: muatan yang sedang dibawa (carried). Muatan hanya jadi milikmu
// setelah dibongkar di kapal — itu aturan inti game, dan reload bukan pengecualian.
import { CFG } from './config.js';
import { G } from './state.js';
import { emptyBag } from './inventory.js';
import { resetTide, updateTide } from './tide.js';

const int = (v, d = 0) => (Number.isFinite(+v) ? Math.max(0, Math.floor(+v)) : d);

export function saveGame() {
  try {
    const data = {
      version: 2,
      worldSeed: G.worldSeed >>> 0,
      refit: Math.min(CFG.REFIT.length, int(G.refit)),
      hull: Math.max(0, Math.round(G.hull)),
      deepHull: Math.max(0, Math.round(G.deepHull)),
      banked: {
        fuel: int(G.banked.fuel), wood: int(G.banked.wood),
        food: int(G.banked.food), medicine: int(G.banked.medicine),
      },
      totalRuns: int(G.totalRuns),
      salvages: (G.salvages || []).slice(0, 12).map((s) => ({
        islandId: int(s.islandId), x: +s.x || 0, y: +s.y || 0,
        cargo: {
          fuel: int(s.cargo && s.cargo.fuel), wood: int(s.cargo && s.cargo.wood),
          food: int(s.cargo && s.cargo.food), medicine: int(s.cargo && s.cargo.medicine),
        },
      })),
      tideT: Math.max(0, Math.min(CFG.TIDE.DAWN_AT + CFG.TIDE.DAWN_FALL - 0.01, +(G.tide ? G.tide.t : 0) || 0)),
      nights: int(G.tide && G.tide.night),
      surveyed: Object.keys(G.surveyed || {}).map((k) => int(k)),
      tabbed: G.tabbed || {},
      muted: !!G.muted,
    };
    localStorage.setItem(CFG.SAVE_KEY, JSON.stringify(data));
    G.saveDirty = false;
  } catch (e) { /* localStorage tidak tersedia — abaikan */ }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(CFG.SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || d.version !== 2) return false;

    G.worldSeed = (d.worldSeed >>> 0) || 1;
    G.refit = Math.min(CFG.REFIT.length, int(d.refit));
    G.hull = Math.max(1, Math.round(+d.hull || 100));
    G.deepHull = Math.max(0, Math.round(+d.deepHull || G.hull));
    const b = d.banked || {};
    G.banked = { fuel: int(b.fuel), wood: int(b.wood), food: int(b.food), medicine: int(b.medicine) };
    G.carried = emptyBag(); // selalu mulai dengan tangan kosong
    G.totalRuns = int(d.totalRuns);
    // Malam lanjut dari tempat ia berhenti, bukan dari nol: dermaga membekukan jam,
    // dan menutup game bukan cara memutar waktu ke belakang.
    resetTide();
    if (Number.isFinite(+d.tideT)) {
      const total = CFG.TIDE.DAWN_AT + CFG.TIDE.DAWN_FALL;
      G.tide.t = Math.max(0, Math.min(total - 0.01, +d.tideT));
      G.tide.night = int(d.nights);
      updateTide(0);
      G.tide.justChanged = false;    // jangan menembakkan beat transisi saat memuat
      G.tide.justDawned = false;
      G.tide.warn = 0;
    }
    G.salvages = Array.isArray(d.salvages) ? d.salvages.map((s) => ({
      islandId: int(s.islandId), x: +s.x || 0, y: +s.y || 0,
      cargo: { fuel: int(s.cargo && s.cargo.fuel), wood: int(s.cargo && s.cargo.wood), food: int(s.cargo && s.cargo.food), medicine: int(s.cargo && s.cargo.medicine) },
    })).filter((s) => Object.values(s.cargo).some((n) => n > 0)) : [];

    const sv = {};
    if (Array.isArray(d.surveyed)) for (const id of d.surveyed) sv[int(id)] = true;
    G.surveyed = sv;

    const tk = {};
    if (d.tabbed && typeof d.tabbed === 'object') {
      for (const [id, v] of Object.entries(d.tabbed)) {
        tk[int(id)] = { fuel: int(v.fuel), wood: int(v.wood), food: int(v.food), medicine: int(v.medicine) };
      }
    }
    G.tabbed = tk;
    G.muted = !!d.muted;
    return true;
  } catch (e) {
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(CFG.SAVE_KEY); } catch (e) { /* noop */ }
}
