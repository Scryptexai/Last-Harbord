// ============ THE TIDE ============
// Satu jam untuk seluruh run. Tugasnya bukan menakut-nakuti, tapi membuat "berapa
// lama lagi aku bertahan?" jadi pertanyaan yang punya ongkos.
//
//   calm    -> ambience. Lampu hangat, camar, laut tenang.
//   turning -> informasi. Air naik di pantai, camar hilang, angin naik, bala bantuan mulai.
//   high    -> gigi. Gelap, horizon merah, gelombang bantuan, lambung terkuras di laut terbuka.
import { CFG } from './config.js';
import { G } from './state.js';

export const PHASES = CFG.TIDE.PHASES;

export function resetTide() {
  const night = G.tide ? (G.tide.night || 0) : 0;
  G.tide = { t: 0, key: 'calm', label: PHASES[0].label, index: 0, progress: 0, warn: 0, nextReinforce: 0, justDawned: false, night };
}

export function tidePhaseIndex(t) {
  for (let i = 0; i < PHASES.length; i++) if (t < PHASES[i].until) return i;
  return PHASES.length - 1;
}

export function tidePhase(t) {
  return PHASES[tidePhaseIndex(t)];
}

// Berapa detik lagi sampai fase berikutnya (Infinity kalau fase terakhir).
export function timeToNextPhase(t) {
  const i = tidePhaseIndex(t);
  if (i >= PHASES.length - 1) return Infinity;
  return PHASES[i].until - t;
}

export function updateTide(dt) {
  if (!G.tide) resetTide();
  const T = G.tide;
  T.t += dt;
  T.justDawned = false;

  // FAJAR: malam habis. Air turun, cakrawala sembuh, camar kembali ke langit, dan
  // malam berikutnya mulai dari nol. Ini satu-satunya tempat jam pasang mundur.
  const total = CFG.TIDE.DAWN_AT + CFG.TIDE.DAWN_FALL;
  if (T.t >= total) {
    T.t -= total;
    T.night = (T.night || 0) + 1;
    T.justDawned = true;
    T.index = 0;                  // paksa fase dihitung ulang di bawah
    T.nextReinforce = 0;
  }

  const i = tidePhaseIndex(T.t);
  const ph = PHASES[i];
  const prev = T.index;
  T.index = i;
  T.key = ph.key;
  T.label = ph.label;
  const next = PHASES[i + 1];
  T.progress = next ? (T.t - (i === 0 ? 0 : PHASES[i - 1].until)) / (next.until - (i === 0 ? 0 : PHASES[i - 1].until)) : 1;

  // peringatan pergantian fase: camar berhenti, angin naik
  const tn = timeToNextPhase(T.t);
  T.warn = tn <= CFG.TIDE.WARNING_AT && tn > 0 ? 1 - tn / CFG.TIDE.WARNING_AT : 0;

  if (prev !== i) {
    T.justChanged = true;
    T.nextReinforce = 0;
  } else {
    T.justChanged = false;
  }

  // jadwal gelombang bala bantuan
  if (ph.reinforce > 0) {
    T.nextReinforce -= dt;
  } else {
    T.nextReinforce = 0;
  }
  return ph;
}

// Apakah sudah waktunya memunculkan gelombang baru di darat?
export function consumeReinforce(dt) {
  const ph = PHASES[tidePhaseIndex(G.tide ? G.tide.t : 0)];
  if (!ph.reinforce) return 0;
  const T = G.tide;
  if (T.nextReinforce <= 0) {
    T.nextReinforce = ph.reinforce;
    return 1;
  }
  return 0;
}

// Kegelapan / tint pasang, 0 (tenang) .. 1 (pasang).
export function tideTint() {
  if (!G.tide) return 0;
  const t = G.tide.t;
  const i = tidePhaseIndex(t);
  const ph = PHASES[i];
  const next = PHASES[i + 1];
  let tint;
  if (!next) tint = ph.tint;
  else {
    // Menanjak SEPANJANG fase ini, dari warna fase ini ke warna fase berikutnya.
    // (Dulu pembaginya `next.until - t0`, yaitu akhir fase BERIKUTNYA — akibatnya
    // tint melompat di batas fase, bukan merangkak: 0,35 di detik 90 dan di detik 150.)
    const t0 = i === 0 ? 0 : PHASES[i - 1].until;
    const t1 = PHASES[i].until;
    const k = (t - t0) / Math.max(1, t1 - t0);
    tint = ph.tint + (next.tint - ph.tint) * Math.max(0, Math.min(1, k));
  }
  // fajar: air turun lagi, 0.70 -> 0 sepanjang DAWN_FALL detik
  const dk = (t - CFG.TIDE.DAWN_AT) / CFG.TIDE.DAWN_FALL;
  if (dk > 0) tint *= 1 - Math.min(1, dk);
  return tint;
}

// BAHAYA pasang: 0 sepanjang fase tenang (tidak ada tekanan sama sekali), menanjak
// selama fase berubah, penuh saat pasang, lalu turun saat fajar.
//
// Dibuat terpisah dari tideTint() dengan sengaja. tideTint() adalah ISYARAT: warnanya
// mengeras perlahan sejak detik pertama, supaya pemain bisa merasa malam menua sebelum
// apa pun terjadi. tideDanger() adalah ONGKOS: air yang benar-benar menelan pantai,
// memperlambat langkah, dan menutup dermaga. Kalau keduanya memakai satu kurva, banjir
// mulai menggerogoti pantai sejak detik nol dan fase "tenang" berhenti jadi tenang.
export function tideDanger() {
  if (!G.tide) return 0;
  const t = G.tide.t;
  const t0 = PHASES[0].until;          // 90  : tenang habis
  const t1 = PHASES[1].until;          // 210 : pasang penuh
  let d = (t - t0) / Math.max(1, t1 - t0);
  d = Math.max(0, Math.min(1, d));
  const dk = (t - CFG.TIDE.DAWN_AT) / CFG.TIDE.DAWN_FALL;
  if (dk > 0) d *= 1 - Math.min(1, dk);   // fajar: air turun lagi
  return d;
}

// Berapa jauh malam ini sudah berjalan, 0 (baru mulai) .. 1 (fajar). Hanya angka:
// tidak menjelaskan apa pun, cuma membuat panjang malam bisa dilihat.
export function nightProgress() {
  if (!G.tide) return 0;
  const total = CFG.TIDE.DAWN_AT + CFG.TIDE.DAWN_FALL;
  return Math.max(0, Math.min(1, G.tide.t / total));
}

export function isDawn() {
  return !!G.tide && G.tide.t >= CFG.TIDE.DAWN_AT;
}

// Kuras lambung saat berlayar di laut terbuka ketika pasang.
export function seaDrainRate(islandDist) {
  const ph = PHASES[tidePhaseIndex(G.tide ? G.tide.t : 0)];
  if (!ph.seaDrain) return 0;
  if (isDawn()) return 0;        // saat air turun, laut melepasmu
  if (islandDist < CFG.TIDE.SEA_SAFE_NEAR) return 0;
  return 1 / ph.seaDrain; // hull per detik
}
