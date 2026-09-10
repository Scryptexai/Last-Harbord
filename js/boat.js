// ============ Perahu ============
import { CFG } from './config.js';
import { G } from './state.js';
import { ASSETS } from './assets.js';

export function maxHP() {
  return CFG.BOAT.BASE_HP + G.upgrades.defense * 20; // 100 + 20/level
}

export function speedMult() {
  return CFG.BOAT.BASE_SPEED * (1 + G.upgrades.speed * 0.2); // +20% per level
}

export function boatLevel() {
  return 1 + G.upgrades.storage + G.upgrades.speed + G.upgrades.defense;
}

export function createBoat(x = 0, y = 0) {
  return { x, y, vx: 0, vy: 0, angle: -Math.PI / 2 };
}

// Gerak dengan inertia: akselerasi dari input, drag membuat melambat bertahap.
export function updateBoat(dt, move) {
  const b = G.boat;
  if (!b) return;

  if (G.anchored || G.fishing) {
    // jangkar / memancing: perahu cepat berhenti
    const stop = Math.pow(0.82, dt * 60);
    b.vx *= stop; b.vy *= stop;
  } else {
    const a = CFG.BOAT.ACCEL * speedMult();
    b.vx += (move.x || 0) * a * dt;
    b.vy += (move.y || 0) * a * dt;
  }

  const max = CFG.BOAT.MAX_SPEED * speedMult();
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > max) { b.vx = b.vx / sp * max; b.vy = b.vy / sp * max; }

  const drag = Math.pow(CFG.BOAT.DRAG, dt * 60); // deceleration inertia
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

// Visual perahu: render Sprite aset (Lv1 / Lv2 / Lv3) sesuai total upgrade level
export function drawBoat(ctx, boat, scale = 1) {
  const lv = boatLevel();
  let sprite = ASSETS.boat_lv1;
  let sw = 64, sh = 64;

  if (lv >= 4) {
    sprite = ASSETS.boat_lv3 || ASSETS.boat_lv2 || ASSETS.boat_lv1;
    sw = 96; sh = 96;
  } else if (lv >= 2) {
    sprite = ASSETS.boat_lv2 || ASSETS.boat_lv1;
    sw = 80; sh = 80;
  }

  ctx.save();
  ctx.translate(boat.x, boat.y);
  ctx.rotate(boat.angle + Math.PI / 2); // sprite faces UP (North)

  // Wake effect di belakang saat bergerak
  const sp = Math.hypot(boat.vx || 0, boat.vy || 0);
  if (sp > 15) {
    ctx.fillStyle = 'rgba(127, 212, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(-10 * scale, (sh * 0.38) * scale);
    ctx.lineTo(0, (sh * 0.38 + 18 + Math.min(20, sp * 0.1)) * scale);
    ctx.lineTo(10 * scale, (sh * 0.38) * scale);
    ctx.closePath();
    ctx.fill();
  }

  if (sprite && sprite.complete && sprite.naturalWidth > 0) {
    const dw = sw * 0.75 * scale;
    const dh = sh * 0.75 * scale;
    ctx.drawImage(sprite, -dw / 2, -dh / 2, dw, dh);
  } else {
    // Fallback vector drawing
    const w = (34 + G.upgrades.storage * 7 + G.upgrades.defense * 3) * scale;
    const h = (18 + G.upgrades.storage * 3 + G.upgrades.speed * 1.5) * scale;
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#2f74b8';
    ctx.strokeStyle = '#12365e';
    ctx.lineWidth = 2 * scale;
    roundRectPath(ctx, -w / 2, -h / 2, w, h, 6 * scale);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}
