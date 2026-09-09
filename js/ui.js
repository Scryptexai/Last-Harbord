// ============ UI overlay (HTML/CSS) ============
import { CFG } from './config.js';
import { G } from './state.js';
import { maxHP, boatLevel } from './boat.js';
import { capacity, usedStorage } from './inventory.js';
import { nearestIsland } from './world.js';
import { fmtTime } from './util.js';

const els = {};
let H = null; // handlers dari main.js

const IDS = [
  'screen-dashboard', 'screen-hud', 'screen-upgrade', 'screen-inventory', 'screen-gameover',
  'dash-level', 'dash-hp-fill', 'dash-hp-text', 'dash-storage', 'dash-speed', 'dash-defense',
  'dash-island-name', 'dash-island-diff', 'dash-island-stock', 'dash-resources', 'dash-runs', 'dash-best',
  'btn-sail', 'btn-fish', 'btn-upgrade', 'btn-inventory', 'btn-explore', 'btn-reset',
  'hud-hp-fill', 'hud-hp-text', 'hud-timer', 'hud-storage',
  'chip-fuel', 'chip-wood', 'chip-food', 'chip-medicine',
  'hud-prompt', 'hud-sea-buttons', 'hud-land-buttons',
  'hud-btn-sail', 'hud-btn-fish', 'hud-btn-anchor', 'hud-btn-explore',
  'hud-btn-attack', 'hud-btn-collect', 'hud-btn-back',
  'upgrade-resources', 'upgrade-rows', 'btn-upgrade-close',
  'inv-capacity', 'inv-rows', 'btn-inventory-close',
  'go-cause', 'go-time', 'btn-go-harbor',
  'toasts',
];

export function initUI(handlers) {
  H = handlers;
  for (const id of IDS) els[id] = document.getElementById(id);

  // dashboard
  els['btn-sail'].onclick = () => H.sail();
  els['btn-fish'].onclick = () => H.fish();
  els['btn-upgrade'].onclick = () => H.upgrade();
  els['btn-inventory'].onclick = () => H.inventory();
  els['btn-explore'].onclick = () => H.explore();
  els['btn-reset'].onclick = () => H.resetSave(els['btn-reset']);

  // HUD laut
  els['hud-btn-sail'].onclick = () => H.hudSail();
  els['hud-btn-fish'].onclick = () => H.hudFish();
  els['hud-btn-anchor'].onclick = () => H.hudAnchor();
  els['hud-btn-explore'].onclick = () => H.hudExplore();

  // HUD daratan
  els['hud-btn-attack'].onclick = () => H.attack();
  els['hud-btn-collect'].onclick = () => H.collect();
  els['hud-btn-back'].onclick = () => H.back();

  // modal
  els['btn-upgrade-close'].onclick = () => H.closeModal();
  els['btn-inventory-close'].onclick = () => H.closeModal();
  els['btn-go-harbor'].onclick = () => H.goHarbor();

  // healing cepat via chip resource
  els['chip-food'].onclick = () => H.heal('food');
  els['chip-medicine'].onclick = () => H.heal('medicine');
}

const stars = (lv) => '★'.repeat(lv) + '☆'.repeat(Math.max(0, 2 - lv));

export function showScreen(state) {
  els['screen-dashboard'].classList.toggle('hidden', state !== 'dashboard');
  els['screen-hud'].classList.toggle('hidden', !(state === 'sea' || state === 'land'));
  els['screen-gameover'].classList.toggle('hidden', state !== 'gameover');
  if (state === 'sea' || state === 'land') {
    els['screen-upgrade'].classList.add('hidden');
    els['screen-inventory'].classList.add('hidden');
  }
  els['hud-sea-buttons'].classList.toggle('hidden', state !== 'sea');
  els['hud-land-buttons'].classList.toggle('hidden', state !== 'land');
}

export function openModal(name) {
  closeModal();
  els['screen-' + name].classList.remove('hidden');
  if (name === 'upgrade') renderUpgradePanel();
  if (name === 'inventory') renderInventoryPanel();
}

export function closeModal() {
  els['screen-upgrade'].classList.add('hidden');
  els['screen-inventory'].classList.add('hidden');
}

export function toast(msg) {
  const d = document.createElement('div');
  d.className = 'toast';
  d.textContent = msg;
  els['toasts'].appendChild(d);
  while (els['toasts'].children.length > 4) els['toasts'].firstChild.remove();
  requestAnimationFrame(() => d.classList.add('show'));
  setTimeout(() => {
    d.classList.remove('show');
    setTimeout(() => d.remove(), 300);
  }, 1900);
}

// ---------- Dashboard ----------
export function updateDashboard() {
  els['dash-level'].textContent = boatLevel();
  els['dash-hp-fill'].style.width = Math.max(0, (G.boatHP / maxHP()) * 100) + '%';
  els['dash-hp-text'].textContent = `HP: ${Math.ceil(G.boatHP)}/${maxHP()}`;
  els['dash-storage'].textContent = `${usedStorage()}/${capacity()}`;
  els['dash-speed'].textContent = stars(G.upgrades.speed);
  els['dash-defense'].textContent = stars(G.upgrades.defense);

  const { island } = nearestIsland(G.boat ? G.boat.x : 0, G.boat ? G.boat.y : 0);
  if (island) {
    els['dash-island-name'].textContent = island.name;
    els['dash-island-diff'].textContent = island.difficulty;
    const stock = Object.entries(island.remaining)
      .filter(([, n]) => n > 0)
      .map(([t, n]) => `${CFG.RESOURCES[t].icon}×${n}`)
      .join('  ');
    els['dash-island-stock'].textContent = stock ? `Tersedia: ${stock}` : 'Resource pulau sudah habis';
  }

  els['dash-resources'].textContent =
    `Fuel: ${G.resources.fuel} | Wood: ${G.resources.wood} | Food: ${G.resources.food} | Medicine: ${G.resources.medicine}`;
  els['dash-runs'].textContent = G.totalRuns;
  els['dash-best'].textContent = (G.bestTime / 60).toFixed(1);
}

// ---------- HUD (dipanggil tiap frame saat laut/daratan) ----------
export function updateHUD() {
  if (!(G.state === 'sea' || G.state === 'land')) return;

  els['hud-hp-fill'].style.width = Math.max(0, (G.boatHP / maxHP()) * 100) + '%';
  els['hud-hp-text'].textContent = `${Math.ceil(G.boatHP)}/${maxHP()}`;
  els['hud-timer'].textContent = `⏱ ${fmtTime(G.runTime)}`;
  els['hud-storage'].textContent = `📦 ${usedStorage()}/${capacity()}`;
  els['chip-fuel'].textContent = `⛽${G.resources.fuel}`;
  els['chip-wood'].textContent = `🪵${G.resources.wood}`;
  els['chip-food'].textContent = `🍖${G.resources.food}`;
  els['chip-medicine'].textContent = `💊${G.resources.medicine}`;

  // prompt kontekstual
  let prompt = '';
  if (G.state === 'land') {
    prompt = '⚔ Serang zombie · 🧺 Kumpulkan resource · ⛵ Balik ke perahu';
  } else if (G.fishing) {
    prompt = `🎣 Memancing... ${Math.round((G.fishing.t / G.fishing.dur) * 100)}%`;
  } else if (G.autopilotTarget) {
    prompt = `⛵ Berlayar otomatis ke ${G.autopilotTarget.name}...`;
  } else if (G.nearIsland && G.nearIsland.dist < 70) {
    prompt = `🏝 ${G.nearIsland.island.name} (Diff ${G.nearIsland.island.difficulty}) — tekan EXPLORE / E`;
  } else {
    prompt = '🌊 WASD / joystick untuk berlayar';
  }
  els['hud-prompt'].textContent = prompt;

  if (G.state === 'sea') {
    const near = G.nearIsland && G.nearIsland.dist < 70 && G.nearIsland.island;
    els['hud-btn-explore'].disabled = !near;
    els['hud-btn-explore'].textContent = near ? `🏝 EXPLORE (${G.nearIsland.island.name})` : '🏝 EXPLORE';
    els['hud-btn-fish'].disabled = !!G.fishing;
    els['hud-btn-fish'].textContent = G.fishing ? '🎣 ...' : '🎣 FISH';
    els['hud-btn-anchor'].classList.toggle('active', G.anchored);
  }
}

// ---------- Modal Upgrade ----------
export function renderUpgradePanel() {
  els['upgrade-resources'].textContent =
    `⛽${G.resources.fuel}  🪵${G.resources.wood}  🍖${G.resources.food}  💊${G.resources.medicine}`;

  const rows = els['upgrade-rows'];
  rows.innerHTML = '';

  for (const [key, def] of Object.entries(CFG.UPGRADES)) {
    const lv = G.upgrades[key];
    const row = document.createElement('div');
    row.className = 'up-row';

    const main = document.createElement('div');
    main.className = 'up-main';

    const head = document.createElement('div');
    head.innerHTML = `<b>${def.label}</b> <span class="muted">Lv ${lv}/2 ${stars(lv)}</span>`;

    const desc = document.createElement('div');
    desc.className = 'muted small';
    desc.textContent = def.desc;

    main.appendChild(head);
    main.appendChild(desc);

    const cost = document.createElement('div');
    const btn = document.createElement('button');

    if (lv >= def.levels.length) {
      cost.className = 'cost ok';
      cost.textContent = 'MAX';
      btn.className = 'btn';
      btn.disabled = true;
      btn.textContent = 'MAX';
    } else {
      const c = def.levels[lv].cost;
      const txt = Object.entries(c).map(([t, n]) => `${n}${CFG.RESOURCES[t].icon}`).join(' + ');
      const ok = Object.entries(c).every(([t, n]) => (G.resources[t] || 0) >= n);
      cost.className = 'cost ' + (ok ? 'ok' : 'bad');
      cost.textContent = `Butuh: ${txt}`;
      btn.className = 'btn btn-go';
      btn.disabled = !ok;
      btn.textContent = 'UPGRADE';
      btn.onclick = () => H.buy(key);
    }

    cost.className += ' small';
    row.appendChild(main);
    row.appendChild(cost);
    row.appendChild(btn);
    rows.appendChild(row);
  }
}

// ---------- Modal Inventory ----------
export function renderInventoryPanel() {
  els['inv-capacity'].textContent = `Kapasitas: ${usedStorage()}/${capacity()} slot`;

  const rows = els['inv-rows'];
  rows.innerHTML = '';

  for (const [type, def] of Object.entries(CFG.RESOURCES)) {
    const row = document.createElement('div');
    row.className = 'inv-row';

    const main = document.createElement('div');
    main.className = 'inv-main';
    main.innerHTML = `<b>${def.icon} ${def.label}</b> <span class="muted mono">x${G.resources[type] || 0}</span>`;
    row.appendChild(main);

    const heal = CFG.HEAL[type];
    if (heal) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-go';
      btn.textContent = `USE +${heal} HP`;
      btn.onclick = () => H.heal(type);
      row.appendChild(btn);
    }
    rows.appendChild(row);
  }
}

// ---------- Game Over ----------
export function renderGameOver() {
  els['go-cause'].textContent = G.deathInfo ? G.deathInfo.cause : '';
  els['go-time'].textContent = G.deathInfo
    ? `Waktu bertahan: ${fmtTime(G.deathInfo.time)} · Best: ${(G.bestTime / 60).toFixed(1)} menit`
    : '';
}
