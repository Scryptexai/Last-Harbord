// ============ Save / Load (localStorage) ============
// Menyimpan: resource, level upgrade perahu, total run, best survival time, boatHP.
import { CFG } from './config.js';
import { G } from './state.js';

export function saveGame() {
  try {
    const data = {
      version: 1,
      resources: {
        fuel: Math.max(0, G.resources.fuel | 0),
        wood: Math.max(0, G.resources.wood | 0),
        food: Math.max(0, G.resources.food | 0),
        medicine: Math.max(0, G.resources.medicine | 0),
      },
      upgrades: {
        storage: Math.min(2, Math.max(0, G.upgrades.storage | 0)),
        speed: Math.min(2, Math.max(0, G.upgrades.speed | 0)),
        defense: Math.min(2, Math.max(0, G.upgrades.defense | 0)),
      },
      boatHP: Math.max(0, Math.round(G.boatHP)),
      totalRuns: Math.max(0, G.totalRuns | 0),
      bestTime: Math.max(0, +G.bestTime || 0),
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
    if (!d || d.version !== 1) return false;
    const res = d.resources || {};
    G.resources = {
      fuel: Math.max(0, res.fuel | 0),
      wood: Math.max(0, res.wood | 0),
      food: Math.max(0, res.food | 0),
      medicine: Math.max(0, res.medicine | 0),
    };
    const up = d.upgrades || {};
    G.upgrades = {
      storage: Math.min(2, Math.max(0, up.storage | 0)),
      speed: Math.min(2, Math.max(0, up.speed | 0)),
      defense: Math.min(2, Math.max(0, up.defense | 0)),
    };
    G.boatHP = Math.max(0, +d.boatHP || 0);
    G.totalRuns = Math.max(0, d.totalRuns | 0);
    G.bestTime = Math.max(0, +d.bestTime || 0);
    return true;
  } catch (e) {
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(CFG.SAVE_KEY); } catch (e) { /* noop */ }
}
