// ============ Harbor ============
// Dermaga bukan menu. Pemain BERJALAN di sini: memilih pulau di meja peta,
// mengerjakan kapal di meja kerja, lalu naik ke haluan untuk berlayar.
// Kapal terlihat tumbuh setiap kali kau kembali — itu seluruh isi pilar pertama.
import { CFG } from './config.js';
import { G } from './state.js';
import { clamp, dist } from './util.js';
import { capacity, nextRung, goalLabel, isMaxed } from './refit.js';
import { ASSETS } from './assets.js';
import { sfx } from './audio.js';
import { drawBoat, drawLanternPool } from './boat.js';
import { HARBOR } from './world.js';
import { carriedLoad, bankLoad, RES_TYPES } from './inventory.js';

const DECK = { x0: -30, x1: 30, y0: -46, y1: 44 };
const PIER = { x0: -44, x1: 44, y0: 44, y1: 250 };
const CAM = { x: 0, y: 86, zoom: 1.35 };

export const SPOTS = [
  { key: 'chart', x: -30, y: 158, r: 52, label: 'MEJA PETA' },
  { key: 'bench', x: 30, y: 206, r: 52, label: 'MEJA KERJA' },
  { key: 'sail',  x: 0,  y: -30, r: 42, label: 'BERLAYAR' },
];

export function enterHarbor() {
  G.state = 'harbor';
  G.cam.x = CAM.x; G.cam.y = CAM.y; G.cam.zoom = CAM.zoom;
  G.harbor = {
    player: { x: 0, y: 18, vx: 0, vy: 0, face: -Math.PI / 2, stepT: 0 },
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
  clampToWalkable(p);
}

function clampToWalkable(p) {
  const inDeck = p.x >= DECK.x0 && p.x <= DECK.x1 && p.y >= DECK.y0 && p.y <= DECK.y1;
  const inPier = p.x >= PIER.x0 && p.x <= PIER.x1 && p.y >= PIER.y0 && p.y <= PIER.y1;
  if (inDeck || inPier) return;
  const cx1 = clamp(p.x, DECK.x0, DECK.x1), cy1 = clamp(p.y, DECK.y0, DECK.y1);
  const cx2 = clamp(p.x, PIER.x0, PIER.x1), cy2 = clamp(p.y, PIER.y0, PIER.y1);
  const d1 = dist(p.x, p.y, cx1, cy1), d2 = dist(p.x, p.y, cx2, cy2);
  if (d1 <= d2) { p.x = cx1; p.y = cy1; } else { p.x = cx2; p.y = cy2; }
}

// ---------- render ----------
export function drawHarbor(ctx, vw, vh) {
  const H = G.harbor;
  if (!H) return;

  // laut malam yang tenang
  const g = ctx.createLinearGradient(0, 0, 0, vh);
  g.addColorStop(0, '#0a1e2e');
  g.addColorStop(0.6, '#071522');
  g.addColorStop(1, '#040c14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);

  ctx.save();
  ctx.translate(vw / 2, vh / 2);
  ctx.scale(CAM.zoom, CAM.zoom);
  ctx.translate(-CAM.x, -CAM.y);

  // riak air
  ctx.strokeStyle = 'rgba(150,210,255,0.06)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 22; i++) {
    const y = -260 + i * 26 + Math.sin(H.t * 1.2 + i) * 3;
    ctx.beginPath();
    for (let x = -320; x <= 320; x += 34) {
      const yy = y + Math.sin(x * 0.02 + H.t * 1.6 + i) * 3;
      if (x === -320) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  drawLanternPool(ctx, 0, 0, 260);

  // dermaga
  drawPier(ctx);

  // kapal
  drawBoat(ctx, { x: 0, y: 0, vx: 0, vy: 0, angle: -Math.PI / 2 }, 1.9, { noParts: false });
  drawCargo(ctx);

  // meja peta & meja kerja
  drawSpot(ctx, H, 'chart');
  drawSpot(ctx, H, 'bench');

  // pemain
  drawPlayer(ctx, H.player);

  ctx.restore();

  // label lokasi mengambang di layar (mudah dibaca, tidak menutupi dunia)
  ctx.save();
  ctx.font = 'bold 11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const s of H.spots) {
    const sx = vw / 2 + (s.x - CAM.x) * CAM.zoom;
    const sy = vh / 2 + (s.y - CAM.y) * CAM.zoom;
    const near = dist(H.player.x, H.player.y, s.x, s.y) < s.r;
    ctx.fillStyle = near ? 'rgba(255,226,160,0.98)' : 'rgba(210,225,240,0.5)';
    ctx.fillText(s.label, sx, sy - 34);
    if (s.key === 'bench') {
      const gl = goalLabel();
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.fillStyle = gl.ready ? 'rgba(150,235,170,0.9)' : 'rgba(190,205,220,0.55)';
      ctx.fillText(gl.text, sx, sy - 20);
      ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    }
  }
  ctx.restore();

  // pasang surut tidak berjalan di dermaga — hanya bintang & tenang
  const vg = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.34, vw / 2, vh / 2, Math.max(vw, vh) * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, vw, vh);
}

function drawPier(ctx) {
  const w = 88;
  ctx.fillStyle = '#5b3a1d';
  ctx.fillRect(-w / 2, 44, w, 210);
  ctx.fillStyle = '#6f4826';
  for (let y = 46; y < 252; y += 13) ctx.fillRect(-w / 2, y, w, 9);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  for (let y = 44; y < 254; y += 13) ctx.fillRect(-w / 2, y + 9, w, 3);
  // tiang pancang
  ctx.fillStyle = '#3d2712';
  ctx.fillRect(-w / 2 - 6, 60, 8, 170);
  ctx.fillRect(w / 2 - 2, 60, 8, 170);
  // tali tambatan
  ctx.strokeStyle = 'rgba(220,205,170,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-20, 46); ctx.quadraticCurveTo(-24, 20, -12, -2);
  ctx.moveTo(20, 46); ctx.quadraticCurveTo(26, 20, 12, -2);
  ctx.stroke();
}

function drawSpot(ctx, H, key) {
  const s = H.spots.find((x) => x.key === key);
  if (!s) return;
  const near = dist(H.player.x, H.player.y, s.x, s.y) < s.r;
  if (key === 'chart') {
    // meja peta: papan dengan peta tergelar
    ctx.fillStyle = '#3f2a15';
    ctx.fillRect(s.x - 24, s.y - 14, 48, 6);
    ctx.fillStyle = '#4d3319';
    ctx.fillRect(s.x - 20, s.y - 8, 5, 22);
    ctx.fillRect(s.x + 15, s.y - 8, 5, 22);
    ctx.fillStyle = '#d8c79a';
    ctx.fillRect(s.x - 22, s.y - 20, 44, 8);
    ctx.fillStyle = 'rgba(120,90,40,0.6)';
    ctx.fillRect(s.x - 16, s.y - 18, 10, 4);
    ctx.fillRect(s.x + 2, s.y - 17, 12, 3);
    ctx.fillStyle = near ? '#ffd782' : '#8a6a3a';
    ctx.beginPath(); ctx.arc(s.x, s.y - 16, 2.4, 0, Math.PI * 2); ctx.fill();
  } else if (key === 'bench') {
    // meja kerja: bangku, alat, kayu
    ctx.fillStyle = '#3f2a15';
    ctx.fillRect(s.x - 26, s.y - 12, 52, 8);
    ctx.fillRect(s.x - 22, s.y - 4, 5, 18);
    ctx.fillRect(s.x + 17, s.y - 4, 5, 18);
    ctx.fillStyle = '#8b8f96';
    ctx.fillRect(s.x - 18, s.y - 18, 14, 6);
    ctx.fillStyle = '#a2662e';
    ctx.fillRect(s.x + 2, s.y - 17, 16, 5);
    // percikan tungku
    const flick = 0.7 + Math.sin(H.t * 9) * 0.3;
    const rg = ctx.createRadialGradient(s.x, s.y - 6, 1, s.x, s.y - 6, 34 * flick);
    rg.addColorStop(0, 'rgba(255,170,70,0.55)');
    rg.addColorStop(1, 'rgba(255,140,50,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(s.x, s.y - 6, 34 * flick, 0, Math.PI * 2); ctx.fill();
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
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 9, 11, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(p.face + Math.PI / 2);
  if (img && img.complete && img.naturalWidth > 0) {
    const sz = 30;
    ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz);
  } else {
    ctx.fillStyle = '#e67e22';
    ctx.beginPath(); ctx.arc(0, 0, CFG.PLAYER.RADIUS, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
