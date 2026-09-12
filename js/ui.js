// ============ UI overlay ============
// Aturan: dunia dulu, HUD kedua, menu ketiga.
// HUD hanya punya 4 hal: HULL, PALKA, PASANG, dan SATU aksi konteks.
import { CFG } from './config.js';
import { G } from './state.js';
import { fmtTime, clamp } from './util.js';
import { capacity, maxHP, nextRung, goalLabel, isMaxed, REFIT, storageLv, speedLv, hullLv } from './refit.js';
import { carriedLoad, bankLoad, RES_TYPES } from './inventory.js';
import { tidePhase, timeToNextPhase, tideTint, nightProgress } from './tide.js';
import { islandTotalRemaining, isDepleted, HARBOR } from './world.js';
import { atExtract, gatherStatus } from './land.js';

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
  'tide-name', 'tide-fill', 'tide-block', 'goal-chip', 'gather-chip', 'toasts',
  'btn-context', 'btn-attack', 'btn-heal', 'btn-mute', 'joystick', 'joy-knob',
  'modal-chart', 'chart-map', 'chart-hint', 'chart-bank', 'chart-close', 'chart-sail',
  'modal-bench', 'bench-rows', 'bench-bank', 'bench-close', 'bench-title', 'bench-sub',
  'modal-inventory', 'inv-resources', 'inv-boat', 'inv-close',
  'modal-debrief', 'db-title', 'db-cause', 'db-lost', 'db-kept', 'db-salvage', 'db-night', 'db-goal', 'db-close',
  'hint-line',
];

export function initUI(handlers) {
  H = handlers;
  for (const id of IDS) els[id] = document.getElementById(id);

  const bind = (id, fn) => { const e = els[id]; if (e) e.onclick = fn; };

  bind('chart-close', () => closeModal());
  bind('chart-sail', () => { closeModal(); if (H.onSailNoTarget) H.onSailNoTarget(); });
  bind('bench-close', () => closeModal());
  bind('inv-close', () => closeModal());
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
  if (name === 'inventory') renderInventory();
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

  // MALAM — tampil juga di dermaga, karena di situlah keputusannya diambil: berapa
  // banyak malam yang tersisa, dan apakah masih ada waktu untuk satu kali lagi.
  const tideOn = inPlay || G.runActive || st === 'harbor';
  els['tide-block'].classList.toggle('hidden', !tideOn);
  if (tideOn) {
    const ph = tidePhase(G.tide ? G.tide.t : 0);
    const tint = Math.round(tideTint() * 20) / 20;
    const prog = Math.round(nightProgress() * 200) / 200;
    const key = ph.key + '|' + tint + '|' + prog;
    if (key !== cache.tide) {
      cache.tide = key;
      els['tide-name'].textContent = ph.label.toUpperCase();
      els['tide-block'].className = 'tide-' + ph.key;
      // bilahnya panjang MALAM, bukan panjang fase: satu malam, sekali jalan, tidak mundur
      els['tide-fill'].style.width = (prog * 100).toFixed(1) + '%';
      els['tide-block'].classList.toggle('dawn-near', prog > 0.86);
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

  // ---- keterangan memanen: jenis resource + sisa muatan (sudah full / masih ada slot) ----
  const gs = gatherStatus();
  const chip = els['gather-chip'];
  if (!gs) {
    if (!chip.classList.contains('hidden')) chip.classList.add('hidden');
  } else {
    const full = gs.carried >= gs.capacity;
    const label = gs.kind === 'salvage'
      ? 'MENGAMBIL MUATAN TENGGELAM'
      : `MEMANEN ${CFG.RESOURCES[gs.type].label.toUpperCase()}`;
    const pct = Math.round(gs.progress * 100);
    chip.innerHTML =
      `<b>${label}</b>` +
      `<span class="gather-bar"><i style="width:${pct}%"></i></span>` +
      `<span class="mono ${full ? 'gather-full' : ''}">palka ${gs.carried}/${gs.capacity}${full ? ' · PENUH' : ''}</span>`;
    chip.classList.remove('hidden');
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

// Peta perairan sekarang SPASIAL, bukan daftar baris: dermaga di tengah, pulau-pulau
// digambar sebagai node pada bidang 2D sesuai posisi dunianya. Yang belum disurvei
// tampil samar (tanda tanya), yang sudah dikenal tampil jelas dengan nama — insentif
// visual untuk eksplorasi. Pemain men-tap titik untuk memilih tujuan.
const CHART_MAP = 440;   // ukuran logis peta (px)
let chartCanvas = null;

export function renderChart() {
  els['chart-bank'].innerHTML = bankChips();
  drawChartMap();
  const sel = G.target;
  const selName = sel ? (G.surveyed[sel.id] ? sel.name : 'perairan belum bernama') : null;
  els['chart-hint'].textContent = sel
    ? `Tujuan: ${selName} · ${Math.round(distToHarbor(sel) / 10)} m dari dermaga`
    : 'Tap satu titik di peta untuk memilih tujuan, lalu berlayar.';
  els['chart-sail'].textContent = sel ? 'BERLAYAR SEKARANG' : 'BERLAYAR TANPA TUJUAN';
}

function chartProject() {
  // Cincin terjauh (jarak maksimum + radius pulau) harus muat di dalam peta.
  const R = CHART_MAP / 2;
  const maxWorld = CFG.SEA.RINGS[CFG.SEA.RINGS.length - 1].dist[1] + 620;
  const scale = (R - 28) / maxWorld;
  return { cx: R, cy: R, scale };
}

function drawChartMap() {
  const wrap = els['chart-map'];
  if (!wrap) return;
  if (!chartCanvas) {
    chartCanvas = document.createElement('canvas');
    wrap.appendChild(chartCanvas);
    chartCanvas.addEventListener('click', onChartMapClick);
  }
  const cv = chartCanvas;
  const dpr = Math.min((typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1, 2);
  cv.width = CHART_MAP * dpr;
  cv.height = CHART_MAP * dpr;
  cv.style.width = '100%';
  cv.style.height = 'auto';
  cv.style.display = 'block';
  const ctx = cv.getContext && cv.getContext('2d');
  if (!ctx) return;   // headless (tanpa canvas asli): aman, tidak menggambar
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const { cx, cy, scale } = chartProject();
  const sx = (wx) => cx + wx * scale;
  const sy = (wy) => cy + wy * scale;

  // latar peta (perairan gelap, lebih terang di tengah)
  const bg = ctx.createRadialGradient(cx, cy, 16, cx, cy, CHART_MAP / 2);
  bg.addColorStop(0, 'rgba(22,42,58,0.95)');
  bg.addColorStop(1, 'rgba(5,11,19,0.98)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CHART_MAP, CHART_MAP);

  // cincin jarak — tiga perairan yang terlihat, bukan angka yang dibaca
  ctx.setLineDash([5, 7]);
  for (const ring of CFG.SEA.RINGS) {
    const mid = (ring.dist[0] + ring.dist[1]) / 2;
    ctx.strokeStyle = 'rgba(120,150,180,0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, mid * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '600 9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(150,180,205,0.45)';
    ctx.fillText(ring.name, cx + 8, cy - mid * scale + 6);
    ctx.setLineDash([5, 7]);
  }
  ctx.setLineDash([]);

  drawHarborOnChart(ctx, cx, cy);

  const hits = [];
  for (const isl of G.islands) {
    const px = sx(isl.x), py = sy(isl.y);
    const surveyed = !!G.surveyed[isl.id];
    const depleted = isDepleted(isl);
    const sv = G.salvages.find((s) => s.islandId === isl.id);
    const chosen = G.target === isl;
    const r = Math.max(7, Math.min(14, 7 + isl.ringIdx * 2.5));

    if (chosen) {
      const g = ctx.createRadialGradient(px, py, 2, px, py, r * 2.7);
      g.addColorStop(0, 'rgba(255,207,106,0.5)');
      g.addColorStop(1, 'rgba(255,207,106,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, py, r * 2.7, 0, Math.PI * 2); ctx.fill();
    }

    if (surveyed) {
      ctx.fillStyle = depleted ? 'rgba(120,122,126,0.55)' : '#d9c79a';
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = depleted ? 'rgba(120,122,126,0.4)' : 'rgba(120,105,70,0.75)';
      ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = '700 10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = depleted ? 'rgba(165,175,185,0.7)' : '#e7eef6';
      ctx.fillText(isl.name, px, py - r - 5);
      if (depleted) {
        ctx.font = '600 8px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(165,175,185,0.5)';
        ctx.fillText('habis', px, py + r + 11);
      }
    } else {
      // belum disurvei: penanda samar — "ada sesuatu di sini, tapi kau belum tahu"
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(150,180,205,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '700 12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(150,180,205,0.65)';
      ctx.fillText('?', px, py + 4);
    }

    // pelampung salvage: bintang emas kecil di atas pulau tempat kau mati
    if (sv) {
      ctx.fillStyle = '#ffcf6a';
      ctx.beginPath(); ctx.arc(px + r * 0.9, py - r * 0.9, 3.2, 0, Math.PI * 2); ctx.fill();
    }

    hits.push({ id: isl.id, px, py, r: Math.max(r, 17) });
  }
  cv._hits = hits;
  cv._proj = { cx, cy, scale };
}

function drawHarborOnChart(ctx, cx, cy) {
  const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 22);
  g.addColorStop(0, 'rgba(255,200,120,0.5)');
  g.addColorStop(1, 'rgba(255,170,80,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6b4522';
  ctx.fillRect(cx - 7, cy - 6, 14, 28);
  ctx.fillStyle = '#8a5c30';
  for (let i = 0; i < 5; i++) ctx.fillRect(cx - 7, cy - 6 + i * 5, 14, 1.5);
  ctx.fillStyle = '#ffd79a';
  ctx.beginPath(); ctx.arc(cx, cy + 19, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.font = '700 10px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffcf6a';
  ctx.fillText('DERMAGA', cx, cy + 38);
}

function onChartMapClick(e) {
  const cv = chartCanvas;
  const hits = (cv && cv._hits) || [];
  if (!hits.length || !cv.getBoundingClientRect) return;
  const rect = cv.getBoundingClientRect();
  const mx = (e.clientX - rect.left) / Math.max(1, rect.width) * CHART_MAP;
  const my = (e.clientY - rect.top) / Math.max(1, rect.height) * CHART_MAP;
  let best = null, bd = 24;
  for (const h of hits) {
    const d = Math.hypot(h.px - mx, h.py - my);
    if (d < bd) { bd = d; best = h; }
  }
  if (best) {
    if (H.onPickTarget) H.onPickTarget(best.id);
    renderChart();
  }
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

// ---------- Gudang & kapal: list resource + list boat (dengan kapasitas) ----------
export function renderInventory() {
  // LIST RESOURCE — tiap jenis dengan jumlah di gudang (banked) dan yang masih dibawa
  // (carried), plus warna penanda yang sama dengan dunia (krat/node di pulau).
  const rows = RES_TYPES.map((t) => {
    const def = CFG.RESOURCES[t];
    const banked = G.banked[t] || 0;
    const carried = G.carried[t] || 0;
    return `<div class="inv-row">
      <i class="dot" style="background:${def.color}"></i>
      <span class="iv-name">${def.label}</span>
      <span class="iv-bar"><i style="width:${Math.min(100, (banked / Math.max(1, capacity())) * 100)}%"></i></span>
      <span class="mono iv-num">${banked}</span>
      ${carried > 0 ? `<span class="muted small">(+${carried} dibawa)</span>` : ''}
    </div>`;
  }).join('');

  els['inv-resources'].innerHTML =
    `<div class="chart-band">GUDANG DERMAGA <span class="muted">aman, tidak bisa hilang</span></div>${rows}`;

  // LIST BOAT — kapasitas palka dan tangga refit palka (semakin besar = semakin banyak
  // yang bisa dibawa). Tiap tingkat menambah +6 slot.
  const cap = capacity();
  const tiers = ['Perahu kecil', 'Perahu sedang', 'Perahu penuh'];
  const tier = G.refit >= 5 ? 2 : G.refit >= 2 ? 1 : 0;
  const storageRungs = REFIT.filter((r) => r.track === 'storage');
  const doneStorage = storageLv();

  const boatRows = storageRungs.map((r, i) => {
    const have = i < doneStorage;
    const capAt = CFG.BOAT.BASE_STORAGE + 6 * (i + 1);
    return `<div class="inv-row ${have ? '' : 'muted'}">
      <i class="dot" style="background:${have ? '#d9a54a' : '#6b7c8d'}"></i>
      <span class="iv-name">${r.label}</span>
      <span class="muted small">${have ? 'terpasang' : 'belum'}</span>
      <span class="mono iv-num">${capAt} unit</span>
    </div>`;
  }).join('');

  els['inv-boat'].innerHTML =
    `<div class="chart-band">KAPAL <span class="muted">${tiers[tier]}</span></div>
     <div class="inv-row inv-boat-now">
       <i class="dot" style="background:var(--brass)"></i>
       <span class="iv-name">Kapasitas palka</span>
       <span class="mono iv-num">${cap} unit</span>
     </div>${boatRows}`;
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
  // Baris malam: bukan penjelasan, cuma panjang malam yang tersisa. Ini yang membuat
  // "sekali lagi" masuk akal — malam belum habis, dan ia hanya berjalan kalau kau keluar.
  const prog = nightProgress();
  const left = Math.max(0, Math.round((1 - prog) * 100));
  const dawnX = ((CFG.TIDE.DAWN_AT / (CFG.TIDE.DAWN_AT + CFG.TIDE.DAWN_FALL)) * 100).toFixed(1);
  els['db-night'].innerHTML =
    `<div class="night-bar${prog > 0.6 ? ' hot' : ''}"><i style="width:${(prog * 100).toFixed(1)}%"></i>` +
    `<b style="left:${dawnX}%"></b></div><span>Malam tersisa ${left}%</span>`;

  const gl = goalLabel();
  els['db-goal'].innerHTML = `<span class="muted small">Tujuan berikutnya:</span> <b>${isMaxed() ? 'Tidak ada — kapal lengkap' : gl.text}</b> <span class="muted small">· ${fmtTime(info.time || 0)}</span>`;
}

export function refreshIfOpen() {
  if (modal === 'chart') renderChart();
  if (modal === 'bench') renderBench();
  if (modal === 'inventory') renderInventory();
}
