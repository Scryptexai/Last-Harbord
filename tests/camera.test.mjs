// ============================================================
// Kontrak kamera miring: menguji bahwa proyeksi benar-benar menempatkan
// benda di layar sesuai janjinya (bukan sekadar "tidak error").
//
// Caranya: ctx tiruan yang melacak matriks transformasi seperti canvas asli,
// lalu memeriksa posisi layar setiap drawImage.
// Jalankan:  node tests/camera.test.mjs
// ============================================================

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg); }
}

// ---------- matriks 2D (a,b,c,d,e,f) ----------
const I = () => [1, 0, 0, 1, 0, 0];
function mul(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}
function apply(m, x, y) { return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] }; }

function trackingCtx() {
  let m = I();
  const stack = [];
  const images = [];              // { cx, cy } posisi layar titik (0,0) lokal gambar
  const c = {
    canvas: { width: 1280, height: 720 },
    _images: images,
    _reset() { images.length = 0; },
    save() { stack.push(m.slice()); c._saved = true; },
    restore() { if (stack.length) m = stack.pop(); },
    translate(x, y) { m = mul(m, [1, 0, 0, 1, x, y]); },
    scale(x, y) { m = mul(m, [x, 0, 0, y, 0, 0]); },
    rotate(a) { const s = Math.sin(a), co = Math.cos(a); m = mul(m, [co, s, -s, co, 0, 0]); },
    setTransform(a, b, cc, d, e, f) { m = [a, b, cc, d, e, f]; },
    transform(a, b, cc, d, e, f) { m = mul(m, [a, b, cc, d, e, f]); },
    drawImage(img, x, y, w, h) {
      // posisi layar titik tengah gambar yang digambar
      if (w !== undefined) {
        const p = apply(m, x + w / 2, y + h / 2);
        images.push({ img, x: p.x, y: p.y });
      } else {
        const p = apply(m, x, y);
        images.push({ img, x: p.x, y: p.y });
      }
    },
    measureText: () => ({ width: 10 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => null,
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  };
  for (const k of ['beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse', 'rect', 'roundRect',
    'fill', 'stroke', 'fillRect', 'strokeRect', 'clearRect', 'clip', 'fillText', 'strokeText', 'setLineDash',
    'getLineDash', 'quadraticCurveTo', 'bezierCurveTo', 'createImageData', 'putImageData']) c[k] = () => {};
  return c;
}

// ---------- lingkungan ----------
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { createElement: () => ({ getContext: () => trackingCtx(), width: 1, height: 1 }) };
globalThis.Image = class { constructor() { this.complete = true; this.naturalWidth = 64; this.naturalHeight = 64; } };
globalThis.requestAnimationFrame = () => {};

const { G } = await import('../js/state.js');
const { CFG } = await import('../js/config.js');
const { ASSETS } = await import('../js/assets.js');
const { generateWorld, HARBOR, drawSea, horizonBand, stormLevel } = await import('../js/world.js');
const { createBoat } = await import('../js/boat.js');
const { enterIsland, updateLand, drawLand } = await import('../js/land.js');
const { resetTide } = await import('../js/tide.js');
const { enterHarbor, drawHarbor } = await import('../js/harbor.js');
const { toScreen, depthAt, visibleWorldRect, beginWorld, endWorld } = await import('../js/camera.js');

// aset palsu supaya setiap sprite benar-benar digambar
for (const k of ['player', 'boat_lv1', 'boat_lv2', 'boat_lv3', 'zombie_slow', 'zombie_fast', 'zombie_tank',
  'tree', 'rock', 'fuel', 'wood', 'food', 'medicine']) ASSETS[k] = new Image();

const VW = 1280, VH = 720;
generateWorld(777);
G.boat = createBoat(HARBOR.x, -40);
G.carried = { fuel: 0, wood: 0, food: 0, medicine: 0 };
G.banked = { fuel: 0, wood: 0, food: 0, medicine: 0 };
resetTide();

function nearestImage(ctx, tx, ty) {
  let best = null, bd = Infinity;
  for (const im of ctx._images) {
    const d = Math.hypot(im.x - tx, im.y - ty);
    if (d < bd) { bd = d; best = im; }
  }
  return { im: best, d: bd };
}

// Kontrak sprite berdiri: kaki tepat di titik dunia, tubuh tumbuh KE ATAS.
// Pusat gambar memang berada di atas titik dunia — itu yang membuat benda "berdiri".
// Yang diuji: tidak ada pergeseran samping, dan tingginya proporsional dengan kedalaman.
function standsOn(im, want, spriteH, zoom, label) {
  if (!im) { fail++; console.log(`  ✗ FAIL: ${label} tidak digambar`); return; }
  const dx = Math.abs(im.x - want.x);
  const up = want.y - im.y;
  const expect = spriteH * 0.42 * zoom;      // anchor 0.92 -> pusat gambar 0.42*h di atas kaki
  ok(dx < 6 && up > 0.6 * expect && up < 1.5 * expect,
    `${label} berdiri tepat di titiknya (geser samping ${dx.toFixed(1)}px, tinggi ${up.toFixed(1)}px, harap ~${expect.toFixed(0)}px)`);
}

console.log('\n== 1. Tanah: benda berdiri mendarat di posisi yang benar ==');
{
  G.cam.zoom = CFG.LAND.ZOOM;
  G.state = 'land';
  const isl = G.islands[0];
  enterIsland(isl);
  const L = G.land;
  // taruh pemain di tempat yang mudah diperiksa
  L.player.x = isl.r * 0.3; L.player.y = -isl.r * 0.2;
  L.zombies.length = 0;
  const z = (await import('../js/zombie.js')).makeZombie('slow', -isl.r * 0.4, isl.r * 0.25);
  z.aggro = 0;
  L.zombies.push(z);
  // node dipaksa terlihat supaya ikut digambar
  for (const nd of L.nodes) nd.forceShow = true;
  updateLand(1 / 60, { x: 0, y: 0 }, { gatherHeld: false });

  const ctx = trackingCtx();
  ctx._reset();
  drawLand(ctx, VW, VH);

  const want = toScreen(L.player.x, L.player.y, VW, VH);
  const zoom = G.cam.zoom;
  const near = (tx, ty) => {
    let best = null, bd = Infinity;
    for (const im of ctx._images) { const d = Math.hypot(im.x - tx, im.y - ty); if (d < bd) { bd = d; best = im; } }
    return best;
  };
  if (process.env.DEBUG_CAM) {
    console.log(`    [debug] harap pemain di (${want.x.toFixed(1)}, ${want.y.toFixed(1)}) zoom=${zoom} cam=(${G.cam.x.toFixed(0)},${G.cam.y.toFixed(0)})`);
  }
  standsOn(near(want.x, want.y - 15), want, 48, zoom, 'pemain');

  // kapal di pulau: digambar di atas air, pusat sprite = posisi kapal
  const wantBoat = toScreen(L.boatPos.x, L.boatPos.y, VW, VH);
  const gotBoat = nearestImage(ctx, wantBoat.x, wantBoat.y);
  ok(gotBoat.d < 12, `kapal di dermaga mendarat di posisinya (meleset ${gotBoat.d.toFixed(2)}px)`);

  // zombie: juga berdiri
  const wantZ = toScreen(z.x, z.y, VW, VH);
  standsOn(near(wantZ.x, wantZ.y - 16), wantZ, z.radius * 2.9, zoom, 'zombie');

  // urutan kedalaman: zombie yang lebih ke selatan harus digambar setelah yang lebih utara
  L.zombies.length = 0;
  const za = (await import('../js/zombie.js')).makeZombie('slow', 0, -100);
  const zb = (await import('../js/zombie.js')).makeZombie('slow', 0, 200);
  za.aggro = 0; zb.aggro = 0;
  L.zombies.push(za, zb);
  const ctx2 = trackingCtx();
  ctx2._reset();
  drawLand(ctx2, VW, VH);
  const pa = toScreen(za.x, za.y, VW, VH);
  const pb = toScreen(zb.x, zb.y, VW, VH);
  const order = ctx2._images.filter((im) => Math.abs(im.x - pa.x) < 8).map((im) => im.y);
  const ia = order.findIndex((y) => Math.abs(y - (pa.y - 16)) < 20);
  const ib = order.findIndex((y) => Math.abs(y - (pb.y - 16)) < 20);
  ok(ia >= 0 && ib >= 0 && ia < ib, 'yang lebih dekat kamera digambar terakhir (tidak saling tembus)');
}

console.log('\n== 2. Laut: kapal & pulau ==');
{
  G.state = 'sea';
  G.cam.zoom = 1;
  G.boat.x = 300; G.boat.y = -200; G.boat.vx = 0; G.boat.vy = 0;
  G.cam.x = G.boat.x; G.cam.y = G.boat.y;
  const ctx = trackingCtx();
  ctx._reset();
  drawSea(ctx, VW, VH);
  const want = toScreen(G.boat.x, G.boat.y, VW, VH);
  const got = nearestImage(ctx, want.x, want.y);
  ok(got.d < 6, `kapal di laut tepat di posisi proyeksinya (meleset ${got.d.toFixed(2)}px)`);

  // di kamera miring, pulau yang LEBIH DEKAT kamera (y lebih besar) tampil lebih besar
  const nearP = depthAt(300), farP = depthAt(-300);
  ok(nearP > farP, `pulau di depan tampak lebih besar (${nearP.toFixed(2)}x vs ${farP.toFixed(2)}x)`);
}

console.log('\n== 3. Framing: pemain melihat ke depan, bukan ke belakang ==');
{
  G.cam.y = 0;
  const r = visibleWorldRect(VW, VH);
  const ahead = Math.abs(r.y0), behind = Math.abs(r.y1);
  ok(ahead > behind * 1.15, `ruang di depan ${Math.round(ahead)}px vs di belakang ${Math.round(behind)}px`);
  // dan bidang pandang tidak tergencet vertikal oleh kemiringan
  ok((r.y1 - r.y0) > (r.x1 - r.x0) * CFG.CAM.TILT * 0.95, 'bidang pandang tidak tergencet vertikal');
}

console.log('\n== 4. Bahasa visual pasang: cakrawala + badai ==');
{
  resetTide();
  const calm = horizonBand();
  G.tide.t = CFG.TIDE.PHASES[0].until + 30; const turn = horizonBand();
  G.tide.t = CFG.TIDE.PHASES[1].until + 60; const high = horizonBand();

  ok(calm.glow.r > calm.glow.b && calm.glow.g > calm.glow.b, 'tenang: cahaya hangat (kuning) di cakrawala');
  ok(high.glow.r > high.glow.g * 1.8, 'pasang: cakrawala memerah');
  ok(turn.height < high.height, `garis cakrawala naik saat pasang (${turn.height.toFixed(2)} -> ${high.height.toFixed(2)})`);
  ok(stormLevel() > 0.9, 'badai terlihat penuh saat pasang');
  G.tide.t = 20;
  ok(stormLevel() === 0, 'tidak ada badai saat tenang (tidak ada kebisingan visual)');
  G.tide.t = 0;
}

console.log('\n== 5. Dermaga memakai bahasa kamera yang sama ==');
{
  G.state = 'harbor';
  enterHarbor();
  const ctx = trackingCtx();
  ctx._reset();
  drawHarbor(ctx, VW, VH);
  const want = toScreen(G.harbor.player.x, G.harbor.player.y, VW, VH);
  const got = nearestImage(ctx, want.x, want.y);
  ok(got.d < 80, `pemain di dek berada di area posisinya (meleset ${got.d.toFixed(0)}px, zoom dermaga 1.35x)`);
  ok(G.harbor.player.y > 0, 'pemain mulai di sisi bawah dek — dekat kamera, seperti dunia lain');
}

console.log(`\nHasil: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
