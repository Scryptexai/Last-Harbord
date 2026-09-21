// ============ Bangsal & ghost tile — [spec §5 + §4.1.3] ============
// Ghost tile: kotak/lingkaran bercahaya di lantai dengan ikon aksi + biaya
// sumber daya. Saat pemain BERDIRI di zona, koin & kayu berpindah per tick
// (1 koin per 0.05s — spec §5.1) dengan partikel melayang, sampai bangunan
// selesai dan kasur-kasurnya terbuka.
//
// Treatment pasien memakai kelas yang sama (ProximityTrigger) di kasur:
// herbal & gandum berpindah per tick, koin datang saat selesai.
import { ACFG } from './config.js';
import { A } from './state.js';
import { dist } from '../util.js';
import { ProximityTrigger } from './proximity.js';
import { curePatient, bedSeat } from './patients.js';
import { bumpQuest } from './quests.js';
import { sfx, haptic } from '../audio.js';
import { burst, flyItem, addFlash } from '../fx.js';
import { toastAs } from './ui.js';

const W = ACFG.WARD;
const P = ACFG.PATIENT;

export function makeBeds(w) {
  const offs = [ { x: -40, y: -2 }, { x: 0, y: -14 }, { x: 40, y: -2 } ];
  return offs.map((o, i) => ({
    id: `${w.id}-${i}`, x: w.x + o.x, y: w.y + o.y,
    patient: null, reserved: null, progress: 0, trigger: null,
  }));
}

// Trigger treatment untuk sebuah kasur (dibuat sekali, dipakai terus)
export function ensureBedTrigger(bed) {
  if (!bed.trigger) {
    bed.trigger = new ProximityTrigger(
      { x: bed.x, y: bed.y, radius: 40 },
      'herb', P.TREAT_HERB,
      () => { if (bed.patient) curePatient(bed.patient); },
      {
        extraCost: { wheat: P.TREAT_WHEAT },
        tickRate: P.TREAT_TICK,
        onTick: (pos, zone) => {
          // [spec §4.1.3] partikel melayang dari pemain ke zona
          flyItem(pos.x, pos.y - 12, { x: zone.x, y: zone.y - 8 }, 'herb');
        },
      }
    );
  }
  return bed.trigger;
}

export function buildWard(w) {
  w.built = true;
  w.trigger = null;
  w.beds = makeBeds(w);
  A.stats.wardsBuilt += 1;
  sfx('forge');
  addFlash(0.4);
  haptic([20, 40, 20, 60]);
  burst(w.x, w.y - 12, 'rgba(255,217,138,0.9)', 20, 150, 'spark', 2.4);
  toastAs(`${w.name} terbuka — ${w.beds.length} kasur baru.`);
  bumpQuest('wardsBuilt', 1);
  A.saveDirty = true;
}

// Dipanggil tiap frame oleh main.js. Hanya berjalan saat pemain BERDIRI DI
// TEMPAT (speed < 12) — sesuai bahasa "berhenti di area target", bukan
// "berjalan melewati". Keluar dari zona / mulai jalan = timer ter-reset.
export function updateTriggers(dt) {
  const d = A.doctor;
  if (!d || A.phase !== 'play') return;
  const still = d.speed < 12;

  // ---- treatment: kasur yang ada pasiennya ----
  for (const w of A.wards) {
    if (!w.built) continue;
    for (const b of w.beds) {
      if (!b.patient) {
        b.progress = 0;
        if (b.trigger) b.trigger.timer = 0;
        continue;
      }
      const t = ensureBedTrigger(b);
      if (still && dist(d.x, d.y, b.x, b.y) < 56) t.update(dt, d, A.res);
      else if (!still) t.timer = 0;
      b.progress = t.progress();
    }
  }

  // ---- build: bangsal terjauh yang belum dibangun ----
  let ghost = null, gd = Infinity;
  for (const w of A.wards) {
    if (w.built) continue;
    const dd = dist(d.x, d.y, w.x, w.y);
    if (dd < gd) { gd = dd; ghost = w; }
  }
  if (ghost) {
    if (!ghost.trigger) {
      ghost.trigger = new ProximityTrigger(
        { x: ghost.x, y: ghost.y, radius: W.RADIUS },
        'coins', W.COST_COINS,
        () => buildWard(ghost),
        {
          extraCost: { wood: W.COST_WOOD },
          tickRate: W.BUILD_TICK,   // spec: 1 koin per 0.05s
          onTick: (pos, zone) => {
            flyItem(pos.x, pos.y - 12, { x: zone.x, y: zone.y - 10 }, 'coin');
          },
        }
      );
    }
    if (still && gd < W.RADIUS + 14) ghost.trigger.update(dt, d, A.res);
    else if (!still) ghost.trigger.timer = 0;
    // onComplete (buildWard) men-noll trigger di tengah frame — baca progress
    // hanya jika masih ada.
    if (ghost.trigger) ghost.progress = ghost.trigger.progress();
  }
}
