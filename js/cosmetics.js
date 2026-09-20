// ============ Kosmetik Drif (Fase 0: sink koin drif) ============
// Kosmetik mengubah RASA, bukan ANGKA: warna pelita kapal, aksen HUD, tinta
// jalur peta. Tidak ada kekuatan yang dijual — sesuai prinsip diskusi.
import { G } from './state.js';
import { markDrifSpent, markPurchase } from './analytics.js';

const KEY = 'lh_style_v1';

// Katalog: item tampil lewat warna yang benar-benar dipakai renderer.
export const CATALOG = [
  { id: 'lantern-brass', fam: 'lantern', name: 'Pelita Kuningan', price: 0,  rgb: [255, 190, 110], deep: [255, 150, 60] },
  { id: 'lantern-ember', fam: 'lantern', name: 'Pelita Bara',     price: 35, rgb: [255, 120, 70],  deep: [255, 60, 40] },
  { id: 'lantern-moss',  fam: 'lantern', name: 'Pelita Lumut',    price: 30, rgb: [150, 220, 140], deep: [60, 140, 70] },
  { id: 'lantern-dusk',  fam: 'lantern', name: 'Pelita Senja',    price: 30, rgb: [185, 155, 255], deep: [110, 70, 220] },
  { id: 'accent-brass',  fam: 'accent',  name: 'Aksen Kuningan',  price: 0,  css: ['#d9a54a', '#8a6a34'] },
  { id: 'accent-tide',   fam: 'accent',  name: 'Aksen Pirus',     price: 30, css: ['#4fc9c0', '#2b7e78'] },
  { id: 'accent-ember',  fam: 'accent',  name: 'Aksen Anggur',    price: 28, css: ['#e06a8a', '#8a2f4a'] },
  { id: 'chart-red',     fam: 'chart',   name: 'Tinta Merah',     price: 0,  color: 'rgba(120,30,20,0.75)' },
  { id: 'chart-pine',    fam: 'chart',   name: 'Tinta Pirus',     price: 22, color: 'rgba(18,95,90,0.80)' },
  { id: 'chart-plum',    fam: 'chart',   name: 'Tinta Anggur',    price: 22, color: 'rgba(95,30,75,0.80)' },
];
export const FAMILIES = { lantern: 'Pelita kapal', accent: 'Aksen antarmuka', chart: 'Tinta jalur peta' };

const DEFAULT_OWNED = { 'lantern-brass': 1, 'accent-brass': 1, 'chart-red': 1 };
const DEFAULT_EQUIP = { lantern: 'lantern-brass', accent: 'accent-brass', chart: 'chart-red' };

let cache = null;
function load() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const d = raw ? JSON.parse(raw) : {};
    cache = { owned: { ...DEFAULT_OWNED, ...(d.owned || {}) }, equipped: { ...DEFAULT_EQUIP, ...(d.equipped || {}) } };
  } catch (e) { cache = { owned: { ...DEFAULT_OWNED }, equipped: { ...DEFAULT_EQUIP } }; }
  // item bawaan tidak pernah hilang
  for (const k of Object.keys(DEFAULT_OWNED)) cache.owned[k] = 1;
  return cache;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch (e) { /* noop */ } }

export const item = (id) => CATALOG.find((i) => i.id === id) || null;
export const owned = (id) => !!load().owned[id];
export const equipped = (fam) => load().equipped[fam];

export function buy(id) {
  const it = item(id);
  if (!it || owned(id)) return { ok: false, why: 'sudah-dimiliki' };
  if ((G.drif || 0) < it.price) return { ok: false, why: 'kurang' };
  G.drif -= it.price;
  load().owned[id] = 1;
  markDrifSpent(it.price);
  markPurchase();
  save();
  return { ok: true };
}
export function equip(id) {
  const it = item(id);
  if (!it || !owned(id)) return false;
  load().equipped[it.fam] = id;
  save();
  applyCosmetics();
  return true;
}

// ---------- kait renderer ----------
const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
export function lanternTint() {
  const it = item(equipped('lantern')) || CATALOG[0];
  return { glow: (a) => rgba(it.rgb, a), deep: (a) => rgba(it.deep, a), rgb: it.rgb };
}
export function courseColor() {
  const it = item(equipped('chart')) || CATALOG[6];
  return it.color;
}
export function applyCosmetics() {
  const it = item(equipped('accent')) || CATALOG[4];
  if (it.css && typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--brass', it.css[0]);
    document.documentElement.style.setProperty('--brass-dim', it.css[1]);
  }
}
