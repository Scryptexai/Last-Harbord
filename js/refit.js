// ============ Refit: tangga progresi kapal ============
// Desain: SATU jalur yang selalu jelas, tiap tingkat = satu CAPABILITY + satu bagian
// kapal yang benar-benar terlihat. Tidak ada angka yang tidak berarti.
import { CFG } from './config.js';
import { G } from './state.js';

export const REFIT = CFG.REFIT;

export function rungsDone(track) {
  let n = 0;
  for (let i = 0; i < G.refit && i < REFIT.length; i++) if (REFIT[i].track === track) n++;
  return n;
}

export const storageLv = () => rungsDone('storage');
export const speedLv = () => rungsDone('speed');
export const hullLv = () => rungsDone('hull');

export const capacity = () => CFG.BOAT.BASE_STORAGE + 6 * storageLv();
export const speedMult = () => 1 + 0.15 * speedLv();
export const maxHP = () => 100 + (hullLv() >= 1 ? 40 : 0) + (hullLv() >= 2 ? 45 : 0);

export const nextRung = () => (G.refit < REFIT.length ? REFIT[G.refit] : null);
export const isMaxed = () => G.refit >= REFIT.length;

// Tier sprite kapal: 1 (kecil) -> 2 -> 3 (penuh). Semua tier bisa dicapai.
export function boatTier() {
  if (G.refit >= 5) return 3;
  if (G.refit >= 2) return 2;
  return 1;
}

// Berapa lagi yang dibutuhkan untuk rung berikutnya (untuk goal gradient).
export function shortfall(cost) {
  const out = [];
  for (const [type, need] of Object.entries(cost)) {
    const have = G.banked[type] || 0;
    if (have < need) out.push({ type, need, have, missing: need - have });
  }
  return out;
}

export function canBuyNext() {
  const rung = nextRung();
  if (!rung) return false;
  return Object.entries(rung.cost).every(([t, n]) => (G.banked[t] || 0) >= n);
}

// Beli rung berikutnya. Mengembalikan rung atau null bila gagal.
export function buyNext() {
  const rung = nextRung();
  if (!rung) return null;
  if (!canBuyNext()) return null;
  for (const [t, n] of Object.entries(rung.cost)) G.banked[t] -= n;
  G.refit++;
  // Lambung baru = perbaikan penuh. Ini hadiah nyata, bukan cuma angka.
  // Riwayat kerusakan (tambalan) ikut terhapus: lambungnya benar-benar baru.
  if (rung.track === 'hull') { G.hull = maxHP(); G.deepHull = maxHP(); }
  return rung;
}

// Label ringkas untuk HUD: "Palka I — butuh 3 kayu lagi"
export function goalLabel() {
  const rung = nextRung();
  if (!rung) return { done: true, text: 'Kapal lengkap' };
  const missing = shortfall(rung.cost);
  if (missing.length === 0) return { done: false, text: `${rung.label} siap dibangun`, ready: true };
  const parts = missing.map((m) => `${m.missing} ${CFG.RESOURCES[m.type].short.toLowerCase()}`);
  return { done: false, text: `${rung.label} · ${parts.join(' + ')} lagi`, ready: false };
}
