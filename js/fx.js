// ============ FX: partikel, guncangan, hit-stop, indikator arah ============
// Aturan: setiap aksi penting harus punya jawaban yang terlihat. Tidak ada toast
// untuk hal yang seharusnya terasa.
import { CFG } from './config.js';
import { clamp, lerp } from './util.js';

let fxTime = 0;                    // akumulator waktu (fx tidak mengimpor state game)
export function fxClock() { return fxTime; }

export const fx = {
  shake: 0,          // trauma 0..1
  hitstop: 0,        // detik; waktu hampir berhenti
  parts: [],         // partikel dunia
  arcs: [],          // indikator arah serangan (layar)
  flash: 0,          // kilatan layar (upgrade / bank) 0..1
  vignette: 0,       // gelap di tepi layar saat lambung kritis
  splashSlow: 0,
};

const MAX_PARTS = 260;

export function addShake(a) {
  fx.shake = clamp(fx.shake + a, 0, 1);
}

export function addHitstop(t) {
  fx.hitstop = Math.max(fx.hitstop, t);
}

// Indikator dari arah mana serangan datang (menggantikan kotak merah layar penuh).
export function addHurtDir(angle, strength = 1) {
  fx.arcs.push({ angle, t: 0, dur: 0.6, strength: clamp(strength, 0.3, 1) });
  if (fx.arcs.length > 4) fx.arcs.shift();
}

export function addFlash(a) {
  fx.flash = clamp(fx.flash + a, 0, 1);
}

export function burst(x, y, color, n = 8, spread = 130, kind = 'spark', size = 3) {
  for (let i = 0; i < n; i++) {
    if (fx.parts.length > MAX_PARTS) break;
    const a = Math.random() * Math.PI * 2;
    const s = spread * (0.35 + Math.random());
    fx.parts.push({
      kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (kind === 'splash' ? 40 : 0),
      life: 0, dur: 0.28 + Math.random() * 0.32, color, size: size * (0.6 + Math.random() * 0.8),
      drag: kind === 'spark' ? 0.86 : 0.92,
    });
  }
}

export function splash(x, y, n = 10) {
  burst(x, y, '#9fd8ff', n, 90, 'splash', 2.4);
}

// Item yang terbang ke pemain — pengganti "walking into icons".
export function flyItem(x, y, target, type) {
  if (fx.parts.length > MAX_PARTS) fx.parts.shift();
  fx.parts.push({ kind: 'item', x, y, vx: 0, vy: 0, life: 0, dur: 0.42, type, target, size: 15, drag: 1 });
}

// CAMAR TERBANG — jam yang bisa dilihat.
// Saat pasang berbalik, burung-burung meninggalkan pulau menuju utara. Tidak ada
// teks, tidak ada ikon: hanya langit yang tiba-tiba kosong. Pemain yang jeli akan
// belajar bahwa itu berarti "waktumu tinggal satu napas lagi".
export function flushGulls(x, y, n = 8) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 30 + Math.random() * 140;
    fx.parts.push({
      kind: 'gull',
      x: x + Math.cos(a) * d,
      y: y + Math.sin(a) * d * 0.6,
      vx: (Math.random() - 0.5) * 70,
      vy: -(150 + Math.random() * 110),   // terbang ke arah pedalaman/utara, menjauh
      life: 0, dur: 2.6 + Math.random() * 1.8, color: 'rgba(238,244,252,0.95)',
      size: 3 + Math.random() * 2, drag: 0.995, flap: Math.random() * 6.28,
    });
  }
  if (fx.parts.length > MAX_PARTS) fx.parts.splice(0, fx.parts.length - MAX_PARTS);
}

export function ring(x, y, color, size = 34, dur = 0.4) {
  fx.parts.push({ kind: 'ring', x, y, life: 0, dur, color, size, drag: 1 });
}

export function updateFx(dt) {
  fxTime += dt;
  fx.shake = Math.max(0, fx.shake - dt * 1.8);
  fx.hitstop = Math.max(0, fx.hitstop - dt);
  fx.flash = Math.max(0, fx.flash - dt * 2.2);
  fx.vignette = lerp(fx.vignette, fx.vignetteTarget || 0, Math.min(1, dt * 3));
  for (let i = fx.arcs.length - 1; i >= 0; i--) {
    fx.arcs[i].t += dt;
    if (fx.arcs[i].t >= fx.arcs[i].dur) fx.arcs.splice(i, 1);
  }
  for (let i = fx.parts.length - 1; i >= 0; i--) {
    const p = fx.parts[i];
    p.life += dt;
    if (p.life >= p.dur) { fx.parts.splice(i, 1); continue; }
    if (p.kind === 'item' && p.target) {
      const k = p.life / p.dur;
      const tx = p.target.x, ty = p.target.y;
      p.x = lerp(p.x, tx, Math.min(1, dt * 4 + k * 0.16));
      p.y = lerp(p.y, ty, Math.min(1, dt * 4 + k * 0.16));
    } else if (p.kind === 'ring') {
      // diam, hanya membesar
    } else {
      p.x += p.vx * dt; p.y += p.vy * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d; p.vy *= d;
      if (p.kind === 'splash') p.vy += 120 * dt;
    }
  }
}

// Skala waktu: hit-stop membuat pukulan terasa berbobot.
export function timeScale() {
  return fx.hitstop > 0 ? 0.06 : 1;
}

export function shakeOffset() {
  const t = fx.shake * fx.shake;
  const m = 9 * t;
  return { x: (Math.random() * 2 - 1) * m, y: (Math.random() * 2 - 1) * m };
}

// ---------- menggambar ----------
export function drawFxWorld(ctx, drawIcon) {
  for (const p of fx.parts) {
    const k = p.life / p.dur;
    if (p.kind === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.lineWidth = 3 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + k), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (p.kind === 'gull') {
      // Burung: dua goresan yang mengepak. Digambar rata di bidang dunia (bukan benda
      // berdiri) — di kamera miring, burung yang terbang jauh memang terlihat pipih.
      const flap = Math.sin(fxTime * 9 + p.flap) * 3;
      ctx.globalAlpha = Math.max(0, Math.min(1, (p.life / p.dur) * 3)) * 0.9;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(p.x - p.size - 1, p.y + flap);
      ctx.lineTo(p.x, p.y);
      ctx.lineTo(p.x + p.size + 1, p.y + flap);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (p.kind === 'item') {
      const a = 1 - k * k;
      ctx.globalAlpha = a;
      if (drawIcon) drawIcon(ctx, p.type, p.x, p.y - Math.sin(k * Math.PI) * 14, p.size);
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = Math.max(0, 1 - k);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - k * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

// Indikator arah: busur di tepi layar, bukan kotak merah penuh.
export function drawFxScreen(ctx, vw, vh, camAngle = 0) {
  const cx = vw / 2, cy = vh / 2;
  for (const a of fx.arcs) {
    const k = a.t / a.dur;
    const alpha = (1 - k) * 0.85 * a.strength;
    const rad = Math.min(vw, vh) * (0.34 + k * 0.1);
    const ang = a.angle - camAngle - Math.PI / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    const grad = ctx.createLinearGradient(0, -rad, 0, -rad + 90);
    grad.addColorStop(0, 'rgba(255,60,50,0)');
    grad.addColorStop(1, `rgba(255,60,50,${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(-140, -rad, 280, 90);
    ctx.restore();
  }

  if (fx.vignette > 0.01) {
    const g = ctx.createRadialGradient(cx, cy, Math.min(vw, vh) * 0.28, cx, cy, Math.max(vw, vh) * 0.62);
    g.addColorStop(0, 'rgba(120,0,0,0)');
    g.addColorStop(1, `rgba(120,0,0,${fx.vignette * 0.55})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);
  }

  if (fx.flash > 0.01) {
    ctx.fillStyle = `rgba(255,225,160,${fx.flash * 0.35})`;
    ctx.fillRect(0, 0, vw, vh);
  }
}

export function resetFx() {
  fx.parts.length = 0;
  fx.arcs.length = 0;
  fx.shake = 0;
  fx.hitstop = 0;
  fx.flash = 0;
  fx.vignette = 0;
  fx.vignetteTarget = 0;
}
