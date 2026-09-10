// Jalankan semua kode gambar dengan konteks canvas tiruan -> menangkap typo runtime.
import { CFG } from '../js/config.js';
import { G } from '../js/state.js';
import { maxHP, buyNext } from '../js/refit.js';
import { addBanked, addCarried, emptyBag, bankCarried } from '../js/inventory.js';
import { generateWorld, drawSea, HARBOR } from '../js/world.js';
import { createBoat, drawBoat } from '../js/boat.js';
import { enterIsland, updateLand, drawLand } from '../js/land.js';
import { resetTide, updateTide } from '../js/tide.js';
import { enterHarbor, updateHarbor, drawHarbor } from '../js/harbor.js';
import { fx, updateFx, drawFxScreen, resetFx, addFlash, addShake, ring, burst, flyItem, splash, addHurtDir } from '../js/fx.js';

globalThis.localStorage = { getItem:()=>null, setItem(){}, removeItem(){} };
globalThis.document = { createElement: () => ({ getContext: () => cstub(), width:0, height:0 }) };

let ops = 0;
function cstub() {
  const c = { canvas: { width: 1280, height: 720 } };
  const grad = () => ({ addColorStop() {} });
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
stage('laut: pasang tinggi', () => { G.tide.t = 260; updateTide(0); drawSea(ctx, VW, VH); });
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
G.tide.t = 96; updateTide(0);
for (let i = 0; i < 60 * 12; i++) updateLand(1 / 60, { x: 0.6, y: 0 }, { gatherHeld: false });
stage('pulau: fase berubah (air naik, gelombang mulai)', () => drawLand(ctx, VW, VH));
G.tide.t = 240; updateTide(0);
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

console.log(process.exitCode ? '\nADA JALUR GAMBAR YANG GAGAL.' : '\nSemua jalur gambar berjalan tanpa error.');
