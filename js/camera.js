// ============ Kamera: proyeksi miring 3/4 (bukan tampak atas) ============
// Kamera game ini BUKAN pandangan dari langit. Ia duduk di belakang dan sedikit
// di atas bahu pemain, menghadap ke utara pulau. Konsekuensinya bukan kosmetik:
//
//   1. ATAS LAYAR = jauh / pedalaman / bahaya.  BAWAH LAYAR = dekat / pantai / pulau.
//      "Pulang" secara harfiah berarti berjalan TURUN di layar, menuju cahaya.
//   2. Benda punya tinggi: pohon, zombie, dan pemain berdiri tegak, bukan pipih.
//   3. Yang lebih dekat tampak lebih besar dan menutupi yang jauh.
//
// Semua logika permainan tetap di ruang dunia 2D yang datar (tabrakan, jarak,
// jangkauan tidak berubah sama sekali). Yang berubah hanya cara dunia diproyeksikan
// ke layar. Ini menjaga seluruh test logika tetap sahih.
import { CFG } from './config.js';
import { G } from './state.js';
import { clamp } from './util.js';

export function camZoom() { return G.cam.zoom || 1; }

// Titik jangkar kamera di layar: sedikit di ATAS tengah, sehingga pemain duduk di
// bawah-tengah dan pemain melihat lebih banyak dunia di depannya daripada di belakangnya.
export function anchorY(vh) {
  return vh / 2 + (CFG.CAM.LIFT || 0) * vh;
}

// Masuk ke ruang dunia yang sudah dimiringkan.
// (wx, wy) -> (vw/2 + (wx-cam.x)*z , anchorY + (wy-cam.y)*z*TILT)
// rot = sudut sweep kamera (dipakai saat mendarat: kamera berputar lalu lurus).
export function beginWorld(ctx, vw, vh) {
  const z = camZoom();
  ctx.save();
  ctx.translate(vw / 2, anchorY(vh));
  ctx.scale(z, z * CFG.CAM.TILT);
  if (G.cam.rot) ctx.rotate(G.cam.rot);
  ctx.translate(-G.cam.x, -G.cam.y);
  return ctx;
}

export function endWorld(ctx) { ctx.restore(); }

// Untuk hal-hal yang hidup di ruang layar: penunjuk arah, kabut, gradien.
export function toScreen(wx, wy, vw, vh) {
  const z = camZoom();
  return {
    x: vw / 2 + (wx - G.cam.x) * z,
    y: anchorY(vh) + (wy - G.cam.y) * z * CFG.CAM.TILT,
  };
}

// Kedalaman: makin dekat ke kamera (makin ke bawah layar) makin besar.
// Ini yang memberi "kedalaman" pada proyeksi miring — bukan sekadar gambar gepeng.
export function depthAt(wy) {
  const d = (wy - G.cam.y) * camZoom();
  return clamp(1 + d * CFG.CAM.PERSP, CFG.CAM.PERSP_MIN, CFG.CAM.PERSP_MAX);
}

// Benda yang BERDIRI (pemain, zombie, pohon, kapal, peti) digambar lewat ini.
// Transformasi lokal menjadi seragam (x dan y berskala sama), jadi rotasi tetap benar
// dan sprite berdiri tegak — tingginya tidak ikut tergencet oleh kemiringan tanah.
//
// PENTING: pakai atUpright(). upright() sengaja TIDAK menyeimbangkan save/restore,
// jadi memanggilnya dua kali tanpa restore akan menumpuk transformasi (bug nyata yang
// pernah terjadi dan ditangkap tests/camera.test.mjs).
export function upright(ctx, wx, wy) {
  const p = depthAt(wy);
  ctx.translate(wx, wy);
  ctx.scale(p, p / CFG.CAM.TILT);
  return p;
}

// Cara aman: atUpright(ctx, wx, wy, (scale) => { ...gambar di titik itu... })
export function atUpright(ctx, wx, wy, fn) {
  ctx.save();
  const p = upright(ctx, wx, wy);
  fn(p);
  ctx.restore();
  return p;
}

// Urutan gambar: yang paling utara (y kecil) dulu, yang paling dekat kamera terakhir.
export function byDepth(a, b) { return a.y - b.y; }
export function sortDepth(list) { return list.sort(byDepth); }

// Berapa banyak dunia yang terlihat di layar (dipakai untuk culling & test framing).
export function visibleWorldRect(vw, vh) {
  const z = camZoom();
  const halfH = (vh / 2) / (z * CFG.CAM.TILT);
  const halfW = (vw / 2) / z;
  const cy = G.cam.y - (CFG.CAM.LIFT || 0) * vh / (z * CFG.CAM.TILT);
  return { x0: G.cam.x - halfW, x1: G.cam.x + halfW, y0: cy - halfH, y1: cy + halfH };
}
