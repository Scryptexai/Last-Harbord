// ============ Inventory & resource ============
import { G } from './state.js';

export const RES_TYPES = ['fuel', 'wood', 'food', 'medicine'];

export function capacity() {
  return 10 + G.upgrades.storage * 5; // default 10, +5 per level storage
}

export function usedStorage() {
  return RES_TYPES.reduce((s, t) => s + (G.resources[t] || 0), 0);
}

// Tambah resource, dibatasi kapasitas. Return jumlah yang benar-benar masuk.
export function addResource(type, qty = 1) {
  const cap = capacity();
  let added = 0;
  for (let i = 0; i < qty; i++) {
    if (usedStorage() >= cap) break;
    G.resources[type] = (G.resources[type] || 0) + 1;
    added++;
  }
  return added;
}

export function canAfford(cost) {
  return Object.entries(cost).every(([t, n]) => (G.resources[t] || 0) >= n);
}

export function payCost(cost) {
  for (const [t, n] of Object.entries(cost)) G.resources[t] -= n;
}
