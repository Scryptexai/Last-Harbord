// Jalankan semua kode gambar dengan konteks canvas tiruan -> menangkap typo runtime.
import { CFG } from '../js/config.js';
import { G } from '../js/state.js';
import { maxHP, buyNext } from '../js/refit.js';
import { addBanked, addCarried, emptyBag, bankCarried } from '../js/inventory.js';
import { generateWorld, drawSea, HARBOR } from '../js/world.js';
import { createBoat, drawBoat } from '../js/boat.js';
import { enterIsland, updateLand, drawLand } from '../js/land.js';
import { resetTide, updateTide, tideTint } from '../js/tide.js';
import { enterHarbor, updateHarbor, drawHarbor } from '../js/harbor.js';
import { fx, updateFx, drawFxScreen, resetFx, addFlash, addShake, ring, burst, flyItem, splash, addHurtDir } from '../js/fx.js';

globalThis.localStorage = { getItem:()=>null, setItem(){}, removeItem(){} };
globalThis.document = { createElement: () => ({ getContext: () => cstub(), width:0, height:0 }) };

let ops = 0;
let gradStops = [];                    // warna gradien yang benar-benar dipakai menggambar
function cstub() {
  const c = { canvas: { width: 1280, height: 720 } };
  const grad = () => {
    const g = { stops: [], addColorStop(pos, col) { g.stops.push([pos, col]); gradStops.push(col); } };
    return g;
  };
  c.createLinearGradient = grad; c.createRadialGradient = grad;
  c.createPattern = () => null; c.measureText = () => ({ width: 10 });
  c.getImageData = () => ({ data: new Uint8ClampedArray(4) });
  for (const m of ['save','restore','translate','scale','rotate','setTransform','transform','beginPath','closePath',
    'moveTo','lineTo','arc','arcTo','ellipse','rect','roundRect','fill','stroke','fillRect','strokeRect','clearRect',
    'clip','fillText','strokeText','drawImage','setLineDash','getLineDash','quadraticCurveTo','bezierCurveTo',
    'createImageData','putImageData']) c[m] = () => { ops++; };
  return c;
}
const ctx = cstub();
const VW = 1280, VH = 720;

function stage(name, fn) {
  const before = ops;
  try { fn(); console.log(`  ok   ${name} (${ops - before} operasi gambar)`); }
  catch (e) { console.log(`  ERR  ${name}: ${e.message}\n         ${(e.stack||'').split('\n')[1]}`); process.exitCode = 1; }
}

generateWorld(2026);
G.boat = createBoat(HARBOR.x, -40);
G.hull = maxHP(); G.carried = emptyBag(); G.banked = emptyBag();
resetTide();
G.nearIsland = { island: G.islands[0], dist: 60 };

stage('laut: tanpa target', () => { G.target = null; drawSea(ctx, VW, VH); });
stage('laut: dengan target', () => { G.target = G.islands[3]; drawSea(ctx, VW, VH); });
stage('laut: dekat pulau (tanda & nama muncul)', () => { G.boat.x = G.islands[3].x; G.boat.y = G.islands[3].y + G.islands[3].r + 44; G.nearIsland = { island: G.islands[3], dist: 20 }; drawSea(ctx, VW, VH); });
stage('laut: dekat dermaga', () => { G.boat.x = HARBOR.x + 60; G.boat.y = HARBOR.y + 40; drawSea(ctx, VW, VH); });
G.boat.x = 3000; G.boat.y = -2000;
stage('laut: pasang tinggi', () => { G.tide.t = CFG.TIDE.PHASES[1].until + 40; updateTide(0); drawSea(ctx, VW, VH); });
stage('laut: memancing', () => { G.fishing = { t: 1, dur: 6 }; drawSea(ctx, VW, VH); G.fishing = null; });
stage('laut: kabut jauh (belum disurvei)', () => {
  for (const i of G.islands) delete G.surveyed[i.id];
  G.boat.x = 0; G.boat.y = 0; drawSea(ctx, VW, VH);
});
for (let lv = 0; lv <= 6; lv++) {
  stage(`kapal tingkat ${lv} (bagian refit terlihat)`, () => {
    G.refit = lv; drawBoat(ctx, G.boat, 1.2, { hullDmg: 0 });
    drawBoat(ctx, G.boat, 1, { hullDmg: 0.8 });
  });
}
G.refit = 0;

// pulau
resetTide();
const isl = G.islands[0];
enterIsland(isl);
updateLand(1 / 60, { x: 0, y: 0 }, { gatherHeld: false });
stage('pulau: tenang, kabut baru terbuka sedikit', () => drawLand(ctx, VW, VH));
const nd = G.land.nodes.find((n) => n.kind === 'res');
G.land.player.x = nd.x; G.land.player.y = nd.y;
G.land.player.gather = { node: nd, t: 0.4, need: 1.2 };
stage('pulau: cincin progres pemanenan', () => drawLand(ctx, VW, VH));
G.land.player.gather = null;
G.tide.t = CFG.TIDE.PHASES[0].until + 6; updateTide(0);
for (let i = 0; i < 60 * 12; i++) updateLand(1 / 60, { x: 0.6, y: 0 }, { gatherHeld: false });
stage('pulau: fase berubah (air naik, gelombang mulai)', () => drawLand(ctx, VW, VH));
G.tide.t = CFG.TIDE.PHASES[1].until + 30; updateTide(0);
for (let i = 0; i < 60 * 8; i++) updateLand(1 / 60, { x: -0.6, y: 0.3 }, { gatherHeld: false });
stage('pulau: pasang tinggi + zombie', () => drawLand(ctx, VW, VH));
stage('pulau: di dermaga pulau', () => {
  G.land.player.x = G.land.extract.x; G.land.player.y = G.land.extract.y; drawLand(ctx, VW, VH);
});

// fx + layar
updateFx(1/60);
addFlash(0.5); addShake(0.4); addHurtDir(1.2, 0.8);
burst(10, 10, '#fff', 10, 100, 'spark', 3); splash(0, 0, 8); ring(0, 0, 'rgba(255,255,255,0.8)', 40, 0.4);
flyItem(0, 0, 20, 20, 'wood', 0.5);
stage('fx: dunia + layar', () => { updateFx(1/60); drawLand(ctx, VW, VH); drawFxScreen(ctx, VW, VH, 0); });
resetFx();

// pelabuhan
G.state = 'harbor';
G.refit = 6;
addBanked('wood', 12); addBanked('fuel', 9); addBanked('food', 14); addBanked('medicine', 3);
enterHarbor();
stage('pelabuhan: kapal penuh muatan di dek', () => drawHarbor(ctx, VW, VH));
G.refit = 0; G.banked = emptyBag();
for (const t of Object.keys(CFG.RESOURCES)) addBanked(t, 1);
enterHarbor(); G.hull = 30;
updateHarbor(1 / 60, { x: 0.5, y: 0.5 }, false);
stage('pelabuhan: kapal kosong, lambung rusak, sedang berjalan', () => drawHarbor(ctx, VW, VH));
stage('pelabuhan: semua posisi (pemain di tiap titik)', () => {
  for (const s of [{x:-30,y:158},{x:30,y:206},{x:0,y:-30}]) {
    G.harbor.player.x = s.x; G.harbor.player.y = s.y; drawHarbor(ctx, VW, VH);
  }
});

// ---------- Kontrak kamera miring ----------
const { beginWorld, endWorld, toScreen, depthAt, visibleWorldRect } = await import('../js/camera.js');
const { G: G2, CFG: CFG2 } = { G, CFG };
{
  // Rekaman transformasi: membuktikan tanah benar-benar diperas, bukan sekadar gambar baru.
  const rec = [];
  const recCtx = (() => {
    const c = cstub();
    c.translate = (x, y) => rec.push(['translate', x, y]);
    c.scale = (x, y) => rec.push(['scale', x, y]);
    return c;
  })();
  G.cam.zoom = 1.45;
  G.cam.x = 100; G.cam.y = 200;
  beginWorld(recCtx, 1280, 720);
  const scaleOp = rec.find((r) => r[0] === 'scale');
  console.log(`  ok   beginWorld memakai skala (${scaleOp[1].toFixed(2)}, ${scaleOp[2].toFixed(2)}) -> tanah diperas ${(100 - scaleOp[2] / scaleOp[1] * 100).toFixed(0)}%`);
  if (!(scaleOp[2] < scaleOp[1])) { console.log('  ERR  kamera TIDAK miring (skala y >= skala x)'); process.exitCode = 1; }

  // Proyeksi: 100px ke utara harus tampak lebih pendek daripada 100px ke timur.
  const a = toScreen(0, 0, 1280, 720);
  const north = toScreen(0, -100, 1280, 720);
  const east = toScreen(100, 0, 1280, 720);
  const dy = Math.abs(north.y - a.y), dx = Math.abs(east.x - a.x);
  console.log(`  ok   100px utara = ${dy.toFixed(0)}px layar, 100px timur = ${dx.toFixed(0)}px layar`);
  if (!(dy < dx)) { console.log('  ERR  proyeksi tidak memiringkan sumbu Y'); process.exitCode = 1; }

  // Kedalaman: benda yang lebih dekat kamera harus lebih besar.
  G.cam.y = 0;
  const near = depthAt(300), far = depthAt(-300);
  console.log(`  ok   paralaks kedalaman: dekat ${near.toFixed(2)}x, jauh ${far.toFixed(2)}x`);
  if (!(near > far)) { console.log('  ERR  tidak ada paralaks kedalaman'); process.exitCode = 1; }

  // Framing: pemain harus melihat LEBIH BANYAK ke depan (utara) daripada ke belakang.
  G.cam.y = 0;
  const r = visibleWorldRect(1280, 720);
  const ahead = Math.abs(r.y0), behind = Math.abs(r.y1);
  console.log(`  ok   framing: ${Math.round(ahead)}px ruang di depan, ${Math.round(behind)}px di belakang`);
  if (!(ahead > behind)) { console.log('  ERR  kamera tidak mengangkat fokus ke depan'); process.exitCode = 1; }

  // Cakrawala: bahasa visual fase pasang, dan bukan cuma warna.
  const hz = (await import('../js/world.js')).horizonBand;
  G.tide.t = 30; resetTide();
  const c1 = hz();
  G.tide.t = CFG.TIDE.PHASES[1].until + 40;
  const c3 = hz();
  console.log(`  ok   cakrawala tenang rgb(${c1.glow.r},${c1.glow.g},${c1.glow.b}) h ${c1.height.toFixed(2)} -> pasang rgb(${c3.glow.r},${c3.glow.g},${c3.glow.b}) h ${c3.height.toFixed(2)}`);
  const warm = c1.glow.r > c1.glow.b && c1.glow.g > c1.glow.b;
  const red = c3.glow.r > c3.glow.g * 2;
  if (!warm || !red || !(c3.height > c1.height)) { console.log('  ERR  cakrawala tidak berubah makna antar fase'); process.exitCode = 1; }

  // Dermaga: malam yang sama harus terlihat di rumah. Kalau dermaga selalu biru tenang,
  // "sesuatu milikmu sedang terancam" tidak pernah terbaca.
  const { enterHarbor, drawHarbor } = await import('../js/harbor.js');
  enterHarbor();
  G.tide.t = 20; updateTide(0);
  gradStops = []; drawHarbor(ctx, 1280, 720);
  const calmHarbor = gradStops.slice(0, 3);
  const tideCalm = tideTint();
  G.tide.t = CFG.TIDE.PHASES[1].until + 80; updateTide(0);
  gradStops = []; drawHarbor(ctx, 1280, 720);
  const highHarbor = gradStops.slice(0, 3);
  const tideHigh = tideTint();
  const rgb = (c) => { const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(c); return m ? [+m[1], +m[2], +m[3]] : null; };
  const ca = rgb(calmHarbor[0]), ch = rgb(highHarbor[0]);
  const changed = calmHarbor[0] !== highHarbor[0];
  const blueCalm = ca && ca[2] > ca[0];
  const redHigh = ch && ch[0] > ch[2];
  console.log(`  ok   dermaga: tenang ${calmHarbor[0]} (tint ${tideCalm.toFixed(2)}) -> pasang ${highHarbor[0]} (tint ${tideHigh.toFixed(2)})`);
  if (!(changed && blueCalm && redHigh)) {
    console.log('  ERR  dermaga tidak memperlihatkan malam (warnanya tidak berubah sesuai fase)');
    process.exitCode = 1;
  }
  if (!(tideHigh > tideCalm * 3)) { console.log('  ERR  tint malam tidak naik cukup jauh'); process.exitCode = 1; }
}

console.log(process.exitCode ? '\nADA JALUR GAMBAR YANG GAGAL.' : '\nSemua jalur gambar berjalan tanpa error.');
