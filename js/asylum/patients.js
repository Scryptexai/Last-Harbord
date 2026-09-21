// ============ Pasien — jantung core loop [spec §5] ============
//   Pasien Masuk -> Bawa Herbal/Obat -> Berdiri di Samping Kasur ->
//   Sembuhkan (treatment) -> Kumpulkan Koin -> Buka Ruangan Baru
//
// Pasien adalah elemen IDLE: mereka datang sendiri lewat gerbang utara.
// Tekanannya lembut tapi nyata: kondisi pasien menurun selama menunggu.

import { ACFG } from './config.js';
import { A } from './state.js';
import { dist } from '../util.js';
import { sfx, haptic } from '../audio.js';
import { ring } from '../fx.js';
import { bumpQuest } from './quests.js';
import { toastAs } from './ui.js';

const P = ACFG.PATIENT;
const W = ACFG.WORLD;

function wrapPi(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function queueCount() {
  return A.patients.filter((p) => p.state === 'entering' || p.state === 'queue').length;
}

export function freeBed() {
  for (const w of A.wards) {
    if (!w.built) continue;
    for (const b of w.beds) if (!b.patient && !b.reserved) return b;
  }
  return null;
}

function freeQueueSlot() {
  const used = new Set(A.patients.filter((p) => p.queueSlot >= 0).map((p) => p.queueSlot));
  for (let i = 0; i < W.QUEUE.length; i++) if (!used.has(i)) return i;
  return -1;
}

export function spawnPatient() {
  const p = {
    id: ++A.patientSeq,
    state: 'entering',        // entering | queue | toBed | bed | leaving
    x: W.GATE.x + (Math.random() * 44 - 22),
    y: W.GATE.y - 80,
    face: Math.PI / 2,
    walkT: Math.random() * 6,
    condition: 100,
    bed: null,
    queueSlot: freeQueueSlot(),
    cured: false,
    hue: 210 + Math.floor(Math.random() * 130),
  };
  A.patients.push(p);
  sfx('groan', 120 + Math.random() * 40);
  const bed = freeBed();
  if (bed) assignBed(p, bed);
  return p;
}

export function assignBed(p, bed) {
  p.bed = bed;
  p.reserved = p;
  bed.reserved = p;
  p.queueSlot = -1;
  p.state = 'toBed';
}

// Titik berdiri dokter di samping kasur (sisi timur bed)
export function bedSeat(b) { return { x: b.x + 26, y: b.y + 4 }; }

function walkToward(p, tx, ty, dt) {
  const dx = tx - p.x, dy = ty - p.y;
  const d = Math.hypot(dx, dy) || 1;
  p.x += (dx / d) * P.WALK_SPEED * dt;
  p.y += (dy / d) * P.WALK_SPEED * dt;
  p.face += wrapPi(Math.atan2(dy, dx) - p.face) * Math.min(1, dt * 8);
  p.walkT += dt * 7;
}

export function losePatient(p, why) {
  if (p.state === 'leaving') return;
  p.cured = false;
  A.stats.lost += 1;
  if (p.bed) {
    p.bed.reserved = null;
    p.bed.patient = null;
    p.bed.progress = 0;
    p.bed.trigger = null;
    p.bed = null;
  }
  p.queueSlot = -1;
  p.state = 'leaving';
  sfx('groan', 90);
  toastAs(`Seorang pasien pergi tanpa sembuh — ${why}.`, 4000);
}

// Sembuh: koin berpindah (dipanggil ProximityTrigger treatment)
export function curePatient(p) {
  const bed = p.bed;
  const reward = P.REWARD_MIN + Math.floor(Math.random() * (P.REWARD_MAX - P.REWARD_MIN + 1));
  A.res.coins += reward;
  A.stats.cured += 1;
  A.stats.coinsEarned += reward;
  p.cured = true;
  if (bed) {
    bed.reserved = null;
    bed.patient = null;
    bed.progress = 0;
    bed.trigger = null;
    p.bed = null;
  }
  p.queueSlot = -1;
  p.state = 'leaving';
  sfx('bank');
  haptic([16, 30, 40]);
  ring(p.x, p.y - 4, 'rgba(255,217,138,0.9)', 40, 0.5);
  toastAs(`Pasien sembuh · +${reward} koin`);
  bumpQuest('cured', 1);
  A.saveDirty = true;
}

export function updatePatients(dt) {
  if (A.phase === 'play') {
    A.nextPatientIn -= dt;
    if (A.nextPatientIn <= 0 && queueCount() < P.QUEUE_CAP) {
      spawnPatient();
      A.nextPatientIn = P.SPAWN_MIN + Math.random() * (P.SPAWN_MAX - P.SPAWN_MIN);
    }
  }

  for (let i = A.patients.length - 1; i >= 0; i--) {
    const p = A.patients[i];
    switch (p.state) {
      case 'entering': {
        // Kalau kasur kosong selama berjalan masuk: langsung ke kasur
        const bed = freeBed();
        if (bed) { assignBed(p, bed); break; }
        const slot = p.queueSlot >= 0 ? W.QUEUE[p.queueSlot] : W.GATE;
        if (dist(p.x, p.y, slot.x, slot.y) < 4) p.state = 'queue';
        else walkToward(p, slot.x, slot.y, dt);
        break;
      }
      case 'queue': {
        p.condition -= P.CONDITION_DRAIN * dt;
        if (p.condition <= 0) { losePatient(p, 'menunggu terlalu lama di gerbang'); break; }
        const bed = freeBed();
        if (bed) assignBed(p, bed);
        else p.walkT += dt * 0.6;   // bernapas pelan di antrean
        break;
      }
      case 'toBed': {
        if (!p.bed) { p.state = 'queue'; p.queueSlot = freeQueueSlot(); break; }
        p.condition -= P.BED_DRAIN * dt * 0.5;
        if (p.condition <= 0) { losePatient(p, 'tidak sempat tertangani'); break; }
        const seat = bedSeat(p.bed);
        if (dist(p.x, p.y, seat.x, seat.y) < 5) {
          p.state = 'bed';
          p.bed.patient = p;
          p.bed.reserved = null;
        } else walkToward(p, seat.x, seat.y, dt);
        break;
      }
      case 'bed': {
        p.condition -= P.BED_DRAIN * dt;
        if (p.condition <= 0) losePatient(p, 'sakitnya terlalu berat');
        break;
      }
      case 'leaving': {
        const gx = W.GATE.x, gy = W.GATE.y - 46;
        if (dist(p.x, p.y, gx, gy) < 6) A.patients.splice(i, 1);
        else walkToward(p, gx, gy, dt);
        break;
      }
    }
  }
}
