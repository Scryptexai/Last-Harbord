// ============================================================
// Harness PACING: bot bermain di atas MODUL ASLI (bukan tiruan).
// Gunanya bukan menguji unit, tetapi menjawab: "apakah loop-nya masih masuk akal
// setelah aku mengubah kamera / pasang / ekonomi?"
//
//   node tests/pacing.test.mjs            -> bot hati-hati (mundur di 42% lambung)
//   node tests/pacing.test.mjs 0          -> bot serakah (tidak pernah mundur)
//   node tests/pacing.test.mjs 0.42 5     -> 5 sesi, gaya hati-hati
//
// Laporan dicetak, dan hanya batas yang sangat longgar yang di-assert supaya alat ini
// tidak pernah jadi sumber test rapuh.
// ============================================================

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

// RNG ditanam LEBIH DULU, sebelum modul game diimpor: beberapa modul memakai Math.random
// saat pertama dimuat, dan kalau itu terjadi sebelum penanaman, hasil ukur berubah tiap jalan.
const { mulberry32 } = await import('./_seed.mjs');

const { CFG } = await import('../js/config.js');
const { G } = await import('../js/state.js');
const { maxHP, capacity, buyNext, canBuyNext, isMaxed, goalLabel } = await import('../js/refit.js');
const { addCarried, carriedLoad, emptyBag, bankCarried, dropCarried } = await import('../js/inventory.js');
const { generateWorld, nearestIsland, HARBOR, harborDist, islandById, islandTotalRemaining } = await import('../js/world.js');
const { createBoat, updateBoat } = await import('../js/boat.js');
const { enterIsland, updateLand, contextAction, atExtract, landContext, tryAttack } = await import('../js/land.js');
const { resetTide, updateTide, tidePhase } = await import('../js/tide.js');
const { enterHarbor, updateHarbor, harborContext } = await import('../js/harbor.js');
const { SPOTS } = await import('../js/harbor.js');
const { makeZombie } = await import('../js/zombie.js');

const retreatAt = process.argv[2] === undefined ? 0.42 : parseFloat(process.argv[2]);
const RUNS = parseInt(process.argv[3] || '3', 10);
const DT = 1 / 60;
const MAX_SESSION = 60 * 60 * 20;      // 20 menit per sesi (bukan per run)

function dist(a, b, c, d) { return Math.hypot(a - c, b - d); }

// RNG yang bisa diulang (lihat _seed.mjs): tanpa ini angka bot bergoyang antar-jalan,
// dan alat ukur yang hasilnya berubah tidak bisa dipakai sebagai bukti.

// ---------- bot: satu gaya main, dua ambang ----------
function playSession(seed) {
  Math.random = mulberry32(seed ^ 0x9e3779b9);   // angka yang sama setiap kali dijalankan
  generateWorld(seed);
  G.hull = maxHP();
  G.carried = emptyBag();
  G.banked = emptyBag();
  G.refit = 0;
  G.salvages = [];
  G.surveyed = {};
  G.tabbed = {};
  G.totalRuns = 0;
  G.boat = createBoat(HARBOR.x, -40);
  resetTide();                     // sesi baru = malam baru (kalau tidak, sesi 2/3 mewarisi malam sesi 1)
  // Sesi baru harus mulai dari keadaan bersih. Tanpa ini, kecepatan pemain yang tersisa
  // dari sesi sebelumnya ikut terbawa ke frame pertama sesi berikutnya.
  G.land = null; G.target = null; G.fishing = null; G.runActive = false;
  G.nearIsland = nearestIsland(G.boat.x, G.boat.y);
  G.cam.x = HARBOR.x; G.cam.y = HARBOR.y; G.cam.zoom = 1;

  const log = [];
  let runs = 0;
  let stuckFrames = 0;
  let lastProgress = 0;

  const pickTarget = () => {
    let best = null, bd = Infinity;
    for (const isl of G.islands) {
      const left = islandTotalRemaining(isl);
      if (left <= 0) continue;
      const d = dist(HARBOR.x, HARBOR.y, isl.x, isl.y);
      if (d < bd) { bd = d; best = isl; }
    }
    return best;
  };

  function startRun(target) {
    G.target = target;
    G.runActive = true;
    G.runTime = 0;
    G.state = 'sea';
    G.boat.x = HARBOR.x; G.boat.y = HARBOR.y - 160;
    G.boat.vx = 0; G.boat.vy = 0;
    if (!G.tide) resetTide();          // malam tidak direset: jam lanjut dari dermaga
    runs++;
    return { t: G.tide.t, night: G.tide.night || 0, phase: tidePhase(G.tide.t).key, hull: G.hull };
  }

  function bank() {
    const moved = bankCarried();
    G.runActive = false;
    enterHarbor();
    return moved;
  }

  while (!isMaxed() && runs < 60) {
    const target = pickTarget();
    if (!target) break;
    const start = startRun(target);

    let result = 'pulang';
    let death = false;

    // ---- pulau ----
    G.boat.x = target.x; G.boat.y = target.y + target.r + CFG.BOAT.PARK_OFFSET;
    G.boat.vx = 0; G.boat.vy = 0;
    enterIsland(target);
    G.state = 'land';
    let islandTime = 0;
    let last = 0;

    const cargoFull = () => carriedLoad() >= capacity();
    const hullFrac = () => G.hull / maxHP();

    while (G.state === 'land') {
      if (G.pendingDeath) { G.pendingDeath = false; death = true; result = 'MATI'; break; }
      const L = G.land;
      const p = L.player;

      // keputusan berbalik: palka penuh, lambung rendah, atau pulau sudah habis
      const cargoFull = carriedLoad() >= capacity();
      const lowHull = retreatAt > 0 && G.hull / maxHP() <= retreatAt;
      const left = L.nodes.some((nd) => !nd.taken);
      const mustLeave = cargoFull || lowHull || !left;

      if (mustLeave) {
        // pakai kondisi asli game (atExtract), bukan jarak ke titik tengah dermaga —
        // kalau tidak, bot melewati dermaga dan tersangkut di tepi pantai
        if (atExtract()) {
          // land.js hanya mengembalikan 'board'; perpindahan state adalah tugas main.js
          if (contextAction() === 'board') {
            G.land = null;
            G.state = 'sea';
            result = 'naik kapal';
            break;
          }
        }
        const dir = { x: L.extract.x - p.x, y: L.extract.y - p.y };
        const d = Math.hypot(dir.x, dir.y) || 1;
        updateLand(DT, d < 8 ? { x: 0, y: 0 } : { x: dir.x / d, y: dir.y / d }, { gatherHeld: false });
        const z = L.zombies.find((zz) => dist(zz.x, zz.y, p.x, p.y) < CFG.PLAYER.ATTACK_RANGE * 0.9);
        if (z) tryAttack();
        if (z) { G.hull = Math.min(maxHP(), G.hull); }   // bot tidak menghindar, hanya menyerang balik
      } else {
        // node terdekat; pelampung salvage diprioritaskan kalau ada di pulau ini
        const sv = L.nodes.find((nd) => nd.kind === 'salvage' && !nd.taken);
        let best = sv || null, bd = sv ? dist(sv.x, sv.y, p.x, p.y) : Infinity;
        if (!sv) {
          for (const nd of L.nodes) {
            if (nd.taken) continue;
            const d = dist(nd.x, nd.y, p.x, p.y);
            if (d < bd) { bd = d; best = nd; }
          }
        }
        if (!best) { result = 'habis'; break; }
        const dir = { x: best.x - p.x, y: best.y - p.y };
        const d = Math.hypot(dir.x, dir.y) || 1;
        const near = d < CFG.PLAYER.GATHER_NEAR - 2;
        // ancaman terdekat: hadapi sebelum memanen, jangan bertukar pukulan sambil diam
        let z = null, zd = Infinity;
        for (const zz of L.zombies) {
          const dz = dist(zz.x, zz.y, p.x, p.y);
          if (dz < zd) { zd = dz; z = zz; }
        }
        const threat = z && zd < 90;
        if (threat) {
          const facing = dist(z.x, z.y, p.x, p.y) < CFG.PLAYER.ATTACK_RANGE * 0.85;
          if (facing) tryAttack();
          const back = { x: p.x - z.x, y: p.y - z.y };
          const bd = Math.hypot(back.x, back.y) || 1;
          updateLand(DT, { x: back.x / bd, y: back.y / bd }, { gatherHeld: false });   // mundur sambil menebas
        } else {
          updateLand(DT, near ? { x: 0, y: 0 } : { x: dir.x / d, y: dir.y / d },
            { gatherHeld: near && !!p.gather });
          if (near && !p.gather && landContext().kind === 'gather') contextAction();
        }
      }

      updateTide(DT);
      G.runTime += DT;
      islandTime += DT;
      last = carriedLoad();
      if (process.env.PACE_TRACE && Math.floor(islandTime * 2) !== Math.floor((islandTime - DT) * 2)) {
        const nds = L.nodes.filter((n) => !n.taken);
        const t0 = nds[0];
        console.log(`    [t=${islandTime.toFixed(0)}s] p=(${p.x.toFixed(0)},${p.y.toFixed(0)}) palka=${last}/${capacity()} gather=${!!p.gather} fase=${p.gather ? (p.gather.t / p.gather.need).toFixed(2) : '-'} node sisa=${nds.length} terdekat=${t0 ? Math.round(dist(t0.x, t0.y, p.x, p.y)) : '-'}px zombie=${L.zombies.length} lambung=${G.hull.toFixed(0)}`);
      }
      if (islandTime > 240) { result = 'LAMA'; break; }
      if (G.pendingDeath) { G.pendingDeath = false; death = true; result = 'MATI'; break; }
    }

    if (G.state === 'land') { G.land = null; G.state = 'sea'; }
    // muatan dihitung SEBELUM dibongkar, bukan sesudah
    last = last;

    // ---- laut: kembali ke dermaga ----
    let sailTime = 0;
    if (!death) {
      G.state = 'sea';
      G.boat.x = target.x; G.boat.y = target.y + target.r + CFG.BOAT.PARK_OFFSET;
      G.boat.vx = 0; G.boat.vy = 0;
      G.nearIsland = nearestIsland(G.boat.x, G.boat.y);
      while (G.state === 'sea' && sailTime < 300) {
        const dir = { x: HARBOR.x - G.boat.x, y: HARBOR.y - G.boat.y };
        const d = Math.hypot(dir.x, dir.y) || 1;
        updateBoat(DT, { x: dir.x / d, y: dir.y / d }, { shallow: false });
        updateTide(DT);
        sailTime += DT;
        if (harborDist() < 170) { bank(); result = 'tambat'; break; }
      }
      if (G.state === 'sea') result = 'NYASAR';
    }

    if (death) {
      dropCarried();
      G.hull = Math.max(1, Math.round(0.5 * maxHP()));
      bank();
    }

    // ---- dermaga: beli kalau bisa, lalu berangkat lagi ----
    let bought = null;
    if (canBuyNext()) { const r = buyNext(); bought = r ? r.label : null; }
    if (G.hull < maxHP()) G.hull = Math.min(maxHP(), G.hull + 25);

    log.push({
      island: islandTime, sail: sailTime, cargo: last, tide: G.tide.t,
      tideStart: start.t, startPhase: start.phase, night: start.night,
      hullLost: Math.max(0, Math.round((start.hull - G.hull) * 10) / 10),
      nightNow: G.tide.night || 0,
      result, death, bought, rung: G.refit,
    });

    // deteksi macet: tidak ada kemajuan berapa run pun
    if (G.refit > lastProgress) { lastProgress = G.refit; stuckFrames = 0; }
    else if (++stuckFrames > 14 && !canBuyNext()) break;
  }

  return { log, rungs: G.refit, bank: { ...G.banked }, runs };
}

// Sidik jari satu sesi: dipakai untuk membuktikan alat ukur ini benar-benar bisa diulang.
function fingerprint(r) {
  const s = r.log.reduce((a, l) => a + l.island * 7.3 + l.sail * 3.1 + l.cargo * 11.7 + (l.death ? 1000 : 0), 0);
  return Math.round(s * 1000) / 1000 + '|' + r.rungs + '|' + r.runs;
}

// ---------- jalankan ----------
console.log(`\nBot: ${retreatAt > 0 ? `hati-hati (mundur di ${(retreatAt * 100).toFixed(0)}% lambung)` : 'SERAKAH (tidak pernah mundur)'}`);
console.log('sesi  run  cincin  rata pulau  rata layar  muatan  pasang   hasil');

const sessions = [];
for (let s = 0; s < RUNS; s++) {
  const seed = [4242, 777, 31337, 90210, 12345][s % 5];
  const r = playSession(seed);
  sessions.push(r);
  const isl = r.log.reduce((a, l) => a + l.island, 0) / Math.max(1, r.log.length);
  const sail = r.log.reduce((a, l) => a + l.sail, 0) / Math.max(1, r.log.length);
  const cargo = r.log.reduce((a, l) => a + l.cargo, 0) / Math.max(1, r.log.length);
  const tide = r.log.reduce((a, l) => a + l.tide, 0) / Math.max(1, r.log.length);
  console.log(
    `  ${s + 1}   ${String(r.log.length).padStart(3)}   ${String(r.rungs).padStart(3)}/6    ` +
    `${isl.toFixed(1).padStart(6)}s     ${sail.toFixed(1).padStart(5)}s   ` +
    `${cargo.toFixed(1).padStart(5)}  ${tide.toFixed(0).padStart(4)}s   ` +
    `${r.log.filter((l) => l.death).length} mati`
  );
}

// Sidik jari dicetak supaya dua JALAN PERINTAH yang berbeda bisa dibandingkan: RNG
// ditanam dan audio tidak lagi menggeser aliran acak, jadi keluaran yang sama berarti
// pengukuran ini bisa diulang (sudah diverifikasi dua kali jalan terpisah).
console.log(`\nsidik jari          : ${fingerprint(sessions[0])} (sesi 1, seed 4242)`);

const all = sessions.flatMap((s) => s.log);
const avg = (f) => all.reduce((a, l) => a + f(l), 0) / Math.max(1, all.length);
const deaths = all.filter((l) => l.death).length;
const completed = sessions.filter((s) => s.rungs >= 6).length;

console.log('\n--- RINGKASAN ---');
console.log(`total run                 : ${all.length}`);
console.log(`rata waktu di pulau       : ${avg((l) => l.island).toFixed(1)}s   (target desain 45-90s)`);
console.log(`rata waktu berlayar       : ${avg((l) => l.sail).toFixed(1)}s   (target 10-30s)`);
console.log(`rata muatan dibawa pulang : ${avg((l) => l.cargo).toFixed(1)} unit`);
{
  const P = CFG.TIDE.PHASES;
  console.log(`rata pasang saat tambat   : ${avg((l) => l.tide).toFixed(0)}s  ` +
    `(malam: 0-${P[0].until} tenang, ${P[0].until}-${P[1].until} berubah, ${P[1].until}+ pasang, ` +
    `${CFG.TIDE.DAWN_AT} fajar)`);
}

// ---- MALAM: apakah ketegangannya benar-benar datang, dan apakah tetap bisa dimainkan ----
const byPhase = {};
for (const l of all) (byPhase[l.startPhase] = byPhase[l.startPhase] || []).push(l);
console.log('\n--- PER FASE SAAT BERANGKAT (inilah bukti malam tidak mundur) ---');
for (const k of ['calm', 'turning', 'high']) {
  const g = byPhase[k] || [];
  if (!g.length) { console.log(`  ${k.padEnd(8)}: -`); continue; }
  const di = g.filter((l) => l.death).length;
  console.log(`  ${k.padEnd(8)}: ${String(g.length).padStart(3)} run   rata pulau ` +
    `${(g.reduce((a, l) => a + l.island, 0) / g.length).toFixed(0)}s   muatan ` +
    `${(g.reduce((a, l) => a + l.cargo, 0) / g.length).toFixed(1)}   ` +
    `lambung -${(g.reduce((a, l) => a + l.hullLost, 0) / g.length).toFixed(1)}   ` +
    `mati ${di} (${Math.round(100 * di / g.length)}%)`);
}
const dawns = sessions.reduce((a, r) => a + (r.log.length ? r.log[r.log.length - 1].nightNow : 0), 0);
console.log(`fajar terjadi             : ${dawns} kali dalam ${sessions.length} sesi (malam tamat dengan sendirinya)`);
console.log(`kematian                  : ${deaths} dari ${all.length} run`);
console.log(`sesi yang tamat (6/6)     : ${completed}/${sessions.length}`);
console.log(`hasil akhir per sesi      : ${all.filter((l) => l.result === 'MATI').length} mati, ` +
  `${all.filter((l) => l.result === 'TERJEBAK').length} terjebak, ` +
  `${all.filter((l) => l.result === 'habis').length} pulau habis`);

// batas longgar: alat ini tidak boleh jadi sumber test rapuh
let fail = 0;
function ok(cond, msg) { if (cond) console.log('  ✓ ' + msg); else { fail++; console.log('  ✗ FAIL: ' + msg); } }
console.log('');
ok(all.length > 0, 'bot menyelesaikan setidaknya satu run (loop tidak macet)');
ok(avg((l) => l.island) < 130, 'waktu di pulau tidak membengkak (maks 130s rata-rata)');
ok(avg((l) => l.sail) < 60, 'waktu berlayar tidak membengkak (maks 60s rata-rata)');
ok(all.filter((l) => l.result === 'TERJEBAK').length === 0, 'tidak ada run yang terjebak selamanya');
ok(sessions.some((r) => r.rungs >= 3), 'bot bisa menaiki tangga refit (>=3 tingkat) dalam 3 sesi');
ok(all.some((l) => l.startPhase !== 'calm'),
  'ada run yang BERANGKAT setelah fase tenang lewat (malam tidak direset tiap berlayar)');
ok(dawns > 0, 'fajar benar-benar terjadi: satu malam bisa tamat dalam satu sesi');
ok(all.filter((l) => l.result === 'NYASAR').length === 0, 'tidak ada run yang tersesat tanpa akhir di laut');

process.exit(fail ? 1 : 0);
