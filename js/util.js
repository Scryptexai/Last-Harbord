// ============ Util kecil ============

// PRNG deterministic — dipakai untuk dunia & bentuk pulau yang konsisten.
export function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function clamp(v, a, b) {
  return v < a ? a : (v > b ? b : v);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Pendekatan frame-rate independent: x menuju target dengan laju `rate` per detik.
export function approach(cur, target, rate, dt) {
  const k = 1 - Math.pow(1 - clamp(rate, 0, 1), dt * 60);
  return cur + (target - cur) * k;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

export function fmtMeters(px) {
  return Math.round(px / 10) + ' m';
}

// Warna: campur dua hex.
export function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, t));
  const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t));
  const bl = Math.round(lerp(pa & 255, pb & 255, t));
  return `rgb(${r},${g},${bl})`;
}
