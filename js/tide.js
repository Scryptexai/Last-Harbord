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
  G.tide = { t: 0, key: 'calm', label: PHASES[0].label, index: 0, progress: 0, warn: 0, nextReinforce: 0 };
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
  const i = tidePhaseIndex(G.tide.t);
  const ph = PHASES[i];
  const next = PHASES[i + 1];
  if (!next) return ph.tint;
  const t0 = i === 0 ? 0 : PHASES[i - 1].until;
  const k = (G.tide.t - t0) / (next.until - t0);
  return ph.tint + (next.tint - ph.tint) * Math.max(0, Math.min(1, k));
}

// Kuras lambung saat berlayar di laut terbuka ketika pasang.
export function seaDrainRate(islandDist) {
  const ph = PHASES[tidePhaseIndex(G.tide ? G.tide.t : 0)];
  if (!ph.seaDrain) return 0;
  if (islandDist < CFG.TIDE.SEA_SAFE_NEAR) return 0;
  return 1 / ph.seaDrain; // hull per detik
}
