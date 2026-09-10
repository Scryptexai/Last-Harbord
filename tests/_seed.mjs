// Disuntik paling awal: beberapa modul memakai Math.random saat pertama diimpor, dan
// kalau itu terjadi sebelum harness menanam RNG-nya, hasil pengukuran berubah tiap jalan.
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
globalThis.__rng = (s) => { Math.random = mulberry32(s); };
globalThis.__rng(0xC0FFEE);
