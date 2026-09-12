// ============ Last Harbor — main (state machine + game loop) ============
import { CFG } from './config.js';
import { G } from './state.js';
import { loadGame, saveGame, clearSave } from './save.js';
import { initInput, getMove, input, pressContext, releaseContext, pressAttack, clearQueued } from './input.js';
import { initUI, showScreen, openModal, closeModal, isModalOpen, toast, updateHUD, renderDebrief, renderChart, renderBench, showHint, refreshIfOpen } from './ui.js';
import { createBoat, updateBoat, drawBoat, drawLanternPool, maxHP, speedMult, boatTier } from './boat.js';
import { generateWorld, nearestIsland, drawSea, drawOceanBackground, drawRain, HARBOR, harborDist, survey, islandRemaining, islandTotalRemaining, islandById } from './world.js';
import { enterIsland, updateLand, drawLand, tryAttack, contextAction, landContext, atExtract, playerWorldPos } from './land.js';
import { enterHarbor, updateHarbor, drawHarbor, harborContext } from './harbor.js';
import { addCarried, bankCarried, carriedLoad, emptyBag, RES_TYPES, dropCarried } from './inventory.js';
import { buyNext, nextRung, canBuyNext, goalLabel, isMaxed, capacity } from './refit.js';
import { resetTide, updateTide, tidePhase, seaDrainRate } from './tide.js';
import { loadAssets } from './assets.js';
import { sfx, haptic, initAudio, setAmbience, tickAmbience, setMuted } from './audio.js';
import { fx, updateFx, timeScale, shakeOffset, drawFxScreen, resetFx, addFlash, addShake, ring, flushGulls, returnGulls } from './fx.js';
import { clamp, dist, lerp, fmtTime } from './util.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let vw = window.innerWidth, vh = window.innerHeight, dpr = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  vw = window.innerWidth;
  vh = window.innerHeight;
  canvas.width = Math.round(vw * dpr);
  canvas.height = Math.round(vh * dpr);
  canvas.style.width = vw + 'px';
  canvas.style.height = vh + 'px';
}
window.addEventListener('resize', resize);

const tips = new Set();
function tip(key, text, ms = 5200) {
  if (tips.has(key)) return;
  tips.add(key);
  showHint(text, ms);
}

// =================== Aksi ===================

function beginRun() {
  const first = G.totalRuns === 0;
  G.totalRuns++;
  G.runActive = true;
  G.runTime = 0;
  G.anchored = false;
  G.fishing = null;
  G.state = 'sea';
  G.cam.zoom = 1;
  G.cam.x = G.boat.x; G.cam.y = G.boat.y;
  // JAM PASANG TIDAK DI-RESET DI SINI. Dermaga membekukan malam, bukan memutarnya:
  // kalau berlayar lagi, malam lanjut dari detik terakhir kau menambat. Satu-satunya
  // yang memutar jam ini ke nol adalah fajar (lihat tide.js).
  if (!G.tide) resetTide();
  resetFx();
  showScreen('sea');
  setAmbience('sea');
  sfx('anchor');
  saveGame();
  if (first) tip('t_sail', 'Bertolak. Ikuti penunjuk arah, atau berlayar bebas — hanya kau yang tahu berapa jauh terlalu jauh. Perhatikan cakrawala.', 6500);
}

function pickTarget(id) {
  G.target = islandById(id);
  if (H.onModalClosed) { /* peta tetap terbuka */ }
}

// Perahu tiba di pulau -> mendarat.
function enterIslandFlow(island) {
  G.fishing = null;
  G.anchored = false;
  G.target = null;

  const a = Math.PI / 2;
  G.boat.x = island.x;
  G.boat.y = island.y + (island.r + CFG.BOAT.PARK_OFFSET);
  G.boat.vx = 0; G.boat.vy = 0;
  G.boat.angle = -Math.PI / 2;

  const first = !G.surveyed[island.id];
  enterIsland(island);
  G.state = 'land';
  showScreen('land');
  setAmbience('land');
  clearQueued();

  const left = islandTotalRemaining(island);
  if (first) {
    tip('t_land', 'Kapalmu ada di bawah layar. Semua yang kau kumpulkan hilang kalau kau mati sebelum naik kapal.', 6200);
    toast(`${island.name} · ${CFG.FLAVORS[island.flavor].label}`);
  } else if (left <= 0) {
    toast('Pulau ini sudah habis dikuras.');
  } else {
    toast(`${island.name} · sisa muatan di pulau ini`);
  }
}

function backToBoat() {
  if (G.state !== 'land' || !G.land) return;
  const isl = G.land.island;
  G.land = null;
  G.state = 'sea';
  G.boat.x = isl.x;
  G.boat.y = isl.y + (isl.r + CFG.BOAT.PARK_OFFSET);
  G.boat.vx = 0; G.boat.vy = 0;
  G.cam.x = G.boat.x; G.cam.y = G.boat.y;
  G.cam.zoom = 1;
  G.nearIsland = nearestIsland(G.boat.x, G.boat.y);
  setAmbience('sea');
  sfx('board');
  haptic(20);
  addFlash(0.25);
  showScreen('sea');
  if (carriedLoad() >= capacity()) {
    tip('t_full', 'Palka penuh. Waktunya pulang sebelum pasang menutup jalanmu.', 5000);
  }
  saveGame();
}

// Tambat di dermaga: muatan dibongkar, run selesai.
function moorHarbor() {
  const moved = bankCarried();
  const total = Object.values(moved).reduce((a, b) => a + b, 0);
  G.runActive = false;
  G.runTime = 0;
  G.boat.vx = 0; G.boat.vy = 0;
  G.boat.x = HARBOR.x; G.boat.y = -40;
  G.target = null;
  resetFx();

  enterHarbor();
  showScreen('harbor');
  setAmbience('harbor');
  saveGame();

  if (total > 0) {
    sfx('bank');
    haptic([22, 40, 30, 60, 40]);
    addFlash(0.3);
    showBankBeat(moved);
    if (canBuyNext()) {
      const r = nextRung();
      toast(`${r.label} sudah bisa dipasang di meja kerja.`);
      sfx('newGoal');
    }
  } else {
    toast('Kau kembali dengan tangan kosong.');
  }
}

function showBankBeat(cargo) {
  const el = document.getElementById('bank-beat');
  if (!el) return;
  const icons = RES_TYPES.filter((t) => (cargo[t] || 0) > 0)
    .map((t) => `<span class="bb-item"><i style="background:${CFG.RESOURCES[t].color}"></i>+${cargo[t]}</span>`).join('');
  el.innerHTML = `<div class="bb-title">MUATAN DIBONGKAR</div><div class="bb-row">${icons}</div>`;
  el.classList.remove('hidden');
  el.classList.remove('show');
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.classList.add('hidden'), 400); }, 1500);
}

// Kematian bukan hard-cut: 0.8s slow-mo dulu (waktu berjalan 1/4 kecepatan, guncangan,
// suara tenggelam), baru debrief. Ini memberi "framing" kematian — momen, bukan popup.
function beginDeath(cause) {
  if (G.dying) return;
  G.dying = { t: 0.8, cause };
  addShake(0.5);
  sfx('death');
  haptic([60, 60, 120]);
}

function die(cause) {
  const pos = playerWorldPos();
  const lost = dropCarried();
  const lostTotal = Object.values(lost).reduce((a, b) => a + b, 0);
  let salvageText = '';

  if (lostTotal > 0) {
    let islandId, sx, sy;
    if (pos && G.land) {
      // mati di darat: pelampung jatuh tepat di tempat kejadian
      islandId = G.land.island.id; sx = pos.x; sy = pos.y;
    } else {
      // mati di laut: muatan hanyut ke pulau terdekat
      const ni = nearestIsland(G.boat.x, G.boat.y);
      const isl = ni.island;
      islandId = isl.id;
      const a = Math.random() * Math.PI * 2;
      sx = Math.cos(a) * isl.r * 0.5;
      sy = Math.sin(a) * isl.r * 0.5;
    }
    G.salvages.push({ islandId, x: sx, y: sy, cargo: { ...lost } });
    const isl = islandById(islandId);
    salvageText = `Pelampung muatan hanyut ke ${isl ? isl.name : 'pulau terdekat'} — tandai di peta, ambil kembali kapan saja.`;
  } else {
    salvageText = 'Tidak ada muatan yang hilang.';
  }

  const runTime = G.runTime;
  G.hull = Math.max(1, Math.round(0.5 * maxHP()));
  G.deathInfo = { cause, time: runTime, lost, salvageText };
  G.runActive = false;
  G.runTime = 0;
  G.land = null;
  G.fishing = null;
  G.target = null;
  G.pendingDeath = false;

  resetFx();
  saveGame();
  enterHarbor();
  showScreen('harbor');
  setAmbience('harbor');
  renderDebrief(G.deathInfo);
  openModal('debrief');
}

function newGame() {
  clearSave();
  G.refit = 0;
  G.hull = maxHP();
  G.banked = emptyBag();
  G.carried = emptyBag();
  G.totalRuns = 0;
  G.salvages = [];
  G.surveyed = {};
  G.tabbed = {};
  G.deathInfo = null;
  G.worldSeed = (Math.random() * 1e9) >>> 0;
  generateWorld(G.worldSeed);
  G.hull = maxHP();
  enterHarbor();
  showScreen('harbor');
  saveGame();
  refreshIfOpen();
}

function useHeal() {
  const mx = maxHP();
  const need = mx - G.hull;
  if (need <= 0) return;
  const med = G.carried.medicine || 0;
  const food = G.carried.food || 0;
  let type = null;
  if (med > 0 && need >= CFG.HEAL.medicine) type = 'medicine';
  else if (food > 0) type = 'food';
  else if (med > 0) type = 'medicine';
  if (!type) { toast('Bekal habis.'); sfx('blockFull'); return; }
  G.carried[type]--;
  G.hull = Math.min(mx, G.hull + CFG.HEAL[type]);
  sfx('pickup');
  addFlash(0.12);
  const px = G.land && G.land.player ? G.land.player.x : G.boat.x;
  const py = G.land && G.land.player ? G.land.player.y : G.boat.y;
  ring(px, py, '#9fe0a8', 42, 0.45);
  toast(`+${CFG.HEAL[type]} hull · ${CFG.RESOURCES[type].short}`);
  G.saveDirty = true;
}

function buyRefit() {
  const rung = buyNext();
  if (!rung) { toast('Belum cukup bahan.'); sfx('blockFull'); return; }
  sfx('forge');
  addFlash(0.4);
  addShake(0.2);
  toast(`${rung.label} terpasang · ${rung.effect}`);
  saveGame();
  renderBench();
  refreshIfOpen();
}

// ---------- memancing: di air dangkal dekat pulau, berumpan 1 makanan ----------
function fishHere() {
  if (G.state !== 'sea' || G.fishing) return;
  if ((G.banked.food || 0) + (G.carried.food || 0) <= 0) return;
  G.fishing = { t: 0, dur: CFG.FISH.DURATION };
  G.anchored = true;
  sfx('splash');
  tip('t_fish', 'Memancing menahanmu di sini sementara pasang terus naik.', 4200);
}

function tickFishing(dt) {
  const f = G.fishing;
  if (!f) return;
  f.t += dt;
  if (f.t < f.dur) return;
  G.fishing = null;
  G.anchored = false;
  // umpan: ambil dari gudang dulu, lalu dari muatan
  if (G.banked.food > 0) G.banked.food--; else if (G.carried.food > 0) G.carried.food--;
  const got = [];
  const add = (t, n) => { const a = addCarried(t, n); if (a > 0) got.push(`${a} ${CFG.RESOURCES[t].short.toLowerCase()}`); };
  add('food', 2);
  if (Math.random() < 0.3) add('wood', 1);
  if (Math.random() < 0.15) add('medicine', 1);
  if (got.length) { sfx('gather_done'); toast('Tangkapan: ' + got.join(', ')); }
  else toast('Palka penuh — tangkapan lepas.');
  G.saveDirty = true;
}

// =================== Update ===================

let lastSaveT = 0;
function flushSave() {
  if (G.saveDirty && G.time - lastSaveT > 1.0) {
    saveGame();
    lastSaveT = G.time;
  }
}

// Konteks tunggal — satu tombol yang selalu tahu apa yang masuk akal.
function currentContext() {
  if (isModalOpen()) return { kind: null };
  if (G.state === 'land') return landContext();
  if (G.state === 'harbor') return harborContext();
  if (G.state === 'sea') {
    const hd = harborDist();
    if (hd < 190) return { kind: 'moor', label: 'BERTAMBAT' };
    const ni = G.nearIsland;
    if (ni && ni.island && ni.dist < 90) return { kind: 'land', label: 'MENDARAT' };
    if (ni && ni.island && ni.dist < 280 && (G.banked.food > 0 || G.carried.food > 0)) {
      return { kind: 'fish', label: 'MEMANCING' };
    }
    return { kind: null };
  }
  return { kind: null };
}

function doContext() {
  const c = currentContext();
  switch (c.kind) {
    case 'land': {
      const ni = G.nearIsland;
      if (ni && ni.island) enterIslandFlow(ni.island);
      break;
    }
    case 'moor': moorHarbor(); break;
    case 'fish': fishHere(); break;
    case 'moorNothing': break;
    case 'board': backToBoat(); break;
    case 'chart': openModal('chart'); break;
    case 'bench': openModal('bench'); break;
    case 'sail': {
      if (!G.target) { openModal('chart'); toast('Pilih tujuan dulu di meja peta.'); }
      else { sfx('board'); beginRun(); }
      break;
    }
    case 'gather':
    case 'salvage': {
      const r = contextAction();
      if (r === 'board') backToBoat();
      break;
    }
    default: {
      const r = contextAction();
      if (r === 'board') backToBoat();
      break;
    }
  }
}

function updateSea(dt) {
  if (G.runActive) G.runTime += dt;
  const manual = getMove();
  let move = manual;
  const hasManual = Math.hypot(manual.x, manual.y) > 0.01;
  if (hasManual && G.fishing) { G.fishing = null; G.anchored = false; }
  if (hasManual && G.anchored) G.anchored = false;

  const ni = nearestIsland(G.boat.x, G.boat.y);
  G.nearIsland = ni;
  const shallow = (ni.island && ni.dist < 100) || harborDist() < 240;

  updateBoat(dt, move, { shallow });
  if (G.fishing) tickFishing(dt);

  // pasang menguras lambung di laut terbuka
  const drain = seaDrainRate(Math.min(ni.dist, harborDist() - HARBOR.r));
  if (drain > 0) {
    G.hull -= drain * dt;
    if (Math.random() < dt * 1.4) { sfx('crack'); addShake(0.12); }
    if (G.hull <= 0) {
      G.hull = 0;
      beginDeath('Lambung tidak kuat menahan pasang di laut terbuka.');
      return;
    }
  }

  G.cam.x += (G.boat.x - G.cam.x) * Math.min(1, dt * 5);
  G.cam.y += (G.boat.y - G.cam.y) * Math.min(1, dt * 5);
  flushSave();
  maybeRevealNearby(ni.island, ni.dist);
}

function maybeRevealNearby(island, d) {
  if (!island || d > 260) return;
  if (survey(island)) {
    toast(`${island.name} tercatat di peta.`);
    saveGame();
    renderChart();
  }
}

function updateLandState(dt) {
  if (!G.land) return;
  if (G.runActive) G.runTime += dt;

  if (input.attackQueued) {
    input.attackQueued = false;
    tryAttack();
  }

  updateLand(dt, getMove(), { gatherHeld: input.held.action });

  const p = G.land.player;
  if (p) {
    G.cam.x += (p.x - G.cam.x) * Math.min(1, dt * 6);
    G.cam.y += (p.y - G.cam.y) * Math.min(1, dt * 6);
  }
  // reveal pendaratan: zoom lebar menyusut mulus ke zoom main selama ~1.2s
  if (G.camReveal > 0) {
    G.camReveal = Math.max(0, G.camReveal - dt);
    const k = 1 - G.camReveal / 1.2;
    const ease = 1 - Math.pow(1 - Math.min(1, k), 3);   // ease-out: cepat di awal, halus di akhir
    G.cam.zoom = lerp(CFG.LAND.ZOOM * 0.70, CFG.LAND.ZOOM, ease);
  }
  flushSave();

  if (G.pendingDeath) {
    G.pendingDeath = false;
    beginDeath('Kau kalah di daratan. Kapal menunggu, tapi kau tidak sampai.');
  }
}

function update(dt) {
  const icon = getMove();
  G.time += dt;

  // hit-stop: satu-satunya tempat waktu boleh berhenti
  const ts = timeScale();
  let d = dt * ts;

  // kematian: slow-mo 0.8s dulu, lalu debrief — waktu bermain melambat, jam nyata jalan
  if (G.dying) {
    G.dying.t -= dt;
    d *= 0.25;
    if (G.dying.t <= 0) {
      const cause = G.dying.cause;
      G.dying = null;
      die(cause);
      return;
    }
  }

  updateFx(dt);

  if (G.state === 'sea' && fx.vignetteTarget) fx.vignetteTarget = 0;

  if (G.state === 'sea' || G.state === 'land') {
    updateTide(d);
    const ph = tidePhase(G.tide ? G.tide.t : 0);
    // Catatan: flag ada di G.tide, bukan di tabel fase. Sebelum ini dibaca dari
    // PHASES (undefined) sehingga beat camar/guncangan tidak pernah menyala.
    const changed = !!(G.tide && G.tide.justChanged);
    if (changed && ph.key === 'turning') {
      sfx('waveChange');
      // burung-burung pergi. Tidak ada teks — hanya langit yang tiba-tiba kosong.
      const w = G.state === 'land' && G.land ? G.land.player : G.boat;
      flushGulls(w.x, w.y * 0.96, 9);
      addShake(0.14);
      tip('t_turn', 'Camar terbang pergi. Perhatikan garis air di pantai.', 6000);
    }
    if (changed && ph.key === 'high') {
      sfx('waveChange');
      flushGulls(G.boat ? G.boat.x : 0, (G.boat ? G.boat.y : 0), 14);
      addShake(0.34);
      tip('t_high', 'Air pasang. Sepanjang kau di luar, lambungmu terkuras — kembali ke kapal, atau terus ke pulau lain.', 6500);
    }
    // FAJAR: malam habis. Air turun, langit sembuh, camar kembali. Tidak ada teks:
    // yang berubah adalah dunia, dan yang dibaca pemain adalah "aku masih hidup".
    if (G.tide && G.tide.justDawned) {
      sfx('gull');
      addFlash(0.22);
      const w = G.state === 'land' && G.land ? G.land.player : G.boat;
      returnGulls(w.x, w.y, 7);
      toast('Fajar. Air turun.');   // sisanya diperlihatkan dunia, bukan ditulis
    }
    const amb = ph.key === 'high' ? 'high' : (G.state === 'land' ? 'land' : 'sea');
    setAmbience(amb);
    tickAmbience(dt, ph.key === 'calm' && G.state === 'sea');
  }

  // aksi dari keyboard
  if (input.actionQueued) {
    input.actionQueued = false;
    doContext();
  }

  if (G.state === 'sea') updateSea(d);
  else if (G.state === 'land') updateLandState(d);
  else if (G.state === 'harbor') {
    updateHarbor(d, icon, isModalOpen());
    tickAmbience(dt, true);
  }
}

// =================== Render ===================

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;

  const sh = shakeOffset();
  const zoom = G.cam.zoom || 1;

  if (G.state === 'sea' || G.state === 'land' || G.state === 'harbor') {
    ctx.save();
    if (sh.x || sh.y) ctx.translate(sh.x, sh.y);
    if (G.state === 'sea') drawSea(ctx, vw, vh);
    else if (G.state === 'land') drawLand(ctx, vw, vh);
    else drawHarbor(ctx, vw, vh);
    ctx.restore();
    // cuaca (hujan + kabut) hidup di atas dunia — satu bahasa dengan pasang, bukan UI
    if (G.state === 'sea' || G.state === 'land') drawRain(ctx, vw, vh);
  } else {
    drawOceanBackground(ctx, vw, vh, 0, 0);
  }

  // indikator arah serangan & vignette lambung kritis (layar)
  drawFxScreen(ctx, vw, vh, 0);

}

// =================== Handlers UI ===================

const H = {
  onContextDown: () => pressContext(),
  onContextUp: () => releaseContext(),
  onAttack: () => pressAttack(),
  onMute: () => {
    setMuted(!G.muted);
    toast(G.muted ? 'Suara mati.' : 'Suara hidup.');
    saveGame();
  },
  onPickTarget: (id) => pickTarget(id),
  onSailNoTarget: () => {
    if (!G.target) G.target = null;
    beginRun();
  },
  onBuy: () => buyRefit(),
  onHeal: () => useHeal(),
  onModalClosed: () => clearQueued(),
};

// =================== Bootstrap & loop ===================

async function boot() {
  resize();
  await loadAssets();
  resetTide();                 // default; loadGame() boleh menimpa jam malam ini
  const loaded = loadGame();
  if (!G.worldSeed) G.worldSeed = (Math.random() * 1e9) >>> 0;
  generateWorld(G.worldSeed);
  G.boat = createBoat(HARBOR.x, -40);
  if (!(G.hull > 0)) G.hull = maxHP();
  G.hull = Math.min(G.hull, maxHP());

  initInput({ mute: () => H.onMute(), escape: () => closeModal() });
  input.onGesture = () => initAudio();
  initUI(H);

  enterHarbor();
  showScreen('harbor');
  setAmbience('harbor');

  if (loaded) {
    toast('Progres dimuat dari dermaga terakhir.');
  } else {
    toast('Kau baru saja sampai di dermaga ini.');
  }
  setTimeout(() => {
    const touch = typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches;
    tip('t_move', touch ? 'Joystick kiri untuk berjalan. Tombol kanan untuk aksi.' : 'WASD untuk berjalan · E untuk aksi · SPASI untuk menyerang.', 6000);
  }, 500);
  setTimeout(() => {
    tip('t_harbor', 'Buka peta untuk memilih pulau, lalu berjalan ke haluan kapal untuk berlayar.', 8000);
  }, 6600);

  let last = performance.now();
  function frame(now) {
    const raw = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(raw);
    render();
    updateHUD(currentContext());
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ---------- Titik masuk eksplisit ----------
// boot() tidak lagi dijalankan otomatis saat modul dimuat di browser. Ia diekspor
// sebagai startGame() dan dipanggil oleh js/boot.js setelah tombol mulai ditekan.
// Seluruh isi boot() TIDAK berubah — hanya titik pemicunya yang pindah dari
// "otomatis saat load" menjadi "dipanggil setelah tombol mulai ditekan".
export async function startGame() {
  await boot();
}

// Test headless (mis. tests/integration.test.mjs) mengimpor main.js secara langsung
// tanpa boot.js, sehingga flag ini tidak tersetel dan game tetap boot otomatis —
// alur lama tetap utuh di sana.
if (!(typeof window !== 'undefined' && window.__LAST_HARBOR_BOOT__)) {
  startGame();
}
