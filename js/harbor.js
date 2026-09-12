// ============ Harbor ============
// Dermaga bukan menu. Pemain BERJALAN di sini: memilih pulau di meja peta,
// mengerjakan kapal di meja kerja, lalu naik ke haluan untuk berlayar.
// Kapal terlihat tumbuh setiap kali kau kembali — itu seluruh isi pilar pertama.
import { CFG } from './config.js';
import { G } from './state.js';
import { clamp, dist, makeRng } from './util.js';
import { capacity, nextRung, goalLabel, isMaxed } from './refit.js';
import { ASSETS } from './assets.js';
import { sheetFrame } from './sheets.js';
import { sfx } from './audio.js';
import { drawBoat, drawLanternPool } from './boat.js';
import { HARBOR } from './world.js';
import { carriedLoad, bankLoad, RES_TYPES } from './inventory.js';
import { beginWorld, endWorld, upright, atUpright } from './camera.js';
import { tideTint, tideDanger } from './tide.js';

// Dermaga adalah waterfront selebar layar, bukan pulau kecil di tengah laut:
// papan kayu membentang dari ujung kiri ke kanan tanpa celah air di sisi,
// air hanya di utara (belakang) tempat kapal bersandar.
const BOARDWALK = { x0: -500, x1: 500, y0: -46, y1: 470 };
const CAM = { x: 0, y: 110, zoom: 1.35 };

export const SPOTS = [
  { key: 'chart', x: -30, y: 158, r: 52, label: 'MEJA PETA' },
  { key: 'bench', x: 30, y: 206, r: 52, label: 'MEJA KERJA' },
  { key: 'sail',  x: 0,  y: -30, r: 42, label: 'BERLAYAR' },
];

export function enterHarbor() {
  G.state = 'harbor';
  G.cam.x = CAM.x; G.cam.y = CAM.y; G.cam.zoom = CAM.zoom;
  G.harbor = {
    player: { x: 0, y: 18, vx: 0, vy: 0, face: -Math.PI / 2, faceDirX: 0, faceDirY: -1, stepT: 0, walkT: 0, walkAmp: 0 },
    spots: SPOTS.map((s) => ({ ...s })),
    t: 0,
  };
  if (G.hull <= 0) G.hull = Math.max(1, Math.round(0.5 * 100));
  return G.harbor;
}

export function harborContext() {
  const H = G.harbor;
  if (!H) return { kind: null };
  const p = H.player;
  for (const s of H.spots) {
    if (dist(p.x, p.y, s.x, s.y) < s.r) {
      if (s.key === 'chart') return { kind: 'chart', label: 'BUKA PETA', spot: s };
      if (s.key === 'bench') return { kind: 'bench', label: 'PERBAIKI KAPAL', spot: s };
      return { kind: 'sail', label: 'BERLAYAR', spot: s };
    }
  }
  return { kind: null };
}

export function updateHarbor(dt, move, ctxBusy) {
  const H = G.harbor;
  if (!H) return;
  const p = H.player;
  H.t += dt;

  if (!ctxBusy) {
    const ml = Math.hypot(move.x, move.y);
    const tx = ml > 0.01 ? (move.x / ml) * CFG.PLAYER.SPEED * 0.8 : 0;
    const ty = ml > 0.01 ? (move.y / ml) * CFG.PLAYER.SPEED * 0.8 : 0;
    p.vx += (tx - p.vx) * clamp(dt / CFG.PLAYER.ACCEL_T, 0, 1);
    p.vy += (ty - p.vy) * clamp(dt / CFG.PLAYER.ACCEL_T, 0, 1);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (ml > 0.01) {
      const want = Math.atan2(move.y, move.x);
      p.faceDirX = Math.cos(want); p.faceDirY = Math.sin(want);
      let d = want - p.face;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      p.face += d * clamp(dt / CFG.PLAYER.TURN_T, 0, 1);
    }
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > 20) {
      p.stepT -= dt;
      if (p.stepT <= 0) { p.stepT = 0.42; sfx('step'); }
    }
  }
  // penggerak animasi berjalan (untuk sheet arah + siklus langkah)
  p.walkAmp = clamp(p.walkAmp + ((Math.hypot(p.vx, p.vy) > 0.01 ? 1 : 0) - p.walkAmp) * Math.min(1, dt * 7), 0, 1);
  p.walkT += Math.hypot(p.vx, p.vy) * dt * 0.055;
  clampToWalkable(p);
}

function clampToWalkable(p) {
  p.x = clamp(p.x, BOARDWALK.x0, BOARDWALK.x1);
  p.y = clamp(p.y, BOARDWALK.y0, BOARDWALK.y1);
}

// ---------- render ----------
export function drawHarbor(ctx, vw, vh) {
  const H = G.harbor;
  if (!H) return;

  // Laut di dermaga BUKAN selamanya tenang: warnanya mengikuti malam yang sedang
  // berjalan. Pemain pulang dan melihat airnya naik — itu alasan untuk tegang,
  // tanpa satu kalimat pun yang menjelaskannya.
  const tideK = Math.min(1, tideTint() / 0.70);   // isyarat: warna langit & air
  const dangerK = tideDanger();                   // ongkos: air yang benar-benar naik
                                                  // (dermaga pulau memakai kurva yang sama)
  const mix = (a, b, t) => `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
  const g = ctx.createLinearGradient(0, 0, 0, vh);
  g.addColorStop(0, mix([10, 30, 46], [46, 18, 24], tideK));
  g.addColorStop(0.6, mix([7, 21, 34], [30, 12, 18], tideK));
  g.addColorStop(1, mix([4, 12, 20], [12, 5, 9], tideK));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);

  // Bahasa kamera yang sama dengan dunia: miring, bukan dari atas.
  ctx.save();
  ctx.translate(vw / 2, vh / 2 + (CFG.CAM.LIFT || 0) * vh);
  ctx.scale(CAM.zoom, CAM.zoom * CFG.CAM.TILT);
  ctx.translate(-CAM.x, -CAM.y);

  // air terbuka di utara (tempat kapal bersandar) — riak + pantulan cahaya
  drawOpenWater(ctx, H.t);

  // kolam cahaya lentera kapal di atas air (menyusut saat malam menua)
  drawLanternPool(ctx, 0, -4, 260 * (1 - 0.35 * tideK));

  // dermaga: papan kayu membentang selebar layar
  drawBoardwalk(ctx, H.t);

  // garis air: saat pasang, air merambat naik ke atas papan
  drawTideLine(ctx, H.t, dangerK);

  // kapal bersandar di tepi air + muatannya di dek
  atUpright(ctx, 0, 0, () => {
    drawBoat(ctx, { x: 0, y: 0, vx: 0, vy: 0, angle: -Math.PI / 2 }, 1.9, { noParts: false });
    drawCargo(ctx);
  });

  // struktur dermaga + pemain, diurutkan menurut kedalaman (tanpa teks mengambang)
  drawDockProps(ctx, H);

  ctx.restore();

  // vignette: gelap di tepi
  const vg = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.34, vw / 2, vh / 2, Math.max(vw, vh) * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, vw, vh);
}

// Garis air di dermaga. Bahasa yang sama dengan pulau: saat pasang, ujung dermaga
// yang paling jauh ke laut tenggelam lebih dulu, lalu airnya merangkak ke arah dek.
let lastWaterLine = null;
// Dipakai test untuk memverifikasi garis air yang benar-benar digambar (bukan rumus
// yang disalin ulang di test).
export function tideLineY() { return lastWaterLine; }

function drawTideLine(ctx, t, k) {
  if (k <= 0.02) { lastWaterLine = null; return; }
  // Air pasang merambat dari tepi dermaga (utara) turun ke atas papan menuju kamera.
  const y0 = 8 + k * 190;
  lastWaterLine = y0;
  const x0 = BOARDWALK.x0, x1 = BOARDWALK.x1;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, y0 - 160);
  ctx.lineTo(x0, y0);
  for (let x = x0; x <= x1; x += 16) {
    ctx.lineTo(x, y0 + Math.sin(x * 0.09 + t * 1.7) * 3.5 + Math.sin(x * 0.21 - t * 2.3) * 1.6);
  }
  ctx.lineTo(x1, y0 - 160);
  ctx.closePath();
  ctx.fillStyle = `rgba(${Math.round(18 + 30 * k)},${Math.round(46 - 14 * k)},${Math.round(66 - 30 * k)},${0.52 + 0.16 * k})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(214,232,246,${0.16 + 0.2 * k})`;   // buih tipis di garis air
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

// ---------- elemen visual dermaga (tanpa teks mengambang) ----------

function drawOpenWater(ctx, t) {
  // riak air di utara dermaga, berhenti di tepi papan
  ctx.strokeStyle = 'rgba(150,210,255,0.07)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 18; i++) {
    const y = -260 + i * 22 + Math.sin(t * 1.2 + i) * 3;
    if (y > -8) break;
    ctx.beginPath();
    for (let x = -520; x <= 520; x += 36) {
      const yy = y + Math.sin(x * 0.02 + t * 1.6 + i) * 3;
      if (x === -520) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  // pantulan cahaya lentera yang berkedip di air
  const flick = 0.5 + Math.sin(t * 2.1) * 0.15;
  const g = ctx.createLinearGradient(0, -260, 0, -4);
  g.addColorStop(0, 'rgba(255,196,110,0)');
  g.addColorStop(0.7, `rgba(255,180,90,${0.05 + 0.06 * flick})`);
  g.addColorStop(1, 'rgba(255,160,70,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-520, -260, 1040, 256);
}

function drawBoardwalk(ctx) {
  const { x0, x1, y1 } = BOARDWALK;
  const w = x1 - x0;
  const top = -4;   // tepi air

  // dasar gelap
  ctx.fillStyle = '#33200f';
  ctx.fillRect(x0, top, w, y1 - top);

  // papan horizontal dengan variasi tone (stabil per seed)
  const rng = makeRng(1337);
  for (let y = top; y < y1; y += 14) {
    const tone = 0.9 + rng() * 0.2;
    ctx.fillStyle = `rgb(${Math.round(107 * tone)},${Math.round(69 * tone)},${Math.round(34 * tone)})`;
    ctx.fillRect(x0, y, w, 11);
    if (rng() < 0.4) {
      ctx.fillStyle = 'rgba(0,0,0,0.10)';
      ctx.fillRect(x0 + rng() * (w - 60), y, 40 + rng() * 60, 11);
    }
  }
  // celah antar papan
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (let y = top; y < y1; y += 14) ctx.fillRect(x0, y + 11, w, 3);
  // sambungan vertikal
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.lineWidth = 1;
  for (let x = x0 + 23; x < x1; x += 46) {
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, y1); ctx.stroke();
  }

  // rel kayu di tepi air (utara)
  ctx.fillStyle = '#5b3a1d';
  ctx.fillRect(x0, top - 3, w, 7);
  ctx.fillStyle = '#7a4e26';
  ctx.fillRect(x0, top - 3, w, 2);
  // tepi depan (selatan, menghadap kamera)
  ctx.fillStyle = '#8a5c30';
  ctx.fillRect(x0, y1 - 4, w, 4);
}

function drawDockProps(ctx, H) {
  // tiang pancang di tepi air
  ctx.fillStyle = '#3d2712';
  for (let x = -470; x <= 470; x += 60) ctx.fillRect(x - 3, -26, 8, 26);
  ctx.fillStyle = '#4a2f17';
  for (let x = -470; x <= 470; x += 60) ctx.fillRect(x - 5, -28, 12, 4);

  // lentera di kiri & kanan
  drawLanternPost(ctx, -360, H.t);
  drawLanternPost(ctx, 360, H.t);

  const props = [
    { y: H.spots.find((x) => x.key === 'chart').y, draw: () => drawChartTable(ctx, H) },
    { y: H.spots.find((x) => x.key === 'bench').y, draw: () => drawWorkbench(ctx, H) },
    { y: 120, draw: () => drawBarrels(ctx, H.t) },
    { y: 320, draw: () => drawLowerDeck(ctx) },
    { y: H.player.y, draw: () => drawPlayer(ctx, H.player) },
  ];
  props.sort((a, b) => a.y - b.y);
  for (const p of props) p.draw();
}

// Peti + tumpukan jala + bollard di dek bawah: mengisi ruang agar dermaga
// terasa besar dan hidup, bukan papan kosong.
function drawLowerDeck(ctx) {
  // tumpukan peti
  const crates = [
    { x: -180, y: 330, w: 26, h: 22 },
    { x: -150, y: 344, w: 26, h: 22 },
    { x: -165, y: 366, w: 30, h: 24 },
    { x: -135, y: 370, w: 26, h: 22 },
  ];
  for (const c of crates) {
    ctx.fillStyle = '#8d5626';
    ctx.fillRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(c.x - c.w / 2 + 0.5, c.y - c.h / 2 + 0.5, c.w - 1, c.h - 1);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(c.x - c.w / 2, c.y - c.h / 2); ctx.lineTo(c.x + c.w / 2, c.y + c.h / 2);
    ctx.moveTo(c.x + c.w / 2, c.y - c.h / 2); ctx.lineTo(c.x - c.w / 2, c.y + c.h / 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(c.x - c.w / 2 + 1, c.y - c.h / 2 + 1, c.w - 2, 2);
  }
  // jaring nelayan tergulung
  ctx.fillStyle = '#5c6a5a';
  ctx.beginPath(); ctx.ellipse(190, 360, 30, 18, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(190, 360, 30 - i * 5, 18 - i * 3, -0.2, 0, Math.PI * 2);
    ctx.stroke();
  }
  // bollard tambatan
  ctx.fillStyle = '#4a2f17';
  ctx.fillRect(96, 300, 12, 26);
  ctx.fillStyle = '#3d2712';
  ctx.beginPath(); ctx.arc(102, 298, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5b3a1d';
  ctx.beginPath(); ctx.arc(102, 298, 5, 0, Math.PI * 2); ctx.fill();
}

function drawLanternPost(ctx, x, t) {
  const flick = 0.85 + Math.sin(t * 6.2 + x) * 0.12;
  ctx.fillStyle = '#3d2712';
  ctx.fillRect(x - 2, -4, 4, 34);
  const g = ctx.createRadialGradient(x, -8, 2, x, -8, 46 * flick);
  g.addColorStop(0, 'rgba(255,200,120,0.45)');
  g.addColorStop(1, 'rgba(255,170,80,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, -8, 46 * flick, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd79a';
  ctx.beginPath(); ctx.arc(x, -8, 2.8, 0, Math.PI * 2); ctx.fill();
}

function drawChartTable(ctx, H) {
  const s = H.spots.find((x) => x.key === 'chart');
  const near = dist(H.player.x, H.player.y, s.x, s.y) < s.r;
  atUpright(ctx, s.x, s.y, () => {
    ctx.translate(-s.x, -s.y);
    ctx.fillStyle = '#3a2513';
    ctx.fillRect(s.x - 28, s.y - 2, 5, 24);
    ctx.fillRect(s.x + 23, s.y - 2, 5, 24);
    ctx.fillStyle = '#4d3319';
    ctx.fillRect(s.x - 32, s.y - 16, 64, 10);
    // peta tergelar + garis pulau
    ctx.fillStyle = '#d8c79a';
    ctx.fillRect(s.x - 26, s.y - 22, 52, 8);
    ctx.strokeStyle = 'rgba(90,70,40,0.85)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(s.x - 13, s.y - 18, 6, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(s.x + 5, s.y - 18, 3.5, 2.2, 0, 0, Math.PI * 2);
    ctx.moveTo(s.x - 13, s.y - 18); ctx.lineTo(s.x + 5, s.y - 18);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,90,40,0.7)';
    ctx.beginPath(); ctx.arc(s.x + 14, s.y - 18, 4, 0, Math.PI * 2); ctx.stroke();
    // lilin + nyala
    ctx.fillStyle = '#e8e2d0';
    ctx.fillRect(s.x + 20, s.y - 27, 3, 7);
    const flick = 0.7 + Math.sin(H.t * 10) * 0.3;
    ctx.fillStyle = '#ffce7a';
    ctx.beginPath(); ctx.arc(s.x + 21.5, s.y - 28, 2.4 * flick, 0, Math.PI * 2); ctx.fill();
    if (near) {
      const g = ctx.createRadialGradient(s.x, s.y - 16, 2, s.x, s.y - 16, 36);
      g.addColorStop(0, 'rgba(255,214,130,0.4)');
      g.addColorStop(1, 'rgba(255,214,130,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(s.x, s.y - 16, 36, 0, Math.PI * 2); ctx.fill();
    }
  });
}

function drawWorkbench(ctx, H) {
  const s = H.spots.find((x) => x.key === 'bench');
  const near = dist(H.player.x, H.player.y, s.x, s.y) < s.r;
  atUpright(ctx, s.x, s.y, () => {
    ctx.translate(-s.x, -s.y);
    ctx.fillStyle = '#3a2513';
    ctx.fillRect(s.x - 28, s.y - 2, 5, 24);
    ctx.fillRect(s.x + 23, s.y - 2, 5, 24);
    ctx.fillStyle = '#4d3319';
    ctx.fillRect(s.x - 32, s.y - 16, 64, 11);
    // kayu & alat
    ctx.fillStyle = '#a2662e';
    ctx.fillRect(s.x - 24, s.y - 22, 18, 7);
    ctx.fillRect(s.x - 4, s.y - 21, 14, 6);
    ctx.fillStyle = '#8b8f96';
    ctx.fillRect(s.x + 12, s.y - 21, 12, 5);
    // percikan tungku
    const flick = 0.7 + Math.sin(H.t * 9) * 0.3;
    const rg = ctx.createRadialGradient(s.x, s.y - 10, 1, s.x, s.y - 10, 34 * flick);
    rg.addColorStop(0, 'rgba(255,170,70,0.55)');
    rg.addColorStop(1, 'rgba(255,140,50,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(s.x, s.y - 10, 34 * flick, 0, Math.PI * 2); ctx.fill();
    if (near) {
      const g = ctx.createRadialGradient(s.x, s.y - 12, 2, s.x, s.y - 12, 36);
      g.addColorStop(0, 'rgba(255,180,100,0.4)');
      g.addColorStop(1, 'rgba(255,180,100,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(s.x, s.y - 12, 36, 0, Math.PI * 2); ctx.fill();
    }
  });
}

function drawBarrels(ctx, t) {
  const rows = [{ x: -80, y: 130 }, { x: -60, y: 138 }, { x: 100, y: 160 }];
  for (const b of rows) {
    const s = 11;
    ctx.fillStyle = '#5b3a1d';
    ctx.beginPath(); ctx.ellipse(b.x, b.y, s, s * 0.82, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(b.x, b.y, s, s * 0.82, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(b.x, b.y - 4, s * 0.92, s * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#4a2f17';
    ctx.beginPath(); ctx.ellipse(b.x, b.y - 4, s * 0.92, s * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  }
}

// Gudang sebagai tumpukan peti di dek — inventory yang benar-benar terlihat.
function drawCargo(ctx) {
  const total = bankLoad();
  const cap = Math.max(1, capacity());
  if (total <= 0 && carriedLoad() <= 0) return;
  const rows = Math.min(8, Math.ceil(total / 3));
  const crate = 9;
  ctx.save();
  ctx.translate(-16, 26);
  for (let i = 0; i < rows; i++) {
    const x = (i % 3) * (crate + 1) - 2;
    const y = -Math.floor(i / 3) * (crate + 1);
    ctx.fillStyle = i % 2 ? '#a2662e' : '#8d5626';
    ctx.fillRect(x, y, crate, crate);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, crate - 1, crate - 1);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x + 1, y + 1, crate - 2, 2);
  }
  // komposisi: titik warna kecil per jenis resource
  const types = RES_TYPES.filter((t) => (G.banked[t] || 0) > 0);
  let i = 0;
  for (const t of types) {
    const n = Math.min(4, Math.ceil((G.banked[t] / cap) * 4));
    for (let k = 0; k < n; k++) {
      ctx.fillStyle = CFG.RESOURCES[t].color;
      ctx.fillRect(-24 + (i % 2) * 5, 22 + i * 3.2, 4, 3);
      i++;
    }
  }
  ctx.restore();
}

function drawPlayer(ctx, p) {
  const img = ASSETS.player;
  // bayangan rata di dek
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 3, 11, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  atUpright(ctx, p.x, p.y, () => {
    // arah hadap + siklus langkah dari sheet; napas halus saat diam
    const mv = Math.hypot(p.vx, p.vy) > 0.01;
    const fdx = mv ? p.vx : (p.faceDirX || 0);
    const fdy = mv ? p.vy : (p.faceDirY || -1);
    const fr = sheetFrame('player', fdx, fdy, p.walkT, mv);
    const flip = fr ? fr.flip : (Math.cos(p.face) < 0 ? -1 : 1);
    const bob = Math.sin(G.time * 2.4) * (mv ? 0 : 1.4);
    ctx.scale(flip, 1);
    ctx.translate(0, bob);
    if (fr && fr.img && fr.img.complete && fr.img.naturalWidth > 0) {
      const sz = 44;
      ctx.drawImage(fr.img, -sz / 2, -sz * 0.92, sz, sz);
    } else if (img && img.complete && img.naturalWidth > 0) {
      const sz = 44;
      ctx.drawImage(img, -sz / 2, -sz * 0.92, sz, sz);
    } else {
      ctx.fillStyle = '#e67e22';
      ctx.beginPath(); ctx.ellipse(0, -14, 11, 15, 0, 0, Math.PI * 2); ctx.fill();
    }
  });
}
