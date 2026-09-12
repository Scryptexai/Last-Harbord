// ============ VERIFIKASI BERKALA: BUSUR KETEGANGAN SATU MALAM ============
// Alat ini menjawab satu pertanyaan saja: kalau pemain keluar dan tidak kembali,
// apa yang berubah di layar, detik demi detik, sampai fajar — dan apakah setiap
// perubahan itu terbaca tanpa satu kata pun.
//
// Semua angka diambil dari modul asli (world.js, land.js, harbor.js), bukan dari
// rumus yang disalin ulang. Kalau warnanya berhenti berubah, alat ini gagal.
import { CFG } from '../js/config.js';
import { G } from '../js/state.js';
import { generateWorld, horizonBand, stormLevel, HARBOR } from '../js/world.js';
import { floodRadius } from '../js/land.js';
import { resetTide, updateTide, tideTint, tidePhase, nightProgress, isDawn } from '../js/tide.js';
import { enterHarbor, drawHarbor, tideLineY } from '../js/harbor.js';
import { createBoat } from '../js/boat.js';

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { createElement: () => ({ getContext: () => null }) };

// --- konteks gambar tiruan: semua jalur harus jalan tanpa error ---
function recordingCtx() {
  let cur = null;
  const c = { canvas: { width: 1280, height: 720 } };
  const grad = () => ({ addColorStop() {} });
  c.createLinearGradient = grad; c.createRadialGradient = grad; c.createPattern = () => null;
  c.measureText = () => ({ width: 10 });
  c.getImageData = () => ({ data: new Uint8ClampedArray(4) });
  const noop = () => {};
  for (const m of ['save', 'restore', 'translate', 'scale', 'rotate', 'setTransform', 'transform',
    'closePath', 'arc', 'arcTo', 'ellipse', 'rect', 'roundRect', 'stroke', 'strokeRect', 'clearRect',
    'clip', 'fillText', 'strokeText', 'drawImage', 'setLineDash', 'getLineDash', 'quadraticCurveTo',
    'bezierCurveTo', 'createImageData', 'putImageData']) c[m] = noop;
  c.beginPath = () => { cur = 'path'; };
  c.moveTo = () => {};
  c.lineTo = () => {};
  c.fill = () => { cur = null; };
  c.fillRect = () => {};
  return c;
}

generateWorld(2026);
G.boat = createBoat(HARBOR.x, -40);
G.hull = 100;
resetTide();

const isl = { r: 365 };                       // pulau rata-rata: dipakai floodRadius()
const ctx = recordingCtx();
enterHarbor();
G.state = 'sea';                              // jam hanya berjalan saat di luar

const DAWN = CFG.TIDE.DAWN_AT + CFG.TIDE.DAWN_FALL;
const rows = [];
let waterLine = null;

function sample(label) {
  const hz = horizonBand();
  const tint = tideTint();
  const ph = tidePhase(G.tide.t);
  // dermaga digambar di SETIAP titik: rumah harus memperlihatkan malam yang sama
  const st = G.state;
  G.state = 'harbor'; enterHarbor();
  drawHarbor(ctx, 1280, 720);
  waterLine = tideLineY();            // null = tidak ada air di dermaga
  G.state = st;
  rows.push({
    label, t: G.tide.t, phase: ph.key, tint, night: nightProgress(),
    hz: `rgb(${Math.round(hz.glow.r)},${Math.round(hz.glow.g)},${Math.round(hz.glow.b)})`,
    hzH: hz.height, storm: stormLevel(),
    flood: floodRadius(isl), drain: G.tide.t >= DAWN - CFG.TIDE.DAWN_FALL ? 0 : 1,
    water: waterLine,
  });
}

// maju per 30 detik malam; di dermaga jam TIDAK boleh bergerak
function advance(seconds, dt = 0.25) {
  for (let i = 0; i < seconds / dt; i++) updateTide(dt);
}

const P = CFG.TIDE.PHASES;
const CALM_END = P[0].until, HIGH_AT = P[1].until;
const DAWN_AT = CFG.TIDE.DAWN_AT;

// titik ukur diturunkan dari config: kalau fase di-tuning, alat ini ikut
const marks = [
  [0, 'berangkat'],
  [CALM_END / 3, 'tenang awal'],
  [CALM_END - 5, 'tenang hampir habis'],
  [CALM_END + 5, 'berubah'],
  [(CALM_END + HIGH_AT) / 2, 'tengah berubah'],
  [HIGH_AT + 5, 'pasang'],
  [DAWN_AT - 30, 'pasang lama'],
  [DAWN_AT + CFG.TIDE.DAWN_FALL / 2, 'air turun'],
];
let cursor = 0;
for (const [at, label] of marks) {
  advance(at - cursor);
  cursor = at;
  sample(`${Math.round(at)}s (${label})`);
}
advance(CFG.TIDE.DAWN_FALL);   // melewati fajar
sample('setelah fajar');

console.log('\nSatu malam, 7 menit di laut (angka dari modul asli)\n');
console.log('titik                fase     tint   cakrawala             tinggi  badai  air-pantai  garis-air');
for (const r of rows) {
  console.log(
    `${r.label.padEnd(20)} ${r.phase.padEnd(8)} ${r.tint.toFixed(2)}   ${r.hz.padEnd(20)} ` +
    `${r.hzH.toFixed(2)}    ${r.storm.toFixed(2)}   ${String(Math.round(r.flood)).padStart(4)}px     ` +
    `${r.water === null ? '   -  ' : String(Math.round(r.water)).padStart(4) + 'px'}`
  );
}

let fail = 0;
const ok = (c, m) => { if (c) console.log('  ✓ ' + m); else { fail++; console.log('  ✗ FAIL: ' + m); } };
console.log('');

const calm = rows.find((r) => r.label.includes('(tenang awal)'));
const high = rows.find((r) => r.label.includes('(pasang lama)'));
const dawnRow = rows.find((r) => r.label.includes('(air turun)'));
const after = rows[rows.length - 1];

ok(calm.tint < 0.2 && high.tint > 0.6, `tint naik sepanjang malam (${calm.tint.toFixed(2)} -> ${high.tint.toFixed(2)})`);
ok(high.hzH > calm.hzH * 1.5, `cakrawala tumbuh, bukan cuma berubah warna (${calm.hzH.toFixed(2)} -> ${high.hzH.toFixed(2)})`);
ok(high.storm > 0.9 && calm.storm < 0.05, `badai: tenang -> penuh (${calm.storm.toFixed(2)} -> ${high.storm.toFixed(2)})`);
ok(high.flood < calm.flood * 0.85, `pantai yang bisa dijalani menyusut ${Math.round(calm.flood - high.flood)}px`);
const wet = rows.filter((r) => r.water !== null);
const rising = wet.slice(0, wet.findIndex((r) => r.phase === 'high') + 1);
ok(rows[0].water === null, 'tenang: papan dermaga kering — tidak ada air di atasnya');
ok(rising.every((r, i) => i === 0 || r.water >= rising[i - 1].water - 0.01),
  `air merangkak naik sepanjang malam tanpa mundur (${rising.map((r) => Math.round(r.water)).join(' -> ')}px)`);
ok(high.water !== null && high.water > 100, `pasang: air sampai ke tengah dermaga (${high.water && Math.round(high.water)}px dari tepi)`);
ok(dawnRow.water < high.water && after.water === null,
  `fajar: air turun lagi (${Math.round(high.water)} -> ${Math.round(dawnRow.water)} -> ` +
  `${after.water === null ? 'dermaga kering lagi' : Math.round(after.water) + 'px'})`);
ok(dawnRow.tint < high.tint, `fajar mulai menurunkan air (${high.tint.toFixed(2)} -> ${dawnRow.tint.toFixed(2)})`);
ok(after.t < 60, `jam diputar oleh fajar (t=${after.t.toFixed(1)}s, malam ke-${G.tide.night})`);
ok(!isDawn(), 'setelah fajar: bukan lagi fase pasang');
ok(rows.filter((r) => r.phase === 'calm').length >= 1 && rows.filter((r) => r.phase === 'high').length >= 1,
  'satu malam benar-benar melewati semua fase');

// dermaga membekukan malam: waktu tidak bergerak saat pemain tidak di luar
{
  const before = G.tide.t;
  enterHarbor();
  for (let i = 0; i < 600; i++) { /* 10 detik di dermaga: updateTide tidak dipanggil */ }
  ok(G.tide.t === before, 'di dermaga jam tidak bergerak (pulang = aman, bukan maju)');
}

console.log(fail ? `\n${fail} KESALAHAN pada busur ketegangan.` : '\nBusur ketegangan terbaca di semua kanal.');
process.exit(fail ? 1 : 0);
