// ============ Inventory: DIBAGI DUA ============
// carried = hasil run yang masih di tangan. Hanya jadi milikmu setelah dibongkar di kapal.
// banked  = gudang di dermaga. Tidak bisa hilang, dipakai untuk refit.
import { G } from './state.js';
import { capacity } from './refit.js';

export const RES_TYPES = ['fuel', 'wood', 'food', 'medicine'];

export const emptyBag = () => ({ fuel: 0, wood: 0, food: 0, medicine: 0 });

export function carriedLoad() {
  return RES_TYPES.reduce((s, t) => s + (G.carried[t] || 0), 0);
}

export function bankLoad() {
  return RES_TYPES.reduce((s, t) => s + (G.banked[t] || 0), 0);
}

export const carriedFull = () => carriedLoad() >= capacity();
export const carriedRoom = () => Math.max(0, capacity() - carriedLoad());

// Tambah ke bawaan (dibatasi kapasitas palka). Return jumlah yang benar-benar masuk.
export function addCarried(type, qty = 1) {
  let added = 0;
  while (added < qty && carriedLoad() < capacity()) {
    G.carried[type] = (G.carried[type] || 0) + 1;
    added++;
  }
  return added;
}

export function addBanked(type, qty = 1) {
  G.banked[type] = (G.banked[type] || 0) + qty;
}

// Bongkar muatan: carried -> banked. Ini momen "selamat" tiap run.
export function bankCarried() {
  const moved = { ...G.carried };
  for (const t of RES_TYPES) {
    G.banked[t] = (G.banked[t] || 0) + (G.carried[t] || 0);
    G.carried[t] = 0;
  }
  return moved;
}

export function dropCarried() {
  const dropped = { ...G.carried };
  G.carried = emptyBag();
  return dropped;
}

export function canAffordBanked(cost) {
  return Object.entries(cost).every(([t, n]) => (G.banked[t] || 0) >= n);
}

export function payBanked(cost) {
  for (const [t, n] of Object.entries(cost)) G.banked[t] -= n;
}
