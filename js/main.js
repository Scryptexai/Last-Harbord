// ============ Last Harbor — main (state machine + game loop) ============
import { CFG } from './config.js';
import { G } from './state.js';
import { loadGame, saveGame, clearSave } from './save.js';
import { initInput, getMove, input } from './input.js';
import {
  initUI, showScreen, openModal, closeModal, toast,
  updateDashboard, updateHUD, renderUpgradePanel, renderInventoryPanel, renderGameOver,
} from './ui.js';
import { createBoat, updateBoat, drawBoat, maxHP } from './boat.js';
import { generateSeaWorld, nearestIsland, drawSea, drawOceanBackground } from './world.js';
import { enterIsland, updateLand, drawLand, tryAttack, collectNearby } from './land.js';
import { addResource, canAfford, payCost, RES_TYPES } from './inventory.js';
import { loadAssets } from './assets.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const previewCanvas = document.getElementById('boat-preview');
const pctx = previewCanvas ? previewCanvas.getContext('2d') : null;

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

// =================== Aksi-aksi game ===================

function beginRun() {
  G.totalRuns++;
  G.runActive = true;
  G.runTime = 0;
  G.anchored = false;
  G.fishing = null;
  G.autopilotTarget = null;
  G.state = 'sea';
  G.cam.x = G.boat.x;
  G.cam.y = G.boat.y;
  showScreen('sea');
  saveGame();
  toast('Berlayar! Dekati pulau lalu tekan EXPLORE.');
}

// Dari dashboard: autopilot menuju pulau terdekat lalu mendarat.
function departExplore() {
  beginRun();
  const { island } = nearestIsland(G.boat.x, G.boat.y);
  if (!island) return;
  G.autopilotTarget = island;
  toast(`Autopilot: menuju ${island.name} (Diff ${island.difficulty})`);
}

// Perahu tiba di pulau → masuk mode daratan.
function enterIslandFlow(island) {
  G.autopilotTarget = null;
  G.fishing = null;
  G.anchored = false;
  enterIsland(island);

  const a = Math.PI / 2; // parkir di sisi dock
  G.boat.x = island.x + Math.cos(a) * (island.r + 34);
  G.boat.y = island.y + Math.sin(a) * (island.r + 34);
  G.boat.vx = 0; G.boat.vy = 0;

  G.state = 'land';
  const p = G.land.player;
  G.cam.x = p.x; G.cam.y = p.y;
  showScreen('land');
  toast(`Mendarat di ${island.name}! Difficulty ${island.difficulty}`);
}

function backToBoat() {
  if (G.state !== 'land' || !G.land) return;
  const isl = G.land.island;
  G.land = null;
  G.state = 'sea';
  const a = Math.PI / 2;
  G.boat.x = isl.x + Math.cos(a) * (isl.r + 40);
  G.boat.y = isl.y + Math.sin(a) * (isl.r + 40);
  G.boat.vx = 0; G.boat.vy = 0;
  G.cam.x = G.boat.x; G.cam.y = G.boat.y;
  G.nearIsland = nearestIsland(G.boat.x, G.boat.y);
  saveGame();
  showScreen('sea');
  toast('Kembali ke perahu.');
}

// Tombol SAIL di HUD laut = kembali ke harbor (akhiri run).
function dockHarbor() {
  if (G.runTime > G.bestTime) G.bestTime = G.runTime;
  const t = G.runTime;
  G.runActive = false;
  G.runTime = 0;
  resetToHarbor();
  toast(`Kembali ke harbor. Waktu run: ${fmtTimeLocal(t)}`);
}

function die(cause) {
  if (G.runTime > G.bestTime) G.bestTime = G.runTime;
  G.deathInfo = { cause, time: G.runTime };
  // kehilangan seluruh resource di inventory; upgrade tetap
  for (const t of RES_TYPES) G.resources[t] = 0;
  G.boatHP = maxHP();
  G.runActive = false;
  G.runTime = 0;
  G.land = null;
  G.autopilotTarget = null;
  G.fishing = null;
  G.anchored = false;
  G.state = 'gameover';
  saveGame();
  renderGameOver();
  showScreen('gameover');
}

function resetToHarbor() {
  G.state = 'dashboard';
  G.land = null;
  G.autopilotTarget = null;
  G.fishing = null;
  G.anchored = false;
  G.runActive = false;
  G.runTime = 0;
  G.boat = createBoat(0, 0);
  G.cam.x = 0; G.cam.y = 0;
  G.nearIsland = null;
  generateSeaWorld();
  saveGame();
  showScreen('dashboard');
  updateDashboard();
}

// EXPLORE saat di laut: dekat → langsung masuk; jauh → autopilot.
function exploreNear() {
  if (G.state !== 'sea') return;
  const { island, dist } = nearestIsland(G.boat.x, G.boat.y);
  if (!island) return;
  if (dist < 50) {
    enterIslandFlow(island);
  } else {
    G.autopilotTarget = island;
    toast(`Berlayar ke ${island.name}...`);
  }
}

// ---------- Fishing ----------
function startFishing() {
  if (G.state !== 'sea' || G.fishing) return;
  G.fishing = { t: 0, dur: CFG.FISH.DURATION };
  toast('Mulai memancing...');
}

function tickFishing(dt) {
  const f = G.fishing;
  f.t += dt;
  if (f.t < f.dur) return;
  G.fishing = null;
  const roll = Math.random();
  let type = null;
  if (roll < CFG.FISH.CHANCE_FOOD) type = 'food';
  else if (roll < CFG.FISH.CHANCE_FOOD + CFG.FISH.CHANCE_WOOD) type = 'wood';
  if (type) {
    const n = addResource(type, 1);
    toast(n ? `Dapat 1 ${CFG.RESOURCES[type].label}!` : 'Storage penuh, hasil lepas!');
  } else {
    toast('Tidak dapat apa-apa...');
  }
  G.saveDirty = true;
}

// ---------- Anchor ----------
function toggleAnchor() {
  if (G.state !== 'sea') return;
  G.anchored = !G.anchored;
  if (G.anchored && G.fishing) G.fishing = null;
  toast(G.anchored ? 'Jangkar turun — perahu berhenti.' : 'Jangkar ditarik.');
}

// ---------- Upgrade ----------
function buyUpgrade(key) {
  const def = CFG.UPGRADES[key];
  const lv = G.upgrades[key];
  if (lv >= def.levels.length) { toast('Sudah level maksimum.'); return; }
  const cost = def.levels[lv].cost;
  if (!canAfford(cost)) { toast('Resource tidak cukup!'); return; }
  payCost(cost);
  G.upgrades[key] = lv + 1;
  if (key === 'defense') G.boatHP = Math.min(maxHP(), G.boatHP + 20);
  saveGame();
  renderUpgradePanel();
  updateDashboard();
  toast(`${def.label} → Lv.${lv + 1}!`);
}

// ---------- Healing (Food / Medicine) ----------
function useHeal(type) {
  if (!CFG.HEAL[type]) return;
  if ((G.resources[type] || 0) <= 0) {
    toast(`Tidak punya ${CFG.RESOURCES[type].label}!`);
    return;
  }
  if (G.boatHP >= maxHP()) { toast('HP sudah penuh.'); return; }
  G.resources[type]--;
  const h = CFG.HEAL[type];
  G.boatHP = Math.min(maxHP(), G.boatHP + h);
  toast(`+${h} HP (${CFG.RESOURCES[type].label})`);
  saveGame();
  updateDashboard();
  renderInventoryPanel();
  if (!elsHidden('screen-upgrade')) renderUpgradePanel();
}

function elsHidden(id) {
  const el = document.getElementById(id);
  return !el || el.classList.contains('hidden');
}

// ---------- Reset save (klik 2x untuk konfirmasi) ----------
let resetArmed = false, resetTimer = null;
function resetSaveFlow(btn) {
  if (!resetArmed) {
    resetArmed = true;
    btn.textContent = 'Yakin? Klik lagi untuk hapus';
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => { resetArmed = false; btn.textContent = 'Reset Save'; }, 2600);
    return;
  }
  resetArmed = false;
  clearTimeout(resetTimer);
  clearSave();
  G.resources = { fuel: 0, wood: 0, food: 0, medicine: 0 };
  G.upgrades = { storage: 0, speed: 0, defense: 0 };
  G.totalRuns = 0;
  G.bestTime = 0;
  G.boatHP = maxHP();
  btn.textContent = 'Reset Save';
  resetToHarbor();
  toast('Save direset.');
}

// =================== Update per state ===================

let lastSaveT = 0;
function flushSave() {
  if (G.saveDirty && G.time - lastSaveT > 0.8) {
    saveGame();
    G.saveDirty = false;
    lastSaveT = G.time;
  }
}

function updateSea(dt) {
  if (G.runActive) G.runTime += dt;

  const manual = getMove();
  let move = manual;
  const hasManual = Math.hypot(manual.x, manual.y) > 0.01;

  if (hasManual) {
    if (G.autopilotTarget) { G.autopilotTarget = null; toast('Autopilot dibatalkan.'); }
    if (G.fishing) { G.fishing = null; toast('Memancing dibatalkan.'); }
    if (G.anchored) { G.anchored = false; toast('Jangkar ditarik.'); }
  } else if (G.autopilotTarget) {
    const t = G.autopilotTarget;
    const dx = t.x - G.boat.x, dy = t.y - G.boat.y;
    const d = Math.hypot(dx, dy) || 1;
    move = { x: dx / d, y: dy / d };
  }

  updateBoat(dt, move);
  if (G.fishing) tickFishing(dt);

  if (G.autopilotTarget) {
    const t = G.autopilotTarget;
    if (Math.hypot(t.x - G.boat.x, t.y - G.boat.y) < t.r + 42) {
      enterIslandFlow(t);
      return;
    }
  }

  const ni = nearestIsland(G.boat.x, G.boat.y);
  G.nearIsland = ni;
  for (const isl of G.islands) {
    isl.inRange = (ni.island === isl && ni.dist < 70);
  }

  G.cam.x += (G.boat.x - G.cam.x) * Math.min(1, dt * 5);
  G.cam.y += (G.boat.y - G.cam.y) * Math.min(1, dt * 5);

  flushSave();
}

function updateLandState(dt) {
  if (!G.land) return;
  G.runTime += dt;

  if (input.attackQueued) {
    input.attackQueued = false;
    tryAttack();
  }

  updateLand(dt, getMove());

  const p = G.land.player;
  if (p) {
    G.cam.x += (p.x - G.cam.x) * Math.min(1, dt * 6);
    G.cam.y += (p.y - G.cam.y) * Math.min(1, dt * 6);
  }

  flushSave();

  if (G.pendingDeath) {
    G.pendingDeath = false;
    die('Kau dibunuh zombie di daratan.');
  }
}

function update(dt) {
  G.time += dt;
  G.hpFlash = Math.max(0, (G.hpFlash || 0) - dt * 1.4);

  if (G.state === 'sea') updateSea(dt);
  else if (G.state === 'land') updateLandState(dt);

  // aksi dari keyboard
  if (input.actionQueued) {
    const a = input.actionQueued;
    input.actionQueued = null;
    if (a === 'explore' && G.state === 'sea') exploreNear();
    if (a === 'back' && G.state === 'land') backToBoat();
  }
}

// =================== Render ===================

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (G.state === 'sea') {
    drawSea(ctx, vw, vh);
  } else if (G.state === 'land') {
    drawLand(ctx, vw, vh);
  } else {
    drawOceanBackground(ctx, vw, vh, 0, 0);
  }

  // vignette merah saat kena hit
  if (G.hpFlash > 0) {
    ctx.fillStyle = `rgba(255,30,30,${(G.hpFlash * 0.55).toFixed(3)})`;
    ctx.fillRect(0, 0, vw, vh);
  }

  if (G.state === 'dashboard') drawBoatPreview();
}

// Preview perahu di dashboard
function drawBoatPreview() {
  if (!pctx) return;
  const w = previewCanvas.width, h = previewCanvas.height;

  pctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = pctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0d283f');
  g.addColorStop(1, '#05101b');
  pctx.fillStyle = g;
  pctx.fillRect(0, 0, w, h);

  pctx.strokeStyle = 'rgba(127, 212, 255, 0.08)';
  pctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const yb = 18 + i * 26 + ((G.time * 14) % 26);
    pctx.beginPath();
    for (let x = -10; x <= w + 10; x += 18) {
      const y = yb + Math.sin(x * 0.03 + G.time * 1.6 + i) * 3;
      if (x === -10) pctx.moveTo(x, y); else pctx.lineTo(x, y);
    }
    pctx.stroke();
  }

  pctx.setTransform(1, 0, 0, 1, w / 2, h / 2 + 4);
  drawBoat(pctx, { x: 0, y: 0, angle: -Math.PI / 2 }, 1.35);

  pctx.setTransform(1, 0, 0, 1, 0, 0);
  pctx.fillStyle = 'rgba(255,255,255,0.7)';
  pctx.font = '11px system-ui, sans-serif';
  pctx.textAlign = 'left';
  pctx.fillText(`Storage Lv.${G.upgrades.storage} · Speed Lv.${G.upgrades.speed} · Defense Lv.${G.upgrades.defense}`, 10, h - 10);
}

// =================== Handlers UI ===================

const handlers = {
  sail: () => beginRun(),
  fish: () => { beginRun(); startFishing(); },
  upgrade: () => openModal('upgrade'),
  inventory: () => openModal('inventory'),
  explore: () => departExplore(),
  resetSave: (btn) => resetSaveFlow(btn),

  hudSail: () => dockHarbor(),
  hudFish: () => startFishing(),
  hudAnchor: () => toggleAnchor(),
  hudExplore: () => exploreNear(),

  attack: () => { input.attackQueued = true; },
  collect: () => collectNearby(),
  back: () => backToBoat(),

  buy: (key) => buyUpgrade(key),
  heal: (type) => useHeal(type),
  closeModal: () => closeModal(),
  goHarbor: () => resetToHarbor(),
};

// =================== Bootstrap & loop ===================

function fmtTimeLocal(s) {
  const sec = Math.max(0, Math.floor(s || 0));
  return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
}

async function boot() {
  resize();
  await loadAssets();
  const loaded = loadGame();
  if (!(G.boatHP > 0)) G.boatHP = maxHP();
  G.boatHP = Math.min(G.boatHP, maxHP());
  G.boat = createBoat(0, 0);
  G.cam.x = 0; G.cam.y = 0;
  generateSeaWorld();
  initInput();
  initUI(handlers);
  showScreen('dashboard');
  updateDashboard();
  if (loaded) toast('Save dimuat dari localStorage.');

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    updateHUD();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();
