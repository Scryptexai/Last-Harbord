// ============ Perahu ============
// Perahu = rumah, bank, dan nyawa pemain. Setiap tingkat refit menambah bagian
// yang BENAR-BENAR terlihat di lambung/dek — bukan cuma angka.
import { CFG } from './config.js';
import { G } from './state.js';
import { ASSETS } from './assets.js';
import { maxHP, speedMult, boatTier, REFIT } from './refit.js';

export { maxHP, speedMult, boatTier };

export function createBoat(x = 0, y = 0) {
  return { x, y, vx: 0, vy: 0, angle: -Math.PI / 2 };
}

// Inersia: akselerasi dari input, drag membuat melambat bertahap, air dangkal melambatkan.
export function updateBoat(dt, move, opts = {}) {
  const b = G.boat;
  if (!b) return;
  const shallow = opts.shallow ? CFG.BOAT.SHALLOW_SLOW : 1;

  if (G.anchored || G.fishing) {
    const stop = Math.pow(0.82, dt * 60);
    b.vx *= stop; b.vy *= stop;
  } else {
    const a = CFG.BOAT.ACCEL * speedMult();
    b.vx += (move.x || 0) * a * dt;
    b.vy += (move.y || 0) * a * dt;
  }

  const max = CFG.BOAT.MAX_SPEED * speedMult() * shallow;
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > max) { b.vx = b.vx / sp * max; b.vy = b.vy / sp * max; }

  const drag = Math.pow(CFG.BOAT.DRAG, dt * 60);
  b.vx *= drag; b.vy *= drag;

  b.x += b.vx * dt;
  b.y += b.vy * dt;

  if (sp > 10) b.angle = Math.atan2(b.vy, b.vx);
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------- bagian refit: digambar di atas sprite kapal ----------
// Setiap rung punya wujud. Pemain harus bisa mengenali kapalnya sendiri dari jauh.
function drawRungPart(ctx, rungIndex, damage) {
  const box = (x, y, w, h, fill, edge) => {
    ctx.fillStyle = fill; ctx.strokeStyle = edge || 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.2;
    roundRectPath(ctx, x, y, w, h, 2); ctx.fill(); ctx.stroke();
  };
  switch (rungIndex) {
    case 0: // Palka I — peti kayu di buritan
      box(-11, 11, 9, 8, '#a2662e', '#4a2b12');
      box(-2, 12, 9, 7, '#8d5626', '#4a2b12');
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(-11, 14, 9, 1.5); ctx.fillRect(-2, 15, 9, 1.5);
      break;
    case 1: // Layar I — layar kecil di tengah
      ctx.fillStyle = '#e8e2d0'; ctx.strokeStyle = '#8d8778'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(13, 2); ctx.lineTo(0, 2); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#6b4a26'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, 6); ctx.stroke();
      break;
    case 2: // Lambung I — papan baja di sisi lambung
      ctx.strokeStyle = '#7d8b96'; ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-12, -3); ctx.lineTo(-6, -8);
      ctx.moveTo(12, -3); ctx.lineTo(6, -8);
      ctx.stroke();
      ctx.strokeStyle = '#5a6670'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-12, 4); ctx.lineTo(-7, -1);
      ctx.moveTo(12, 4); ctx.lineTo(7, -1);
      ctx.stroke();
      break;
    case 3: // Palka II — peti kedua, lebih besar
      box(-13, 12, 11, 9, '#b07034', '#4a2b12');
      box(-1, 13, 12, 8, '#9a5f2b', '#4a2b12');
      box(11, 14, 7, 6, '#7d4c22', '#3d2210');
      break;
    case 4: // Layar II — layar besar
      ctx.fillStyle = '#f0ead8'; ctx.strokeStyle = '#8d8778'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(20, 4); ctx.lineTo(0, 4); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-16, 4); ctx.lineTo(0, 4); ctx.closePath();
      ctx.fillStyle = '#ded6c2'; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#6b4a26'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(0, -23); ctx.lineTo(0, 14); ctx.stroke();
      break;
    case 5: // Lambung II — pelat penuh
      ctx.strokeStyle = '#95a3ae'; ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-13, -6); ctx.lineTo(-6, -11);
      ctx.moveTo(13, -6); ctx.lineTo(6, -11);
      ctx.moveTo(-14, 3); ctx.lineTo(-7, -2);
      ctx.moveTo(14, 3); ctx.lineTo(7, -2);
      ctx.stroke();
      break;
    default: break;
  }
}

export function drawBoat(ctx, boat, scale = 1, opts = {}) {
  const tier = boatTier();
  let sprite = ASSETS.boat_lv1;
  let sw = 64;
  if (tier === 3) { sprite = ASSETS.boat_lv3 || ASSETS.boat_lv2 || ASSETS.boat_lv1; sw = 96; }
  else if (tier === 2) { sprite = ASSETS.boat_lv2 || ASSETS.boat_lv1; sw = 80; }

  const sp = Math.hypot(boat.vx || 0, boat.vy || 0);
  const mx = Math.max(1, maxHP());
  const hpK = clamp01(G.hull / mx);                    // kerusakan SEKARANG
  const patchK = clamp01(1 - (G.deepHull || G.hull) / mx); // riwayat kerusakan (tambalan)

  ctx.save();
  ctx.translate(boat.x, boat.y);

  // jejak air / wake
  if (sp > 10) {
    const a = boat.angle;
    ctx.save();
    ctx.rotate(a);
    const len = Math.min(70, 24 + sp * 0.22);
    const g = ctx.createLinearGradient(-16, 0, -len, 0);
    g.addColorStop(0, 'rgba(160,220,255,0.4)');
    g.addColorStop(1, 'rgba(160,220,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-14, -7);
    ctx.lineTo(-len, -16);
    ctx.lineTo(-len, 16);
    ctx.lineTo(-14, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.rotate(boat.angle + Math.PI / 2); // sprite menghadap ke atas (utara)

  // ---- juice: idle bob + kemiringan saat kritis + getar halus saat parah ----
  const bob = sp < 6 ? Math.sin(G.time * 1.7) * 1.1 * scale : 0;
  const list = (hpK < 0.35 && sp < 6) ? (0.35 - hpK) * 0.30 : 0;   // kapal miring saat tenggelam
  const shudder = hpK < 0.35 ? Math.sin(G.time * 37) * 0.5 : 0;
  ctx.rotate(list);
  ctx.translate(shudder, bob);

  if (sprite && sprite.complete && sprite.naturalWidth > 0) {
    const d = sw * 0.72 * scale;
    ctx.drawImage(sprite, -d / 2, -d / 2, d, d);
  } else {
    const w = 32 * scale, h = 52 * scale;
    ctx.fillStyle = '#2f74b8';
    ctx.strokeStyle = '#12365e';
    ctx.lineWidth = 2 * scale;
    roundRectPath(ctx, -w / 2, -h / 2, w, h, 6 * scale);
    ctx.fill(); ctx.stroke();
  }

  // bagian refit digambar di atas sprite (peti, layar, pelat) — semua terlihat
  if (!opts.noParts) {
    ctx.save();
    const u = scale * (sw / 64) * 0.72;
    ctx.scale(u, u);
    // HALUAN & BURITAN: haluan runcing ke depan, buritan tumpul dengan kemudi — dari
    // sudut kamera manapun pemain tahu ke mana kapal menghadap.
    drawBowStern(ctx);
    // TAMBALAN (riwayat) + KERUSAKAN bertingkat di lambung
    drawHullState(ctx, hpK, patchK);
    for (let i = 0; i < G.refit && i < REFIT.length; i++) drawRungPart(ctx, i, 0);
    ctx.restore();
  }

  // lentera: cahaya hangat — simbol emosional kapal. Meredup saat kapal rusak berat.
  const lanternR = (9 + (hullLv2() ? 4 : 0)) * scale * (0.55 + 0.45 * hpK);
  const flick = 0.86 + Math.sin(G.time * 7) * 0.06 + Math.sin(G.time * 13.3) * 0.04
              + (hpK < 0.35 ? Math.sin(G.time * 21) * 0.18 : 0);   // berkedip tak menentu saat kritis
  const lg = ctx.createRadialGradient(0, 0, 1, 0, 0, lanternR * flick);
  lg.addColorStop(0, `rgba(255,196,110,${0.35 + 0.5 * hpK})`);
  lg.addColorStop(0.35, `rgba(255,170,80,${0.12 + 0.18 * hpK})`);
  lg.addColorStop(1, 'rgba(255,150,60,0)');
  ctx.fillStyle = lg;
  ctx.beginPath(); ctx.arc(0, 0, lanternR * flick, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(255,215,154,${0.5 + 0.5 * hpK})`;
  ctx.beginPath(); ctx.arc(0, (6 * sw / 64) * 0.72, 1.9 * scale, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

// Haluan runcing (atas) + buritan tumpul dengan kemudi (bawah). Digambar dalam ruang
// lokal kapal yang sudah diskalakan (1 unit = 0.72 * scale * sw/64).
function drawBowStern(ctx) {
  // bowsprit: tiang runcing yang menjorok ke depan — tanda arah instan
  ctx.fillStyle = '#3a2718';
  ctx.beginPath();
  ctx.moveTo(-2.6, -13);
  ctx.lineTo(0, -20);
  ctx.lineTo(2.6, -13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.7;
  ctx.stroke();
  // kemudi di buritan: bilah vertikal + gagang
  ctx.fillStyle = '#46301c';
  ctx.fillRect(-1.8, 13, 3.6, 7);
  ctx.fillStyle = '#2c1e12';
  ctx.fillRect(-1.8, 13, 3.6, 2);
}

// Kerusakan bertingkat + tambalan permanen. hpK = hull/maxHP (1 utuh, 0 tenggelam),
// patchK = fraksi lambung yang pernah rusak & ditambal (riwayat, tidak hilang saat sembuh).
function drawHullState(ctx, hpK, patchK) {
  const dmg = 1 - hpK;

  // ---- TAMBALAN: kayu baru lebih terang + paku. Posisi deterministik (bukan acak/frame) ----
  const spots = [[-9, -3], [7, -5], [-5, 4], [10, 1], [0, -8], [-11, 6]];
  const nPatch = Math.round(patchK * spots.length);
  for (let i = 0; i < nPatch; i++) {
    const [px, py] = spots[i];
    ctx.fillStyle = '#c49a5e';
    ctx.fillRect(px - 4, py - 2.5, 8, 5);
    ctx.strokeStyle = 'rgba(60,40,20,0.8)'; ctx.lineWidth = 0.8;
    ctx.strokeRect(px - 4, py - 2.5, 8, 5);
    ctx.fillStyle = 'rgba(40,25,12,0.9)';
    ctx.fillRect(px - 3, py - 1.5, 1.3, 1.3);
    ctx.fillRect(px + 1.8, py - 1.5, 1.3, 1.3);
    ctx.fillRect(px - 3, py + 0.3, 1.3, 1.3);
    ctx.fillRect(px + 1.8, py + 0.3, 1.3, 1.3);
  }

  // ---- RETAKAN: rusak ringan ----
  if (dmg > 0.15) {
    const cracks = dmg > 0.4 ? 3 : 2;
    ctx.strokeStyle = `rgba(18,9,5,${0.45 + dmg * 0.4})`;
    ctx.lineWidth = 1.3;
    for (let i = 0; i < cracks; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const y0 = -8 + i * 5;
      ctx.beginPath();
      ctx.moveTo(side * 8, y0);
      ctx.lineTo(side * (10 + (i % 2)), y0 + 4);
      ctx.lineTo(side * 9, y0 + 8);
      ctx.stroke();
    }
  }

  // ---- KEBOCORAN: rembesan air jatuh dari lambung ----
  if (dmg > 0.4) {
    const t = G.time;
    ctx.fillStyle = 'rgba(150,205,235,0.8)';
    for (let i = 0; i < 3; i++) {
      const x = -8 + i * 8;
      const drop = (t * 1.2 + i * 0.4) % 1;
      ctx.fillRect(x, 8 + drop * 10, 1.6, 2.5 + drop * 2);
    }
  }

  // ---- TENGGELAM: garis air naik menelan lambung ----
  if (dmg > 0.65) {
    const wl = -5 + dmg * 17;
    ctx.fillStyle = 'rgba(56,118,148,0.45)';
    ctx.fillRect(-13, wl, 26, 14 - wl);
    ctx.fillStyle = 'rgba(196,228,246,0.5)';
    ctx.fillRect(-13, wl, 26, 1.3);
  }
}

function hullLv2() {
  let n = 0;
  for (let i = 0; i < G.refit && i < REFIT.length; i++) if (REFIT[i].track === 'hull') n++;
  return n >= 2;
}

// Kolam cahaya lentera di atas air (dipakai harbor & saat bersandar).
export function drawLanternPool(ctx, x, y, radius, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 2, x, y, radius);
  g.addColorStop(0, `rgba(255,190,110,${0.30 * alpha})`);
  g.addColorStop(0.5, `rgba(255,160,80,${0.12 * alpha})`);
  g.addColorStop(1, 'rgba(255,150,60,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
}
