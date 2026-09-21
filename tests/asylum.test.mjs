// ============================================================
// Test Last Asylum: Plague (tanpa browser)
// Jalankan:  node tests/asylum.test.mjs
//
// Menutup angka-angka dari spesifikasi:
//   §1 kamera  — SmoothDamp + look-ahead + TILT=cos(58°)
//   §2 gerak   — clamp 720°/s, Turning Penalty 60%, accel/decel
//   §3 rig     — spring jubah (overshoot/terseret), lentera ±25°
//   §4 UI      — (DOM)
//   §5 loop    — ProximityTrigger persis spec, ekonomi pasien->koin->bangsal
// Plus: regresi PACING ekonomi (bot ideal harus bisa bangun bangsal II < 240s)
// ============================================================

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg); }
}
const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

// ---------- DOM palsu (pola tests/integration.test.mjs) ----------
function mkEl(tag = 'div') {
  const el = {
    tagName: tag, _h: {}, children: [], parent: null, style: {}, dataset: {},
    textContent: '', value: '', disabled: false, width: 0, height: 0, onclick: null,
    className: '',
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => this._s.add(x)); },
      remove(...c) { c.forEach((x) => this._s.delete(x)); },
      contains(c) { return this._s.has(c); },
      toggle(c, f) { const on = f === undefined ? !this._s.has(c) : !!f; if (on) this._s.add(c); else this._s.delete(c); },
    },
    appendChild(c) { c.parent = el; el.children.push(c); return c; },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); },
    remove() { if (el.parent) el.parent.removeChild(el); },
    addEventListener(t, fn) { (el._h[t] = el._h[t] || []).push(fn); },
    removeEventListener() {},
    querySelectorAll: () => [],
    querySelector: () => null,
    closest: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    setPointerCapture() {}, focus() {},
    get firstChild() { return el.children[0] || null; },
  };
  Object.defineProperty(el, 'innerHTML', {
    get: () => el._html || '',
    set: (v) => { el._html = v; el.children.length = 0; },
  });
  function grad() { return { addColorStop() {} }; }
  el.getContext = () => ctxStub();
  el.createLinearGradient = grad;
  el.createRadialGradient = grad;
  el.createPattern = () => null;
  el.measureText = () => ({ width: 10 });
  return el;
}

function ctxStub() {
  const c = { canvas: { width: 1280, height: 720 } };
  const grad = () => ({ addColorStop() {} });
  c.createLinearGradient = grad; c.createRadialGradient = grad;
  c.createPattern = () => null; c.measureText = () => ({ width: 10 });
  c.getImageData = () => ({ data: new Uint8ClampedArray(4) });
  for (const m of ['save', 'restore', 'translate', 'scale', 'rotate', 'setTransform', 'transform', 'beginPath',
    'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse', 'rect', 'roundRect', 'fill', 'stroke',
    'fillRect', 'strokeRect', 'clearRect', 'clip', 'fillText', 'strokeText', 'drawImage', 'setLineDash',
    'getLineDash', 'quadraticCurveTo', 'bezierCurveTo', 'createImageData', 'putImageData']) c[m] = () => {};
  return c;
}

const byId = {};
globalThis.document = {
  getElementById(id) { return (byId[id] = byId[id] || mkEl()); },
  createElement: (t) => mkEl(t),
  addEventListener() {},
  body: mkEl('body'),
  documentElement: mkEl('html'),
};

const rafQueue = [];
globalThis.window = {
  innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  requestAnimationFrame: (fn) => { rafQueue.push(fn); return rafQueue.length; },
  performance: { now: () => Date.now() },
};
globalThis.requestAnimationFrame = window.requestAnimationFrame;
globalThis.devicePixelRatio = 1;
globalThis.performance = { now: () => Date.now() };

const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};

// ---------- muat modul game ----------
const { ACFG } = await import('../js/asylum/config.js');
const { A } = await import('../js/asylum/state.js');
const { createWorld, updateNodes, drawWorld, drawMiniIcon, drawGhostWard, drawBuiltWard, drawBed, drawPatient, drawDoctor } = await import('../js/asylum/world.js');
const { createDoctor, updateDoctor } = await import('../js/asylum/doctor.js');
const { createRig, updateRig } = await import('../js/asylum/rig.js');
const { smoothDamp, camUpdate } = await import('../js/asylum/camera.js');
const { ProximityTrigger } = await import('../js/asylum/proximity.js');
const { spawnPatient, updatePatients } = await import('../js/asylum/patients.js');
const { updateTriggers } = await import('../js/asylum/building.js');
const { bumpQuest, activeQuest } = await import('../js/asylum/quests.js');
const { saveAsylum, loadAsylum, clearAsylum } = await import('../js/asylum/save.js');
await import('../js/asylum/main.js');   // auto-start: loop aslinya terdaftar di rafQueue

// tunggu boot selesai mendaftarkan frame pertama
for (let i = 0; i < 100 && rafQueue.length === 0; i++) await new Promise((r) => setTimeout(r, 2));
ok(rafQueue.length > 0, 'game asylum boot & mendaftarkan frame pertama');

const DT = 1 / 60;
function resetDoctor(x = 0, y = 0) {
  A.doctor = createDoctor(x, y);
  A.rig = createRig(x, y);
  A.cam.x = x; A.cam.y = y; A.cam.vx.v = 0; A.cam.vy.v = 0;
  return A.doctor;
}
function step(n = 1) {
  for (let i = 0; i < n; i++) {
    const fn = rafQueue.shift();
    if (!fn) throw new Error('loop asylum berhenti');
    fn(performance.now() + i);
  }
}

// ============================================================
console.log('\n== 1. Gerakan dokter (spec §2) ==');
{
  let d = resetDoctor(0, 0);
  for (let i = 0; i < 6; i++) updateDoctor(DT, { x: 0, y: 1 });
  ok(d.speed >= ACFG.DOCTOR.SPEED * 0.94, `akselerasi 0->max dalam 0.10s (${Math.round(d.speed)}/${ACFG.DOCTOR.SPEED} px/s)`);

  for (let i = 0; i < 9; i++) updateDoctor(DT, { x: 0, y: 0 });
  ok(d.speed < ACFG.DOCTOR.SPEED * 0.02, `deselerasi max->0 dalam 0.15s (sisa ${d.speed.toFixed(1)} px/s)`);

  d = resetDoctor(0, 0);
  for (let i = 0; i < 6; i++) updateDoctor(DT, { x: 0, y: 1 });
  for (let i = 0; i < 3; i++) updateDoctor(DT, { x: 0, y: 0 });
  ok(d.speed > ACFG.DOCTOR.SPEED * 0.5, `deselerasi bertahap — masih ${Math.round(d.speed)} px/s 0.05s setelah lepas (1 langkah penutup)`);

  // clamp rotasi 720°/s
  d = resetDoctor(0, 0);
  d.face = Math.PI / 2;                       // menghadap selatan
  updateDoctor(DT, { x: 1, y: 0 });           // input timur
  ok(Math.abs(wrap(d.face - Math.PI / 2)) <= ACFG.DOCTOR.MAX_TURN * DT + 1e-6,
    `rotasi diklamp 720°/s — Δ1 frame = ${((wrap(d.face - Math.PI / 2) * 180) / Math.PI).toFixed(1)}° (maks ${(ACFG.DOCTOR.MAX_TURN * DT * 180 / Math.PI).toFixed(1)}°), bukan snap`);

  // Turning Penalty: putar balik (>90°) => kecepatan 60%
  d = resetDoctor(0, 0);
  d.face = -Math.PI / 2;                      // menghadap utara; input selatan
  let maxSp = 0, penFrames = 0;
  for (let i = 0; i < 15; i++) {
    updateDoctor(DT, { x: 0, y: 1 });
    if (d.turning) { maxSp = Math.max(maxSp, d.speed); penFrames++; }
  }
  ok(penFrames >= 4, `Turning Penalty terpicu pada putar balik (${penFrames} frame <90°... >90°)`);
  ok(maxSp <= ACFG.DOCTOR.SPEED * 0.6 * 1.03, `kecepatan dipotong ke 60% selama belokan tajam (${Math.round(maxSp)} ≤ ${Math.round(ACFG.DOCTOR.SPEED * 0.6)} px/s)`);
  for (let i = 0; i < 30; i++) updateDoctor(DT, { x: 0, y: 1 });
  ok(d.speed >= ACFG.DOCTOR.SPEED * 0.95, `setelah belokan selesai, akselerasi kembali ke 100% (${Math.round(d.speed)} px/s)`);

  // sinkron animasi (AnimSpeedMultiplier)
  d = resetDoctor(0, 0);
  const w0 = d.walkT;
  updateDoctor(DT, { x: 0, y: 0 });
  ok(d.walkT === w0, 'AnimSpeedMultiplier: Idle = tidak ada langkah');
  for (let i = 0; i < 6; i++) updateDoctor(DT, { x: 0, y: 1 });
  ok(d.walkT > w0 && Math.abs(d.strideMul - d.speed / ACFG.DOCTOR.SPEED) < 1e-9, 'AnimSpeedMultiplier = CurrentMoveSpeed / BaseWalkSpeed');
}

// ============================================================
console.log('\n== 2. Kamera (spec §1) ==');
{
  ok(Math.abs(ACFG.CAM.TILT - Math.cos(58 * Math.PI / 180)) < 1e-12, `TILT = cos(58°) ≈ ${ACFG.CAM.TILT.toFixed(4)} — pitch 58° (rentang aman 55–60°)`);

  // SmoothDamp: konvergen + tanpa overshoot
  const v = { v: 0 };
  let pos = 0, maxPos = 0;
  for (let i = 0; i < 400; i++) { pos = smoothDamp(pos, 100, v, 0.18, 2400, 1 / 60); maxPos = Math.max(maxPos, pos); }
  ok(Math.abs(pos - 100) < 0.5, `SmoothDamp (smoothTime 0.18) konvergen ke target (${pos.toFixed(2)})`);
  ok(maxPos <= 100 + 0.51, 'SmoothDamp tanpa overshoot (guard Unity berfungsi)');

  // look-ahead: kamera mengantisipasi arah gerak dengan factor 1.2
  const d = resetDoctor(0, 0);
  d.vx = 132; d.vy = 0;                       // "kecepatan" konstan ke timur
  for (let i = 0; i < 240; i++) camUpdate(1 / 60);
  ok(Math.abs(A.cam.x - 132 * ACFG.CAM.LOOK_AHEAD) < 3, `look-ahead: kamera ${A.cam.x.toFixed(1)}px ≈ 1.2×v di depan pemain (${(132 * 1.2).toFixed(1)}px)`);
  ok(Math.abs(A.cam.y) < 3, 'look-ahead tidak menyimpang ke arah melintang');
}

// ============================================================
console.log('\n== 3. ProximityTrigger (spec §5.1, perilaku pseudocode) ==');
{
  let done = 0;
  const inv = { coin: 10 };
  const tr = new ProximityTrigger({ x: 0, z: 0, radius: 10 }, 'coin', 4, () => done++);
  tr.update(0.05, { x: 0, y: 0 }, inv);
  ok(inv.coin === 9, '1 unit per tick 0.05s (tick pertama tepat di 0.05s)');
  tr.update(0.04, { x: 0, y: 0 }, inv);
  ok(inv.coin === 9, 'di bawah tick rate: belum ada transfer');
  tr.update(0.02, { x: 0, y: 0 }, inv);
  ok(inv.coin === 8, 'akumulasi antar-frame: 0.04+0.02 menuntaskan 1 tick');
  tr.update(0.5, { x: 0, y: 0 }, inv);
  ok(inv.coin === 7, '1 update = maksimal 1 tick (tanpa utang, sesuai pseudocode)');
  inv.coin = 1;
  tr.update(0.3, { x: 0, y: 0 }, inv);
  ok(inv.coin === 0 && done === 1, 'onComplete tepat saat biaya habis — satu kali');
  tr.update(0.3, { x: 0, y: 0 }, inv);
  ok(done === 1 && inv.coin === 0, 'tidak ada pembayaran ulang setelah selesai');

  let done2 = 0;
  const inv2 = { herb: 9 };
  const tr2 = new ProximityTrigger({ x: 0, y: 0, radius: 10 }, 'herb', 3, () => done2++);
  tr2.update(0.3, { x: 25, y: 0 }, inv2);
  ok(inv2.herb === 9 && done2 === 0, 'di luar radius zona: tidak ada transfer');

  // sumber daya kurang: timer reset, tanpa debet
  let done3 = 0;
  const inv3 = { wood: 0 };
  const tr3 = new ProximityTrigger({ x: 0, y: 0, radius: 10 }, 'wood', 2, () => done3++);
  tr3.update(0.5, { x: 0, y: 0 }, inv3);
  ok(inv3.wood === 0 && done3 === 0 && tr3.timer === 0, 'resource kurang: tick terbuang, timer reset (tidak ada debet)');
}

// ============================================================
console.log('\n== 4. Pasien & treatment (spec §5 core loop) ==');
{
  createWorld();
  A.phase = 'play';
  A.patients = [];
  A.res = { wheat: 99, herb: 99, wood: 99, coins: 0 };
  A.stats.cured = 0; A.stats.lost = 0;
  const d = resetDoctor(0, 100);

  spawnPatient();
  let t = 0;
  while (A.patients[0].state !== 'bed' && t < 40) { updatePatients(1 / 30); t += 1 / 30; }
  ok(A.patients[0].state === 'bed', `Pasien Masuk -> kasur otomatis (${t.toFixed(1)}s jalan dari gerbang)`);

  const p0 = A.patients[0];
  const bed = p0.bed;
  d.x = bed.x + 26; d.y = bed.y + 4; d.speed = 0;   // berdiri di samping kasur
  const herbsBefore = A.res.herb, coinsBefore = A.res.coins;
  t = 0;
  while (p0.state !== 'leaving' && t < 30) {
    updatePatients(1 / 30);
    updateTriggers(1 / 30);
    t += 1 / 30;
  }
  ok(p0.state === 'leaving' && p0.cured, `Berdiri di samping kasur -> Sembuhkan (proximity, TANPA tombol) — ${t.toFixed(1)}s`);
  ok(A.res.herb === herbsBefore - ACFG.PATIENT.TREAT_HERB, `herbal berpindah: ${ACFG.PATIENT.TREAT_HERB} unit terambil dari stok pemain`);
  ok(A.res.coins - coinsBefore >= ACFG.PATIENT.REWARD_MIN, `Sembuhkan -> Kumpulkan Koin (+${A.res.coins - coinsBefore})`);
  ok(A.stats.cured === 1, 'statistik sembuh +1');
  ok(bed.patient === null, 'kasur kosong lagi (siapa pun berikutnya bisa duduk)');
}
{
  // antrean: kasur penuh -> pasien menunggu di gerbang; kondisinya menurun
  createWorld();
  A.phase = 'play';
  A.patients = [];
  A.res = { wheat: 99, herb: 99, wood: 99, coins: 0 };
  A.stats.lost = 0;
  for (let i = 0; i < 3; i++) spawnPatient();
  let t = 0;
  while (A.patients.filter((p) => p.state === 'bed').length < 3 && t < 40) { updatePatients(1 / 30); t += 1 / 30; }
  ok(A.patients.filter((p) => p.state === 'bed').length === 3, '3 kasur Bangsal I terisi');
  spawnPatient();
  const q = A.patients[3];
  t = 0;
  while (q.state !== 'queue' && t < 40) { updatePatients(1 / 30); t += 1 / 30; }
  ok(q.state === 'queue', 'kasur penuh -> pasien ke-4 ANTRE di gerbang');
  t = 0;
  while (q.state === 'queue' && t < 120) { updatePatients(0.1); t += 0.1; }
  ok(q.state === 'leaving' && !q.cured, `kondisi habis setelah ~${(100 / ACFG.PATIENT.CONDITION_DRAIN).toFixed(0)}s antre -> pergi tanpa koin`);
  ok(A.stats.lost === 1 && A.res.coins === 0, 'pasien hilang tidak memberi koin (tekanan idle yang jujur)');
}

// ============================================================
console.log('\n== 5. Misi (spec §4.1.2) ==');
{
  A.quests = { idx: 1, progress: 0 };   // q_herb
  A.res.coins = 0;
  bumpQuest('harvestHerb', 2);
  ok(activeQuest().id === 'q_herb' && A.quests.progress === 2, 'progres misi naik (2/4)');
  bumpQuest('harvestHerb', 2);
  ok(activeQuest().id === 'q_wheat', 'misi selesai -> capsule menunjuk misi berikutnya');
  ok(A.res.coins === 8, `reward misi masuk koin (+${ACFG.QUESTS[1].reward})`);
}

// ============================================================
console.log('\n== 6. Bangsal / ghost tile (spec §5.1 transfer 1 koin per 0.05s) ==');
{
  createWorld();
  A.phase = 'play';
  A.patients = [];
  const d = resetDoctor(0, 0);
  A.res = { wheat: 0, herb: 0, wood: ACFG.WARD.COST_WOOD, coins: ACFG.WARD.COST_COINS };
  const w = A.wards[1];
  d.x = w.x; d.y = w.y; d.speed = 0;
  let t = 0;
  while (!w.built && t < 15) { updateTriggers(1 / 30); t += 1 / 30; }
  ok(w.built, `Kumpulkan Koin -> Buka Bangsal: Bangsal II jadi dalam ${t.toFixed(1)}s (±${(ACFG.WARD.COST_COINS * 0.05).toFixed(1)}s = 60 tick × 0.05s)`);
  ok(w.beds.length === ACFG.WARD.BEDS, `${ACFG.WARD.BEDS} kasur baru terbuka`);
  ok(A.res.coins === 0 && A.res.wood === 0, 'biaya koin & kayu terpakai habis');
  ok(A.stats.wardsBuilt === 1, 'statistik build +1 (misi build terpicu)');

  // pembayaran parsial: resource habis di tengah => progres tersimpan
  createWorld();
  A.phase = 'play';
  A.patients = [];
  resetDoctor(0, 0);
  A.res = { wheat: 0, herb: 0, wood: ACFG.WARD.COST_WOOD, coins: 20 };
  const w2 = A.wards[1];
  A.doctor.x = w2.x; A.doctor.y = w2.y; A.doctor.speed = 0;
  t = 0;
  while (!w2.built && t < 10) {
    if (A.res.coins === 0 && A.res.wood === 0) { t = 11; break; }
    updateTriggers(1 / 30); t += 1 / 30;
  }
  ok(!w2.built, 'resource habis di tengah: bangunan BELUM jadi');
  ok(w2.trigger && w2.trigger.remainingCost() > 0, 'progres tersimpan di trigger (bisa dilanjutkan nanti)');
  ok(w2.trigger.progress() > 0.4, `progress terbaca untuk HUD (${(w2.trigger.progress() * 100).toFixed(0)}%)`);
}

// ============================================================
console.log('\n== 7. Rig & secondary motion (spec §3) ==');
{
  createWorld();
  let d = resetDoctor(0, 0);
  // jalan lurus selatan penuh, lalu berhenti MENDADAK
  for (let i = 0; i < 30; i++) { updateDoctor(DT, { x: 0, y: 1 }); updateRig(DT); }
  const tip = A.rig.chains[1][2];
  const yTip = tip.y;
  for (let i = 0; i < 14; i++) { updateDoctor(DT, { x: 0, y: 0 }); updateRig(DT); }
  ok(tip.y > yTip + 1.2, `jubah MELIPAT MAJU saat berhenti mendadak (tip +( ${(tip.y - yTip).toFixed(1)}px) — momentum kain, bukan snap`);

  // berbelok 90°: kain tertinggal di tengah belokan
  d = resetDoctor(0, 0);
  for (let i = 0; i < 30; i++) { updateDoctor(DT, { x: 0, y: 1 }); updateRig(DT); }
  for (let i = 0; i < 6; i++) { updateDoctor(DT, { x: 1, y: 0 }); updateRig(DT); }
  const tip2 = A.rig.chains[1][2];
  ok(tip2.x > d.x - 12, `jubah TERTINGGAL di tengah belokan (tip ${(tip2.x - d.x).toFixed(1)}px; posisi akhir ≈ -18px)`);

  // lentera: pendulum ritmis, limit ±25°
  d = resetDoctor(0, 0);
  let maxA = 0;
  for (let i = 0; i < 300; i++) {
    updateDoctor(DT, { x: 0, y: 1 });
    updateRig(DT);
    maxA = Math.max(maxA, Math.abs(A.rig.lantern.a));
  }
  ok(maxA <= ACFG.RIG.LANTERN_LIMIT + 1e-6, `lentera: hinge ±25° terjaga (maks ${(maxA * 180 / Math.PI).toFixed(1)}°)`);
  ok(maxA > 0.03, `lentera: berayun ritmis mengikuti langkah (maks ${(maxA * 180 / Math.PI).toFixed(1)}° dari vertikal)`);
}

// ============================================================
console.log('\n== 8. Save (kunci terpisah dari Driftholm) ==');
{
  clearAsylum();
  A.res = { wheat: 3, herb: 4, wood: 5, coins: 77 };
  A.stats.cured = 4; A.stats.wardsBuilt = 1; A.stats.walkPx = 999;
  A.quests = { idx: 5, progress: 2 };
  A.dialogue.i = ACFG.DIALOGUE.length;
  saveAsylum();
  ok(!!store[ACFG.SAVE_KEY] && !store[ACFG.SAVE_KEY].includes('worldSeed'), 'save memakai kunci last-asylum (bukan kunci Driftholm)');
  A.res.coins = 1; A.quests.idx = 0; A.stats.cured = 0;
  ok(loadAsylum() === true, 'save dimuat');
  ok(A.res.coins === 77 && A.quests.idx === 5 && A.stats.cured === 4, 'koin/misi/stats pulih utuh');
  ok(A.dialogue.i === ACFG.DIALOGUE.length, 'status dialog pulih (tidak ulang cerita)');
  clearAsylum();
  ok(loadAsylum() === false, 'setelah clear: fresh start');
}

// ============================================================
console.log('\n== 9. Render pipeline (canvas stub) ==');
{
  createWorld();
  A.phase = 'play';
  A.patients = [];
  resetDoctor(0, 40);
  spawnPatient();
  let t = 0;
  while (A.patients[0].state !== 'bed' && t < 40) { updatePatients(1 / 30); t += 1 / 30; }
  const c = ctxStub();
  drawWorld(c, 0);  // noop-check: fungsi jalan tanpa melempar
  ok(true, 'drawWorld (lantai, node, gerbang, api, kolam cahaya) berjalan');
  drawGhostWard(c, A.wards[1], 1);
  drawBuiltWard(c, A.wards[0]);
  drawBed(c, A.wards[0].beds[0], 1);
  drawPatient(c, A.patients[0]);
  drawDoctor(c, 1);
  drawMiniIcon(c, 'coin', 0, 0, 14);
  ok(true, 'semua primitive karakter/properti (ghost tile, bed, pasien, dokter, ikon) berjalan');
  // loop game aslinya: 60 frame penuh
  step(60);
  ok(true, 'loop asylum 60 frame tanpa error (update + render + HUD)');
}

// ============================================================
console.log('\n== 10. PACING ekonomi: bot ideal (regresi, gaya repo) ==');
{
  createWorld();
  A.patients = [];
  A.phase = 'play';
  A.res = { wheat: 6, herb: 6, wood: 8, coins: 12 };
  A.quests = { idx: 0, progress: 0 };
  A.stats = { cured: 0, lost: 0, wardsBuilt: 0, walkPx: 0, coinsEarned: 0, harvest: { wheat: 0, herb: 0, wood: 0 } };
  A.nextPatientIn = ACFG.PATIENT.FIRST_SPAWN;
  resetDoctor(0, 40);
  A.time = 0;

  const DTB = 1 / 30;
  const distTo = (x, y) => Math.hypot(A.doctor.x - x, A.doctor.y - y);
  const toward = (x, y) => {
    const dx = x - A.doctor.x, dy = y - A.doctor.y;
    const dd = Math.hypot(dx, dy) || 1;
    return dd < 6 ? { x: 0, y: 0 } : { x: dx / dd, y: dy / dd };
  };
  // bot: 1) build begitu buffer siap (PRIORITAS — menjamin loop tertutup);
  //      2) treat; 3) panen resource yang kurang
  function botMove() {
    const g = A.stats.wardsBuilt < 1 ? A.wards.find((w) => !w.built) : null;
    if (g) {
      // sudah berdiri & transfer berjalan: bertahan sampai selesai
      if (g.trigger && !g.trigger.done && distTo(g.x, g.y) < 44) return { x: 0, y: 0 };
      // datang dengan BUFFER, supaya tidak bolak-balik di tengah transfer
      if (A.res.coins >= ACFG.WARD.COST_COINS + 10 && A.res.wood >= ACFG.WARD.COST_WOOD + 2) {
        return distTo(g.x, g.y) < 40 ? { x: 0, y: 0 } : toward(g.x, g.y);
      }
    }
    for (const w of A.wards) {
      if (!w.built) continue;
      for (const b of w.beds) {
        if (!b.patient) continue;
        if (A.res.herb >= ACFG.PATIENT.TREAT_HERB && A.res.wheat >= ACFG.PATIENT.TREAT_WHEAT) {
          return distTo(b.x, b.y) < 30 ? { x: 0, y: 0 } : toward(b.x + 10, b.y);
        }
      }
    }
    // prioritaskan kayu (dengan buffer +2) saat koin sudah dekat biaya,
    // supaya build tidak tersandera dan bot tidak bolak-balik
    const woodTarget = ACFG.WARD.COST_WOOD + 2;
    const needWood = A.stats.wardsBuilt < 1 && A.res.coins >= ACFG.WARD.COST_COINS - 20;
    const want = needWood && A.res.wood < woodTarget ? 'wood'
      : A.res.herb < ACFG.PATIENT.TREAT_HERB * 1.5 ? 'herb'
      : A.res.wheat < ACFG.PATIENT.TREAT_WHEAT * 2 ? 'wheat'
      : A.res.wood < woodTarget ? 'wood'
      : 'herb';
    let best = null, bd = Infinity;
    for (const nd of A.nodes) {
      if (nd.type !== want || nd.stock <= 0) continue;
      const dd = distTo(nd.x, nd.y);
      if (dd < bd) { bd = dd; best = nd; }
    }
    if (!best) {
      for (const t2 of ['herb', 'wheat', 'wood']) {
        for (const nd of A.nodes) {
          if (nd.type !== t2 || nd.stock <= 0) continue;
          const dd = distTo(nd.x, nd.y);
          if (dd < bd) { bd = dd; best = nd; }
        }
      }
    }
    if (!best) return { x: 0, y: 0 };
    return bd < 30 ? { x: 0, y: 0 } : toward(best.x, best.y);
  }

  let builtAt = -1;
  for (let t = 0; t < 240; t += DTB) {
    const mv = botMove();
    updateDoctor(DTB, mv);
    if (A.doctor.speed > 4) bumpQuest('walkPx', A.doctor.speed * DTB);
    updateNodes(DTB);
    updatePatients(DTB);
    updateTriggers(DTB);
    A.time += DTB;
    if (A.stats.wardsBuilt >= 1) { builtAt = t; break; }
  }
  ok(builtAt > 0, `loop inti tertutup: bot membangun Bangsal II dalam ${builtAt.toFixed(0)}s (< 240s)`);
  ok(A.stats.cured >= 3, `koin dari pasien nyata, bukan cheat (${A.stats.cured} pasien sembuh sebelum itu)`);
  ok(A.res.coins >= 0 && A.res.herb >= 0 && A.res.wheat >= 0, 'tidak ada resource negatif (pembayaran tidak overdraw)');
}

// ============================================================
console.log(`\nHasil: ${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
