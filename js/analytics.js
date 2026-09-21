// ============ Analytics Lokal (Fase 0) ============
// Catatan perjalanan TANPA server: semua metrik yang dibutuhkan keputusan
// monetisasi (retensi harian, sesi, progres, aliran drif) dicatat lokal.
// Prinsip: tidak ada data pribadi, tidak ada jaringan — bisa diekspor manual.
const KEY = 'lh_analytics_v1';

const EMPTY = {
  v: 1,
  firstSeen: 0,
  days: {},            // 'YYYY-MM-DD' -> detik bermain hari itu
  sessions: 0,
  runs: 0,
  dawns: 0,
  deaths: 0,
  drifEarned: 0,
  drifSpent: 0,
  shopOpens: 0,
  purchases: 0,
  playSec: 0,
};

let cache = null;
let dirty = false;

function todayKey() { return new Date().toISOString().slice(0, 10); }
function load() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...JSON.parse(raw), days: JSON.parse(raw).days || {} } : { ...EMPTY };
  } catch (e) { cache = { ...EMPTY }; }
  if (!cache.firstSeen) cache.firstSeen = Date.now();
  return cache;
}
export function flush() {
  if (!dirty) return;
  try { localStorage.setItem(KEY, JSON.stringify(load())); } catch (e) { /* noop */ }
  dirty = false;
}
const mark = (fn) => { const a = load(); fn(a); dirty = true; };

export function sessionStart() { mark((a) => { a.sessions += 1; if (!a.days[todayKey()]) a.days[todayKey()] = 0; }); flush(); }
export function trackPlay(sec) { if (!(sec > 0)) return; mark((a) => { a.playSec += sec; a.days[todayKey()] = (a.days[todayKey()] || 0) + sec; }); }
export function markRun() { mark((a) => { a.runs += 1; }); }
export function markDawn() { mark((a) => { a.dawns += 1; }); }
export function markDeath() { mark((a) => { a.deaths += 1; }); }
export function markDrifEarned(n) { if (n > 0) mark((a) => { a.drifEarned += n; }); }
export function markDrifSpent(n) { if (n > 0) mark((a) => { a.drifSpent += n; }); }
export function markShopOpen() { mark((a) => { a.shopOpens += 1; }); }
export function markNote() { mark((a) => { a.notesFound = (a.notesFound || 0) + 1; }); }
export function markPurchase() { mark((a) => { a.purchases += 1; }); }

// Ringkasan untuk logbook pemain + verifikasi dev.
export function summary() {
  const a = load();
  return {
    daysActive: Object.keys(a.days).length,
    sessions: a.sessions,
    runs: a.runs,
    dawns: a.dawns,
    deaths: a.deaths,
    drifEarned: a.drifEarned,
    drifSpent: a.drifSpent,
    shopOpens: a.shopOpens,
    purchases: a.purchases,
    notesFound: a.notesFound || 0,
    playMin: Math.round(a.playSec / 60),
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flush);
  setInterval(flush, 8000);
  window.__analytics = summary;   // hook dev / test
}
