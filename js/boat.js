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

  if (!opts.noParts) {
    // bagian refit digambar di bawah sprite supaya tetap di dek
  }

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
    ctx.scale(scale * (sw / 64) * 0.72, scale * (sw / 64) * 0.72);
    for (let i = 0; i < G.refit && i < REFIT.length; i++) drawRungPart(ctx, i, 0);
    // kerusakan lambung terlihat: garis patah saat hull rendah
    const hpK = G.hull / maxHP();
    if (hpK < 0.6) {
      ctx.strokeStyle = `rgba(20,10,6,${(1 - hpK) * 0.8})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-6, -2); ctx.lineTo(-1, 3); ctx.lineTo(-5, 8);
      ctx.moveTo(5, -6); ctx.lineTo(9, -1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // lentera: cahaya hangat — simbol emosional kapal
  const lanternR = (9 + (hullLv2() ? 4 : 0)) * scale;
  const flick = 0.86 + Math.sin(G.time * 7) * 0.06 + Math.sin(G.time * 13.3) * 0.04;
  const lg = ctx.createRadialGradient(0, 0, 1, 0, 0, lanternR * flick);
  lg.addColorStop(0, 'rgba(255,196,110,0.85)');
  lg.addColorStop(0.35, 'rgba(255,170,80,0.30)');
  lg.addColorStop(1, 'rgba(255,150,60,0)');
  ctx.fillStyle = lg;
  ctx.beginPath(); ctx.arc(0, 0, lanternR * flick, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd79a';
  ctx.beginPath(); ctx.arc(0, (6 * sw / 64) * 0.72, 1.9 * scale, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
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
