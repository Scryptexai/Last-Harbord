// ============ Last Asylum: Plague — main (loop + state machine) ============
// Arsitektur mengikuti konvensi repo (js/main.js Driftholm):
//   update(dt) -> dunia; render() -> layar; requestAnimationFrame; dt clamp.
// State: 'dialog' (cerita pembuka, dunia melambat) -> 'play'.
import { ACFG } from './config.js';
import { A } from './state.js';
import { createWorld } from './world.js';
import { createDoctor, updateDoctor } from './doctor.js';
import { createRig, updateRig } from './rig.js';
import { camUpdate, aBeginWorld, aEndWorld } from './camera.js';
import { updateNodes, drawWorld, drawGhostWard, drawBuiltWard, drawBed, drawPatient, drawDoctor, drawMiniIcon, drawAmbience } from './world.js';
import { updatePatients } from './patients.js';
import { updateTriggers } from './building.js';
import { bumpQuest } from './quests.js';
import { saveAsylum, loadAsylum } from './save.js';
import { advanceDialogue } from './dialogue.js';
import { initAsUI, updateAsUI, toastAs, hintAs } from './ui.js';
import { initInput, getMove } from '../input.js';
import { sfx, initAudio, setMuted } from '../audio.js';
import { fx, updateFx, drawFxWorld, drawFxScreen, burst } from '../fx.js';
import { clamp } from '../util.js';

let canvas = null, ctx = null;
let vw = 0, vh = 0, dpr = 1;

function resize() {
  vw = window.innerWidth;
  vh = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(vw * dpr);
  canvas.height = Math.round(vh * dpr);
  canvas.style.width = vw + 'px';
  canvas.style.height = vh + 'px';
  // zoom: lebar dunia yang terlihat ±560px (pas pelataran); portrait sempit tetap wajar
  A.zoom = clamp(vw / 560, 0.8, 2.4);
}

// ---------- hint one-shot (onboarding pelan-pelan) ----------
function once(key, fn) {
  if (A.hints[key]) return;
  A.hints[key] = true;
  fn();
}

function update(dt) {
  if (A.paused) return;
  A.time += dt;

  if (A.phase === 'dialog') {
    updateFx(dt);
    return;
  }

  const d = A.doctor;
  const move = getMove();
  updateDoctor(dt, move);

  // misi jelajah
  if (d.speed > 4) bumpQuest('walkPx', d.speed * dt);

  // penapakan kaki: suara + debu kecil (grounding)
  if (d.stepEvent) {
    d.stepEvent = 0;
    sfx('step');
    burst(d.x, d.y, 'rgba(190,180,160,0.45)', 2, 40, 'spark', 1.6);
  }

  updateRig(dt);
  updateNodes(dt);
  updatePatients(dt);
  updateTriggers(dt);
  camUpdate(dt);
  updateFx(dt);

  // onboarding pelan
  if (d.speed > 4) {
    once('h_walk', () => hintAs('Gerakkan joystick. Berdirilah di depan tanaman untuk memanen.', 4600));
  }
  if (A.res.herb > 0 && A.stats.cured === 0 && A.patients.some((p) => p.state === 'bed')) {
    once('h_treat', () => hintAs('Berdirilah di samping kasur pasien. Herbal berpindah otomatis — tanpa tombol.', 6000));
  }
  if (A.stats.cured >= 1 && A.stats.wardsBuilt === 0) {
    once('h_ward', () => hintAs('Koin terkumpul. Berdirilah di kotak bergaris (Bangsal II) untuk membangun.', 6000));
  }
}

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0b0f15';
  ctx.fillRect(0, 0, vw, vh);

  const shake = fx.shake > 0.01 ? { x: (Math.random() * 2 - 1) * 5 * fx.shake, y: (Math.random() * 2 - 1) * 5 * fx.shake } : { x: 0, y: 0 };
  aBeginWorld(ctx, vw, vh);
  ctx.translate(shake.x, shake.y);
  drawWorld(ctx, A.time);

  // entitas di-sort kedalaman (y dunia)
  const items = [];
  for (const w of A.wards) {
    if (w.built) {
      items.push({ y: w.y - 64, draw: () => drawBuiltWard(ctx, w) });
      for (const b of w.beds) items.push({ y: b.y, draw: () => drawBed(ctx, b, A.time) });
    } else {
      items.push({ y: w.y, draw: () => drawGhostWard(ctx, w, A.time) });
    }
  }
  for (const p of A.patients) items.push({ y: p.y, draw: () => drawPatient(ctx, p) });
  if (A.doctor) items.push({ y: A.doctor.y, draw: () => drawDoctor(ctx, A.time) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();

  drawFxWorld(ctx, (c, type, x, y, s) => drawMiniIcon(c, type, x, y, s));
  aEndWorld(ctx);

  // ambience + screen-space fx
  drawAmbience(ctx, vw, vh, A.time);
  drawFxScreen(ctx, vw, vh, 0);

  if (A.phase === 'dialog') {
    ctx.fillStyle = 'rgba(4,8,14,0.5)';
    ctx.fillRect(0, 0, vw, vh);
  }
}

// ---------- start ----------
const H = {
  onMute() {
    A.muted = !A.muted;
    setMuted(A.muted);
    A.saveDirty = true;
    const m = document.getElementById('as-mute');
    if (m) m.textContent = A.muted ? '✕♪' : '♪';
  },
  onPause(v) {
    A.paused = !!v;
    sfx('click');
  },
};

export async function startAsylum() {
  canvas = document.getElementById('as-game');
  ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  resize();
  window.addEventListener('resize', resize);

  createWorld();
  loadAsylum();
  // bangun ulang flag bangsal dari statistik (urutan I..IV)
  const builtCount = Math.max(1, Math.min(A.wards.length, 1 + A.stats.wardsBuilt));
  A.wards.forEach((w, i) => {
    w.built = i < builtCount;
    if (!w.built) { w.trigger = null; w.progress = 0; }
  });

  A.doctor = createDoctor(0, 40);
  A.rig = createRig(A.doctor.x, A.doctor.y);
  A.cam.x = A.doctor.x;
  A.cam.y = A.doctor.y - 30;

  if (A.loaded) {
    A.phase = 'play';
    A.nextPatientIn = 3;
  } else {
    A.phase = 'dialog';
    A.nextPatientIn = ACFG.PATIENT.FIRST_SPAWN;
  }

  initInput({
    mute: () => H.onMute(),
    escape: () => {},
    pause: () => H.onPause(!A.paused),
  });
  const inputMod = await import('../input.js');
  inputMod.input.onGesture = () => { try { initAudio(); } catch (e) {} };

  initAsUI(H);
  setMuted(A.muted);

  // dialog: tap layar / Enter / Spasi untuk lanjut
  const onAdvance = () => {
    if (A.phase !== 'dialog' || A.paused) return;
    if (advanceDialogue()) sfx('click');
  };
  window.addEventListener('pointerdown', onAdvance);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') onAdvance();
  });

  if (A.loaded) toastAs('Progres dimuat. Pasien masih terus datang.');

  let lastSaveT = -99;
  const flushSave = () => {
    if (A.saveDirty && A.time - lastSaveT > 1) {
      saveAsylum();
      lastSaveT = A.time;
    }
  };

  let last = (typeof performance !== 'undefined' ? performance.now() : 0);
  const frame = (now) => {
    const raw = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    update(raw);
    if (ctx) render();
    updateAsUI(A.time);
    flushSave();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// Auto-start: di browser langsung jalan; di Node (test) test mengimpor modul
// ini dan mengendalikan state sendiri — tapi jika ada window, loop aktif seperti
// konvensi Driftholm (test headless memang menjalankan loop aslinya).
if (typeof window !== 'undefined' && !(window.__ASYLUM_BOOT_TEST__ || window.__LAST_HARBOR_BOOT__)) {
  startAsylum();
}
