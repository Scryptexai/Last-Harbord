// ============ Dokter Wabah: pergerakan & rotasi — [spec §2] ============
//
// Masalah utama purwarupa: karakter berputar instan (snapping). Di sini:
//   §2.1 Dynamic Steering & Angular Clamping
//     - Max Turn Rate 720°/s (12.566 rad/s): badan memutar BERTAHAP ke arah input
//     - Turning Penalty: jika sudut putar > 90° (putar balik mendadak), kecepatan
//       linier dipotong ke 60% selama belokan, lalu akselerasi kembali ke 100%
//   §2.2 Locomotion & Anti-Foot Sliding (Stride Lock)
//     - AnimSpeedMultiplier = CurrentMoveSpeed / BaseWalkSpeed
//     - Akselerasi 0.10s, deselerasi 0.15s (satu langkah kecil penutup sebelum Idle)
import { ACFG } from './config.js';
import { A } from './state.js';
import { clamp } from '../util.js';

const D = ACFG.DOCTOR;

export function createDoctor(x, y) {
  return {
    x, y,
    vx: 0, vy: 0,             // kecepatan aktual (dipakai look-ahead kamera & fx)
    face: Math.PI / 2,        // 0 = +x (timur); π/2 = +y (selatan, ke kamera)
    velAngle: Math.PI / 2,    // arah vektor gerak (inersia arah)
    speed: 0,                 // magnitud (px/s)
    moving: false,
    turning: false,           // Turning Penalty aktif (Δface > 90°)
    walkT: 0,                 // fase langkah (radian)
    walkAmp: 0,               // 0..1 — 1 = sedang berjalan (fade untuk Idle)
    stepEvent: 0,             // 1 saat satu penapakan kaki (dikonsumsi main.js)
    strideMul: 0,             // AnimSpeedMultiplier (spec §2.2)
  };
}

function wrapPi(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function updateDoctor(dt, move) {
  const d = A.doctor;
  if (!d || dt <= 0) return;
  const inMag = Math.hypot(move.x, move.y);
  const hasIn = inMag > 0.01;

  // ---- Dynamic steering (spec §2.1): rotasi bertahap, max 720°/s ----
  if (hasIn) {
    const target = Math.atan2(move.y, move.x);
    const diff = wrapPi(target - d.face);
    d.turning = Math.abs(diff) > D.TURN_PENALTY_AT;
    d.face += clamp(diff, -D.MAX_TURN * dt, D.MAX_TURN * dt);
    // Arah vektor gerak mengikuti input dengan clamp yang sama (inersia arah):
    // belokan tajam membuat lintasan melengkung, bukan berbelok patah.
    d.velAngle += clamp(wrapPi(target - d.velAngle), -D.MAX_TURN * dt, D.MAX_TURN * dt);
  } else {
    d.turning = false;
  }

  // ---- Kecepatan: akselerasi/deselerasi LINIER + Turning Penalty ----
  const penalty = d.turning ? D.TURN_PENALTY : 1;
  const targetSpeed = hasIn ? D.SPEED * Math.min(1, inMag) * penalty : 0;
  const rate = hasIn ? D.SPEED / D.ACCEL_T : D.SPEED / D.DECEL_T;
  d.speed = targetSpeed > d.speed
    ? Math.min(targetSpeed, d.speed + rate * dt)   // 0 -> Max dalam 0.10s
    : Math.max(targetSpeed, d.speed - rate * dt);  // Max -> 0 dalam 0.15s

  // ---- Posisi ----
  if (d.speed > 0.001) {
    d.x += Math.cos(d.velAngle) * d.speed * dt;
    d.y += Math.sin(d.velAngle) * d.speed * dt;
  }
  d.vx = Math.cos(d.velAngle) * d.speed;
  d.vy = Math.sin(d.velAngle) * d.speed;
  d.moving = d.speed > 4;

  // ---- Siklus langkah tersinkron kecepatan (spec §2.2) ----
  // AnimSpeedMultiplier = CurrentMoveSpeed / BaseWalkSpeed
  d.strideMul = d.speed / D.SPEED;
  if (d.speed > 1) {
    const prev = d.walkT;
    d.walkT += (d.speed / D.STRIDE_PX) * Math.PI * 2 * dt;
    if (Math.floor(d.walkT / Math.PI) !== Math.floor(prev / Math.PI)) d.stepEvent = 1;
  }
  // Fade amplitude: saat deselerasi, langkah terakhir selesai pelan sebelum Idle
  d.walkAmp = clamp(d.walkAmp + ((d.moving ? 1 : 0) - d.walkAmp) * Math.min(1, dt * 7), 0, 1);

  // Batas pelataran
  const B = ACFG.WORLD.BOUNDS;
  d.x = clamp(d.x, B.x0 + 14, B.x1 - 14);
  d.y = clamp(d.y, B.y0 + 14, B.y1 - 14);
}
