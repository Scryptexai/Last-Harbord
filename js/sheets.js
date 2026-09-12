// ============ Sprite sheets: karakter arah + animasi berjalan ============
// Karakter punya arah hadap 8 arah (kiri/kanan + 6 lainnya) dan siklus langkah yang
// NYATA — bukan satu potret yang digeser. Tiap karakter adalah kumpulan frame, disimpan
// sebagai  ASSETS.sheets[name] = { front:[], back:[], side:[], ne:[], se:[] }
//   front = menghadap kamera (selatan), back = membelakangi (utara),
//   side  = profil kanan (timur), ne/se = diagonal tiga-perempat.
// Barat (W), barat-laut (NW) dan barat-daya (SW) didapat dengan MENCERMINKAN
// side/ne/se — memotong beban produksi jadi 5 arah unik untuk 8 arah tampilan.
import { ASSETS } from './assets.js';

// 5 arah unik yang digambar (sisanya di-cermin)
export const SHEET_DIRS = ['front', 'back', 'side', 'ne', 'se'];

// Bulatkan vektor gerak kontinu (sudut bebas 360°) ke salah satu dari 8 arah terdekat
// (kelipatan 45°). Karakter tetap bergerak bebas; hanya ANIMASI yang "snap" ke 8 arah.
// Mengembalikan { dir, flip } — dir adalah salah satu dari 5 arah unik, flip=-1 berarti
// gambar harus dicerminkan horizontal.
// Konvensi: +x = timur/kanan, +y = selatan/bawah (menghadap kamera).
const DIR_TABLE = [
  { dir: 'side',  flip: 1 },   // 0: E
  { dir: 'se',    flip: 1 },   // 1: SE
  { dir: 'front', flip: 1 },   // 2: S
  { dir: 'se',    flip: -1 },  // 3: SW
  { dir: 'side',  flip: -1 },  // 4: W
  { dir: 'ne',    flip: -1 },  // 5: NW
  { dir: 'back',  flip: 1 },   // 6: N
  { dir: 'ne',    flip: 1 },   // 7: NE
];

export function directionOf(dx, dy, lastIdx) {
  const ang = Math.atan2(dy, dx);
  let idx = Math.round(ang / (Math.PI / 4)) % 8;
  if (idx < 0) idx += 8;
  // HISTERESIS arah: sudut kontinu yang jitter di sekitar batas 45° (mis. zombie yang
  // mengejar sambil berputar) tidak boleh membuat sprite "berkedip" berganti-ganti
  // arah setiap frame. Tahan sektor terakhir sampai sudut benar-benar masuk ke sektor
  // sebelah (~9° melewati batas). Tanpa argumen lastIdx, perilaku = pembulatan murni.
  if (lastIdx !== undefined && lastIdx !== null) {
    const sector = ((ang / (Math.PI / 4)) % 8 + 8) % 8;   // posisi kontinu 0..8
    let rel = sector - lastIdx;
    while (rel > 4) rel -= 8;
    while (rel <= -4) rel += 8;
    if (Math.abs(rel) < 0.7) idx = lastIdx;
  }
  return { ...DIR_TABLE[idx], idx };
}

// Pilih frame yang benar untuk sebuah karakter berdasarkan vektor gerak.
//   dx, dy  : arah gerak (kontinu); menentukan hadap + cermin (dibulatkan ke 8 arah)
//   walkT   : fase langkah (bertambah seiring jarak tempuh)
//   moving  : true = siklus langkah, false = pose diam
//   lastIdx : sektor arah sebelumnya (0..7) untuk histeresis — mencegah kedipan di
//             sekitar batas 45°. Boleh kosong.
// Mengembalikan { img, flip, idx } atau null bila sheet belum termuat.
export function sheetFrame(name, dx, dy, walkT, moving, lastIdx) {
  const s = ASSETS.sheets && ASSETS.sheets[name];
  if (!s) return null;
  const d = directionOf(dx, dy, lastIdx);
  const frames = s[d.dir];
  if (!frames || !frames.length) return null;
  let idx = 0;
  if (moving && frames.length > 1) {
    const n = frames.length - 1;                 // jumlah frame jalan
    const cycle = (walkT / (Math.PI * 2)) % 1;
    idx = 1 + (Math.floor(cycle * n) % n + n) % n;
  }
  return { img: frames[idx], flip: d.flip, idx: d.idx };
}

// Gambar sprite karakter dengan rim-light tipis. Frame karakter adalah line-art
// desaturasi (gelap, garis tipis); di atas latar gelap ia bisa "hilang". Cahaya tepi
// yang lembut membuat siluetnya tetap terbaca tanpa mengubah gaya seninya.
export function drawCharSprite(ctx, img, sz, rim = true) {
  if (rim) {
    ctx.save();
    ctx.shadowColor = 'rgba(236,230,216,0.42)';
    ctx.shadowBlur = 4;
    // dua kali untuk menebalkan halo tipis
    ctx.drawImage(img, -sz / 2, -sz * 0.92, sz, sz);
    ctx.drawImage(img, -sz / 2, -sz * 0.92, sz, sz);
    ctx.restore();
  }
  ctx.drawImage(img, -sz / 2, -sz * 0.92, sz, sz);
}
