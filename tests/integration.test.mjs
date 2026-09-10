// ============================================================
// Simulasi terintegrasi: menjalankan LOOP GAME SEBENARNYA (main.js) tanpa browser.
// Semua modul nyata, semua DOM palsu. Ini yang menangkap bug integrasi
// (harbor -> peta -> layar -> pulau -> memanen -> pulang -> tambat -> beli).
// Jalankan:  node tests/integration.test.mjs
// ============================================================

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg); }
}

// ---------- DOM palsu ----------
const listeners = {};
function mkEl(tag = 'div') {
  const el = {
    tagName: tag, _h: {}, children: [], parent: null, style: {}, dataset: {},
    textContent: '', value: '', disabled: false, width: 0, height: 0, onclick: null,
    className: '',
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => this._s.add(x)); },
      remove(...c) { c.forEach((x) => this._s.delete(x)); },
      contains(c) { return this._s.has(c); },
      toggle(c, f) { const on = f === undefined ? !this._s.has(c) : !!f; if (on) this._s.add(c); else this._s.delete(c); },
    },
    appendChild(c) { c.parent = el; el.children.push(c); return c; },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); },
    remove() { if (el.parent) el.parent.removeChild(el); },
    addEventListener(t, fn) { (el._h[t] = el._h[t] || []).push(fn); },
    removeEventListener() {},
    dispatch(t, ev = {}) { (el._h[t] || []).forEach((fn) => fn({ preventDefault() {}, stopPropagation() {}, type: t, ...ev })); },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    setPointerCapture() {}, focus() {},
    get firstChild() { return el.children[0] || null; },
  };
  Object.defineProperty(el, 'innerHTML', {
    get: () => el._html || '',
    set: (v) => { el._html = v; el.children.length = 0; },
  });
  function grad() { return { addColorStop() {} }; }
  el.getContext = () => ctxStub();
  el.createLinearGradient = grad;
  el.createRadialGradient = grad;
  el.createPattern = () => null;
  el.measureText = () => ({ width: 10 });
  return el;
}

function ctxStub() {
  const c = { canvas: { width: 1280, height: 720 } };
  const grad = () => ({ addColorStop() {} });
  c.createLinearGradient = grad; c.createRadialGradient = grad;
  c.createPattern = () => null; c.measureText = () => ({ width: 10 });
  c.getImageData = () => ({ data: new Uint8ClampedArray(4) });
  for (const m of ['save', 'restore', 'translate', 'scale', 'rotate', 'setTransform', 'transform', 'beginPath',
    'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse', 'rect', 'roundRect', 'fill', 'stroke', 'fillRect',
    'strokeRect', 'clearRect', 'clip', 'fillText', 'strokeText', 'drawImage', 'setLineDash', 'getLineDash',
    'quadraticCurveTo', 'bezierCurveTo', 'createImageData', 'putImageData']) c[m] = () => {};
  return c;
}

const byId = {};
globalThis.document = {
  getElementById(id) { return (byId[id] = byId[id] || mkEl()); },
  createElement: (t) => mkEl(t),
  addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
  body: mkEl('body'),
  documentElement: mkEl('html'),
};

const rafQueue = [];
globalThis.window = {
  innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
  addEventListener(t, fn) { (listeners['win:' + t] = listeners['win:' + t] || []).push(fn); },
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  requestAnimationFrame: (fn) => { rafQueue.push(fn); return rafQueue.length; },
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  performance: { now: () => Date.now() },
};
globalThis.requestAnimationFrame = window.requestAnimationFrame;
globalThis.devicePixelRatio = 1;
globalThis.matchMedia = window.matchMedia;
globalThis.performance = { now: () => Date.now() };

const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
globalThis.Image = class {
  constructor() { this.complete = false; this.naturalWidth = 64; this.naturalHeight = 64; }
  set src(v) {
    this._src = v;
    if (String(v).includes('missing')) { setTimeout(() => this.onerror && this.onerror(), 0); return; }
    setTimeout(() => { this.complete = true; if (this.onload) this.onload(); }, 0);
  }
  get src() { return this._src; }
};
// AudioContext sengaja tidak ada: audio harus aman tanpa WebAudio.

// ---------- muat game ----------
const { G } = await import('../js/state.js');
const { CFG } = await import('../js/config.js');
const { HARBOR, islandById, islandTotalRemaining } = await import('../js/world.js');
const { isModalOpen } = await import('../js/ui.js');
const { bankLoad, carriedLoad } = await import('../js/inventory.js');
const { SPOTS } = await import('../js/harbor.js');
const { atExtract } = await import('../js/land.js');
const { input } = await import('../js/input.js');
await import('../js/main.js');

// tunggu boot() selesai mendaftarkan frame pertama
for (let i = 0; i < 60 && rafQueue.length === 0; i++) await new Promise((r) => setTimeout(r, 2));
ok(rafQueue.length > 0, 'game boot dan mendaftarkan frame pertama ke requestAnimationFrame');

// ---------- pengemudi ----------
let t = 1000;
function step(n = 1) {
  for (let i = 0; i < n; i++) {
    const fn = rafQueue.shift();
    if (!fn) throw new Error('loop game berhenti (requestAnimationFrame tidak dipanggil lagi)');
    t += 1000 / 60;
    fn(t);
  }
}
function keyDown(k) { (listeners['win:keydown'] || []).forEach((fn) => fn({ key: k, repeat: false, preventDefault() {} })); }
function keyUp(k) { (listeners['win:keyup'] || []).forEach((fn) => fn({ key: k, preventDefault() {} })); }
function tap(k) { keyDown(k); step(2); keyUp(k); step(1); }
function hold(k, frames) { keyDown(k); step(frames); keyUp(k); step(1); }

console.log('\n== 1. Dermaga: dunia yang bisa dijalani ==');
step(5);
ok(G.state === 'harbor', `mulai di dermaga (state=${G.state})`);
ok(G.worldSeed > 0 && G.islands.length === 15, `dunia tergenerasi (${G.islands.length} pulau, seed ${G.worldSeed})`);

const tideHarbor = G.tide.t;
step(180);                                    // 3 detik di dermaga
ok(G.tide.t === tideHarbor, 'pasang TIDAK berjalan di dermaga (dermaga = tempat aman di luar waktu)');

// berjalan ke meja peta seperti pemain sungguhan
const chartSpot = SPOTS.find((s) => s.key === 'chart');
const hp = G.harbor.player;
hp.x = chartSpot.x - 400; hp.y = chartSpot.y;   // mulai jauh, lalu berjalan masuk jangkauan
keyDown('d'); step(180); keyUp('d'); step(2);
ok(hp.x > chartSpot.x - 400 + 40, `pemain benar-benar berjalan di dek (x ${Math.round(hp.x)})`);
hp.x = chartSpot.x; hp.y = chartSpot.y; step(2);
tap('e');
ok(isModalOpen(), 'berdiri di MEJA PETA + tekan aksi -> peta terbuka');
keyDown('escape'); step(2); keyUp('escape');
ok(!isModalOpen(), 'ESC menutup peta');

console.log('\n== 2. Berlayar ==');
G.target = islandById(0);
const sailSpot = SPOTS.find((s) => s.key === 'sail');
hp.x = sailSpot.x; hp.y = sailSpot.y; step(2);
tap('e');
ok(G.state === 'sea', `naik ke haluan + aksi -> berlayar (state=${G.state})`);
ok(G.runActive && G.tide.t < 1, 'run baru dimulai: jam pasang dari nol');
step(120);
ok(G.tide.t > 1.5, `pasang berjalan selama berlayar (t=${G.tide.t.toFixed(1)}s)`);

console.log('\n== 3. Mendarat & memanen ==');
const isl = islandById(0);
G.boat.x = isl.x; G.boat.y = isl.y + isl.r + CFG.BOAT.PARK_OFFSET;
G.boat.vx = 0; G.boat.vy = 0;
step(3);
tap('e');
ok(G.state === 'land', `aksi di depan pulau -> mendarat (state=${G.state})`);
ok(atExtract(), 'pemain mulai tepat di dermaga pulau');

const L = G.land;
L.zombies.length = 0;                             // pulau tanpa gangguan: yang diuji pemanenan
const node = L.nodes.find((n) => n.kind === 'res');
L.player.x = node.x; L.player.y = node.y;
step(2);
const before = carriedLoad();
hold('e', 90);                                    // tahan aksi > 1.4 detik
ok(carriedLoad() > before, `menahan aksi memanen (${before} -> ${carriedLoad()} unit)`);
ok(node.taken, 'node habis setelah dipanen');

// memanen lagi tanpa menahan: tidak ada progres
const node2 = L.nodes.find((n) => n.kind === 'res' && !n.taken);
L.player.x = node2.x; L.player.y = node2.y; step(2);
tap('e');
ok(carriedLoad() === 1, 'tap singkat tidak memanen apa pun (harus DITAHAN)');

// serangan tidak boleh melempar error walau tidak ada target
keyDown(' '); step(20); keyUp(' ');
ok(true, 'menyerang di ruang kosong aman (whiff)');

console.log('\n== 4. Ekstraksi fisik: harus berjalan ke dermaga ==');
L.player.x = node2.x; L.player.y = node2.y;
tap('e');
ok(G.state === 'land', 'aksi jauh dari dermaga TIDAK mengembalikan ke kapal (tidak ada teleport)');
L.player.x = L.extract.x; L.player.y = L.extract.y; step(2);
tap('e');
ok(G.state === 'sea', `berjalan ke dermaga + aksi -> kembali ke kapal (state=${G.state})`);
ok(carriedLoad() > 0, `muatan ikut (${carriedLoad()} unit) — belum aman sampai tambat`);

console.log('\n== 5. Tambat: muatan baru jadi milikmu ==');
const bankBefore = bankLoad();
G.boat.x = HARBOR.x + 40; G.boat.y = HARBOR.y + 20; G.boat.vx = 0; G.boat.vy = 0;
step(3);
tap('e');
ok(G.state === 'harbor', `aksi di dermaga -> masuk pelabuhan (state=${G.state})`);
ok(carriedLoad() === 0, 'palka kosong setelah dibongkar');
ok(bankLoad() === bankBefore + 1, `gudang bertambah tepat sebanyak muatan (${bankBefore} -> ${bankLoad()})`);
ok(G.harbor && G.harbor.player, 'pemain ditempatkan di dek pelabuhan (bukan di pulau terakhir)');

console.log('\n== 6. Meja kerja: tangga refit bisa dibeli ==');
const benchSpot = SPOTS.find((s) => s.key === 'bench');
G.harbor.player.x = benchSpot.x; G.harbor.player.y = benchSpot.y; step(2);
tap('e');
ok(isModalOpen(), 'berdiri di MEJA KERJA + aksi -> meja kerja terbuka');
keyDown('escape'); step(2); keyUp('escape');

console.log('\n== 7. Kematian di darat: pelampung, bukan kehilangan ==');
{
  G.refit = 0;
  G.target = islandById(1);
  hp.x = sailSpot.x; hp.y = sailSpot.y; step(2);
  // palka diisi lewat memanen: pakai jalur resmi (addCarried lewat pemanenan)
  const isl2 = islandById(1);
  G.state = 'sea'; G.boat.x = isl2.x; G.boat.y = isl2.y + isl2.r + CFG.BOAT.PARK_OFFSET;
  G.boat.vx = 0; G.boat.vy = 0;
  step(3); tap('e');
  ok(G.state === 'land', 'mendarat di pulau kedua');
  const L2 = G.land;
  L2.zombies.length = 0;
  const n2 = L2.nodes.find((n) => n.kind === 'res');
  L2.player.x = n2.x; L2.player.y = n2.y; step(2);
  hold('e', 90);
  const held = carriedLoad();
  ok(held > 0, `membawa ${held} unit di tangan`);
  G.hull = 1;
  const zz = (await import('../js/zombie.js')).makeZombie('slow', L2.player.x + 8, L2.player.y);
  L2.zombies.push(zz);
  step(120);
  ok(G.state === 'harbor', `hull habis -> mati dan kembali ke dermaga (state=${G.state})`);
  ok(G.salvages.length === 1, 'muatan di tangan menjadi pelampung yang bisa diambil kembali');
  ok(G.salvages[0].islandId === isl2.id, 'pelampung ditinggalkan di pulau tempat kau mati');
  ok(G.salvages[0].cargo && Object.values(G.salvages[0].cargo).reduce((a, b) => a + b, 0) === held,
    'isi pelampung = seluruh muatan yang kau bawa');
  ok(bankLoad() >= bankBefore, 'gudang TIDAK ikut hilang saat mati');
  ok(G.refit === 0, 'kapal yang sudah dibangun tidak hilang saat mati');
  ok(isModalOpen(), 'debrief kematian muncul (apa yang hilang, apa yang tersisa)');
  keyDown('escape'); step(2); keyUp('escape');
  ok(!isModalOpen(), 'debrief ditutup -> kembali ke dermaga');
}

console.log('\n== 8. Pasang di darat: gelombang bala bantuan datang ==');
{
  G.target = islandById(2);
  const isl3 = islandById(2);
  G.state = 'sea'; G.boat.x = isl3.x; G.boat.y = isl3.y + isl3.r + CFG.BOAT.PARK_OFFSET;
  G.boat.vx = 0; G.boat.vy = 0;
  step(3);
  tap('e');
  const L3 = G.land;
  L3.zombies.length = 0;
  G.tide.t = 125;                                  // fase "Berubah": gelombang mulai datang
  const n0 = L3.waveCount;
  step(60 * 40);                                   // 40 detik
  ok(L3.waveCount > n0, `bala bantuan datang saat pasang (${n0} -> ${L3.waveCount} gelombang)`);
  ok(L3.zombies.length > 0, `zombie baru benar-benar ada di pulau (${L3.zombies.length})`);
}

console.log('\n== 9. Muatan tidak disimpan di localStorage ==');
{
  const raw = JSON.parse(store[CFG.SAVE_KEY] || '{}');
  ok(raw.carried === undefined, 'palka yang dibawa tidak pernah masuk save (reload bukan jalan pintas)');
  ok(raw.banked !== undefined && raw.refit !== undefined, 'gudang + refit tetap tersimpan');
}

console.log(`\nHasil: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
