// ============ UI overlay ============
// Aturan: dunia dulu, HUD kedua, menu ketiga.
// HUD hanya punya 4 hal: HULL, PALKA, PASANG, dan SATU aksi konteks.
import { CFG } from './config.js';
import { G } from './state.js';
import { fmtTime, clamp } from './util.js';
import { capacity, maxHP, nextRung, goalLabel, isMaxed, REFIT, storageLv, speedLv, hullLv } from './refit.js';
import { carriedLoad, bankLoad, RES_TYPES } from './inventory.js';
import { tidePhase, timeToNextPhase, tideTint } from './tide.js';
import { islandTotalRemaining, isDepleted, HARBOR } from './world.js';
import { atExtract } from './land.js';

const els = {};
let H = null;
// Di desktop, sebutkan tombolnya. Di layar sentuh, tombolnya sudah jelas.
const hasKeyboard = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(hover: hover) and (pointer: fine)').matches : false;
const KEYHINT = { gather: ' · E', salvage: ' · E', board: ' · E', moor: ' · E', land: ' · E', fish: ' · E',
  chart: ' · E', bench: ' · E', sail: ' · E' };
let modal = null;
const cache = { hull: -1, hold: -1, cap: -1, tide: '', goal: '', ctx: '', pips: -1, tint: -1, heal: '' };

const IDS = [
  'hud', 'hud-top', 'hull-fill', 'hull-text', 'hold-pips', 'hold-text',
  'tide-name', 'tide-fill', 'tide-block', 'goal-chip', 'toasts',
  'btn-context', 'btn-attack', 'btn-heal', 'btn-mute', 'joystick', 'joy-knob',
  'modal-chart', 'chart-rows', 'chart-hint', 'chart-bank', 'chart-close', 'chart-sail',
  'modal-bench', 'bench-rows', 'bench-bank', 'bench-close', 'bench-title', 'bench-sub',
  'modal-debrief', 'db-title', 'db-cause', 'db-lost', 'db-kept', 'db-salvage', 'db-goal', 'db-close',
  'hint-line',
];

export function initUI(handlers) {
  H = handlers;
  for (const id of IDS) els[id] = document.getElementById(id);

  const bind = (id, fn) => { const e = els[id]; if (e) e.onclick = fn; };

  bind('chart-close', () => closeModal());
  bind('chart-sail', () => { closeModal(); if (H.onSailNoTarget) H.onSailNoTarget(); });
  bind('bench-close', () => closeModal());
  bind('db-close', () => closeModal());
  bind('btn-mute', () => { if (H.onMute) H.onMute(); });

  const ctx = els['btn-context'];
  if (ctx) {
    ctx.addEventListener('pointerdown', (e) => { e.preventDefault(); if (H.onContextDown) H.onContextDown(); });
    const up = (e) => { if (H.onContextUp) H.onContextUp(); };
    ctx.addEventListener('pointerup', up);
    ctx.addEventListener('pointercancel', up);
    ctx.addEventListener('pointerleave', up);
  }
  const atk = els['btn-attack'];
  if (atk) atk.addEventListener('pointerdown', (e) => { e.preventDefault(); if (H.onAttack) H.onAttack(); });
  const heal = els['btn-heal'];
  if (heal) heal.addEventListener('pointerdown', (e) => { e.preventDefault(); if (H.onHeal) H.onHeal(); });
}

export function isModalOpen() { return !!modal; }

export function showScreen(state) {
  els['btn-attack'].classList.toggle('hidden', state !== 'land');
}

export function openModal(name) {
  closeModal();
  modal = name;
  const el = els['modal-' + name];
  if (el) el.classList.remove('hidden');
  if (name === 'chart') renderChart();
  if (name === 'bench') renderBench();
}

export function closeModal() {
  if (modal) {
    const el = els['modal-' + modal];
    if (el) el.classList.add('hidden');
  }
  modal = null;
  if (H && H.onModalClosed) H.onModalClosed();
}

export function toast(msg) {
  const box = els['toasts'];
  if (!box) return;
  const d = document.createElement('div');
  d.className = 'toast';
  d.textContent = msg;
  box.appendChild(d);
  while (box.children.length > 3) box.firstChild.remove();
  requestAnimationFrame(() => d.classList.add('show'));
  setTimeout(() => {
    d.classList.remove('show');
    setTimeout(() => d.remove(), 320);
  }, 2200);
}

// ---------- HUD (dipanggil tiap frame, hanya menulis saat berubah) ----------
export function updateHUD(ctx) {
  const st = G.state;
  const inPlay = st === 'sea' || st === 'land';
  els['hud'].classList.toggle('in-harbor', st === 'harbor');

  const hull = Math.max(0, Math.round(G.hull));
  if (hull !== cache.hull) {
    cache.hull = hull;
    const mx = maxHP();
    const pct = clamp((hull / mx) * 100, 0, 100);
    els['hull-fill'].style.width = pct + '%';
    els['hull-fill'].classList.toggle('critical', hull / mx <= 0.3);
    els['hull-fill'].classList.toggle('mid', hull / mx > 0.3 && hull / mx <= 0.6);
    els['hull-text'].textContent = `${hull}/${mx}`;
  }

  const load = inPlay ? carriedLoad() : bankLoad();
  const cap = capacity();
  if (load !== cache.hold || cap !== cache.cap) {
    cache.hold = load; cache.cap = cap;
    els['hold-text'].textContent = inPlay ? `${load}/${cap}` : `${load} unit`;
    if (load !== cache.pips || cap !== cache.cap) {
      cache.pips = load;
      const box = els['hold-pips'];
      const want = Math.min(cap, 24);
      if (box.children.length !== want) {
        box.innerHTML = '';
        for (let i = 0; i < want; i++) {
          const d = document.createElement('i');
          box.appendChild(d);
        }
      }
      for (let i = 0; i < box.children.length; i++) box.children[i].className = i < load ? 'on' : '';
    }
    els['hold-text'].classList.toggle('full', inPlay && load >= cap);
  }

  // pasang — hanya tampil saat bermain, dan berubah dari informasi jadi peringatan
  const tideOn = inPlay || G.runActive;
  els['tide-block'].classList.toggle('hidden', !tideOn);
  if (tideOn) {
    const ph = tidePhase(G.tide ? G.tide.t : 0);
    const tint = Math.round(tideTint() * 20) / 20;
    const key = ph.key + '|' + tint;
    if (key !== cache.tide) {
      cache.tide = key;
      els['tide-name'].textContent = ph.label.toUpperCase();
      els['tide-block'].className = 'tide-' + ph.key;
      const total = 90;
      const pctFill = ph.key === 'calm' ? clamp(((G.tide ? G.tide.t : 0) / 90) * 100, 0, 100)
        : ph.key === 'turning' ? clamp(((G.tide.t - 90) / 120) * 100, 0, 100) : 100;
      els['tide-fill'].style.width = pctFill + '%';
    }
    const warn = G.tide && G.tide.warn > 0.15 && ph.key !== 'high';
    els['tide-block'].classList.toggle('warn', !!warn);
  }

  // goal gradient: selalu ada satu tujuan bernama
  const gl = goalLabel();
  if (gl.text !== cache.goal) {
    cache.goal = gl.text;
    els['goal-chip'].textContent = gl.text;
    els['goal-chip'].classList.toggle('ready', !!gl.ready);
  }

  // satu tombol konteks
  const c = ctx || { kind: null };
  const ck = c.kind || '';
  if (ck !== cache.ctx) {
    cache.ctx = ck;
    const btn = els['btn-context'];
    btn.className = 'ctx ctx-' + (c.kind || 'none');
    if (c.kind) {
      btn.textContent = c.label + (hasKeyboard ? KEYHINT[c.kind] || '' : '');
    }
    btn.classList.toggle('hidden', !c.kind);
  }
  if (G.state === 'land') els['btn-attack'].classList.toggle('hidden', false);

  // tombol pakai bekal: hanya muncul saat relevan (hull berkurang + ada bekal)
  const deficit = maxHP() - G.hull;
  const med = G.carried.medicine || 0;
  const food = G.carried.food || 0;
  const canHeal = inPlay && deficit > 0 && (med > 0 || food > 0);
  const healLabel = canHeal ? (med > 0 && deficit >= CFG.HEAL.medicine ? 'OBAT +30' : (food > 0 ? 'MAKAN +10' : 'OBAT +30')) : '';
  if (healLabel !== cache.heal) {
    cache.heal = healLabel;
    const hb = els['btn-heal'];
    hb.classList.toggle('hidden', !canHeal);
    hb.textContent = healLabel;
  }
}

export function showHint(text, ms = 4200) {
  const el = els['hint-line'];
  if (!el) return;
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), ms);
}

// ---------- Peta ----------
function distToHarbor(isl) { return Math.hypot(isl.x - HARBOR.x, isl.y - HARBOR.y); }

export function renderChart() {
  els['chart-bank'].innerHTML = bankChips();
  const rows = els['chart-rows'];
  rows.innerHTML = '';
  const list = [...G.islands].sort((a, b) => distToHarbor(a) - distToHarbor(b));
  const rings = ['Perairan Dekat', 'Perairan Tengah', 'Perairan Jauh'];

  let lastRing = -1;
  for (const isl of list) {
    if (isl.ringIdx !== lastRing) {
      lastRing = isl.ringIdx;
      const h = document.createElement('div');
      h.className = 'chart-band';
      h.innerHTML = `<span>${rings[isl.ringIdx] || ''}</span><span class="muted">${Math.round(distToHarbor(isl) / 10)} m dari dermaga</span>`;
      rows.appendChild(h);
    }
    const known = !!G.surveyed[isl.id];
    const left = islandTotalRemaining(isl);
    const sv = G.salvages.find((s) => s.islandId === isl.id);
    const fl = CFG.FLAVORS[isl.flavor];

    const row = document.createElement('div');
    row.className = 'chart-row' + (isDepleted(isl) ? ' spent' : '') + (G.target === isl ? ' chosen' : '');
    const hint = known ? `${fl.label} · ${fl.hint}` : 'Belum disurvei';
    row.innerHTML = `
      <div class="cr-main">
        <b>${known ? isl.name : 'Perairan belum bernama'}</b>
        <span class="muted">${hint}</span>
        ${sv ? '<span class="sv">◉ pelampung muatan</span>' : ''}
      </div>
      <div class="cr-side">
        <span class="muted">${Math.round(distToHarbor(isl) / 10)} m</span>
        <span class="${left > 0 ? 'ok' : 'bad'}">${left > 0 ? 'ada muatan' : 'habis'}</span>
      </div>`;
    const b = document.createElement('button');
    b.className = 'btn small';
    b.textContent = 'PILIH';
    b.onclick = () => { if (H.onPickTarget) H.onPickTarget(isl.id); renderChart(); };
    row.appendChild(b);
    rows.appendChild(row);
  }

  const sel = G.target;
  els['chart-hint'].textContent = sel
    ? `Tujuan: ${G.surveyed[sel.id] ? sel.name : 'perairan belum bernama'} · ${Math.round(distToHarbor(sel) / 10)} m`
    : 'Belum ada tujuan. Pilih satu pulau, lalu naik ke haluan kapal untuk berlayar.';
  els['chart-sail'].textContent = sel ? 'BERLAYAR SEKARANG' : 'BERLAYAR TANPA TUJUAN';
}

function bankChips() {
  return RES_TYPES.map((t) =>
    `<span class="res-chip"><i style="background:${CFG.RESOURCES[t].color}"></i>${G.banked[t] || 0}</span>`
  ).join('');
}

// ---------- Meja kerja ----------
export function renderBench() {
  els['bench-bank'].innerHTML = bankChips();
  const rows = els['bench-rows'];
  rows.innerHTML = '';
  const rung = nextRung();

  els['bench-title'].textContent = 'MEJA KERJA';
  els['bench-sub'].textContent = `Palka ${storageLv()}/2 · Layar ${speedLv()}/2 · Lambung ${hullLv()}/2`;

  // tiga baris status kapal
  const stats = document.createElement('div');
  stats.className = 'bench-stats';
  stats.innerHTML = `
    <div><span class="muted">Palka</span><b>${capacity()} unit</b></div>
    <div><span class="muted">Kecepatan</span><b>${Math.round((1 + 0.15 * speedLv()) * 100)}%</b></div>
    <div><span class="muted">Hull maks</span><b>${maxHP()}</b></div>`;
  rows.appendChild(stats);

  if (!rung) {
    const d = document.createElement('div');
    d.className = 'bench-done';
    d.innerHTML = '<b>Kapal sudah lengkap.</b><span class="muted">Tidak ada lagi yang bisa dipasang. Sekarang tinggal seberapa jauh kau berani pergi.</span>';
    rows.appendChild(d);
    return;
  }

  const cost = Object.entries(rung.cost).map(([t, n]) => {
    const have = G.banked[t] || 0;
    const ok = have >= n;
    return `<span class="cost ${ok ? 'ok' : 'bad'}"><i style="background:${CFG.RESOURCES[t].color}"></i>${n}<span class="muted"> (${have})</span></span>`;
  }).join(' ');

  const can = Object.entries(rung.cost).every(([t, n]) => (G.banked[t] || 0) >= n);
  const row = document.createElement('div');
  row.className = 'bench-row';
  row.innerHTML = `
    <div class="br-main">
      <b>${rung.label}</b>
      <span class="eff">${rung.effect}</span>
      <span class="muted small">${rung.desc}</span>
    </div>
    <div class="br-cost">${cost}</div>`;
  const b = document.createElement('button');
  b.className = 'btn btn-go';
  b.disabled = !can;
  b.textContent = can ? 'PASANG' : 'BELUM CUKUP';
  b.onclick = () => { if (H.onBuy) H.onBuy(); };
  row.appendChild(b);
  rows.appendChild(row);

  const future = REFIT.slice(G.refit + 1, G.refit + 3);
  if (future.length) {
    const f = document.createElement('div');
    f.className = 'bench-future muted small';
    f.innerHTML = 'Berikutnya: ' + future.map((r) => r.label).join(' → ');
    rows.appendChild(f);
  }
}

// ---------- Debrief (kematian) ----------
export function renderDebrief(info) {
  els['db-title'].textContent = 'KAPAL TENGGELAM';
  els['db-cause'].textContent = info.cause || '';
  const lost = info.lost || {};
  const lostTxt = RES_TYPES.filter((t) => (lost[t] || 0) > 0)
    .map((t) => `<span class="res-chip"><i style="background:${CFG.RESOURCES[t].color}"></i>${lost[t]}</span>`).join(' ');
  els['db-lost'].innerHTML = lostTxt
    ? `<div class="muted small">Hilang bersama muatan (bisa diambil kembali):</div><div class="chips">${lostTxt}</div>`
    : '<div class="muted small">Tidak ada muatan yang hilang.</div>';
  els['db-kept'].innerHTML = `<div class="muted small">Tetap milikmu di dermaga:</div><div class="chips">${bankChips()}</div>`;
  els['db-salvage'].innerHTML = info.salvageText
    ? `<span class="sv">◉</span> ${info.salvageText}`
    : '';
  const gl = goalLabel();
  els['db-goal'].innerHTML = `<span class="muted small">Tujuan berikutnya:</span> <b>${isMaxed() ? 'Tidak ada — kapal lengkap' : gl.text}</b> <span class="muted small">· ${fmtTime(info.time || 0)}</span>`;
}

export function refreshIfOpen() {
  if (modal === 'chart') renderChart();
  if (modal === 'bench') renderBench();
}
