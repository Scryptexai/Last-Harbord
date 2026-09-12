// ============ Sprite sheets: karakter arah + animasi berjalan ============
// Karakter sekarang punya arah hadap (atas/bawah/samping) dan siklus langkah yang
// NYATA — bukan satu potret yang digeser. Setiap karakter adalah kumpulan frame
// (diproduksi dari sheet 3x3 / 3x5 yang di-slice), disimpan sebagai
//   ASSETS.sheets[name] = { up: [img,...], down: [img,...], side: [img,...] }
// Frame 0 = diam, frame 1..n = siklus langkah. Arah 'side' menghadap kanan dan
// di-cermin untuk gerakan ke kiri.
import { ASSETS } from './assets.js';

export const SHEET_DIRS = ['up', 'down', 'side'];

// Banyak frame per arah (harus cocok dengan assets/characters/manifest.json)
export const SHEET_SPEC = {
  player: 3, zombie_slow: 3, zombie_fast: 5, zombie_tank: 5,
};

// Pilih frame yang benar untuk sebuah karakter berdasarkan vektor gerak.
//   dx, dy      : arah gerak (px/s); menentukan hadap + cermin
//   walkT       : fase langkah (bertambah seiring jarak)
//   moving      : true = siklus langkah, false = pose diam
// Mengembalikan { img, flip } atau null bila sheet belum termuat.
export function sheetFrame(name, dx, dy, walkT, moving) {
  const s = ASSETS.sheets && ASSETS.sheets[name];
  if (!s) return null;
  const absX = Math.abs(dx), absY = Math.abs(dy);
  let dir, flip = 1;
  if (absY > absX * 1.15) dir = dy > 0 ? 'down' : 'up';
  else dir = 'side';
  if (dir === 'side') flip = dx >= 0 ? 1 : -1;
  const frames = s[dir];
  if (!frames || !frames.length) return null;
  let idx = 0;
  if (moving && frames.length > 1) {
    const n = frames.length - 1;                 // jumlah frame jalan
    const cycle = (walkT / (Math.PI * 2)) % 1;
    idx = 1 + (Math.floor(cycle * n) % n + n) % n;
  }
  return { img: frames[idx], flip };
}
