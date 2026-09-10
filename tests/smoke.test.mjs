// ============================================================
// Smoke test logika Last Harbor (tanpa browser)
// Jalankan:  node tests/smoke.test.mjs
// ============================================================
import { CFG } from '../js/config.js';
import { G } from '../js/state.js';
import { saveGame, loadGame, clearSave } from '../js/save.js';
import { addResource, capacity, usedStorage, canAfford, payCost } from '../js/inventory.js';
import { createBoat, updateBoat, maxHP, speedMult, boatLevel } from '../js/boat.js';
import { generateSeaWorld, nearestIsland } from '../js/world.js';
import { enterIsland, updateLand, tryAttack, collectNearby } from '../js/land.js';
import { makeZombie } from '../js/zombie.js';
import { initUI } from '../js/ui.js';
import { ASSETS } from '../js/assets.js';

// ---------- DOM stub ----------
function elStub() {
  return {
    classList: { add() {}, remove() {}, toggle() {}, contains: () => true },
    style: {}, textContent: '', innerHTML: '',
    appendChild() {}, remove() {},
    children: [], firstChild: null,
    onclick: null, disabled: false,
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

initUI({}); // isi cache elemen UI dengan stub agar toast() jalan

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓', msg); }
  else { fail++; console.log('  ✗ FAIL:', msg); }
}

console.log('== 0. Modul aset ==');
ok(typeof ASSETS === 'object', 'ASSETS tersedia (fallback vector aktif bila kosong)');

console.log('== 1. Konfigurasi & tabel upgrade ==');
ok(CFG.UPGRADES.storage.levels[0].cost.wood === 10 && CFG.UPGRADES.storage.levels[0].cost.fuel === 5, 'Storage Lv1: 10 Wood + 5 Fuel');
ok(CFG.UPGRADES.storage.levels[1].cost.wood === 20 && CFG.UPGRADES.storage.levels[1].cost.fuel === 10, 'Storage Lv2: 20 Wood + 10 Fuel');
ok(CFG.UPGRADES.speed.levels[0].cost.fuel === 5 && CFG.UPGRADES.speed.levels[0].cost.wood === 5, 'Speed Lv1: 5 Fuel + 5 Wood');
ok(CFG.UPGRADES.speed.levels[1].cost.fuel === 10 && CFG.UPGRADES.speed.levels[1].cost.wood === 10, 'Speed Lv2: 10 Fuel + 10 Wood');
ok(CFG.UPGRADES.defense.levels[0].cost.wood === 10 && CFG.UPGRADES.defense.levels[0].cost.medicine === 5, 'Defense Lv1: 10 Wood + 5 Medicine');
ok(CFG.UPGRADES.defense.levels[1].cost.wood === 20 && CFG.UPGRADES.defense.levels[1].cost.medicine === 10, 'Defense Lv2: 20 Wood + 10 Medicine');

console.log('== 2. Stat perahu ==');
G.upgrades = { storage: 0, speed: 0, defense: 0 };
ok(maxHP() === 100, 'HP default 100');
ok(capacity() === 10, 'Storage default 10');
ok(speedMult() === 1, 'Speed default 1x');
ok(boatLevel() === 1, 'Level default 1');
G.upgrades = { storage: 2, speed: 2, defense: 2 };
ok(maxHP() === 140, 'Defense Lv2 → maxHP 140');
ok(capacity() === 20, 'Storage Lv2 → kapasitas 20');
ok(Math.abs(speedMult() - 1.4) < 1e-9, 'Speed Lv2 → 1.4x');
ok(boatLevel() === 7, 'Level = 1+6 = 7');
G.upgrades = { storage: 0, speed: 0, defense: 0 };

console.log('== 3. Inventory & kapasitas ==');
G.resources = { fuel: 0, wood: 0, food: 0, medicine: 0 };
for (let i = 0; i < 12; i++) addResource('wood', 1);
ok(usedStorage() === 10, `Kapasitas dibatasi 10 (dapat ${usedStorage()})`);
ok(G.resources.wood === 10, 'Wood = 10');
G.resources.wood = 0;
G.resources.fuel = 10; G.resources.wood = 10;
ok(canAfford({ wood: 10, fuel: 5 }), 'canAfford Storage Lv1 (10🪵5⛽)');
payCost({ wood: 10, fuel: 5 });
ok(G.resources.wood === 0 && G.resources.fuel === 5, 'payCost mengurangi resource');
ok(!canAfford({ medicine: 1 }), 'canAfford false saat kurang');

console.log('== 4. Save / Load ==');
G.upgrades = { storage: 1, speed: 0, defense: 1 };
G.boatHP = 77; G.totalRuns = 5; G.bestTime = 130.5;
saveGame();
G.boatHP = 0; G.totalRuns = 0; G.bestTime = 0;
G.upgrades = { storage: 0, speed: 0, defense: 0 };
const loaded = loadGame();
ok(loaded, 'loadGame sukses');
ok(G.upgrades.storage === 1 && G.upgrades.defense === 1 && G.upgrades.speed === 0, 'Level upgrade tersimpan');
ok(G.boatHP === 77 && G.totalRuns === 5 && G.bestTime === 130.5, 'boatHP, runs, bestTime tersimpan');
ok(G.resources.fuel === 5, 'Resource tersimpan (fuel 5)');
clearSave();
ok(loadGame() === false, 'clearSave → load gagal (save hilang)');

console.log('== 5. Dunia laut & pulau ==');
G.boat = createBoat(0, 0);
generateSeaWorld();
ok(G.islands.length === CFG.SEA.ISLAND_COUNT, `6 pulau spawn (${G.islands.length})`);
let distOk = true, diffOk = true, nameOk = true;
for (const isl of G.islands) {
  const d = Math.hypot(isl.x, isl.y);
  if (d < 200 || d > 400) distOk = false;
  if (isl.difficulty < 1 || isl.difficulty > 3) diffOk = false;
  if (!isl.name) nameOk = false;
  const stockTotal = Object.values(isl.remaining).reduce((a, b) => a + b, 0);
  if (stockTotal !== 3 + isl.difficulty * 2) { ok(false, `stock pulau ${isl.name} = diff+2`); }
}
ok(distOk, 'Semua pulau di radius 200-400px dari perahu');
ok(diffOk && nameOk, 'Difficulty 1-3 & nama terisi');
const near = nearestIsland(0, 0);
ok(!!near.island, 'nearestIsland menemukan pulau');

console.log('== 6. Perahu: gerak + inertia ==');
G.boat = createBoat(0, 0);
G.anchored = false; G.fishing = null;
for (let i = 0; i < 60; i++) updateBoat(1 / 60, { x: 1, y: 0 });
const spd = Math.hypot(G.boat.vx, G.boat.vy);
ok(spd > 50, `Perahu bergerak (v=${spd.toFixed(1)} px/s)`);
ok(Math.abs(G.boat.angle) < 0.1, 'Menghadap timur');
const xBefore = G.boat.x;
for (let i = 0; i < 240; i++) updateBoat(1 / 60, { x: 0, y: 0 }); // lepas input
const xCoast = G.boat.x - xBefore;
ok(xCoast > 20, `Inertia: masih meluncur ${xCoast.toFixed(1)}px setelah lepas input`);
const spdAfter = Math.hypot(G.boat.vx, G.boat.vy);
ok(spdAfter < 10, `Melambat sampai hampir berhenti (v=${spdAfter.toFixed(2)})`);

console.log('== 7. Mode daratan ==');
const island = G.islands[0];
const beforeRemaining = { ...island.remaining };
G.boatHP = 100; G.pendingDeath = false;
enterIsland(island);
ok(!!G.land && !!G.land.player, 'Land world & player dibuat');
const expectZ = 2 + island.difficulty * 2;
ok(G.land.zombies.length === expectZ, `Zombie = 2+diff*2 = ${expectZ} (${G.land.zombies.length})`);
let resTotal = 0;
for (const r of G.land.resources) if (!r.taken) resTotal++;
const stockTotal = Object.values(island.remaining).reduce((a, b) => a + b, 0);
ok(resTotal === stockTotal, `Resource di daratan sesuai stock pulau (${resTotal})`);

// pickup dengan mendekati
const res0 = G.land.resources.find((r) => !r.taken);
G.land.player.x = res0.x; G.land.player.y = res0.y + 5;
G.resources = { fuel: 0, wood: 0, food: 0, medicine: 0 };
updateLand(0.016, { x: 0, y: 0 });
ok(res0.taken === true, 'Resource terambil otomatis saat didekati');
ok(G.resources[res0.type] === 1, `+1 ${res0.type} masuk inventory`);
ok(island.remaining[res0.type] === beforeRemaining[res0.type] - 1, 'remaining pulau berkurang');

// zombie mengejar + damage kontak
const z = makeZombie('fast', G.land.player.x + 40, G.land.player.y);
G.land.zombies.push(z);
const px = G.land.player.x;
updateLand(0.5, { x: 0, y: 0 });
ok(z.chasing === true, 'Zombie mengejar dalam radius aggro');
ok(z.x < px + 40, 'Zombie bergerak mendekat');
ok(typeof z.face === 'number', 'z.face ter-set (orientasi sprite)');
const hpBefore = G.boatHP;
G.land.player.x = z.x + (z.radius + CFG.PLAYER.RADIUS); G.land.player.y = z.y;
z.attackCd = 0;
updateLand(0.016, { x: 0, y: 0 });
ok(G.boatHP < hpBefore, `Kontak zombie mengurangi HP (${hpBefore} → ${G.boatHP})`);

// attack sampai mati → drop
const zCount = G.land.zombies.length;
for (let i = 0; i < 10; i++) { G.land.player.attackCd = 0; tryAttack(); }
ok(G.land.zombies.length < zCount, `Zombie mati setelah beberapa serangan (${zCount} → ${G.land.zombies.length})`);
const drops = G.land.resources.filter((r) => r.drop && !r.taken);
ok(drops.length >= 1, 'Zombie drop resource');

// collect tombol
const nearRes = G.land.resources.find((r) => !r.taken);
if (nearRes) {
  G.land.player.x = nearRes.x + 10; G.land.player.y = nearRes.y;
  const invBefore = usedStorage();
  collectNearby();
  ok(usedStorage() >= invBefore, 'Tombol COLLECT mengambil resource sekitar');
}

// death flag (pakai zombie yang masih hidup)
const zAlive = G.land.zombies[G.land.zombies.length - 1];
G.land.player.x = zAlive.x + 5; G.land.player.y = zAlive.y;
zAlive.attackCd = 0;
G.boatHP = 3;
updateLand(0.016, { x: 0, y: 0 });
ok(G.pendingDeath === true, 'HP habis → pendingDeath ter-set');

console.log(`\nHasil: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
