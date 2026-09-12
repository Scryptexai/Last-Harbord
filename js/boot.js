// ============ Last Harbor — boot sequence (pre-game shell) ============
// Tanggung jawab modul ini SANGAT sempit:
//   1. Tampilkan layar pembuka (#screen-boot) dan deteksi apakah ada save lama.
//   2. Tangkap gesture mulai (click / touchend / keydown Enter-Space) secara
//      konsisten lintas platform, dan buka AudioContext di gesture itu.
//   3. Serahkan kontrol ke main.js (startGame) — setelah itu modul ini selesai.
//
// Modul ini TIDAK menyentuh logika gameplay (camera/tide/world/land/boat/zombie/
// refit/inventory/harbor). Ia hanya MEMBACA keberadaan save memakai kunci yang
// sama persis dengan save.js (tanpa mengubah logika save.js).

import { CFG } from './config.js';

// Tandai SEBELUM main.js dievaluasi: main.js menunda auto-boot bila flag ini ada.
// (Test headless yang mengimpor main.js langsung tidak menyetel flag ini, jadi
//  perilaku lama "boot otomatis saat dimuat" tetap utuh di sana.)
window.__LAST_HARBOR_BOOT__ = true;

const { startGame } = await import('./main.js');

const $ = (id) => document.getElementById(id);
const bootEl = () => $('screen-boot');

let started = false;      // cegah start dobel (touchend + click di perangkat sentuh)
let armedNewNight = false;// tombol "Malam Baru" sudah berubah jadi konfirmasi?
let unlockCtx = null;     // tahan referensi supaya AudioContext tidak di-GC

// ---------- audio-unlock: buktikan gesture sah di mata browser ----------
function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!unlockCtx) unlockCtx = new AC();
    if (unlockCtx.state === 'suspended') unlockCtx.resume();
    console.log('[boot] AudioContext:', unlockCtx.state);
  } catch (e) {
    console.warn('[boot] AudioContext tidak tersedia:', e);
  }
}

// ---------- deteksi save (non-destruktif: hanya baca localStorage) ----------
function readSave() {
  try {
    const raw = localStorage.getItem(CFG.SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && d.version === 2 ? d : null;
  } catch (e) {
    return null;
  }
}

// "Malam Baru": tulis ulang save dengan tideT = 0 (malam mulai dari awal).
// Refit, gudang, peta, pelampung, dsb. TIDAK disentuh — sesuai peringatan.
function resetNightInSave() {
  try {
    const d = readSave();
    if (!d) return;
    d.tideT = 0;
    localStorage.setItem(CFG.SAVE_KEY, JSON.stringify(d));
  } catch (e) { /* noop */ }
}

function hideBoot() {
  const el = bootEl();
  if (el) el.classList.add('hidden');
}

function begin(restartNight) {
  if (started) return;
  started = true;
  unlockAudio();               // Langkah 3: buka audio di gesture pertama
  hideBoot();
  if (restartNight) resetNightInSave();
  startGame();                 // Langkah 4: boot game sesungguhnya (main.js)
}

function onStart() {
  if (started || armedNewNight) return;
  begin(false);
}

function onContinue() {
  if (started) return;
  armedNewNight = false;
  begin(false);
}

// Tombol "Malam Baru": tap pertama = peringatan + berubah jadi konfirmasi,
// tap kedua = benar-benar memulai malam baru. "LANJUTKAN" tetap terlihat
// sebagai jalan keluar yang aman (membatalkan konfirmasi).
function onNewNight() {
  if (started) return;
  const btn = $('btn-boot-new');
  const warn = $('boot-warning');
  if (!armedNewNight) {
    armedNewNight = true;
    if (btn) btn.textContent = 'YA — MULAI MALAM BARU';
    if (warn) warn.classList.remove('hidden');
    return;
  }
  begin(true);
}

function setup() {
  const boot = bootEl();
  if (!boot) {
    // Tanpa layar boot (mis. embedding/uji): tidak ada yang ditunda, langsung mulai.
    begin(false);
    return;
  }

  const startBtn = $('btn-boot-start');
  const contBtn = $('btn-boot-continue');
  const newBtn = $('btn-boot-new');

  // Langkah 5: kalau ada save, tampilkan LANJUTKAN / MALAM BARU, bukan MULAI.
  if (readSave()) {
    if (startBtn) startBtn.classList.add('hidden');
    if (contBtn) contBtn.classList.remove('hidden');
    if (newBtn) newBtn.classList.remove('hidden');
  }

  // Langkah 2: tangkap click + touchend + keydown(Enter/Space).
  const bind = (el, fn) => {
    if (!el) return;
    el.addEventListener('click', fn);
    el.addEventListener('touchend', (e) => { e.preventDefault(); fn(); });
  };

  bind(startBtn, onStart);
  bind(contBtn, onContinue);
  bind(newBtn, onNewNight);

  window.addEventListener('keydown', (e) => {
    const el = bootEl();
    if (!el || el.classList.contains('hidden')) return;   // boot sudah lewat
    const k = e.key;
    if (k !== 'Enter' && k !== ' ') return;
    e.preventDefault();
    if (armedNewNight) begin(true);
    else if (readSave()) onContinue();
    else onStart();
  });
}

setup();
