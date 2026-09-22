// ============ Harbor: Pulau Suaka (Haven Sanctuary Island) ============
// Dermaga sekarang berada di PULAU SUAKA — satu-satunya pulau aman tanpa zombie
// di dunia pasang apocalypse. Beberapa korban selamat tinggal di sini dan kekurangan
// resource. Pemain bertanggung jawab mencari resource di pulau-pulau zombie berbahaya,
// bolak-balik dengan perahu yang palka-nya terbatas untuk menyelamatkan koloni.

import { CFG } from './config.js';
import { G } from './state.js';
import { clamp, dist, makeRng } from './util.js';
import { capacity, nextRung, goalLabel, isMaxed } from './refit.js';
import { ASSETS } from './assets.js';
import { sheetFrame, drawCharSprite } from './sheets.js';
import { drawCharacter3D, updateCharacter3D } from './character3d.js';
import { sfx } from './audio.js';
import { snapshot } from './stats.js';
import { burst } from './fx.js';
import { drawBoat, drawLanternPool } from './boat.js';
import { HARBOR } from './world.js';
import { carriedLoad, bankLoad, RES_TYPES } from './inventory.js';
import { beginWorld, endWorld, upright, atUpright } from './camera.js';
import { tideTint, tideDanger } from './tide.js';

// Batas gerak di Pulau Suaka:
// Dermaga menjorok ke laut di utara (-46), membentang ke daratan pulau hingga selatan (470).
const BOARDWALK = { x0: -500, x1: 500, y0: -46, y1: 470 };
const CAM = { x: 0, y: 110, zoom: 1.35 };

export const SPOTS = [
  { key: 'chart', x: -30, y: 158, r: 52, label: 'MEJA PETA' },
  { key: 'bench', x: 30, y: 206, r: 52, label: 'MEJA KERJA' },
  { key: 'store', x: -120, y: 250, r: 56, label: 'GUDANG' },
  { key: 'sail',  x: 0,  y: -30, r: 42, label: 'BERLAYAR' },
  { key: 'shop',  x: 128, y: 250, r: 52, label: 'KIOS' },
];

export function enterHarbor() {
  G.state = 'harbor';
  G.cam.x = CAM.x; G.cam.y = CAM.y; G.cam.zoom = CAM.zoom;
  G.harbor = {
    player: { x: 0, y: 18, vx: 0, vy: 0, face: -Math.PI / 2, faceDirX: 0, faceDirY: -1, stepT: 0, walkT: 0, walkAmp: 0, moveIntent: false, faceIdx: 0 },
    spots: SPOTS.map((s) => ({ ...s })),
    t: 0,
    // Status komunitas korban selamat di Pulau Suaka (Apocalypse Haven)
    colony: {
      pop: 6,
      foodStatus: (G.banked && G.banked.food >= 6) ? 'Tercukupi' : (G.banked && G.banked.food >= 2) ? 'Terbatas' : 'Kritis',
      medStatus: (G.banked && G.banked.medicine >= 4) ? 'Stabil' : 'Kurang',
      fuelStatus: (G.banked && G.banked.fuel >= 5) ? 'Nyala' : 'Redup',
      damStatus: (G.banked && G.banked.wood >= 8) ? 'Kuat' : 'Perlu Kayu',
    },
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
      if (s.key === 'store') return { kind: 'store', label: 'BUKA GUDANG', spot: s };
      if (s.key === 'shop') return { kind: 'shop', label: 'KIOS KOIN DRIF', spot: s };
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
  p.moveIntent = Math.hypot(move.x, move.y) > 0.01;

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
      if (p.stepT <= 0) { p.stepT = 0.42; sfx('step'); burst(p.x, p.y, 'rgba(196,178,142,0.55)', 3, 58, 'spark', 2.1); }
    }
  }
  // penggerak animasi berjalan (untuk sheet arah + siklus langkah)
  p.walkAmp = clamp(p.walkAmp + ((Math.hypot(p.vx, p.vy) > 0.01 ? 1 : 0) - p.walkAmp) * Math.min(1, dt * 7), 0, 1);
  p.walkT += Math.hypot(p.vx, p.vy) * dt * 0.055;
  clampToWalkable(p);
  updateCharacter3D(dt, p);
}

function clampToWalkable(p) {
  p.x = clamp(p.x, BOARDWALK.x0, BOARDWALK.x1);
  p.y = clamp(p.y, BOARDWALK.y0, BOARDWALK.y1);
}

// ---------- render ----------
export function drawHarbor(ctx, vw, vh) {
  const H = G.harbor;
  if (!H) return;

  const tideK = Math.min(1, tideTint() / 0.70);
  const dangerK = tideDanger();

  const mix = (a, b, t) => `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
  const g = ctx.createLinearGradient(0, 0, 0, vh);
  g.addColorStop(0, mix([10, 30, 46], [46, 18, 24], tideK));
  g.addColorStop(0.6, mix([7, 21, 34], [30, 12, 18], tideK));
  g.addColorStop(1, mix([4, 12, 20], [12, 5, 9], tideK));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);

  // Bahasa kamera 2.5D 3/4 down
  ctx.save();
  ctx.translate(vw / 2, vh / 2 + (CFG.CAM.LIFT || 0) * vh);
  ctx.scale(CAM.zoom, CAM.zoom * CFG.CAM.TILT);
  ctx.translate(-CAM.x, -CAM.y);

  // 1. Laut tenang di utara dermaga tempat bersandar
  drawOpenWater(ctx, H.t);

  // Kolam cahaya lentera kapal di atas air
  drawLanternPool(ctx, 0, -4, 260 * (1 - 0.35 * tideK));

  // 2. Daratan Pulau Suaka (Pantai, Tanggul Batu Dam, dan Dataran Hijau Pemukiman)
  drawSanctuaryIslandTerrain(ctx, H.t);

  // 3. Dermaga Kayu Solid (Menghubungkan pantai pulau ke kapal yang ditambat)
  drawBoardwalk(ctx, H.t);

  // 4. Garis air pasang merambat naik saat malam tua
  drawTideLine(ctx, H.t, dangerK);

  // 5. Kapal bersandar di dermaga + muatan palka
  atUpright(ctx, 0, 0, () => {
    drawBoat(ctx, { x: 0, y: 0, vx: 0, vy: 0, angle: -Math.PI / 2 }, 1.9, { noParts: false });
    drawCargo(ctx);
  });

  // 6. Elemen pemukiman: Api unggun, tenda pengungsi, tanggul, warga, dan stasiun kerja
  drawSanctuarySettlement(ctx, H);

  ctx.restore();

  // Overlay HUD info pemukiman Pulau Suaka
  drawColonyHeader(ctx, vw, vh);

  // vignette: gelap di tepi layar
  const vg = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.34, vw / 2, vh / 2, Math.max(vw, vh) * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, vw, vh);
}

// Banner HUD status Pulau Suaka: Menampilkan tanggung jawab pemain terhadap korban selamat
function drawColonyHeader(ctx, vw, vh) {
  const food = G.banked.food || 0;
  const med = G.banked.medicine || 0;
  const fuel = G.banked.fuel || 0;
  const wood = G.banked.wood || 0;

  ctx.save();
  ctx.fillStyle = 'rgba(6, 12, 18, 0.82)';
  ctx.strokeStyle = 'rgba(216, 170, 90, 0.45)';
  ctx.lineWidth = 1;
  const bw = Math.min(620, vw - 32);
  const bx = (vw - bw) / 2;
  const by = 14;

  ctx.beginPath();
  const rr = 6;
  ctx.moveTo(bx + rr, by);
  ctx.arcTo(bx + bw, by, bx + bw, by + 34, rr);
  ctx.arcTo(bx + bw, by + 34, bx, by + 34, rr);
  ctx.arcTo(bx, by + 34, bx, by, rr);
  ctx.arcTo(bx, by, bx + bw, by, rr);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.font = '600 11px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#f3ba46';
  ctx.textAlign = 'left';
  ctx.fillText('🏝️ PULAU SUAKA (ZONA AMAN)', bx + 14, by + 21);

  ctx.textAlign = 'right';
  ctx.font = '500 10.5px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#d1d5db';
  const cap = capacity();
  ctx.fillText(`👥 6 Jiwa | 🍞 Makan: ${food} | 💊 Obat: ${med} | 🪵 Kayu: ${wood} | ⚓ Palka: ${cap} Unit`, bx + bw - 14, by + 21);
  ctx.restore();
}

let lastWaterLine = null;
export function tideLineY() { return lastWaterLine; }

function drawTideLine(ctx, t, k) {
  if (k <= 0.02) { lastWaterLine = null; return; }
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
  ctx.strokeStyle = `rgba(214,232,246,${0.16 + 0.2 * k})`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawOpenWater(ctx, t) {
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

  const flick = 0.5 + Math.sin(t * 2.1) * 0.15;
  const g = ctx.createLinearGradient(0, -260, 0, -4);
  g.addColorStop(0, 'rgba(255,196,110,0)');
  g.addColorStop(0.7, `rgba(255,180,90,${0.05 + 0.06 * flick})`);
  g.addColorStop(1, 'rgba(255,160,70,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-520, -260, 1040, 256);

  drawSeaweedBed(ctx, t);
}

function drawSeaweedBed(ctx, t) {
  const clusters = [
    { x: -430, y: -90, n: 4, h: 30 },
    { x: -320, y: -40, n: 3, h: 22 },
    { x: 300, y: -70, n: 4, h: 28 },
    { x: 420, y: -30, n: 3, h: 20 },
    { x: 140, y: -150, n: 3, h: 24 },
  ];
  for (const c of clusters) {
    for (let i = 0; i < c.n; i++) {
      const sway = Math.sin(t * 1.3 + c.x * 0.01 + i * 1.2) * (4 + i * 1.5);
      const baseX = c.x + i * 9 - c.n * 4;
      ctx.strokeStyle = `rgba(40,96,74,${0.5 + i * 0.08})`;
      ctx.lineWidth = 2.4 - i * 0.3;
      ctx.beginPath();
      ctx.moveTo(baseX, c.y);
      ctx.quadraticCurveTo(baseX + sway * 0.5, c.y - c.h * 0.6, baseX + sway, c.y - c.h);
      ctx.stroke();
    }
  }
}

// 2. Daratan Pulau Suaka (Pantai pasir, tanggul batu dam, bukit rumput)
function drawSanctuaryIslandTerrain(ctx, t) {
  const x0 = BOARDWALK.x0, x1 = BOARDWALK.x1, w = x1 - x0;

  // Lapis 1: Pasir pantai selatan dari air utara (y: -10 ke 110)
  ctx.fillStyle = '#dfcf9a';
  ctx.beginPath();
  ctx.moveTo(x0, -10);
  ctx.lineTo(x1, -10);
  ctx.lineTo(x1, 120);
  ctx.lineTo(x0, 120);
  ctx.closePath();
  ctx.fill();

  // Ombak buih tipis di tepi pantai
  const foam = Math.sin(t * 2.3) * 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0, 8 + foam);
  for (let x = x0; x <= x1; x += 40) {
    ctx.lineTo(x, 8 + Math.sin(x * 0.05 + t * 2) * 2.5 + foam);
  }
  ctx.stroke();

  // Lapis 2: Tanggul Batu / Seawall Dam Pelindung Pulau (y: 60 - 80)
  ctx.fillStyle = '#3a444c';
  ctx.fillRect(x0, 60, w, 20);
  // Balok-balok batu tanggul dam dengan pencahayaan 2.5D
  for (let x = x0; x < x1; x += 36) {
    ctx.fillStyle = '#5d6770';
    ctx.fillRect(x + 2, 60, 32, 6); // permukaan atas tanggul terpapar cahaya
    ctx.fillStyle = '#2d353b';
    ctx.fillRect(x + 2, 66, 32, 14); // sisi depan bayangan
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, 60, 32, 20);
  }

  // Lapis 3: Dataran tinggi rumput hijau tempat tinggal korban selamat (y: 80 - 470)
  ctx.fillStyle = '#2f6d3a';
  ctx.fillRect(x0, 80, w, 390);

  // Variasi warna rumput dan jalan setapak tanah liat
  ctx.fillStyle = '#285e32';
  for (let y = 100; y < 470; y += 45) {
    ctx.beginPath();
    ctx.ellipse(0, y, 460, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Jalan setapak tanah/batu menghubungkan dermaga ke api unggun & stasiun
  ctx.fillStyle = '#6b5336';
  ctx.beginPath();
  ctx.moveTo(-28, 80);
  ctx.lineTo(28, 80);
  ctx.lineTo(45, 470);
  ctx.lineTo(-45, 470);
  ctx.closePath();
  ctx.fill();

  // Batu pijakan jalan setapak
  ctx.fillStyle = '#8a7d6d';
  for (let y = 90; y < 460; y += 28) {
    ctx.beginPath();
    ctx.ellipse(Math.sin(y * 0.08) * 12, y, 9, 5, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 3. Dermaga Kayu Solid (Menghubungkan pantai pulau ke perahu di laut utara)
function drawBoardwalk(ctx, t) {
  // Dermaga kayu menjorok ke perahu: x: -44 s/d +44, y: -46 s/d 70
  const dw = 88;
  const top = -46;
  const bot = 70;

  // Dasar papan kayu gelap dermaga
  ctx.fillStyle = '#2c190a';
  ctx.fillRect(-dw / 2, top, dw, bot - top);

  // Papan-papan horizontal dermaga kayu
  for (let y = top; y < bot; y += 8) {
    ctx.fillStyle = (Math.sin(y * 1.5) > 0) ? '#6d4520' : '#593718';
    ctx.fillRect(-dw / 2, y, dw, 6.5);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-dw / 2, y + 6.5, dw, 1.5);
  }

  // Tiang-tiang pancang kayu di tepi dermaga
  ctx.fillStyle = '#241407';
  for (let y = top; y <= bot; y += 24) {
    ctx.fillRect(-dw / 2 - 3, y, 4, 8);
    ctx.fillRect(dw / 2 - 1, y, 4, 8);
  }

  // Tiang tambat tali kapal (Bollard)
  ctx.fillStyle = '#111';
  ctx.fillRect(-18, top + 6, 8, 12);
  ctx.fillRect(10, top + 6, 8, 12);
  ctx.fillStyle = '#c5a059';
  ctx.beginPath();
  ctx.ellipse(-14, top + 14, 7, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(14, top + 14, 7, 3, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawSanctuarySettlement(ctx, H) {
  // Tiang lentera penuntun di dermaga
  drawLanternPost(ctx, -60, -20, H.t);
  drawLanternPost(ctx, 60, -20, H.t);

  // Pohon pinus / beringin suaka di pinggir pulau
  drawSanctuaryTree(ctx, -260, 140, 1.2, H.t);
  drawSanctuaryTree(ctx, -380, 220, 1.1, H.t);
  drawSanctuaryTree(ctx, 280, 130, 1.3, H.t);
  drawSanctuaryTree(ctx, 390, 210, 1.15, H.t);

  const props = [
    { y: 120, draw: () => drawBarrels(ctx, H.t) },
    { y: 140, draw: () => drawRefugeeTents(ctx) },
    { y: H.spots.find((x) => x.key === 'chart').y, draw: () => drawChartTable(ctx, H) },
    { y: 190, draw: () => drawCampfire(ctx, H) },
    { y: H.spots.find((x) => x.key === 'bench').y, draw: () => drawWorkbench(ctx, H) },
    { y: H.spots.find((x) => x.key === 'store').y, draw: () => drawStore(ctx, H) },
    { y: H.spots.find((x) => x.key === 'shop').y, draw: () => drawStall(ctx, H) },
    { y: KEEPER.y, draw: () => drawKeeper(ctx, H) },
    { y: 220, draw: () => drawDoctorMaya(ctx, H) },
    { y: 320, draw: () => drawLowerDeck(ctx) },
    { y: H.player.y, draw: () => drawPlayer(ctx, H.player) },
  ];
  props.sort((a, b) => a.y - b.y);
  for (const p of props) p.draw();
}

// Pohon pantai 2.5D di Pulau Suaka
function drawSanctuaryTree(ctx, tx, ty, scale, t) {
  atUpright(ctx, tx, ty, (p) => {
    const s = 34 * scale * p;
    const sway = Math.sin(t * 1.5 + tx * 0.05) * 3;

    // Batang pohon kayu gnarled
    ctx.fillStyle = '#3a2b1c';
    ctx.beginPath();
    ctx.moveTo(-s * 0.18, 0);
    ctx.lineTo(s * 0.18, 0);
    ctx.lineTo(s * 0.1 + sway * 0.2, -s * 1.4);
    ctx.lineTo(-s * 0.1 + sway * 0.2, -s * 1.4);
    ctx.closePath();
    ctx.fill();

    // Rindang daun pinus 3/4 volume
    const cy = -s * 1.4;
    ctx.fillStyle = '#164323';
    ctx.beginPath();
    ctx.arc(sway, cy, s * 0.85, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#276b3b';
    ctx.beginPath();
    ctx.arc(sway - s * 0.2, cy - s * 0.2, s * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Kilap daun atas
    ctx.fillStyle = '#429e5a';
    ctx.beginPath();
    ctx.arc(sway - s * 0.3, cy - s * 0.35, s * 0.35, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Api Unggun Pusat Suaka (Central Campfire & 2D Radial Light Glow)
function drawCampfire(ctx, H) {
  const t = H.t;
  const cx = 0, cy = 190;
  const flick = 0.84 + Math.sin(t * 8.5) * 0.16 + Math.sin(t * 14) * 0.08;

  // 1. Cahaya 2D Radial Light Glow hangat di atas tanah
  const rg = ctx.createRadialGradient(cx, cy, 6, cx, cy, 95 * flick);
  rg.addColorStop(0, 'rgba(255, 175, 55, 0.65)');
  rg.addColorStop(0.45, 'rgba(255, 120, 30, 0.28)');
  rg.addColorStop(1, 'rgba(255, 80, 10, 0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(cx, cy, 95 * flick, 0, Math.PI * 2);
  ctx.fill();

  atUpright(ctx, cx, cy, () => {
    // 2. Lingkaran batu api unggun
    ctx.fillStyle = '#4d555c';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 16, Math.sin(a) * 9, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Kayu bakar menyilang
    ctx.fillStyle = '#321f11';
    ctx.fillRect(-12, -4, 24, 6);
    ctx.fillRect(-4, -12, 8, 20);

    // 4. Kobaran lidah api aktif
    const flH = 18 * flick;
    ctx.fillStyle = '#e65100';
    ctx.beginPath();
    ctx.moveTo(-9, 2);
    ctx.lineTo(0, -flH * 1.1);
    ctx.lineTo(9, 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffb300';
    ctx.beginPath();
    ctx.moveTo(-6, 2);
    ctx.lineTo(Math.sin(t * 12) * 2, -flH * 0.8);
    ctx.lineTo(6, 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fff9c4';
    ctx.beginPath();
    ctx.arc(0, -3, 4 * flick, 0, Math.PI * 2);
    ctx.fill();

    // 5. Partikel bara api (embers) melayang naik
    for (let i = 0; i < 4; i++) {
      const ey = -8 - ((t * 22 + i * 16) % 35);
      const ex = Math.sin(t * 3.5 + i * 2) * 8;
      ctx.fillStyle = 'rgba(255, 230, 120, 0.85)';
      ctx.beginPath();
      ctx.arc(ex, ey, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// Tenda Pengungsi (Refugee Shelters)
function drawRefugeeTents(ctx) {
  const tents = [
    { x: -190, y: 150, s: 1.1 },
    { x: 190, y: 160, s: 1.05 },
    { x: -240, y: 180, s: 0.95 },
  ];
  for (const tent of tents) {
    atUpright(ctx, tent.x, tent.y, () => {
      const s = tent.s;
      // Bayangan tenda
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 2, 28 * s, 10 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Kain kanopi terpal tenda
      ctx.fillStyle = '#b8a98b';
      ctx.beginPath();
      ctx.moveTo(0, -32 * s);
      ctx.lineTo(-24 * s, 0);
      ctx.lineTo(24 * s, 0);
      ctx.closePath();
      ctx.fill();

      // Pintu tenda gelap
      ctx.fillStyle = '#261b12';
      ctx.beginPath();
      ctx.moveTo(0, -26 * s);
      ctx.lineTo(-10 * s, 0);
      ctx.lineTo(10 * s, 0);
      ctx.closePath();
      ctx.fill();

      // Tiang kayu pengikat tenda
      ctx.strokeStyle = '#5a3d24';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, -34 * s);
      ctx.lineTo(0, 0);
      ctx.stroke();
    });
  }
}

// Dokter Maya: Menjaga tenda medis dan pasien luka
function drawDoctorMaya(ctx, H) {
  const mx = -150, my = 220;
  const t = H.t;
  const near = dist(H.player.x, H.player.y, mx, my) < 56;

  atUpright(ctx, mx, my, () => {
    // Peti Palang Merah
    ctx.fillStyle = '#f0ebe1';
    ctx.fillRect(-22, -12, 14, 12);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-17, -10, 4, 8);
    ctx.fillRect(-19, -8, 8, 4);

    // Karakter Dokter Maya
    ctx.fillStyle = '#e8ecf2';
    ctx.fillRect(-6, -28, 12, 22); // jas lab putih pengungsi
    ctx.fillStyle = '#374151';
    ctx.fillRect(-5, -6, 4, 7);
    ctx.fillRect(1, -6, 4, 7);
    ctx.fillStyle = '#e2bc98';
    ctx.beginPath();
    ctx.arc(0, -32, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e1b18';
    ctx.beginPath();
    ctx.arc(0, -34, 6, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();

    if (near) {
      const line = (G.banked.medicine > 3)
        ? 'Pasokan obat cukup untuk merawat korban gigitan ringan.'
        : 'Obat di suaka menipis! Tolong cari peti medis di pulau reruntuhan!';
      drawSpeechBubble(ctx, 0, -42, line);
    }
  });
}

function drawSpeechBubble(ctx, bx, by, text) {
  ctx.save();
  ctx.font = '600 10.5px Inter, system-ui, sans-serif';
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 34 && cur) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  let maxW = 0;
  for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l).width);
  const bw = maxW + 16, bh = lines.length * 13 + 10;
  const x0 = bx - bw / 2, y0 = by - bh;

  ctx.fillStyle = 'rgba(8, 15, 24, 0.94)';
  ctx.strokeStyle = 'rgba(216, 170, 90, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const rr = 5;
  ctx.moveTo(x0 + rr, y0);
  ctx.arcTo(x0 + bw, y0, x0 + bw, y0 + bh, rr);
  ctx.arcTo(x0 + bw, y0 + bh, x0, y0 + bh, rr);
  ctx.arcTo(x0, y0 + bh, x0, y0, rr);
  ctx.arcTo(x0, y0, x0 + bw, y0, rr);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f3f4f6';
  ctx.textAlign = 'center';
  lines.forEach((l, i) => ctx.fillText(l, bx, y0 + 13 + i * 13));
  ctx.restore();
}

const KEEPER = { x: -60, y: 185 };
const KEEPER_NEW = [
  'Kakek Aris: "Malam pertama di laut, nak? Cari kayu & solar dulu, lalu segera pulang!"',
  'Kakek Aris: "Perahu kita palka-nya kecil. Jangan serakah sebelum pasang menenggelamkanmu."',
  'Kakek Aris: "Di pulau luar penuh zombie lapar. Hanya pulau ini yang masih aman."',
];
const KEEPER_COMEBACK = [
  'Kakek Aris: "Syukurlah kau kembali bernyawa! Lautan menuntut keberanian, bukan kepasrahan."',
  'Kakek Aris: "Muatan yang jatuh jadi pelampung di pulau itu. Bisa kau ambil lagi bila siap."',
];
const KEEPER_VET = [
  'Kakek Aris: "Pelaut tangguh! Berkat pasokanmu, lentera suaka kita terus menyala membakar malam."',
  'Kakek Aris: "Makin jauh ke pulau terluar, makin ganas zombie-nya tapi makin berharga jarahannya."',
];

function keeperLine(H) {
  const st = snapshot();
  let pool = KEEPER_NEW;
  if ((st.bestNight || 0) >= 4) pool = KEEPER_VET;
  else if ((st.deaths || 0) >= 1) pool = KEEPER_COMEBACK;
  return pool[Math.floor(H.t / 7) % pool.length];
}

function drawKeeper(ctx, H) {
  const k = KEEPER;
  const t = H.t;
  const bobY = Math.sin(t * 1.6) * 1.4;
  const nearP = dist(H.player.x, H.player.y, k.x, k.y);
  const close = nearP < 68;

  atUpright(ctx, k.x, k.y, () => {
    // Tongkat kayu Kakek Aris
    ctx.strokeStyle = '#5c4125';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(8, -26 + bobY);
    ctx.lineTo(10, 0);
    ctx.stroke();

    // Jubah nelayan tua
    ctx.fillStyle = '#4a3825';
    ctx.fillRect(-7, -24 + bobY, 14, 24);
    ctx.fillStyle = '#d6b88b';
    ctx.beginPath();
    ctx.arc(0, -29 + bobY, 6, 0, Math.PI * 2);
    ctx.fill();
    // Janggut putih Kakek Aris
    ctx.fillStyle = '#eaeaea';
    ctx.beginPath();
    ctx.arc(0, -26 + bobY, 4, 0, Math.PI);
    ctx.fill();

    if (close) {
      const line = keeperLine(H);
      drawSpeechBubble(ctx, 0, -38 + bobY, line);
    }
  });
}

function drawStall(ctx, H) {
  const s = H.spots.find((x) => x.key === 'shop');
  const near = dist(H.player.x, H.player.y, s.x, s.y) < s.r;
  atUpright(ctx, s.x, s.y, () => {
    const img = ASSETS.stall_flair;
    if (img && img.complete && img.naturalWidth) {
      const flick = 0.8 + Math.sin(H.t * 7.3) * 0.14;
      const g = ctx.createRadialGradient(0, -12, 4, 0, -12, 58 * flick);
      g.addColorStop(0, 'rgba(255,190,110,0.32)');
      g.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, -12, 58 * flick, 0, Math.PI * 2); ctx.fill();
      const w = 96, h = 96;
      ctx.drawImage(img, -w / 2, -h + 20, w, h);
    } else {
      ctx.fillStyle = '#4d3319';
      ctx.fillRect(-26, -14, 52, 12);
      ctx.fillStyle = '#d9a54a';
      ctx.beginPath(); ctx.arc(0, -20, 5, 0, Math.PI * 2); ctx.fill();
    }
    if (near) {
      const g = ctx.createRadialGradient(0, -20, 2, 0, -20, 40);
      g.addColorStop(0, 'rgba(255,214,130,0.45)');
      g.addColorStop(1, 'rgba(255,214,130,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, -20, 40, 0, Math.PI * 2); ctx.fill();
    }
  });
}

function drawStore(ctx, H) {
  const s = H.spots.find((x) => x.key === 'store');
  const near = dist(H.player.x, H.player.y, s.x, s.y) < s.r;
  atUpright(ctx, s.x, s.y, () => {
    ctx.fillStyle = '#3d2712';
    ctx.fillRect(-34, -20, 5, 40);
    ctx.fillRect(29, -20, 5, 40);
    ctx.fillStyle = '#4d3319';
    ctx.fillRect(-40, -30, 80, 10);
    ctx.fillStyle = '#5b3a1d';
    ctx.fillRect(-40, -30, 80, 3);

    ctx.fillStyle = '#3a2513';
    ctx.fillRect(-30, 8, 60, 5);
    ctx.fillRect(-30, -2, 60, 5);

    const types = RES_TYPES.filter((t) => (G.banked[t] || 0) > 0);
    if (types.length === 0) {
      ctx.fillStyle = 'rgba(120,110,90,0.5)';
      ctx.fillRect(-24, -12, 10, 8);
      ctx.fillRect(-6, -12, 10, 8);
      ctx.fillRect(12, -12, 10, 8);
    } else {
      for (let i = 0; i < 3; i++) {
        const t = types[i % types.length];
        ctx.fillStyle = CFG.RESOURCES[t].color;
        ctx.fillRect(-24 + i * 18, -12, 12, 9);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-24 + i * 18, -12, 12, 9);
      }
    }

    ctx.fillStyle = '#8d5626';
    ctx.fillRect(-20, 16, 18, 14);
    ctx.fillStyle = '#a2662e';
    ctx.fillRect(4, 18, 16, 12);

    if (near) {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 42);
      g.addColorStop(0, 'rgba(255,214,130,0.4)');
      g.addColorStop(1, 'rgba(255,214,130,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.fill();
    }
  });
}

function drawWorkbench(ctx, H) {
  const s = H.spots.find((x) => x.key === 'bench');
  const near = dist(H.player.x, H.player.y, s.x, s.y) < s.r;
  atUpright(ctx, s.x, s.y, () => {
    // Sosok Budi Si Tukang Kapal di samping meja kerja
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(-32, -26, 11, 24); // celemek kulit cokelat
    ctx.fillStyle = '#d4a373';
    ctx.beginPath(); ctx.arc(-26, -30, 5, 0, Math.PI * 2); ctx.fill();

    // Meja kerja kayu pertukangan Budi
    ctx.fillStyle = '#4a2f17';
    ctx.fillRect(-18, -14, 38, 14);
    ctx.fillStyle = '#6b4522';
    ctx.fillRect(-20, -18, 42, 5);

    // Alat & cetak biru perahu di atas meja
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(-14, -21, 14, 3); // blueprint kapal
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(6, -21, 12, 3);  // gergaji & palu

    // Tungku bara kerja
    const flick = 0.7 + Math.sin(H.t * 9) * 0.3;
    const rg = ctx.createRadialGradient(0, -10, 1, 0, -10, 34 * flick);
    rg.addColorStop(0, 'rgba(255,170,70,0.55)');
    rg.addColorStop(1, 'rgba(255,140,50,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(0, -10, 34 * flick, 0, Math.PI * 2); ctx.fill();

    if (near) {
      const g = ctx.createRadialGradient(0, -12, 2, 0, -12, 38);
      g.addColorStop(0, 'rgba(255,180,100,0.4)');
      g.addColorStop(1, 'rgba(255,180,100,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, -12, 38, 0, Math.PI * 2); ctx.fill();
    }
  });
}

function drawChartTable(ctx, H) {
  const s = H.spots.find((x) => x.key === 'chart');
  const near = dist(H.player.x, H.player.y, s.x, s.y) < s.r;
  atUpright(ctx, s.x, s.y, () => {
    // Pondasi batu tebing meja peta
    ctx.fillStyle = '#525c66';
    ctx.fillRect(-22, -8, 44, 16);

    // Daun meja kayu bundar / persegi
    ctx.fillStyle = '#5c3a1d';
    ctx.fillRect(-18, -16, 36, 12);
    // Peta gulung bahari
    ctx.fillStyle = '#dfcb9f';
    ctx.fillRect(-14, -18, 28, 8);
    ctx.strokeStyle = '#856d48';
    ctx.lineWidth = 1;
    ctx.strokeRect(-14, -18, 28, 8);

    // Lentera tembaga di meja peta
    const flick = 0.8 + Math.sin(H.t * 6.8) * 0.15;
    const g = ctx.createRadialGradient(10, -22, 1, 10, -22, 45 * flick);
    g.addColorStop(0, 'rgba(255,200,100,0.55)');
    g.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(10, -22, 45 * flick, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd580';
    ctx.beginPath(); ctx.arc(10, -22, 3, 0, Math.PI * 2); ctx.fill();

    if (near) {
      const ng = ctx.createRadialGradient(0, -12, 2, 0, -12, 38);
      ng.addColorStop(0, 'rgba(255,214,130,0.4)');
      ng.addColorStop(1, 'rgba(255,214,130,0)');
      ctx.fillStyle = ng;
      ctx.beginPath(); ctx.arc(0, -12, 38, 0, Math.PI * 2); ctx.fill();
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
    ctx.fillStyle = '#4a2f17';
    ctx.beginPath(); ctx.ellipse(b.x, b.y - 4, s * 0.92, s * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function drawLowerDeck(ctx) {
  const crates = [
    { x: -180, y: 330, w: 26, h: 22 },
    { x: -150, y: 344, w: 26, h: 22 },
    { x: -165, y: 366, w: 30, h: 24 },
  ];
  for (const c of crates) {
    ctx.fillStyle = '#8d5626';
    ctx.fillRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(c.x - c.w / 2 + 0.5, c.y - c.h / 2 + 0.5, c.w - 1, c.h - 1);
  }
}

function drawLanternPost(ctx, lx, ly, t) {
  atUpright(ctx, lx, ly, () => {
    ctx.fillStyle = '#2c1e11';
    ctx.fillRect(-2, -32, 4, 32);
    ctx.fillRect(-6, -34, 12, 3);

    const flick = 0.85 + Math.sin(t * 7.1 + lx) * 0.15;
    const g = ctx.createRadialGradient(0, -38, 2, 0, -38, 48 * flick);
    g.addColorStop(0, 'rgba(255,200,110,0.6)');
    g.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, -38, 48 * flick, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffefa0';
    ctx.beginPath(); ctx.arc(0, -38, 3.5, 0, Math.PI * 2); ctx.fill();
  });
}

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
  }
  ctx.restore();
}

function drawPlayer(ctx, p) {
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 3, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
  atUpright(ctx, p.x, p.y, () => {
    if (typeof window === 'undefined' && ASSETS && ASSETS.player) {
      ctx.drawImage(ASSETS.player, -36, -63, 72, 72);
    } else {
      drawCharacter3D(ctx, p, 70);
    }
  });
}
