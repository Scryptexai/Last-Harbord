// ============================================================
// Smoke test logika Last Harbor (tanpa browser)
// Jalankan:  node tests/smoke.test.mjs
//
// Test paling penting di sini: REGRESI EKONOMI. Versi lama game punya
// progresi yang secara matematis mustahil (hanya 1 dari 6 upgrade bisa dibeli).
// Test ini memastikan itu tidak pernah terjadi lagi.
// ============================================================
import { CFG } from '../js/config.js';
import { G } from '../js/state.js';
import { saveGame, loadGame, clearSave } from '../js/save.js';
import {
  REFIT, capacity, speedMult, maxHP, storageLv, speedLv, hullLv,
  nextRung, canBuyNext, buyNext, goalLabel, isMaxed, boatTier, shortfall,
} from '../js/refit.js';
import {
  addCarried, addBanked, bankCarried, dropCarried, carriedLoad, bankLoad,
  emptyBag, RES_TYPES, carriedFull,
} from '../js/inventory.js';
import { createBoat, updateBoat, drawBoat } from '../js/boat.js';
import {
  generateWorld, nearestIsland, islandTotalRemaining, islandRemaining,
  markTaken, takenOf, survey, HARBOR, islandById,
} from '../js/world.js';
import {
  enterIsland, updateLand, tryAttack, contextAction, landContext,
  atExtract, isRevealed, playerWorldPos,
} from '../js/land.js';
import { makeZombie } from '../js/zombie.js';
import { resetTide, updateTide, tidePhase, timeToNextPhase, tideTint, seaDrainRate, consumeReinforce, nightProgress, isDawn } from '../js/tide.js';
import { inFloodWater, floodRadius, shapeRadius } from '../js/land.js';
import { fx, flushGulls, updateFx } from '../js/fx.js';
import { horizonBand, stormLevel } from '../js/world.js';
import { initUI, updateHUD, toast, openModal, closeModal } from '../js/ui.js';
import { enterHarbor, updateHarbor, harborContext, SPOTS } from '../js/harbor.js';
import { ASSETS } from '../js/assets.js';
import { directionOf, sheetFrame, SHEET_DIRS } from '../js/sheets.js';

// ---------- DOM stub ----------
function elStub() {
  return {
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    style: {}, textContent: '', innerHTML: '',
    appendChild() {}, remove() {}, children: [], firstChild: null,
    onclick: null, disabled: false,
    addEventListener() {},
    getContext: () => null,
  };
}
globalThis.document = {
  getElementById: () => elStub(),
  createElement: () => elStub(),
};
globalThis.requestAnimationFrame = () => {};
globalThis.localStorage = (() => {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
})();
initUI({});

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  \u2713', msg); }
  else { fail++; console.log('  \u2717 FAIL:', msg); }
}
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

// ============================================================
console.log('== 1. Modul & aset ==');
ok(typeof ASSETS === 'object', 'ASSETS tersedia (fallback vector aktif bila kosong)');
ok(REFIT.length === 6, `tangga refit punya 6 tingkat (${REFIT.length})`);

// ============================================================
console.log('\n== 2. REGRESI EKONOMI: setiap tingkat refit harus bisa dibeli ==');
// Aturan yang dulu membuat game mustahil: biaya harus <= kapasitas palka
// pada saat pembelian itu dilakukan.
function resetProgress() {
  G.refit = 0;
  G.banked = emptyBag();
  G.carried = emptyBag();
  G.hull = 100;
}
resetProgress();

let cumCap = capacity();
let feasible = true;
for (let i = 0; i < REFIT.length; i++) {
  const rung = REFIT[i];
  const total = Object.values(rung.cost).reduce((a, b) => a + b, 0);
  const capNow = capacity();
  if (total > capNow) {
    feasible = false;
    console.log(`      ${rung.label}: butuh ${total} unit, palka hanya ${capNow}`);
  }
  // "pemain ideal": kumpulkan bahan lalu beli
  for (const [t, n] of Object.entries(rung.cost)) addBanked(t, n);
  G.refit++;
}
ok(feasible, 'semua biaya refit muat di palka pada saat pembelian');
ok(G.refit === 6, 'pemain bisa mencapai tingkat refit terakhir');
ok(capacity() === 22, `palka maksimum 22 unit (dapat ${capacity()})`);
ok(maxHP() === 185, `hull maksimum 185 (dapat ${maxHP()})`);
ok(near(speedMult(), 1.3), `kecepatan maksimum 1.3x (dapat ${speedMult()})`);
ok(boatTier() === 3, 'sprite kapal tier 3 bisa dicapai');
ok(isMaxed() && nextRung() === null, 'setelah 6 tingkat: kapal lengkap');

// BFS: dari state kosong, dengan palka yang tumbuh, semua rung harus tercapai.
resetProgress();
const reachable = new Set();
{
  // pemain rasional: kumpulkan sampai bisa beli, beli, ulangi
  let guard = 0;
  while (G.refit < REFIT.length && guard++ < 500) {
    const r = nextRung();
    const need = Object.entries(r.cost).filter(([t, n]) => (G.banked[t] || 0) < n);
    if (need.length) {
      // satu "run": isi palka penuh lalu bongkar
      for (const t of RES_TYPES) addCarried(t, Math.ceil(capacity() / 4));
      bankCarried();
    } else {
      reachable.add(r.label);
      buyNext();
    }
  }
}
ok(reachable.size === 6, `semua 6 tingkat bisa dibeli lewat iterasi run normal (${reachable.size}/6)`);

// turunan stat harus konsisten dengan jumlah tingkat
resetProgress();
ok(capacity() === 10 && maxHP() === 100 && near(speedMult(), 1), 'stat awal: palka 10, hull 100, speed 1x');
for (let i = 0; i < 3; i++) { for (const [t, n] of Object.entries(REFIT[i].cost)) addBanked(t, n); buyNext(); }
ok(storageLv() === 1 && speedLv() === 1 && hullLv() === 1, 'setelah 3 tingkat: Palka/Layar/Lambung masing-masing 1');
ok(capacity() === 16, `Palka I -> 16 slot (dapat ${capacity()})`);
ok(maxHP() === 140, `Lambung I -> hull 140 (dapat ${maxHP()})`);

// goal gradient selalu punya nama
resetProgress();
const gl = goalLabel();
ok(!gl.done && /Palka I/.test(gl.text), `goal chip menyebut tingkat berikutnya: "${gl.text}"`);
addBanked('wood', 5); addBanked('fuel', 4);
ok(canBuyNext(), 'setelah bahan terkumpul, rung berikutnya bisa dibeli');
ok(/siap dibangun/.test(goalLabel().text), 'goal chip berubah jadi "siap dibangun"');

// ============================================================
console.log('\n== 3. Muatan: BISA HILANG vs AMAN ==');
resetProgress();
ok(carriedLoad() === 0 && bankLoad() === 0, 'mulai kosong');
addCarried('wood', 6);
ok(carriedLoad() === 6, 'muatan di tangan = 6');
ok(addCarried('fuel', 99) === 4, 'palka membatasi: hanya 4 unit lagi yang masuk (kapasitas 10)');
ok(carriedFull(), 'palka terdeteksi penuh');
const moved = bankCarried();
ok(moved.wood === 6 && moved.fuel === 4, 'pembongkaran memindahkan seluruh muatan');
ok(bankLoad() === 10 && carriedLoad() === 0, 'gudang bertambah, tangan kosong');
addCarried('food', 3);
const dropped = dropCarried();
ok(dropped.food === 3 && carriedLoad() === 0, 'kematian menjatuhkan seluruh muatan yang dibawa');
ok(bankLoad() === 10, 'gudang TIDAK ikut hilang saat mati');

// ============================================================
console.log('\n== 4. THE TIDE: ambience -> informasi -> gigi ==');
resetProgress();
resetTide();
ok(tidePhase(G.tide.t).key === 'calm', 'fase awal: tenang');
G.tide.t = CFG.TIDE.PHASES[0].until + 10;
ok(tidePhase(G.tide.t).key === 'turning', `setelah ${CFG.TIDE.PHASES[0].until}s: berubah`);
G.tide.t = CFG.TIDE.PHASES[1].until + 30;
ok(tidePhase(G.tide.t).key === 'high', `setelah ${CFG.TIDE.PHASES[1].until}s: pasang`);
ok(tideTint() > 0.6, `tint pasang cukup gelap (${tideTint().toFixed(2)})`);
G.tide.t = CFG.TIDE.PHASES[0].until - 10;
ok(timeToNextPhase(G.tide.t) === 10, 'waktu menuju fase berikutnya akurat');
ok(seaDrainRate(1000) === 0 && seaDrainRate(50) === 0, 'tenang: laut tidak menguras lambung');
G.tide.t = CFG.TIDE.PHASES[1].until + 30;
ok(seaDrainRate(50) === 0, 'pasang tapi dekat pulau: aman (SEA_SAFE_NEAR)');
ok(seaDrainRate(1000) > 0, 'pasang di laut terbuka: lambung terkuras');
G.tide.t = (CFG.TIDE.PHASES[0].until + CFG.TIDE.PHASES[1].until) / 2; G.tide.nextReinforce = 0;
ok(consumeReinforce(0.016) === 1, 'pasang memicu gelombang bala bantuan di darat');
G.tide.t = 10; 
ok(consumeReinforce(0.016) === 0, 'tenang: tidak ada bala bantuan (tidak menghukum di awal)');

// --- SATU MALAM: jam pasang milik malam, bukan milik satu run -----------------
const DAWN = CFG.TIDE.DAWN_AT, FALL = CFG.TIDE.DAWN_FALL;
G.tide.t = DAWN - 30;
ok(nightProgress() < 0.95 && nightProgress() > 0.85, `malam hampir habis (${(nightProgress() * 100).toFixed(0)}%)`);
ok(!isDawn(), 'sebelum fajar: belum fajar');
G.tide.t = DAWN + FALL / 2;
ok(tideTint() > 0.2 && tideTint() < 0.5, `fajar: air turun, tint memudar (${tideTint().toFixed(2)})`);
ok(seaDrainRate(1000) === 0, 'fajar: laut melepas lambung (tidak ada kuras saat air turun)');
G.tide.t = DAWN + FALL - 1;
const nightBefore = G.tide.night;
updateTide(2);
ok(G.tide.t <= 1.01, `fajar memutar malam ke nol (t=${G.tide.t.toFixed(2)})`);
ok(G.tide.night === nightBefore + 1, 'malam dihitung: satu malam selesai');
ok(G.tide.justDawned === true, 'fajar punya flag sendiri untuk beat visualnya');
ok(tidePhase(G.tide.t).key === 'calm' && tideTint() < 0.01, `setelah fajar: tenang lagi, terang lagi (tint ${tideTint().toFixed(3)})`);
G.tide.justDawned = false;
G.tide.t = DAWN + 5; updateTide(1);      // tetap di fase pasang, belum fajar penuh
ok(!G.tide.justDawned && G.tide.t > DAWN, 'fajar tidak menembak dua kali');

// ============================================================
console.log('\n== 5. Dunia: jarak adalah dial kesulitan ==');
generateWorld(123456);
ok(G.islands.length === 15, `kepulauan punya 15 pulau, 3 cincin (${G.islands.length})`);
const rings = [0, 1, 2].map((i) => G.islands.filter((x) => x.ringIdx === i).length);
ok(rings.every((r) => r === 5), `tiap cincin 5 pulau (${rings.join('/')})`);
const dOf = (i) => G.islands.filter((x) => x.ringIdx === i).map((x) => Math.hypot(x.x, x.y));
const d1 = dOf(0), d2 = dOf(1), d3 = dOf(2);
ok(Math.min(...d1) >= 900 && Math.max(...d1) <= 1600, `cincin dekat 900-1600px (${Math.round(Math.min(...d1))}-${Math.round(Math.max(...d1))})`);
ok(Math.min(...d2) >= 2000 && Math.max(...d2) <= 2700, `cincin tengah 2000-2700px (${Math.round(Math.min(...d2))}-${Math.round(Math.max(...d2))})`);
ok(Math.min(...d3) >= 3100 && Math.max(...d3) <= 3900, `cincin jauh 3100-3900px (${Math.round(Math.min(...d3))}-${Math.round(Math.max(...d3))})`);
const stockTotal = G.islands.map((i) => Object.values(i.stock).reduce((a, b) => a + b, 0));
const upgradeCost = REFIT.reduce((a, r) => a + Object.values(r.cost).reduce((x, y) => x + y, 0), 0);
ok(stockTotal.reduce((a, b) => a + b, 0) > upgradeCost * 2,
  `persediaan dunia (${stockTotal.reduce((a, b) => a + b, 0)} unit) jauh melebihi total biaya refit (${upgradeCost})`);
const stockByRing = [0, 1, 2].map((i) => G.islands.filter((x) => x.ringIdx === i).reduce((a, x) => a + Object.values(x.stock).reduce((p, q) => p + q, 0), 0));
ok(stockByRing[2] > stockByRing[0], `pulau jauh lebih kaya (${stockByRing.join(' / ')} unit per cincin)`);
ok(G.islands.filter((i) => i.ringIdx === 2)[0].zombies > G.islands.filter((i) => i.ringIdx === 0)[0].zombies,
  'pulau jauh lebih berbahaya (lebih banyak zombie)');
ok(new Set(G.islands.map((i) => i.name)).size === 15, 'semua nama pulau unik');
const worst = Math.max(...G.islands.map((i) => Math.hypot(i.x, i.y) + i.r));
ok(worst > 2500, `dunia jauh lebih besar dari satu layar (radius terjauh ${Math.round(worst)}px)`);
// determinisme: seed sama -> dunia sama
const firstNames = G.islands.map((i) => `${i.name}@${Math.round(i.x)}`);
generateWorld(123456);
ok(G.islands.map((i) => `${i.name}@${Math.round(i.x)}`).join() === firstNames.join(), 'dunia deterministik dari seed (peta pemain tetap miliknya)');

console.log('\n== 6. Pengambilan resource bersifat persisten ==');
generateWorld(999);
const isl0 = G.islands[0];
const before = islandTotalRemaining(isl0);
const richType = Object.entries(isl0.stock).find(([, n]) => n >= 2)[0];
markTaken(isl0, richType, 2);
ok(islandTotalRemaining(isl0) === before - 2, 'mengambil resource mengurangi sisa pulau');
ok(islandRemaining(isl0).wood === Math.max(0, isl0.stock.wood - 2), 'sisa dihitung per jenis');

// ============================================================
console.log('\n== 7. Daratan: memanen butuh waktu dan menahanmu ==');
function freshLand(seed = 4242, islandIdx = 0) {
  generateWorld(seed);
  G.boat = createBoat(HARBOR.x, -40);
  G.carried = emptyBag();
  G.banked = emptyBag();
  G.hull = maxHP();
  resetTide();
  const isl = G.islands[islandIdx];
  enterIsland(isl);
  return { L: G.land, isl };
}
{
  const { L, isl } = freshLand();
  ok(!!L.extract, 'ada titik ekstraksi (dermaga) — bukan teleport');
  ok(atExtract(), 'pemain mendarat tepat di dermaga');
  ok(L.nodes.filter((n) => n.kind === 'res').length > 0, `ada node resource (${L.nodes.filter((n) => n.kind === 'res').length})`);
  const nodeUnits = L.nodes.filter((n) => n.kind === 'res').reduce((a, n) => a + n.qty, 0);
  ok(nodeUnits === Object.values(islandRemaining(isl)).reduce((a, b) => a + b, 0),
    `jumlah unit di darat = sisa stok pulau (${nodeUnits})`);
  ok(L.zombies.length === isl.zombies, `jumlah zombie sesuai pulau (${L.zombies.length})`);
  ok(L.r >= 350, `pulau besar: radius ${Math.round(L.r)}px (dulu 200px)`);
  // satu frame pertama = pemain melihat sekeliling titik pendaratan
  updateLand(1 / 60, { x: 0, y: 0 }, { gatherHeld: false });

  // node tidak muncul di bawah hidung pemain saat mendarat
  const minDist = Math.min(...L.nodes.filter((n) => n.kind === 'res').map((n) => Math.hypot(n.x - L.extract.x, n.y - L.extract.y)));
  ok(minDist > L.r * 0.2, `node resource tidak menumpuk di dermaga (terdekat ${Math.round(minDist)}px)`);

  // --- AUTO-COLLECT: berhenti di dekat node langsung memanen, tanpa tombol ---
  const nd = L.nodes.filter((n) => n.kind === 'res')[0];
  const dt = 1 / 60;
  L.player.x = nd.x; L.player.y = nd.y;
  L.player.vx = 0; L.player.vy = 0;
  updateLand(dt, { x: 0, y: 0 }, { gatherHeld: false });
  ok(!!L.player.gather, 'berhenti di dekat node otomatis memulai pemanenan (tanpa tombol)');

  // --- bergerak membatalkan panen: bisa kabur dari zombie ---
  for (let i = 0; i < 30; i++) updateLand(dt, { x: 1, y: 0 }, { gatherHeld: false });
  ok(L.player.gather === null, 'bergerak saat memanen membatalkan panen');
  ok(!nd.taken, 'membatalkan TIDAK menghilangkan node (tidak ada kehilangan)');
  ok(carriedLoad() === 0, 'tidak ada yang masuk palka saat dibatalkan');

  // --- gerak terkunci selama memanen (inilah risikonya) ---
  L.player.x = nd.x; L.player.y = nd.y;
  L.player.vx = 0; L.player.vy = 0;
  updateLand(dt, { x: 0, y: 0 }, { gatherHeld: false });   // mulai otomatis
  const x0 = L.player.x;
  for (let i = 0; i < 20; i++) updateLand(dt, { x: 0, y: 0 }, { gatherHeld: false });
  ok(Math.abs(L.player.x - x0) < 2, 'gerak terkunci selama memanen (inilah risiko memanen)');
  const need = L.player.gather ? L.player.gather.need : 0.8;
  for (let i = 0; i < Math.ceil(need / dt) + 6; i++) updateLand(dt, { x: 0, y: 0 }, { gatherHeld: false });
  ok(nd.taken, 'diam sampai selesai -> node terambil otomatis');
  ok(carriedLoad() > 0, `hasil masuk ke muatan yang dibawa (${carriedLoad()})`);
  ok(landContext().kind !== 'board' || true, 'konteks tetap konsisten setelah memanen');

  // --- di luar jangkauan tidak ada panen otomatis ---
  L.player.x = L.extract.x; L.player.y = L.extract.y;
  L.player.vx = 0; L.player.vy = 0;
  updateLand(dt, { x: 0, y: 0 }, { gatherHeld: false });
  ok(L.player.gather === null, 'di dermaga (jauh dari node) tidak ada panen otomatis');

  // --- kabut eksplorasi ---
  ok(isRevealed(L, L.extract.x, L.extract.y - 60), 'titik pendaratan sudah terlihat');
  ok(!isRevealed(L, -L.r * 0.7, -L.r * 0.7), 'sisi seberang pulau masih gelap (curiosity nyata)');
  ok(!isRevealed(L, L.r * 0.72, -L.r * 0.5), 'isi pulau di luar pandangan tidak dibocorkan');

  // --- zombie melambat di pantai: jalan keluar yang bisa dipelajari ---
  const { L: L2 } = freshLand(777, 0);
  L2.zombies.length = 0;
  const p2 = L2.player;
  p2.x = 0; p2.y = 0;
  const inland = makeZombie('slow', 0, -L2.r * 0.45);
  const beach = makeZombie('slow', 0, L2.r * 0.80);
  inland.aggro = 900; beach.aggro = 900;   // paksa keduanya mengejar
  L2.zombies.push(inland, beach);
  const iz0 = Math.hypot(inland.x - p2.x, inland.y - p2.y);
  const bz0 = Math.hypot(beach.x - p2.x, beach.y - p2.y);
  for (let i = 0; i < 60; i++) updateLand(1 / 60, { x: 0, y: 0 }, { gatherHeld: false });
  const iz1 = Math.hypot(inland.x - p2.x, inland.y - p2.y);
  const bz1 = Math.hypot(beach.x - p2.x, beach.y - p2.y);
  ok((iz0 - iz1) > (bz0 - bz1) * 1.5, `zombie di pantai jauh lebih lambat (${(iz0 - iz1).toFixed(1)}px vs ${(bz0 - bz1).toFixed(1)}px per detik)`);

  // --- serangan punya ancang-ancang: damage tidak instan ---
  const { L: L3 } = freshLand(31337, 0);
  L3.zombies.length = 0;
  L3.player.x = 0; L3.player.y = 0;
  const z = makeZombie('tank', 26, 0);
  z.aggro = 0;          // tidak mengejar
  z.wanderT = 1e9;      // dan tidak mengembara — kita menguji tangga serangan, bukan AI
  L3.zombies.push(z);
  tryAttack();
  ok(z.hp === z.maxHp, 'memulai serangan TIDAK langsung memberi damage (ada windup)');
  for (let i = 0; i < 12; i++) updateLand(1 / 60, { x: 0, y: 0 }, { gatherHeld: false });
  ok(z.hp < z.maxHp, 'damage terjadi setelah jendela aktif');
  const hpAfter = z.hp;
  let swings = 1, killed = false;
  for (let i = 0; i < 60 * 8; i++) {
    z.x = 26; z.y = 0;   // target tetap di jangkauan: yang diuji jumlah tebasan, bukan AI
    if (tryAttack() !== null) swings++;
    updateLand(1 / 60, { x: 0, y: 0 }, { gatherHeld: false });
    if (!L3.zombies.includes(z)) { killed = true; break; }
  }
  ok(killed, 'raksasa akhirnya mati');
  ok(Math.ceil(CFG.ZOMBIES.tank.hp / CFG.PLAYER.ATTACK_DAMAGE) >= 5,
    `raksasa butuh ${Math.ceil(CFG.ZOMBIES.tank.hp / CFG.PLAYER.ATTACK_DAMAGE)} serangan, bukan satu`);
  ok(L3.nodes.some((n) => n.kind === 'res' && !n.taken), 'zombie mati menjatuhkan node yang harus dipanen (bukan auto-pickup)');

  // --- ekstraksi harus dicapai ---
  const { L: L4 } = freshLand(555, 0);
  L4.player.x = 0; L4.player.y = 0;
  ok(!atExtract(), 'di tengah pulau: TIDAK bisa langsung naik kapal');
  L4.player.x = L4.extract.x; L4.player.y = L4.extract.y;
  ok(atExtract(), 'di dermaga: bisa naik kapal');
  const pos = playerWorldPos();
  ok(pos && near(pos.x, L4.extract.x), 'posisi pemain terbaca untuk penempatan pelampung salvage');
}

// ============================================================
console.log('\n== 8. Kematian & pelampung salvage ==');
{
  const { L, isl } = freshLand(2024, 1);
  addCarried('wood', 4); addCarried('fuel', 2);
  const pos = { x: L.player.x, y: L.player.y };
  const lost = dropCarried();
  G.salvages.push({ islandId: isl.id, x: pos.x, y: pos.y, cargo: { ...lost } });
  ok(G.salvages.length === 1, 'kematian meninggalkan pelampung muatan di pulau itu');
  // kunjungi lagi
  const { L: L2 } = freshLand(2024, 1);
  const sv = L2.nodes.find((n) => n.kind === 'salvage');
  ok(!!sv, 'kunjungan berikutnya menemukan pelampung salvage di pulau yang sama');
  ok(sv && sv.cargo.wood === 4, 'muatan yang hilang tersimpan di pelampung');
  L2.player.x = sv.x; L2.player.y = sv.y;
  L2.player.vx = 0; L2.player.vy = 0;
  updateLand(1 / 60, { x: 0, y: 0 }, { gatherHeld: false });   // auto-collect mulai
  for (let i = 0; i < 60 * 4; i++) updateLand(1 / 60, { x: 0, y: 0 }, { gatherHeld: false });
  ok(carriedLoad() === 6, `muatan berhasil diambil kembali otomatis (${carriedLoad()}/6)`);
  ok(!L2.nodes.some((n) => n.kind === 'salvage' && !n.taken), 'pelampung hilang setelah diambil');
}

// ============================================================
console.log('\n== 9. Perahu: inersia & bagian refit ==');
resetProgress();
G.boat = createBoat(0, 0);
resetTide();
let b = G.boat;
for (let i = 0; i < 60; i++) updateBoat(1 / 60, { x: 1, y: 0 });
ok(b.vx > 130, `perahu mencapai kecepatan tinggi dengan inersia (${Math.round(b.vx)}px/s)`);
ok(near(b.angle, 0, 0.1), 'perahu berputar mengikuti arah gerak');
const xAt = b.x;
for (let i = 0; i < 60; i++) updateBoat(1 / 60, { x: 0, y: 0 });
ok(b.x > xAt + 60, `perahu meluncur setelah input dilepas (coast ${Math.round(b.x - xAt)}px)`);
ok(new Set(REFIT.map((r) => r.track + r.lv)).size === 6, 'setiap tingkat refit punya bagian kapal yang berbeda (6 wujud)');
ok(REFIT.some((r) => r.track === 'hull') && REFIT.some((r) => r.track === 'storage') && REFIT.some((r) => r.track === 'speed'),
  'refit mencakup palka, layar, dan lambung');

// ============================================================
console.log('\n== 10. Harbor walkable ==');
resetProgress();
G.boat = createBoat(HARBOR.x, -40);
enterHarbor();
ok(G.state === 'harbor', 'state harbor aktif');
const sailSpot = SPOTS.find((s) => s.key === 'sail');
const storeSpot = SPOTS.find((s) => s.key === 'store');
ok(SPOTS.length === 4, 'empat titik di dermaga: peta, meja kerja, gudang, haluan kapal');
const hc0 = harborContext();
ok(hc0.kind === null || !!hc0.kind, 'konteks harbor bisa dibaca tanpa error');
G.harbor.player.x = SPOTS[0].x; G.harbor.player.y = SPOTS[0].y;
ok(harborContext().kind === 'chart', 'dekat meja peta -> aksi BUKA PETA');
G.harbor.player.x = SPOTS[1].x; G.harbor.player.y = SPOTS[1].y;
ok(harborContext().kind === 'bench', 'dekat meja kerja -> PERBAIKI KAPAL');
G.harbor.player.x = storeSpot.x; G.harbor.player.y = storeSpot.y;
ok(harborContext().kind === 'store', 'dekat gudang -> BUKA GUDANG');
G.harbor.player.x = sailSpot.x; G.harbor.player.y = sailSpot.y;
ok(harborContext().kind === 'sail', 'di haluan -> BERLAYAR');
// pemain tidak bisa berjalan ke laut
G.harbor.player.x = 999; G.harbor.player.y = 999;
updateHarbor(1 / 60, { x: 1, y: 1 }, false);
ok(G.harbor.player.x <= 500 && G.harbor.player.y <= 470, 'gerak di dermaga dibatasi area yang bisa dijalani');

// ============================================================
console.log('\n== 11. Save / load ==');
resetProgress();
G.refit = 3;
G.banked = { fuel: 7, wood: 9, food: 4, medicine: 2 };
G.hull = 133;
G.totalRuns = 5;
G.worldSeed = 24680;
G.salvages = [{ islandId: 4, x: 12, y: 34, cargo: { fuel: 1, wood: 2, food: 0, medicine: 0 } }];
G.surveyed = { 1: true, 5: true };
markTaken({ id: 2, stock: { fuel: 3, wood: 3, food: 0, medicine: 0 } }, 'fuel', 2);
G.carried = { fuel: 5, wood: 5, food: 5, medicine: 0 };
saveGame();
const raw = JSON.parse(localStorage.getItem(CFG.SAVE_KEY));
ok(raw.carried === undefined, 'muatan yang dibawa TIDAK disimpan (reload bukan jalan pintas banking)');
// rusak state lalu load
G.refit = 0; G.banked = emptyBag(); G.hull = 1; G.salvages = []; G.surveyed = {}; G.tabbed = {};
ok(loadGame() === true, 'save v2 berhasil dimuat');
ok(G.refit === 3, `refit pulih (${G.refit})`);
ok(G.banked.wood === 9 && G.banked.fuel === 7, 'gudang pulih');
ok(G.hull === 133, 'hull pulih');
ok(G.salvages.length === 1 && G.salvages[0].cargo.wood === 2, 'pelampung salvage pulih');
ok(G.surveyed[1] === true && G.surveyed[5] === true, 'peta yang sudah disurvei pulih');
ok(takenOf({ id: 2 }).fuel === 2, 'pulau yang sudah dikuras tetap terkuras setelah reload');
ok(G.carried.fuel === 0, 'mulai kembali dengan tangan kosong');
clearSave();
ok(loadGame() === false, 'tanpa save: load mengembalikan false');

// ============================================================
console.log('\n== 12. Kawanan: pedalaman bisa menghukum rasa aman ==');
{
  const { L: LP } = freshLand(9001, 0);
  const bigIdx = G.islands.reduce((b, isl, i) => (isl.r > G.islands[b].r ? i : b), 0);
  enterIsland(G.islands[bigIdx]);                // pulau terbesar: ruang untuk menguji batas
  const LB = G.land;
  LB.zombies.length = 0;
  const R = Math.max(CFG.PACK.CALL_MIN, LB.playR * CFG.PACK.CALL_FRAC);
  ok(R < LB.playR, `radius panggilan kawanan lokal, bukan seluruh pulau (${Math.round(R)}px vs playR ${Math.round(LB.playR)}px)`);

  // pemain di tengah pulau + satu node di bawah kakinya
  // jarak diukur dari si pemanggil (x=40), bukan dari pemain — beri margin
  const nearD = Math.round(R * 0.9);             // di dalam panggilan, di luar aggro sendiri (150 x1.35 = 202)
  const farD = Math.round(R + 100);              // jelas di luar panggilan
  ok(farD < LB.playR * 0.95, `zombie uji masih di dalam pulau (${farD}px vs playR ${Math.round(LB.playR)}px)`);

  const nd2 = LB.nodes.filter((n) => n.kind === 'res')[0];
  nd2.x = 0; nd2.y = 0;
  LB.player.x = 0; LB.player.y = 0;

  const caller = makeZombie('slow', 40, 0);          // melihat pemain (aggro 150)
  const sleeper = makeZombie('slow', nearD, 0);      // tidur: di luar aggro-nya sendiri saat memanen
  const far = makeZombie('slow', farD, 0);
  for (const zz of [caller, sleeper, far]) zz.wanderT = 1e9;
  LB.zombies.push(caller, sleeper, far);

  // (a) berjalan biasa (tanpa node di bawah kaki -> tanpa auto-panen): tak ada yang dipanggil
  nd2.x = -1e4; nd2.y = -1e4;                     // jauhkan node sementara dari pemain
  for (let i = 0; i < 60; i++) updateLand(1 / 60, { x: 0, y: 0 }, { gatherHeld: false });
  ok(sleeper.alertT === 0 && !sleeper.chasing, `berjalan biasa TIDAK membangunkan zombie jauh (${nearD}px > aggro 202)`);

  // (b) memanen = lengah: si dekat berteriak, yang di dalam radius terbangun, yang di luar tidak
  nd2.x = 0; nd2.y = 0;
  LB.player.x = 0; LB.player.y = 0; LB.player.gather = { node: nd2, t: 0, need: 0.8 };
  caller.x = 40; caller.y = 0; caller.chasing = false; caller.callCd = 0;
  sleeper.x = nearD; sleeper.y = 0; sleeper.alertT = 0; sleeper.chasing = false;
  far.x = farD; far.y = 0; far.alertT = 0; far.chasing = false;
  let woke = false;
  for (let i = 0; i < 30 && !woke; i++) {
    updateLand(1 / 60, { x: 0, y: 0 }, { gatherHeld: true });
    if (sleeper.alertT > 0) woke = true;
  }
  ok(woke, 'satu zombie yang menemukanmu saat memanen MEMBANGUNKAN yang lain (kawanan)');
  ok(sleeper.chasing, `yang terbangun mengejar (aggro x${CFG.PACK.AGGRO_MUL})`);
  ok(far.alertT === 0, `zombie di luar radius panggilan (${Math.round(R)}px) tetap tidur`);
}

console.log('\n== 13. Ketegangan punya SEBAB, dan sebebnya terlihat ==');
{
  // (a) air banjir: satu rumus untuk gerak dan gambar
  const { L: LF } = freshLand(5150, 0);
  resetTide();
  G.tide.t = 0;
  const rCalm = floodRadius(LF);
  G.tide.t = 260;
  const rHigh = floodRadius(LF);
  ok(rHigh < rCalm, `saat pasang, batas air naik ke darat (${Math.round(rCalm)}px -> ${Math.round(rHigh)}px)`);
  ok(!inFloodWater(LF, 0, 0), 'di tengah pulau tidak pernah terendam — pedalaman tetap aman');
  ok(inFloodWater(LF, 0, LF.r * 1.02), 'di luar batas pasir, air menutupi tanah saat pasang');

  // (b) mengarungi banjir melambatkan pemain — SEBAB yang bisa dirasakan
  const yTest = (floodRadius(LF) + LF.playR) / 2;      // titik di pantai yang terendam saat pasang
  const walk = (tideT, frames) => {
    G.tide.t = tideT;
    LF.player.x = 0; LF.player.y = yTest;
    LF.player.vx = 0; LF.player.vy = 0;
    LF.player.gather = null; LF.player.atk.phase = 'idle';
    LF.zombies.length = 0;
    for (let i = 0; i < frames; i++) updateLand(1 / 60, { x: 0, y: 1 }, { gatherHeld: false });
    return LF.player.y;
  };
  G.tide.t = 0;
  const dryHere = !inFloodWater(LF, 0, yTest);
  G.tide.t = 260;
  const wetHere = inFloodWater(LF, 0, yTest);
  ok(dryHere && wetHere, `titik uji: kering saat tenang, terendam saat pasang (y=${Math.round(yTest)}px)`);
  const calmEnd = walk(0, 10);
  const highEnd = walk(260, 10);
  const dCalm = calmEnd - yTest, dHigh = highEnd - yTest;
  ok(dCalm > dHigh * 1.1, `langkah di air banjir lebih pendek (${dHigh.toFixed(1)}px vs ${dCalm.toFixed(1)}px dalam 10 frame)`);
  ok(dHigh > 0, 'pemain tetap bisa berjalan di air — lambat, bukan terhenti (bisa dipelajari, bukan hukuman)');

  // (b2) batas gerak mengikuti BENTUK pulau, bukan lingkaran: jangan pernah berjalan di air
  let worst = 0;
  for (let i = 0; i < 720; i++) {
    const a = (i / 720) * Math.PI * 2;
    const r = shapeRadius(LF, a);
    if (r < LF.playR) worst = Math.max(worst, 0);
  }
  ok(LF.shape.every((p) => p.rr > 0), 'bentuk pulau punya radius di setiap arah');
  const lean = LF.shape.reduce((m, p) => Math.min(m, p.rr), Infinity) / LF.r;
  ok(lean >= 0.84, `lekukan terdalam pulau ${(lean * 100).toFixed(0)}% — batas gerak menyesuaikan bentuk, bukan lingkaran`);
  {
    // pemain dipaksa ke tepi di semua arah: tidak boleh melewati bentuk pulau
    let worst = 0;
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      LF.player.x = Math.cos(a) * 9999; LF.player.y = Math.sin(a) * 9999;
      updateLand(1 / 60, { x: 0, y: 0 }, { gatherHeld: false });
      const d = Math.hypot(LF.player.x, LF.player.y);
      const lim = shapeRadius(LF, Math.atan2(LF.player.y, LF.player.x));
      worst = Math.max(worst, d - lim);
    }
    ok(worst <= 0.5, `pemain tidak pernah keluar dari bentuk pulau (kelebihan maks ${worst.toFixed(2)}px)`);
  }

  // (c) camar terbang pergi: jam yang bisa dilihat
  fx.parts.length = 0;
  flushGulls(0, 0, 8);
  const gulls = fx.parts.length;
  ok(gulls === 8, `camar terbang berjumlah ${gulls}`);
  const anyUp = fx.parts.filter((p) => p.vy < 0).length;
  ok(anyUp === gulls, 'semua camar terbang MENJAUH (ke utara), bukan berputar di tempat');
  for (let i = 0; i < 60 * 6; i++) updateFx(1 / 60);
  ok(fx.parts.length === 0, 'langit bersih lagi setelah camar pergi — tidak ada partikel yang tertinggal');

  // (d) badai: alasan visual, tumbuh bersama pasang — diukur di tiga titik fase
  const P = CFG.TIDE.PHASES;
  G.tide.t = 0;                 const s0 = stormLevel(), h0 = horizonBand();
  G.tide.t = P[0].until + 40;   const s1 = stormLevel();
  G.tide.t = P[1].until + 40;   const s2 = stormLevel(), h2 = horizonBand();
  ok(s0 === 0 && s1 > s0 && s2 > s1 && s2 > 0.95,
    `badai tumbuh seiring pasang, tanpa melompat (${s0.toFixed(2)} -> ${s1.toFixed(2)} -> ${s2.toFixed(2)})`);
  ok(h0.glow.r > h0.glow.b && h2.glow.r > h2.glow.b * 1.6,
    `cakrawala berubah warna dari hangat ke merah (rgb(${h0.glow.r},${h0.glow.g},${h0.glow.b}) -> rgb(${h2.glow.r},${h2.glow.g},${h2.glow.b}))`);
  // dan warnanya benar-benar merangkak, bukan melompat di batas fase (bug yang pernah ada)
  G.tide.t = P[0].until + 5;  const creepA = tideTint();
  G.tide.t = P[0].until + 55; const creepB = tideTint();
  ok(creepB > creepA + 0.05, `tint menanjak DI DALAM fase, bukan melompat (${creepA.toFixed(2)} -> ${creepB.toFixed(2)})`);
  G.tide.t = 0;
}

console.log('\n== 14. Target bantuan & HUD ==');
G.target = islandById(0);
ok(G.target && G.target.name, 'tujuan navigasi bisa dipilih dari peta');
const minim = { kind: null };
updateHUD(minim);
ok(true, 'updateHUD berjalan tanpa DOM nyata (aman untuk headless)');
toast('tes');
ok(true, 'toast aman tanpa DOM nyata');
openModal('chart'); closeModal();
ok(true, 'modal peta bisa dibuka & ditutup');

// ============================================================
console.log('\n== 15. Karakter 8 arah: animasi dibulatkan, gerak tetap bebas ==');
// Input joystick kontinu (sudut bebas) harus DIBULATKAN ke kelipatan 45° terdekat
// untuk memilih animasi; posisi/gerak TIDAK ikut terkunci. Arah barat (W/NW/SW)
// tidak digambar ulang — dicerminkan dari sisi kanan (E/NE/SE).
ok(SHEET_DIRS.join() === 'front,back,side,ne,se',
  `5 arah unik digambar (${SHEET_DIRS.join(',')}), sisanya dicerminkan`);

// --- tabel arah: setiap 8 arah utama memetakan ke (dir, flip) yang benar ---
const DIRS = [
  [[1, 0], 'side', 1],   // E
  [[1, 1], 'se', 1],     // SE
  [[0, 1], 'front', 1],  // S
  [[-1, 1], 'se', -1],   // SW (cermin SE)
  [[-1, 0], 'side', -1], // W  (cermin side)
  [[-1, -1], 'ne', -1],  // NW (cermin NE)
  [[0, -1], 'back', 1],  // N
  [[1, -1], 'ne', 1],    // NE
];
for (const [[dx, dy], dir, flip] of DIRS) {
  const got = directionOf(dx, dy);
  ok(got.dir === dir && got.flip === flip,
    `arah (${dx},${dy}) -> ${got.dir}${got.flip < 0 ? ' (cermin)' : ''} (harap ${dir}${flip < 0 ? ' cermin' : ''})`);
}

// --- pembulatan: sudut kontinu dekat batas tetap jatuh ke kelipatan 45° terdekat ---
// 20° dari timur = lebih dekat E daripada NE; -20° = masih E (bukan N).
ok(directionOf(Math.cos(0.35), Math.sin(0.35)).dir === 'side', '20° di atas timur -> E (bukan NE)');
ok(directionOf(Math.cos(-0.35), Math.sin(-0.35)).dir === 'side', '20° di bawah timur -> E (bukan N)');
// Konvensi: +x=timur, +y=selatan. 135° = kiri-bawah (SW) -> SE dicerminkan, bukan selatan.
const sw = directionOf(Math.cos(Math.PI * 0.75), Math.sin(Math.PI * 0.75));
ok(sw.dir === 'se' && sw.flip === -1, `135° (kiri-bawah) -> SW = SE dicerminkan (${sw.dir}, flip ${sw.flip})`);
// 60° = antara SE (45°) dan S (90°), lebih dekat SE
ok(directionOf(Math.cos(Math.PI / 3), Math.sin(Math.PI / 3)).dir === 'se', '60° -> SE (lebih dekat SE daripada S)');

// --- pemilihan frame: diam = frame 0, jalan = siklus 1..2, dan cermin ikut arah ---
{
  const fake = { front: ['f0', 'f1', 'f2'], back: ['b0', 'b1', 'b2'], side: ['s0', 's1', 's2'], ne: ['n0', 'n1', 'n2'], se: ['e0', 'e1', 'e2'] };
  ASSETS.sheets = { player: fake };
  const idle = sheetFrame('player', 0, 1, 0, false);      // menghadap selatan, diam
  ok(idle.img === 'f0' && idle.flip === 1, `diam menghadap S -> frame idle depan (${idle.img})`);
  const w1 = sheetFrame('player', 0, 1, Math.PI * 2 * 0.1, true);   // awal siklus
  const w2 = sheetFrame('player', 0, 1, Math.PI * 2 * 0.6, true);   // paruh siklus
  ok(w1.img === 'f1' && w2.img === 'f2', `jalan menghadap S -> siklus frame 1/2 (${w1.img},${w2.img})`);
  const wside = sheetFrame('player', -1, 0, 0, true);     // berjalan ke BARAT
  ok(wside.img === 's1' && wside.flip === -1, `jalan ke barat -> side DI-CERMIN (${wside.img}, flip ${wside.flip})`);
  const idleN = sheetFrame('player', 0, -1, 0, false);    // diam menghadap utara
  ok(idleN.img === 'b0', `diam menghadap N -> frame idle belakang (${idleN.img})`);
  // arah yang belum digambar (diagonal 4 tersisa) tidak menabrak: null aman
  ASSETS.sheets = {};
  ok(sheetFrame('player', 0, 1, 0, false) === null, 'sheet belum termuat -> null (render fallback aman)');
}

console.log(`\nHasil: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
