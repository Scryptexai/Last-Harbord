// ============ Audio ============
// Semua suara disintesis lewat WebAudio: tanpa file, tanpa dependency, tanpa unduhan.
// Audio adalah kanal feedback termurah dan paling kuat — karena itu ada di sini.
import { CFG } from './config.js';
import { G } from './state.js';

let ctx = null;
let master = null;
let ambGain = null;
let ambSrc = null;
let ambFilter = null;
let ambKind = null;
let gullTimer = 0;

// RNG PRIBADI AUDIO. Suara tidak boleh menyentuh aliran acak permainan: dulu buffer noise
// memakai Math.random(), dan karena pemutaran suara di-throttle dengan jam dinding
// (performance.now), jumlah pemanggilan acak berbeda antar-jalan — posisi zombie pun ikut
// berubah hanya karena sebuah langkah kaki berbunyi. Sekarang audio punya urutan sendiri.
let aSeed = 0x51ed2701;
function arand() { aSeed = (aSeed * 1664525 + 1013904223) >>> 0; return aSeed / 4294967296; }
let lastPlay = 0;
let lastGain = 1;   // pengali volume sesaat (dipakai sfx untuk atenuasi jarak)

function ac() {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = G.muted ? 0 : 0.5;
    master.connect(ctx.destination);
  } catch (e) {
    ctx = null;
  }
  return ctx;
}

// Dipanggil dari gesture pertama pemain (autoplay policy).
export function initAudio() {
  const c = ac();
  if (c && c.state === 'suspended') c.resume();
}

export function setMuted(m) {
  G.muted = !!m;
  if (master) master.gain.value = G.muted ? 0 : 0.5;
}

export function ambientOn() {
  return !!ambSrc && !!ctx;
}

// ---------- primitif ----------
function tone({ f = 440, f2 = null, dur = 0.12, type = 'sine', gain = 0.08, at = 0, attack = 0.004 }) {
  const c = ac();
  if (!c || G.muted) return;
  const t0 = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain * lastGain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.15, gain = 0.09, f = 900, f2 = null, q = 1, at = 0, type = 'lowpass' }) {
  const c = ac();
  if (!c || G.muted) return;
  const t0 = c.currentTime + at;
  const n = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = arand() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const flt = c.createBiquadFilter();
  flt.type = type;
  flt.frequency.setValueAtTime(f, t0);
  if (f2) flt.frequency.exponentialRampToValueAtTime(Math.max(40, f2), t0 + dur);
  flt.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain * lastGain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(flt); flt.connect(g); g.connect(master);
  src.start(t0); src.stop(t0 + dur + 0.02);
}

// ---------- suara permainan ----------
const SFX = {
  gather_tick: () => tone({ f: 300 + arand() * 40, dur: 0.045, type: 'square', gain: 0.035 }),
  gather_done: () => { tone({ f: 480, f2: 660, dur: 0.08, type: 'triangle', gain: 0.09 }); noise({ dur: 0.09, gain: 0.05, f: 2200 }); },
  pickup: () => tone({ f: 620, f2: 940, dur: 0.09, type: 'sine', gain: 0.08 }),
  swing: () => noise({ dur: 0.13, gain: 0.06, f: 1800, f2: 420, q: 1.2 }),
  whiff: () => noise({ dur: 0.16, gain: 0.035, f: 1400, f2: 300 }),
  hit: (p = 150) => { noise({ dur: 0.09, gain: 0.11, f: p * 8, f2: p * 2, q: 0.8 }); tone({ f: p, f2: p * 0.5, dur: 0.13, type: 'sine', gain: 0.10 }); },
  kill: (p = 150) => { noise({ dur: 0.22, gain: 0.10, f: p * 4, f2: p, q: 0.7 }); tone({ f: p * 0.9, f2: p * 0.4, dur: 0.3, type: 'sawtooth', gain: 0.06 }); },
  hurt: () => { tone({ f: 160, f2: 78, dur: 0.3, type: 'sawtooth', gain: 0.11 }); noise({ dur: 0.2, gain: 0.08, f: 700, f2: 180 }); },
  crack: () => { noise({ dur: 0.18, gain: 0.13, f: 420, f2: 130, q: 3 }); tone({ f: 120, f2: 70, dur: 0.2, type: 'square', gain: 0.06 }); },
  blockFull: () => { tone({ f: 220, f2: 180, dur: 0.16, type: 'square', gain: 0.05 }); },
  board: () => { tone({ f: 240, f2: 150, dur: 0.36, type: 'sawtooth', gain: 0.07 }); noise({ dur: 0.3, gain: 0.05, f: 900, f2: 300 }); },
  bank: () => { tone({ f: 300, f2: 300, dur: 0.09, type: 'triangle', gain: 0.09, at: 0 }); tone({ f: 450, dur: 0.1, type: 'triangle', gain: 0.09, at: 0.09 }); tone({ f: 600, dur: 0.16, type: 'triangle', gain: 0.08, at: 0.18 }); noise({ dur: 0.1, gain: 0.05, f: 600, at: 0.18 }); },
  forge: () => { noise({ dur: 0.3, gain: 0.14, f: 2600, f2: 700, q: 4 }); tone({ f: 900, f2: 1300, dur: 0.24, type: 'triangle', gain: 0.07 }); tone({ f: 140, dur: 0.3, type: 'sine', gain: 0.08, at: 0.03 }); },
  anchor: () => { noise({ dur: 0.5, gain: 0.12, f: 1600, f2: 160, q: 0.8 }); tone({ f: 90, f2: 50, dur: 0.4, type: 'sine', gain: 0.08 }); },
  splash: () => noise({ dur: 0.34, gain: 0.09, f: 1400, f2: 300, q: 0.7 }),
  step: () => noise({ dur: 0.05, gain: 0.02, f: 800 + arand() * 400 }),
  gull: () => { tone({ f: 900, f2: 520, dur: 0.13, type: 'triangle', gain: 0.03 }); tone({ f: 1000, f2: 600, dur: 0.1, type: 'triangle', gain: 0.024, at: 0.15 }); },
  groan: (p = 150) => { tone({ f: p, f2: p * 0.7, dur: 0.55, type: 'sawtooth', gain: 0.045 }); noise({ dur: 0.4, gain: 0.03, f: 400, f2: 150 }); },
  screech: () => { tone({ f: 700, f2: 300, dur: 0.18, type: 'square', gain: 0.05 }); },
  waveChange: () => { tone({ f: 220, f2: 140, dur: 1.2, type: 'sine', gain: 0.07 }); noise({ dur: 1.4, gain: 0.05, f: 500, f2: 200 }); },
  death: () => { tone({ f: 200, f2: 40, dur: 1.6, type: 'sine', gain: 0.12 }); noise({ dur: 1.8, gain: 0.06, f: 700, f2: 80 }); },
  salvage: () => { tone({ f: 420, f2: 630, dur: 0.14, type: 'triangle', gain: 0.09 }); noise({ dur: 0.2, gain: 0.05, f: 1800, f2: 500 }); },
  newGoal: () => { tone({ f: 520, dur: 0.14, type: 'triangle', gain: 0.08 }); tone({ f: 780, dur: 0.22, type: 'triangle', gain: 0.07, at: 0.13 }); },
};

export function sfx(name, arg, gainMul) {
  if (!SFX[name]) return;
  // throttle ringan supaya suara tidak menumpuk jadi bising
  const now = (typeof performance !== 'undefined' ? performance.now() : 0);
  if (name === 'gather_tick' || name === 'hit' || name === 'step') {
    if (now - lastPlay < 24) return;
    lastPlay = now;
  }
  lastGain = typeof gainMul === 'number' ? Math.max(0, Math.min(1.5, gainMul)) : 1;
  try { SFX[name](arg); } catch (e) { /* audio opsional */ }
  lastGain = 1;
}

// Haptik getar untuk layar sentuh — feedback di tangan, bukan cuma di telinga.
// Diperlakukan sebagai bonus: kalau perangkat tidak mendukung, tidak terjadi apa-apa.
export function haptic(pattern = 8) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
  } catch (e) { /* opsional */ }
}

// ---------- music bed: satu drone rendah yang bernapas mengikuti pasang ----------
// Bukan lagu: dua nada rendah yang intervalnya melebar dari konsonan (tenang) menuju
// tritone (pasang tinggi) — ketegangan terdengar, bukan diumumkan. Sangat pelan, di
// bawah semua SFX. Ini "musik" yang dulu tidak ada (lihat Appendix E.7).
let music = null;

function ensureMusic() {
  const c = ac();
  if (!c || music) return;
  music = {
    gain: c.createGain(),
    filter: c.createBiquadFilter(),
    o1: c.createOscillator(),
    o2: c.createOscillator(),
    lfo: c.createOscillator(),
    lfoGain: c.createGain(),
  };
  music.gain.gain.value = 0;
  music.filter.type = 'lowpass';
  music.filter.frequency.value = 200;
  music.filter.Q.value = 0.6;
  music.o1.type = 'sine';
  music.o2.type = 'sine';
  music.o1.frequency.value = 65.4;
  music.o2.frequency.value = 98.1;
  music.lfo.type = 'sine';
  music.lfo.frequency.value = 0.08;
  music.lfoGain.gain.value = 3.5;
  music.lfo.connect(music.lfoGain);
  music.lfoGain.connect(music.o1.frequency);
  music.o1.connect(music.filter);
  music.o2.connect(music.filter);
  music.filter.connect(music.gain);
  music.gain.connect(master);
  music.o1.start(); music.o2.start(); music.lfo.start();
}

// tint = tideTint() 0..1. Dipanggil tiap frame dari main.js.
export function updateMusic(tint) {
  const c = ac();
  if (!c) return;
  ensureMusic();
  if (G.muted || !music) { if (music) music.gain.gain.value = 0; return; }
  const t = c.currentTime;
  const root = 65.4 - 17 * tint;             // C2 turun ke ~G1: makin rendah makin gelap
  const ratio = 1.5 - 0.086 * tint;          // perfect fifth -> tritone: makin sumbang
  music.o1.frequency.setTargetAtTime(root, t, 1.8);
  music.o2.frequency.setTargetAtTime(root * ratio, t, 1.8);
  music.filter.frequency.setTargetAtTime(180 + 150 * tint, t, 1.8);
  music.gain.gain.setTargetAtTime(G.muted ? 0 : (0.045 - 0.014 * tint), t, 1.8);
}

// ---------- ambience ----------
// kind: 'harbor' | 'sea' | 'land' | 'high'
export function setAmbience(kind) {
  const c = ac();
  if (!c || !ambGain) return;   // audio belum siap — jangan menyentuh gain yang belum ada
  if (!ambSrc) {
    const n = Math.floor(c.sampleRate * 2);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = arand() * 2 - 1;
    ambSrc = c.createBufferSource();
    ambSrc.buffer = buf;
    ambSrc.loop = true;
    ambFilter = c.createBiquadFilter();
    ambFilter.type = 'lowpass';
    ambFilter.frequency.value = 400;
    ambGain = c.createGain();
    ambGain.gain.value = 0;
    ambSrc.connect(ambFilter); ambFilter.connect(ambGain); ambGain.connect(master);
    ambSrc.start();
  }
  const targets = {
    harbor: { gain: 0.035, f: 520 },
    sea:    { gain: 0.030, f: 620 },
    land:   { gain: 0.022, f: 340 },
    high:   { gain: 0.060, f: 260 },
  };
  const t = targets[kind] || targets.sea;
  ambKind = kind;
  ambGain.gain.linearRampToValueAtTime(G.muted ? 0 : t.gain, c.currentTime + 1.2);
  ambFilter.frequency.linearRampToValueAtTime(t.f, c.currentTime + 1.2);
}

// Camar sesekali saat tenang — tanda bahwa dunia masih baik-baik saja.
export function tickAmbience(dt, allowed) {
  const c = ac();
  if (!c || G.muted) return;
  if (!allowed) return;
  gullTimer -= dt;
  if (gullTimer <= 0) {
    gullTimer = 7 + arand() * 14;
    sfx('gull');
  }
}

export function isAudioReady() {
  return !!ctx;
}
