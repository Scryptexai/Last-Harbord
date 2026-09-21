// ============ Rigging skeletal & secondary physics — [spec §3] ============
//
// Hierarki (spec §3.1) diterjemahkan ke 2.5D:
//   Root (ground) -> Hips -> ... -> Hand -> Lantern_Anchor (Damped Pendulum)
//   Cloak_Root (belakang pinggang)
//     ├── Cloak_Chain_L   (3 bone)
//     ├── Cloak_Chain_Mid (3 bone)
//     └── Cloak_Chain_R   (3 bone)
//
// Secondary motion (spec §3.2):
//   Jubah: spring-bone — Stiffness 0.35, Damping 0.45, Drag 0.20.
//     Menghasilkan kibasan kain yang TERTINGGAL saat berbelok dan melipat
//     MAJU sesaat saat berhenti mendadak (verlet + spring toward rest +
//     constraint panjang segmen).
//   Lentera: pendulum teredam dengan limit hinge ±25°, gerak ritmis
//     maju-mundur mengikuti langkah kaki.
import { ACFG } from './config.js';
import { A } from './state.js';

const R = ACFG.RIG;

export function createRig(x, y) {
  const chains = [];
  for (let c = 0; c < R.CLOAK_CHAINS; c++) {
    const pts = [];
    for (let i = 0; i < R.CLOAK_BONES; i++) {
      const px = x - 7 - i * R.CLOAK_BONE;
      pts.push({ x: px, y, px, py: y });
    }
    chains.push(pts);
  }
  return { chains, lantern: { a: 0, v: 0, seed: Math.random() * 6.28 } };
}

const _rd = { x: -1, y: 0 };

// Arah rest jubah: di belakang badan (-face), condong sedikit ke kamera (+y)
function restDir(face) {
  let rx = -Math.cos(face) * 0.72;
  let ry = -Math.sin(face) * 0.72 + 0.68;
  const l = Math.hypot(rx, ry) || 1;
  _rd.x = rx / l;
  _rd.y = ry / l;
}

export function updateRig(dt) {
  const d = A.doctor, r = A.rig;
  if (!d || !r || dt <= 0) return;

  const face = d.face;
  const fx = Math.cos(face), fy = Math.sin(face);
  const lx = fy, ly = -fx;               // kiri karakter = (fy, -fx)
  restDir(face);
  const stiffA = R.CLOAK_STIFF * 1600;   // akselerasi spring ke arah rest (px/s²)
  const drag = Math.pow(1 - R.CLOAK_DRAG, dt * 60);
  const dampVel = 1 - R.CLOAK_DAMP * Math.min(1, dt * 5);

  // Anchor: 3 titik di pinggang belakang, menyebar ke kiri-kanan
  const anchors = [
    { x: d.x - fx * 8 - lx * 5, y: d.y - fy * 8 - ly * 5 },
    { x: d.x - fx * 8,          y: d.y - fy * 8 },
    { x: d.x - fx * 8 + lx * 5, y: d.y - fy * 8 + ly * 5 },
  ];

  for (let c = 0; c < r.chains.length; c++) {
    const pts = r.chains[c];
    const an = anchors[c];
    // Verlet: kekekalan momentum kain + spring ke rest + gravitasi menuju kamera
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const vx = (p.x - p.px) * drag * dampVel;
      const vy = (p.y - p.py) * drag * dampVel;
      p.px = p.x; p.py = p.y;
      p.x += vx + _rd.x * stiffA * dt * dt;
      p.y += vy + (_rd.y * stiffA + R.CLOAK_GRAV) * dt * dt;
    }
    // Constraint panjang segmen; root terikat anchor (ikut badan)
    for (let iter = 0; iter < 3; iter++) {
      let ax = an.x, ay = an.y;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const dx = p.x - ax, dy = p.y - ay;
        const dl = Math.hypot(dx, dy) || 1;
        p.x = ax + dx / dl * R.CLOAK_BONE;
        p.y = ay + dy / dl * R.CLOAK_BONE;
        ax = p.x; ay = p.y;
      }
    }
  }

  // ---- Lentera: pendulum teredam, limit ±25°, drive ritmis dari langkah ----
  const L = r.lantern;
  const drive = d.moving ? Math.cos(d.walkT) * R.LANTERN_DRIVE * d.walkAmp : 0;
  L.v += (-(R.LANTERN_K * Math.sin(L.a)) - R.LANTERN_D * L.v + drive) * dt;
  L.a += L.v * dt;
  if (!d.moving) {
    // di Idle: goyangan angin sangat pelan, relaksasi ke tengah
    L.a += (Math.sin(A.time * 0.8 + L.seed) * 0.05 - L.a) * Math.min(1, dt * 1.5);
  }
  const lim = R.LANTERN_LIMIT;
  if (L.a > lim) { L.a = lim; if (L.v > 0) L.v = 0; }
  else if (L.a < -lim) { L.a = -lim; if (L.v < 0) L.v = 0; }
}

// Posisi lentera di ruang dunia (tangan KIRI: offset kiri * 10)
export function lanternPos(d) {
  const r = A.rig;
  const fx = Math.cos(d.face), fy = Math.sin(d.face);
  const lx = fy, ly = -fx;
  const hx = d.x + lx * 10, hy = d.y + ly * 10;
  const a = r ? r.lantern.a : 0;
  return {
    hx, hy,
    x: hx + Math.sin(a) * R.LANTERN_LEN,
    y: hy + Math.cos(a) * R.LANTERN_LEN * 0.6,
  };
}

export function chainTip(c) {
  const pts = c.chains ? c.chains[1] : c;
  return pts[pts.length - 1];
}
