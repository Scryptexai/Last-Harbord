// ============ Kamera Last Asylum — [spec §1] Steep Perspective Rig ============
//
// Spesifikasi: Perspective Projection, FOV 28°–32° (telephoto / narrow angle),
// rotasi Pitch 58° (rentang aman 55–60°), Yaw 0, Roll 0, offset (0, 15, -9.3),
// dan Damped Spring + Forward Look-Ahead (smoothTime 0.18, factor 1.2).
//
// Terjemahan ke proyeksi 2.5D repo (kontrak yang sama dengan js/camera.js):
//   offset (0, 15, -9.3)  -> sudut pandang atan2(15, 9.3) = 58.2°  =>  TILT = cos(58°)
//   FOV sempit (telephoto, meminimalkan edge distortion) => skala kedalaman NARROW
//   offset -Z (belakang target)  => pemain duduk di bawah-tengah (LIFT)
// Semua logika permainan tetap di ruang dunia datar; yang berubah hanya
// cara dunia diproyeksikan — pola yang sama dengan Driftholm.
import { ACFG } from './config.js';
import { A } from './state.js';
import { clamp } from '../util.js';

// Port dari Unity Vector3.SmoothDamp (versi skalar) — damped spring dengan
// guard overshoot: kalau output melompati target, snap kembali ke target.
// Ini inti "karena tidak mengunci kaku" dari spec §1.2.
export function smoothDamp(cur, target, vel, smoothTime, maxSpeed, dt) {
  if (!(dt > 0)) return cur;
  smoothTime = Math.max(1e-4, smoothTime);
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  let change = cur - target;
  const originalTo = target;
  const maxChange = maxSpeed * smoothTime;
  change = clamp(change, -maxChange, maxChange);
  target = cur - change;
  const temp = (vel.v + omega * change) * dt;
  vel.v = (vel.v - omega * temp) * exp;
  let output = target + (change + temp) * exp;
  if ((originalTo - cur) * (originalTo - cur) < (originalTo - output) * (originalTo - output)) {
    output = originalTo;
    vel.v = (output - cur) / dt;
  }
  return output;
}

// Algoritma pergerakan kamera (spec §1.2):
//   targetPosition = target.position + offset + velocity * lookAheadFactor
//   offset (0,15,-9.3) sudah "dimasak" ke TILT/LIFT proyeksi, jadi di ruang
//   dunia datar yang tersisa adalah velocity * 1.2 (forward look-ahead).
export function camUpdate(dt) {
  const C = ACFG.CAM;
  const d = A.doctor;
  const px = d ? d.x : A.cam.x;
  const py = d ? d.y : A.cam.y;
  const tx = px + (d ? d.vx : 0) * C.LOOK_AHEAD;
  const ty = py + (d ? d.vy : 0) * C.LOOK_AHEAD;
  A.cam.x = smoothDamp(A.cam.x, tx, A.cam.vx, C.SMOOTH_TIME, C.MAX_SPEED, dt);
  A.cam.y = smoothDamp(A.cam.y, ty, A.cam.vy, C.SMOOTH_TIME, C.MAX_SPEED, dt);
}

// ---------- proyeksi (kontrak sama dengan js/camera.js Driftholm) ----------

// Titik jangkar kamera: sedikit di atas tengah (LIFT) — pemain di bawah-tengah,
// sehingga area navigasi di depan pemain (utara) lebih banyak yang terlihat.
export function aAnchorY(vh) { return vh / 2 + ACFG.CAM.LIFT * vh; }

export function aBeginWorld(ctx, vw, vh) {
  const z = A.zoom || 1;
  ctx.save();
  ctx.translate(vw / 2, aAnchorY(vh));
  ctx.scale(z, z * ACFG.CAM.TILT);
  ctx.translate(-A.cam.x, -A.cam.y);
  return ctx;
}

export function aEndWorld(ctx) { ctx.restore(); }

export function aToScreen(wx, wy, vw, vh) {
  const z = A.zoom || 1;
  return {
    x: vw / 2 + (wx - A.cam.x) * z,
    y: aAnchorY(vh) + (wy - A.cam.y) * z * ACFG.CAM.TILT,
  };
}

// Kedalaman: makin dekat kamera (y besar) makin besar — telephoto => range sempit
export function aDepthAt(wy) {
  const d = (wy - A.cam.y) * (A.zoom || 1);
  return clamp(1 + d * ACFG.CAM.PERSP, ACFG.CAM.PERSP_MIN, ACFG.CAM.PERSP_MAX);
}

// Benda yang BERDIRI (doktor, pasien, bed, properti) lewat jalur ini supaya
// tegak dan tidak tergencet kemiringan tanah.
export function aAtUpright(ctx, wx, wy, fn) {
  const p = aDepthAt(wy);
  ctx.save();
  ctx.translate(wx, wy);
  ctx.scale(p, p / ACFG.CAM.TILT);
  fn(p);
  ctx.restore();
  return p;
}

// Berapa banyak dunia yang terlihat di layar (culling + test framing)
export function aVisibleRect(vw, vh) {
  const z = A.zoom || 1;
  const halfH = (vh / 2) / (z * ACFG.CAM.TILT);
  const halfW = (vw / 2) / z;
  const cy = A.cam.y - ACFG.CAM.LIFT * vh / (z * ACFG.CAM.TILT);
  return { x0: A.cam.x - halfW, x1: A.cam.x + halfW, y0: cy - halfH, y1: cy + halfH };
}
