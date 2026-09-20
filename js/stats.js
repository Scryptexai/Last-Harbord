// ============ Statistik & Preferensi (localStorage) ============
// Jurnal lintas-run — standar roguelike modern: rekor malam bertahan, total
// korban, jumlah kematian. Independen dari save malam berjalan: selamat dari
// "Malam Baru", tapi ikut terhapus di "Hapus Data".
const STATS_KEY = 'lh_stats';
const PREFS_KEY = 'lh_prefs';

const DEFAULTS = { kills: 0, deaths: 0, bestNight: 0, runs: 0 };
const DEFAULT_PREFS = { music: true, reduceMotion: false };

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...fallback };
    return { ...fallback, ...JSON.parse(raw) };
  } catch (e) {
    return { ...fallback };
  }
}
function write(key, obj) {
  try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) { /* noop */ }
}

export function snapshot() { return read(STATS_KEY, DEFAULTS); }
export function bumpKill() { const s = read(STATS_KEY, DEFAULTS); s.kills += 1; write(STATS_KEY, s); }
export function bumpDeath(nightNo) {
  const s = read(STATS_KEY, DEFAULTS);
  s.deaths += 1;
  if (nightNo > s.bestNight) s.bestNight = nightNo;
  write(STATS_KEY, s);
}
export function nightDone(nightNo) {
  const s = read(STATS_KEY, DEFAULTS);
  if (nightNo > s.bestNight) { s.bestNight = nightNo; write(STATS_KEY, s); }
}
export function bumpRun() { const s = read(STATS_KEY, DEFAULTS); s.runs += 1; write(STATS_KEY, s); }
export function wipeStats() { try { localStorage.removeItem(STATS_KEY); } catch (e) { /* noop */ } }

export function prefs() { return read(PREFS_KEY, DEFAULT_PREFS); }
export function setPref(key, value) { const p = read(PREFS_KEY, DEFAULT_PREFS); p[key] = value; write(PREFS_KEY, p); if (key === 'music') {} }
export function wipePrefs() { try { localStorage.removeItem(PREFS_KEY); } catch (e) { /* noop */ } }
