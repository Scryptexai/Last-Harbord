// ============ Daratan ============
// Pulau adalah taruhan yang ditaruh dengan kaki sendiri.
//  - Memanen MENAHANMU di tempat (0.8-1.2s) -> risiko nyata.
//  - Air pasang naik ke pantai -> jalur pulang bisa terputus.
//  - ZOMBIE MELAMBAT DI PANTAI -> kalau kau bisa mencapai air, kau bisa lolos.
//  - Harus kembali ke dermaga untuk naik kapal. Tidak ada teleport.
import { CFG } from './config.js';
import { G } from './state.js';
import { makeRng, clamp, dist } from './util.js';
import { addCarried, carriedFull } from './inventory.js';
import { makeZombie } from './zombie.js';
import { sfx } from './audio.js';
import { fx, burst, splash, flyItem, ring, addShake, addHitstop, addHurtDir, drawFxWorld } from './fx.js';
import { blobPath, markTaken, survey, islandRemaining, drawStormPulse } from './world.js';
import { ASSETS } from './assets.js';
import { consumeReinforce, tideTint, tideDanger, tidePhase } from './tide.js';
import { beginWorld, endWorld, upright, atUpright, byDepth } from './camera.js';
import { drawBoat, drawLanternPool } from './boat.js';
import { maxHP } from './refit.js';

const P = CFG.PLAYER;

// ---------- pembangunan pulau ----------
export function enterIsland(island) {
  const L = buildLand(island);
  G.land = L;
  G.cam.x = L.player.x;
  G.cam.y = L.player.y;
  G.cam.zoom = CFG.LAND.ZOOM;
  const first = survey(island);
  sfx('anchor');
  splash(L.extract.x, L.extract.y, 14);
  if (first) L.firstVisit = true;
  return L;
}

function buildLand(island) {
  const rng = makeRng(island.seed);
  const r = island.r;
  const playR = r * CFG.LAND.PLAY_RATIO;

  const shape = [];
  const n = 28;
  for (let i = 0; i < n; i++) shape.push({ a: (i / n) * Math.PI * 2, rr: r * (0.88 + rng() * 0.2) });

  const dockA = Math.PI / 2; // dermaga di sisi selatan
  const extract = { x: Math.cos(dockA) * r * 0.78, y: Math.sin(dockA) * r * 0.78, r: 62 };

  const place = (minD, maxD, minDistFromExtract = 0, tries = 30) => {
    for (let i = 0; i < tries; i++) {
      const a = rng() * Math.PI * 2;
      const d = minD + Math.sqrt(rng()) * (maxD - minD);
      const p = { x: Math.cos(a) * d, y: Math.sin(a) * d };
      if (dist(p.x, p.y, extract.x, extract.y) < minDistFromExtract) continue;
      return p;
    }
    return { x: 0, y: 0 };
  };

  // pepohonan & batu: menghalangi gerak + memutus garis pandang
  const trees = [];
  const nMul = 1 + island.ringIdx * 0.35;
  for (let i = 0; i < Math.round(16 * nMul); i++) {
    const p = place(r * 0.08, r * 0.66, r * 0.30);
    if (Math.hypot(p.x, p.y) < 20) continue;
    trees.push({ x: p.x, y: p.y, s: 11 + rng() * 9, seed: rng() });
  }
  const rocks = [];
  for (let i = 0; i < Math.round(7 * nMul); i++) {
    const p = place(r * 0.12, r * 0.64, r * 0.26);
    if (Math.hypot(p.x, p.y) < 20) continue;
    rocks.push({ x: p.x, y: p.y, s: 7 + rng() * 6 });
  }

  // ---- resource: tersebar ke arah dalam, makin dalam makin padat ----
  const remaining = islandRemaining(island);
  let units = Object.values(remaining).reduce((a, b) => a + b, 0);
  const pool = [];
  for (const [t, c] of Object.entries(remaining)) for (let i = 0; i < c; i++) pool.push(t);

  const richChance = 0.08 + island.ringIdx * 0.16;
  const nodes = [];
  let guard = 0;
  while (units > 0 && guard++ < 200) {
    const rich = units >= 2 && rng() < richChance;
    const qty = rich ? 2 : 1;
    const type = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    if (rich) {
      const extra = pool.indexOf(type);
      if (extra >= 0) pool.splice(extra, 1);
    }
    // makin dalam = makin kaya. Imbalan besar ada di pedalaman, bukan di pantai.
    const p = rich ? place(r * 0.46, r * 0.64, r * 0.30) : place(r * 0.14, r * 0.46, r * 0.28);
    nodes.push({ kind: 'res', type, x: p.x, y: p.y, qty, rich, taken: false, bob: rng() * 6.28 });
    units -= qty;
  }

  // ---- zombie: di sisi pulau yang jauh dari titik pendaratan ----
  const zombies = [];
  const zCount = island.zombies;
  for (let i = 0; i < zCount; i++) {
    let x = 0, y = 0;
    for (let t = 0; t < 40; t++) {
      const a = rng() * Math.PI * 2;
      const d = r * (0.34 + rng() * 0.44);
      x = Math.cos(a) * d; y = Math.sin(a) * d;
      if (dist(x, y, extract.x, extract.y) > r * 0.34) break;
    }
    zombies.push(makeZombie(pickZombieType(rng, island), x, y));
  }

  // ---- pelampung salvage: muatan yang hilang di pulau ini ----
  const sv = G.salvages.find((s) => s.islandId === island.id);
  if (sv) {
    nodes.push({
      kind: 'salvage', x: sv.x, y: sv.y, qty: Object.values(sv.cargo).reduce((a, b) => a + b, 0),
      cargo: sv.cargo, taken: false, bob: 0,
    });
  }

  // ---- kabut eksplorasi ----
  const cell = CFG.LAND.FOG_CELL;
  const span = r * 1.2;
  const cw = Math.ceil((span * 2) / cell);
  const ch = cw;

  return {
    island, r, playR, shape, trees, rocks, nodes, zombies,
    extract, waveCount: 0, firstVisit: false, moveAcc: { x: 0, y: 0 },
    // titik jangkar laut (dipakai kapal), sudut sama dengan dermaga
    boatPos: { x: 0, y: r * 0.95 + CFG.BOAT.PARK_OFFSET },
    fog: { cw, ch, cell, x0: -span, y0: -span, cells: new Uint8Array(cw * ch), dirty: true, lastX: 1e9, lastY: 1e9 },
    player: {
      x: extract.x, y: extract.y, vx: 0, vy: 0, face: -Math.PI / 2,
      atk: { phase: 'idle', t: 0, hitDone: false }, gather: null, invuln: 0,
      stepT: 0, gatherFade: 0,
    },
  };
}

function pickZombieType(rng, island) {
  const ring = CFG.SEA.RINGS[island.ringIdx];
  const roll = rng();
  if (roll < ring.tank) return 'tank';
  if (roll < ring.tank + ring.fast) return 'fast';
  return 'slow';
}

// ---------- input aksi ----------
// Satu tombol konteks: apa pun yang masuk akal dilakukan pemain saat ini.
export function landContext() {
  const L = G.land;
  if (!L || !L.player) return { kind: null };
  const p = L.player;
  if (p.gather) return { kind: 'gather', label: 'LEPAS', target: p.gather.node };
  const node = nearestNode(p);
  if (node) {
    const rich = node.kind === 'salvage' ? 'AMBIL MUATAN' : (node.rich ? 'PANEN (BANYAK)' : 'PANEN');
    return { kind: node.kind === 'salvage' ? 'salvage' : 'gather', label: rich, target: node };
  }
  if (atExtract()) return { kind: 'board', label: 'NAIK KAPAL' };
  return { kind: null };
}

export function atExtract() {
  const L = G.land;
  if (!L || !L.player) return false;
  return dist(L.player.x, L.player.y, L.extract.x, L.extract.y) < L.extract.r;
}

function nearestNode(p) {
  const L = G.land;
  let best = null, bd = P.GATHER_NEAR + 14;
  for (const nd of L.nodes) {
    if (nd.taken) continue;
    const d = dist(nd.x, nd.y, p.x, p.y);
    if (d < bd) { bd = d; best = nd; }
  }
  return best;
}

// Dipanggil tombol konteks (ketuk) / tombol E.
export function contextAction() {
  const L = G.land;
  if (!L || !L.player) return;
  const p = L.player;
  if (p.gather) { cancelGather(); return; }
  const node = nearestNode(p);
  if (node) {
    const need = node.kind === 'salvage' ? P.GATHER_SALVAGE : (node.rich ? P.GATHER_RICH : P.GATHER_SMALL);
    p.gather = { node, t: 0, need };
    return;
  }
  if (atExtract()) return 'board';
}

function cancelGather() {
  const p = G.land && G.land.player;
  if (!p || !p.gather) return;
  p.gatherFade = 1;
  p.gather = null;
}

function completeGather(node) {
  const p = G.land.player;
  const type = node.type;
  let added = 0;

  if (node.kind === 'salvage') {
    const cargo = node.cargo || {};
    let left = {};
    for (const [t, n] of Object.entries(cargo)) {
      const a = addCarried(t, n);
      if (a < n) left[t] = (left[t] || 0) + (n - a);
      added += a;
    }
    const svIdx = G.salvages.findIndex((s) => s.islandId === G.land.island.id);
    if (Object.keys(left).length === 0) {
      if (svIdx >= 0) G.salvages.splice(svIdx, 1);
      node.taken = true;
    } else {
      node.cargo = left;
      node.qty = Object.values(left).reduce((a, b) => a + b, 0);
      if (svIdx >= 0) G.salvages[svIdx].cargo = left;
    }
    if (added > 0) {
      sfx('salvage'); ring(p.x, p.y, '#ffcf6a', 40, 0.5);
      flyItem(node.x, node.y, p, Object.keys(cargo)[0]);
      addShake(0.12);
    } else {
      sfx('blockFull');
    }
  } else {
    added = addCarried(type, node.qty);
    if (added > 0) {
      node.taken = true;
      markTaken(G.land.island, type, added);
      flyItem(node.x, node.y, p, type);
      sfx('gather_done');
      burst(node.x, node.y, CFG.RESOURCES[type].color, 6, 70, 'spark', 2);
      if (added < node.qty) {
        // sisa tidak muat — tetap di tanah
        G.land.nodes.push({ kind: 'res', type, x: node.x + 12, y: node.y + 8, qty: node.qty - added, rich: false, taken: false, bob: 0 });
        sfx('blockFull');
      }
    } else {
      sfx('blockFull');
      node.taken = false;
    }
  }
  G.saveDirty = true;
}

// ---------- update ----------
export function updateLand(dt, move, opts = {}) {
  const L = G.land;
  if (!L || !L.player) return;
  const p = L.player;
  const held = !!opts.gatherHeld;

  p.invuln = Math.max(0, p.invuln - dt);
  p.gatherFade = Math.max(0, p.gatherFade - dt * 2);
  updateAttack(dt, move);

  // ---- gerak: terkunci saat memanen / ancang-ancang ----
  const locked = !!p.gather || p.atk.phase === 'windup' || p.atk.phase === 'active';
  const recov = p.atk.phase === 'recover' ? 0.8 : 1;
  if (!locked) {
    const ml = Math.hypot(move.x, move.y);
    // mengarungi air banjir saat pasang itu berat — dan bisa dilihat & dipelajari
    const inFlood = inFloodWater(L, p.x, p.y) ? (CFG.TIDE.WADE || 0.78) : 1;
    const tx = ml > 0.01 ? (move.x / Math.max(1, ml)) * P.SPEED * recov * inFlood : 0;
    const ty = ml > 0.01 ? (move.y / Math.max(1, ml)) * P.SPEED * recov * inFlood : 0;
    p.vx += (tx - p.vx) * clamp(dt / P.ACCEL_T, 0, 1);
    p.vy += (ty - p.vy) * clamp(dt / P.ACCEL_T, 0, 1);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (ml > 0.01) {
      const want = Math.atan2(move.y, move.x);
      let d = want - p.face;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      p.face += d * clamp(dt / P.TURN_T, 0, 1);
    }
    // langkah kaki
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > 20) {
      p.stepT -= dt;
      if (p.stepT <= 0) { p.stepT = 0.36; sfx('step'); }
    }
  } else {
    p.vx *= Math.pow(0.7, dt * 60); p.vy *= Math.pow(0.7, dt * 60);
  }

  collideObstacles(L, p);
  clampToIsland(p, L);

  updateGather(dt, held);
  updateZombies(dt, L);
  updateFog(L, p);

  if (fx.vignetteTarget === undefined) fx.vignetteTarget = 0;
  fx.vignetteTarget = clamp(1 - G.hull / Math.max(1, maxHP()), 0, 1) * (G.hull / maxHP() < 0.35 ? 1 : 0);

  if (G.pendingDeath) return;

  // gelombang bala bantuan masuk dari tepi pulau — selalu terlihat berjalan masuk
  if (consumeReinforce(dt) > 0) spawnWave(L);

}

// Dipanggil tombol SERANG / SPASI. Damage TIDAK langsung terjadi: ada windup,
// jendela aktif, lalu recovery yang membuatmu rentan. Itulah komitmennya.
export function tryAttack() {
  const L = G.land;
  if (!L || !L.player) return;
  const p = L.player;
  if (p.gather || p.atk.phase !== 'idle') return;
  p.atk.phase = 'windup';
  p.atk.t = P.WINDUP;
  p.atk.hitDone = false;
  const z = nearestZombie(L, p, P.ATTACK_RANGE + 46);
  if (z) p.face = Math.atan2(z.y - p.y, z.x - p.x);
}

function updateAttack(dt, move) {
  const L = G.land;
  const p = L.player;
  const a = p.atk;
  if (a.phase === 'idle') return;
  a.t -= dt;
  if (a.t > 0) return;

  if (a.phase === 'windup') {
    // windup selesai -> tebasan mendarat. Inilah momen komitmennya.
    a.phase = 'active'; a.t = P.ACTIVE; a.hitDone = true;
    const z = nearestZombie(L, p, P.ATTACK_RANGE);
    if (z) hitZombie(L, p, z);
    else sfx('whiff');
    return;
  }
  if (a.phase === 'active') {
    a.phase = 'recover'; a.t = P.RECOVER;
    return;
  }
  a.phase = 'idle'; a.t = 0;
}

function nearestZombie(L, p, range) {
  let best = null, bd = range + 40;
  for (const z of L.zombies) {
    const d = dist(z.x, z.y, p.x, p.y) - z.radius;
    if (d < bd) { bd = d; best = z; }
  }
  return best;
}

function hitZombie(L, p, z) {
  const def = CFG.ZOMBIES[z.type];
  z.hp -= P.ATTACK_DAMAGE;
  z.hitFlash = 1;
  const a = Math.atan2(z.y - p.y, z.x - p.x);
  z.x += Math.cos(a) * (P.KNOCKBACK / Math.max(0.6, z.radius / 14));
  z.y += Math.sin(a) * (P.KNOCKBACK / Math.max(0.6, z.radius / 14));
  clampToIsland(z, L);

  addHitstop(0.07);
  addShake(0.10);
  sfx('hit', def.pitch);
  burst(z.x, z.y, '#ffe9b0', 7, 120, 'spark', 2.4);
  ring(z.x, z.y, 'rgba(255,235,190,0.9)', z.radius + 8, 0.26);

  if (z.hp <= 0) killZombie(L, z);
}

function killZombie(L, z) {
  const i = L.zombies.indexOf(z);
  if (i >= 0) L.zombies.splice(i, 1);
  sfx('kill', CFG.ZOMBIES[z.type].pitch);
  addShake(0.16);
  burst(z.x, z.y, '#7a1f1f', 14, 150, 'spark', 3);
  // drop: harus dipanen seperti node lain (tidak ada auto-pickup)
  const types = Object.keys(CFG.RESOURCES);
  const type = types[Math.floor(Math.random() * types.length)];
  L.nodes.push({ kind: 'res', type, x: z.x, y: z.y, qty: 1, rich: false, taken: false, bob: Math.random() * 6 });
  G.saveDirty = true;
}

function updateGather(dt, held) {
  const L = G.land;
  const p = L.player;
  if (!p.gather) return;
  const g = p.gather;
  const nd = g.node;
  if (nd.taken || dist(nd.x, nd.y, p.x, p.y) > P.GATHER_NEAR + 16) { cancelGather(); return; }
  if (!held) {
    // tombol dilepas: progres hangus, node tetap ada (tidak ada kehilangan barang)
    cancelGather();
    return;
  }
  g.t += dt;
  if (Math.floor(g.t * 8) !== Math.floor((g.t - dt) * 8)) sfx('gather_tick');
  if (g.t >= g.need) {
    p.gather = null;
    completeGather(nd);
  }
}

function updateZombies(dt, L) {
  const p = L.player;
  const gathering = !!p.gather;
  for (const z of L.zombies) {
    z.attackCd -= dt;
    z.hitFlash = Math.max(0, z.hitFlash - dt * 5);
    z.groanCd = (z.groanCd || Math.random() * 6) - dt;

    const dx = p.x - z.x, dy = p.y - z.y;
    const d = Math.hypot(dx, dy) || 1;
    z.alertT = Math.max(0, (z.alertT || 0) - dt);
    z.callCd = Math.max(0, (z.callCd || 0) - dt);
    const alertMul = z.alertT > 0 ? CFG.PACK.AGGRO_MUL : 1;
    const aggro = z.aggro * (gathering ? 1.35 : 1) * alertMul;
    const wasChasing = z.chasing;

    if (d < aggro) {
      z.chasing = true;
      if (z.groanCd <= 0) { z.groanCd = 4 + Math.random() * 7; if (d < 320) sfx('groan', CFG.ZOMBIES[z.type].pitch); }
    } else {
      z.chasing = false;
      z.wanderT -= dt;
      if (z.wanderT <= 0) { z.wanderT = 1 + Math.random() * 2; z.wanderA = Math.random() * Math.PI * 2; }
    }

    // KAWANAN: kalau kau tertangkap basah sedang memanen, satu teriakan membangunkan yang lain.
    // Ini satu-satunya hal yang menghukum rasa aman yang berlebihan di pedalaman.
    // Hanya penemu pertama yang berteriak — tidak ada rantai — supaya radius panggilan
    // tetap berarti dan keputusan "mau memanen di sini?" tetap bisa dinilai pemain.
    if (z.chasing && !wasChasing && gathering && z.callCd <= 0 && z.alertT <= 0) {
      z.callCd = CFG.PACK.CALL_CD;
      callPack(L, z);
    }

    // MELAMBAT DI PANTAI: jalan keluar yang bisa dipelajari pemain
    const dd = Math.hypot(z.x, z.y);
    const inSand = dd > L.r * CFG.LAND.SAND_RATIO;
    const mud = inSand ? CFG.LAND.WATER_SLOW : 1;
    const sp = z.speed * mud;

    if (z.chasing) {
      z.x += dx / d * sp * dt;
      z.y += dy / d * sp * dt;
      z.face = Math.atan2(dy, dx);
    } else {
      z.x += Math.cos(z.wanderA) * sp * 0.45 * dt;
      z.y += Math.sin(z.wanderA) * sp * 0.45 * dt;
      z.face = z.wanderA;
    }
    collideObstacles(L, z);
    clampToIsland(z, L);

    // serangan kontak
    if (d < z.radius + P.RADIUS + 4 && z.attackCd <= 0 && p.invuln <= 0) {
      z.attackCd = 1.0;
      hurtPlayer(z.dmg, Math.atan2(z.y - p.y, z.x - p.x), z.type);
      p.x -= dx / d * 14;
      p.y -= dy / d * 14;
      clampToIsland(p, L);
      cancelGather();
      if (G.hull <= 0) { G.hull = 0; G.pendingDeath = true; }
    }
  }
}

// radius panggilan mengikuti besar pulau: di pulau kecil, kawanan = pulau itu sendiri;
// di pulau besar, tetap lokal. Skala bahaya datang dari ukuran, bukan dari angka ajaib.
function packRadius(L) {
  return Math.max(CFG.PACK.CALL_MIN, L.playR * CFG.PACK.CALL_FRAC);
}

function callPack(L, caller) {
  const R = packRadius(L);
  let woke = 0;
  for (const o of L.zombies) {
    if (o === caller || o.alertT > 1.5) continue;
    if (dist(o.x, o.y, caller.x, caller.y) > R) continue;
    o.alertT = CFG.PACK.ALERT_T;
    woke++;
  }
  if (woke > 0) {
    // bisa didengar SEBELUM terlihat — itulah gunanya
    sfx(caller.type === 'fast' ? 'screech' : 'groan', CFG.ZOMBIES[caller.type].pitch * 0.8);
    addShake(0.12);
    ring(caller.x, caller.y, 'rgba(255,120,110,0.7)', R * 0.5, 0.5);
  }
}

function hurtPlayer(dmg, angle, type) {
  G.hull -= dmg;
  G.hurtFlash = 0.4;
  const p = G.land.player;
  p.invuln = P.INVULN;
  addHurtDir(angle, clamp(dmg / 12, 0.35, 1));
  addShake(clamp(dmg / 20, 0.15, 0.5));
  sfx('hurt');
  sfx('crack');
  burst(p.x, p.y, '#e05a4a', 8, 90, 'spark', 2.2);
  G.saveDirty = true;
}

function wavePhase() { return tidePhase(G.tide ? G.tide.t : 0); }

function spawnWave(L) {
  const ph = wavePhase();
  const n = 1 + L.island.ringIdx + (ph && ph.waveBonus ? ph.waveBonus : 0);
  const p = L.player;
  // Seed dari dunia + pulau + nomor gelombang, bukan dari jam dinding: satu save dengan
  // seed yang sama harus melahirkan gelombang yang sama (bisa diuji, bisa diulang).
  const rng = makeRng((G.worldSeed ^ (L.island.id * 2654435761) ^ (L.waveCount * 7919)) >>> 0);
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0;
    for (let t = 0; t < 40; t++) {
      const a = rng() * Math.PI * 2;
      const d = L.r * (0.72 + rng() * 0.1);
      x = Math.cos(a) * d; y = Math.sin(a) * d;
      if (dist(x, y, p.x, p.y) > 240) break;
    }
    const z = makeZombie(pickZombieType(rng, L.island), x, y);
    z.wave = true;
    L.zombies.push(z);
  }
  L.waveCount++;
  sfx('screech');
}

function collideObstacles(L, e) {
  const R = e.radius || CFG.PLAYER.RADIUS;
  for (const list of [L.rocks, L.trees]) {
    for (const o of list) {
      const dx = e.x - o.x, dy = e.y - o.y;
      const d = Math.hypot(dx, dy);
      const min = o.s * (list === L.trees ? 0.55 : 0.8) + R;
      if (d < min && d > 0.001) {
        e.x = o.x + dx / d * min;
        e.y = o.y + dy / d * min;
      }
    }
  }
}

// Radius pulau pada sudut tertentu. Bentuk pulau digambar sebagai blob (26 titik),
// jadi batas gerak harus mengikuti BENTUK itu — bukan lingkaran. Kalau tidak, pemain
// bisa berjalan di atas air tepat di lekukan pantai.
export function shapeRadius(L, ang) {
  const n = L.shape.length;
  let a = ang % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  const f = (a / (Math.PI * 2)) * n;
  const i0 = Math.floor(f) % n, i1 = (i0 + 1) % n;
  const t = f - Math.floor(f);
  return L.shape[i0].rr * (1 - t) + L.shape[i1].rr * t;
}

function clampToIsland(e, L) {
  const d = Math.hypot(e.x, e.y);
  if (d < 0.001) return;
  const ang = Math.atan2(e.y, e.x);
  const max = Math.min(L.playR, shapeRadius(L, ang) * 0.985);
  if (d > max) { e.x = e.x / d * max; e.y = e.y / d * max; }
}

// ---------- kabut eksplorasi ----------
function updateFog(L, p) {
  const f = L.fog;
  if (Math.abs(p.x - f.lastX) < 6 && Math.abs(p.y - f.lastY) < 6) return;
  f.lastX = p.x; f.lastY = p.y;
  const rad = CFG.PLAYER.REVEAL;
  const c0x = Math.floor((p.x - rad - f.x0) / f.cell);
  const c1x = Math.ceil((p.x + rad - f.x0) / f.cell);
  const c0y = Math.floor((p.y - rad - f.y0) / f.cell);
  const c1y = Math.ceil((p.y + rad - f.y0) / f.cell);
  for (let cy = c0y; cy <= c1y; cy++) {
    for (let cx = c0x; cx <= c1x; cx++) {
      if (cx < 0 || cy < 0 || cx >= f.cw || cy >= f.ch) continue;
      const wx = f.x0 + (cx + 0.5) * f.cell;
      const wy = f.y0 + (cy + 0.5) * f.cell;
      const d = Math.hypot(wx - p.x, wy - p.y);
      if (d > rad) continue;
      const idx = cy * f.cw + cx;
      if (!f.cells[idx]) { f.cells[idx] = 1; f.dirty = true; }
    }
  }
}

export function isRevealed(L, x, y) {
  const f = L.fog;
  const cx = Math.floor((x - f.x0) / f.cell);
  const cy = Math.floor((y - f.y0) / f.cell);
  if (cx < 0 || cy < 0 || cx >= f.cw || cy >= f.ch) return false;
  return !!f.cells[cy * f.cw + cx];
}

// Dipakai main.js untuk menyimpan muatan yang hilang saat mati.
// Batas air banjir: satu rumus, dipakai gerak DAN gambar. Tidak boleh ada dua versi.
export function floodRadius(L) {
  return L.r * (1.06 - CFG.LAND.FLOOD * tideDanger());
}

export function inFloodWater(L, x, y) {
  if (!L) return false;
  return Math.hypot(x, y) > floodRadius(L);
}

export function playerWorldPos() {
  const L = G.land;
  if (!L || !L.player) return null;
  return { x: L.player.x, y: L.player.y };
}

// ---------- render ----------
function ensureFogCanvas(L) {
  if (L._fogCv) return L._fogCv;
  if (typeof document === 'undefined' || !document.createElement) return null;
  const cv = document.createElement('canvas');
  cv.width = L.fog.cw; cv.height = L.fog.ch;
  const g = cv.getContext ? cv.getContext('2d') : null;
  if (!g) return null;
  L._fogCv = cv; L._fogCtx = g; L.fog.dirty = true;
  return cv;
}

function paintFog(L) {
  const f = L.fog;
  const g = L._fogCtx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, f.cw, f.ch);
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = 'rgba(3,7,12,0.93)';
  g.fillRect(0, 0, f.cw, f.ch);
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  for (let cy = 0; cy < f.ch; cy++) {
    for (let cx = 0; cx < f.cw; cx++) {
      if (f.cells[cy * f.cw + cx]) g.fillRect(cx, cy, 1, 1);
    }
  }
  g.globalCompositeOperation = 'source-over';
  f.dirty = false;
}

// Dipakai fx: item yang terbang ke pemain. Argumennya TYPE (string), bukan node.
function drawItemIcon(ctx, type, x, y, size) {
  const def = CFG.RESOURCES[type];
  if (!def) return;
  const img = ASSETS[type];
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
  } else {
    ctx.fillStyle = def.color;
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
  }
}

function drawNodeIcon(ctx, nd, x, y, size) {
  if (nd.kind === 'salvage') {
    // pelampung: tong + bendera
    ctx.fillStyle = '#d8d2c4';
    ctx.beginPath(); ctx.ellipse(x, y + size * 0.3, size * 0.62, size * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b23b1f';
    ctx.fillRect(x - size * 0.66, y - size * 0.1, size * 1.32, size * 0.4);
    ctx.strokeStyle = '#e9e2d4'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - size * 0.1); ctx.lineTo(x, y - size * 1.1); ctx.stroke();
    ctx.fillStyle = '#ffcf6a';
    ctx.beginPath(); ctx.moveTo(x, y - size * 1.1); ctx.lineTo(x + size * 0.7, y - size * 0.85); ctx.lineTo(x, y - size * 0.6); ctx.closePath(); ctx.fill();
    return;
  }
  const def = CFG.RESOURCES[nd.type];
  const img = ASSETS[nd.type];
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
  } else {
    ctx.fillStyle = def.color;
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
  }
}

export function drawLand(ctx, vw, vh) {
  const L = G.land;
  if (!L) return;
  const tint = tideTint();
  const danger = tideDanger();
  const zoom = G.cam.zoom || 1;

  ctx.fillStyle = '#05121d';
  ctx.fillRect(0, 0, vw, vh);

  // Kamera miring: tanah diperas vertikal, benda berdiri tetap tegak (lihat camera.js).
  beginWorld(ctx, vw, vh);

  const fl = CFG.FLAVORS[L.island.flavor];

  // laut
  ctx.fillStyle = '#0a2233';
  ctx.fillRect(G.cam.x - vw, G.cam.y - vh, vw * 2, vh * 2);

  // air dangkal di sekitar pulau
  blobPath(ctx, 0, 0, L.shape, 1.2);
  ctx.fillStyle = `rgba(26,84,112,${0.5 + tint * 0.2})`;
  ctx.fill();

  // pasir
  blobPath(ctx, 0, 0, L.shape, 1);
  ctx.fillStyle = tint > 0.6 ? shadeHex(fl.sand, -0.18) : fl.sand;
  ctx.fill();

  // PASANG NAIK KE PANTAI — kanal informasi utama, bukan UI.
  // Satu rumus dengan gerak: floodRadius(). Kalau digambar sendiri di sini, gambar dan
  // tabrakan bisa berbeda, dan pemain berjalan di air (atau sebaliknya) tanpa alasan.
  // Warna air tetap ikut tint (isyarat); POSISINYA ikut bahaya (ongkos).
  blobPath(ctx, 0, 0, L.shape, floodRadius(L) / L.r);
  ctx.fillStyle = `rgba(20,66,92,${0.72 + danger * 0.2})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(160,220,255,${0.2 + danger * 0.28})`;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // rumput
  blobPath(ctx, 0, 0, L.shape, CFG.LAND.SAND_RATIO);
  ctx.fillStyle = tint > 0.6 ? shadeHex(fl.grass, -0.2) : fl.grass;
  ctx.fill();

  // dermaga
  drawPier(ctx, L);

  // ---- BAYANGAN DI TANAH (datar, ikut miring) ----
  // Semua bayangan digambar lebih dulu: benda berdiri tanpa bayangan tampak melayang.
  drawGroundShadows(ctx, L);
  ctx.fillStyle = 'rgba(0,0,0,0.26)';
  for (const t of L.trees) {
    ctx.beginPath(); ctx.ellipse(t.x, t.y + t.s * 0.35, t.s * 1.15, t.s * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (const rk of L.rocks) {
    ctx.beginPath(); ctx.ellipse(rk.x, rk.y + rk.s * 0.2, rk.s * 1.1, rk.s * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  }

  // ---- LAPISAN BERDIRI, DIURUTKAN MENURUT KEDALAMAN ----
  // Aturan kamera miring: yang lebih dekat kamera (y lebih besar) digambar terakhir,
  // sehingga pohon di depan benar-benar menutupi zombie di belakangnya.
  const nearExtract = dist(L.player.x, L.player.y, L.extract.x, L.extract.y) < L.extract.r * 1.4;
  const layer = [];
  for (const rk of L.rocks) layer.push({ y: rk.y, draw: () => drawRock(ctx, rk) });
  for (const t of L.trees) layer.push({ y: t.y, draw: () => drawTree(ctx, t) });
  for (const nd of L.nodes) {
    if (nd.taken) continue;
    if (!isRevealed(L, nd.x, nd.y) && !nd.forceShow) continue;
    layer.push({ y: nd.y, draw: () => drawNode(ctx, L, nd) });
  }
  for (const z of L.zombies) layer.push({ y: z.y, draw: () => drawZombie(ctx, L, z) });
  // Kapal duduk di buritan: paling dekat kamera. Kalau pemain berdiri di dermaga,
  // ia diangkat sedikit supaya tidak tertutup lambung kapal saat naik.
  layer.push({ y: L.boatPos.y + 6, draw: () => drawBoatAtLand(ctx, L) });
  layer.push({ y: nearExtract ? L.boatPos.y + 14 : L.player.y, draw: () => drawPlayer(ctx, L) });
  layer.sort(byDepth);
  for (const item of layer) item.draw();

  // partikel dunia (fx)
  drawFxWorld(ctx, drawItemIcon);

  // kabut eksplorasi
  const cv = ensureFogCanvas(L);
  if (cv) {
    if (L.fog.dirty) paintFog(L);
    const f = L.fog;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(cv, f.x0, f.y0, f.cw * f.cell, f.ch * f.cell);
    ctx.restore();
  }

  // cincin progres panen
  const p = L.player;
  if (p.gather) {
    const g = p.gather;
    const k = clamp(g.t / g.need, 0, 1);
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(g.node.x, g.node.y - 4, 26, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ffd782'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(g.node.x, g.node.y - 4, 26, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
    ctx.restore();
  } else if (p.gatherFade > 0) {
    ctx.save();
    ctx.globalAlpha = p.gatherFade;
    ctx.strokeStyle = '#e06a5a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(p.x, p.y - 4, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.gatherFade); ctx.stroke();
    ctx.restore();
  }

  endWorld(ctx);

  // kilat jauh juga terlihat dari darat: dunia ini punya langit yang sama
  drawStormPulse(ctx, vw, vh, 0.55);

  // pasang: gelap + tepi merah
  if (tint > 0.3) {
    const g = ctx.createLinearGradient(0, 0, 0, vh);
    g.addColorStop(0, `rgba(80,16,10,${(tint - 0.3) * 0.42})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh * 0.55);
    const dark = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.3, vw / 2, vh / 2, Math.max(vw, vh) * 0.66);
    dark.addColorStop(0, 'rgba(0,0,0,0)');
    dark.addColorStop(1, `rgba(6,10,18,${(tint - 0.3) * 0.7})`);
    ctx.fillStyle = dark; ctx.fillRect(0, 0, vw, vh);
  }
}

function shadeHex(hex, k) {
  const p = parseInt(hex.slice(1), 16);
  const r = clamp(Math.round(((p >> 16) & 255) * (1 + k)), 0, 255);
  const g = clamp(Math.round(((p >> 8) & 255) * (1 + k)), 0, 255);
  const b = clamp(Math.round((p & 255) * (1 + k)), 0, 255);
  return `rgb(${r},${g},${b})`;
}

function drawPier(ctx, L) {
  const y0 = L.r * 0.66, y1 = L.r * 0.99;
  const w = 34;
  ctx.fillStyle = '#6b4522';
  ctx.fillRect(-w / 2, y0, w, y1 - y0);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  for (let y = y0; y < y1; y += 12) ctx.fillRect(-w / 2, y, w, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(-w / 2, y0, 3, y1 - y0);
  // lentera dermaga
  const lx = -w / 2 - 8, ly = y0 + 10;
  const flick = 0.85 + Math.sin(G.time * 6.2) * 0.12;
  const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 90 * flick);
  g.addColorStop(0, 'rgba(255,200,120,0.5)');
  g.addColorStop(1, 'rgba(255,170,80,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(lx, ly, 90 * flick, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd79a';
  ctx.beginPath(); ctx.arc(lx, ly, 3.4, 0, Math.PI * 2); ctx.fill();
}

function drawBoatAtLand(ctx, L) {
  const bp = L.boatPos;
  // Saat air naik, cahaya kapal tumbuh dan berdenyut lebih cepat: satu-satunya benda
  // di pulau yang memanggil pemain pulang, tanpa satu kata pun.
  const k = tideTint();
  const poolR = 190 * (1 + k * 0.35);
  drawLanternPool(ctx, bp.x, bp.y, poolR);
  const saved = { x: G.boat.x, y: G.boat.y, vx: G.boat.vx, vy: G.boat.vy, angle: G.boat.angle };
  G.boat.x = bp.x; G.boat.y = bp.y; G.boat.vx = 0; G.boat.vy = 0; G.boat.angle = -Math.PI / 2;
  atUpright(ctx, bp.x, bp.y, () => {
    ctx.translate(-bp.x, -bp.y);      // batalkan translate drawBoat: asal = posisi kapal
    drawBoat(ctx, G.boat, 1.25);
  });
  G.boat.x = saved.x; G.boat.y = saved.y; G.boat.vx = saved.vx; G.boat.vy = saved.vy; G.boat.angle = saved.angle;

  // zona naik kapal
  const p = L.player;
  const near = dist(p.x, p.y, L.extract.x, L.extract.y) < L.extract.r;
  ctx.save();
  ctx.setLineDash([7, 7]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = near ? 'rgba(255,214,130,0.95)' : 'rgba(255,214,130,0.35)';
  ctx.beginPath(); ctx.arc(L.extract.x, L.extract.y, L.extract.r, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  if (near) {
    atUpright(ctx, L.extract.x, L.extract.y, () => {
      ctx.fillStyle = 'rgba(255,236,190,0.95)';
      ctx.font = 'bold 13px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NAIK KAPAL', 0, -L.extract.r * 0.9);
    });
  }
  ctx.restore();
}

// Bayangan semua yang berdiri, rata di tanah, digambar sebelum lapisan berdiri.
function drawGroundShadows(ctx, L) {
  const p = L.player;
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 3, CFG.PLAYER.RADIUS * 0.95, CFG.PLAYER.RADIUS * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  for (const z of L.zombies) {
    ctx.globalAlpha = isRevealed(L, z.x, z.y) ? 0.3 : 0.16;
    ctx.beginPath(); ctx.ellipse(z.x, z.y + 3, z.radius * 0.9, z.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Batu & pohon: benda yang benar-benar berdiri di atas tanah, bukan tempelan pipih.
function drawRock(ctx, rk) {
  atUpright(ctx, rk.x, rk.y, (p) => {
    const sz = rk.s * 2.4 * p;
    const img = ASSETS.rock;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -sz / 2, -sz * 0.66, sz, sz);
    } else {
      ctx.fillStyle = '#52606d';
      ctx.beginPath(); ctx.ellipse(0, -rk.s * 0.4 * p, rk.s * p, rk.s * 0.8 * p, 0, 0, Math.PI * 2); ctx.fill();
    }
  });
}

function drawTree(ctx, t) {
  atUpright(ctx, t.x, t.y, (p) => {
    const sz = t.s * 3.1 * p;
    const img = ASSETS.tree;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -sz / 2, -sz * 0.88, sz, sz);
    } else {
      ctx.fillStyle = '#3b3122';
      ctx.fillRect(-t.s * 0.14 * p, -t.s * 0.9 * p, t.s * 0.28 * p, t.s * 0.9 * p);
      ctx.fillStyle = '#1c4627';
      ctx.beginPath(); ctx.arc(0, -t.s * 1.25 * p, t.s * 0.95 * p, 0, Math.PI * 2); ctx.fill();
    }
  });
}

// Node resource: BARANG di tanah, bukan ikon datar yang ditempel di lantai.
function drawNode(ctx, L, nd) {
  const bob = Math.sin(G.time * 2.6 + nd.bob) * 2.4;
  const size = nd.kind === 'salvage' ? 30 : (nd.rich ? 30 : 22);
  const gl = 0.3 + Math.sin(G.time * 3 + nd.bob) * 0.16;
  ctx.globalAlpha = gl;
  ctx.fillStyle = nd.kind === 'salvage' ? '#ffcf6a' : CFG.RESOURCES[nd.type].color;
  ctx.beginPath(); ctx.ellipse(nd.x, nd.y + 2, size * 0.85, size * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  atUpright(ctx, nd.x, nd.y, () => {
    ctx.translate(0, -size * 0.32 + bob);
    drawNodeIcon(ctx, nd, 0, 0, size);
    if (nd.rich && nd.kind === 'res') {
      ctx.fillStyle = 'rgba(255,240,190,0.95)';
      ctx.font = 'bold 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('×2', 0, -size * 0.72);
    }
  });
}

function drawZombie(ctx, L, z) {
  const def = CFG.ZOMBIES[z.type];
  const revealed = isRevealed(L, z.x, z.y);
  const img = ASSETS['zombie_' + z.type];

  // Arah hadap dibaca dari TANAH: sektor tipis di depan kakinya. Di kamera miring,
  // "ke mana ia berjalan" jadi pertanyaan spasial, bukan pertanyaan sprite.
  if (revealed) {
    const a = z.face !== undefined ? z.face : 0;
    ctx.save();
    ctx.globalAlpha = z.chasing ? 0.38 : 0.16;
    ctx.fillStyle = z.chasing ? '#e0554a' : '#9fb0c0';
    ctx.beginPath();
    ctx.moveTo(z.x, z.y);
    ctx.ellipse(z.x, z.y, z.radius * 1.9, z.radius * 0.85, 0, a - 0.5, a + 0.5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  atUpright(ctx, z.x, z.y, () => {
  if (!revealed) ctx.globalAlpha = 0.34;
  // Menghadap kiri/kanan = cermin, bukan rotasi: kamera miring, jadi tubuh tetap tegak.
  const flip = Math.cos(z.face || 0) < 0 ? -1 : 1;
  ctx.scale(flip, 1);

  if (img && img.complete && img.naturalWidth > 0) {
    const sz = z.radius * 2.9;
    ctx.drawImage(img, -sz / 2, -sz * 0.92, sz, sz);
  } else {
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.ellipse(0, -z.radius * 0.85, z.radius, z.radius * 1.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.outline;
    ctx.beginPath(); ctx.ellipse(0, -z.radius * 1.55, z.radius * 0.6, z.radius * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  }

  // kilatan kena pukul: lebih murah dari ctx.filter, lebih terbaca
  if (z.hitFlash > 0.34) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,240,200,${(z.hitFlash - 0.34) * 1.3})`;
    ctx.beginPath(); ctx.arc(0, -z.radius * 0.95, z.radius * 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  if (revealed) {
    // HP bar hanya untuk yang benar-benar ganas (raksasa) — sampah tidak perlu bar
    if (z.type === 'tank' || z.hp < z.maxHp) {
      const bw = 26;
      const by = -z.radius * 2.7;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(-bw / 2, by, bw, 3.5);
      ctx.fillStyle = '#e0554a';
      ctx.fillRect(-bw / 2, by, bw * Math.max(0, z.hp / z.maxHp), 3.5);
    }
  } else {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 13px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', 0, -z.radius * 2.5);
  }
  });
}

function drawPlayer(ctx, L) {
  const p = L.player;
  const img = ASSETS.player;

  // cincin "kau di sini" — rata di tanah, jadi ikut miring bersama tanah
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(p.x, p.y, CFG.PLAYER.RADIUS + 6, 0, Math.PI * 2); ctx.stroke();

  // Berdiri di air: kaki basah. Ini yang membuat "air naik" terasa di badan pemain,
  // bukan cuma di latar belakang — dan menjelaskan mengapa ia melambat.
  if (inFloodWater(L, p.x, p.y)) {
    const t = G.time;
    ctx.save();
    ctx.strokeStyle = `rgba(178,224,255,${0.22 + 0.1 * Math.sin(t * 2.4)})`;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 2; i++) {
      const k = (t * 0.7 + i * 0.5) % 1;
      ctx.globalAlpha = (1 - k) * 0.45;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 2, (10 + k * 20), (4 + k * 8), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  atUpright(ctx, p.x, p.y, () => {
    if (p.invuln > 0 && Math.floor(G.time * 20) % 2 === 0) ctx.globalAlpha = 0.5;
    const flip = Math.cos(p.face) < 0 ? -1 : 1;
    ctx.scale(flip, 1);
    if (img && img.complete && img.naturalWidth > 0) {
      const sz = 36;
      ctx.drawImage(img, -sz / 2, -sz * 0.92, sz, sz);
    } else {
      ctx.fillStyle = '#e67e22';
      ctx.beginPath(); ctx.ellipse(0, -15, 12, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f0c39a';
      ctx.beginPath(); ctx.arc(0, -27, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  });

  // tebasan: busur rata di tanah — sekaligus indikator jangkauan, bukan hiasan
  const a = p.atk;
  if (a.phase === 'windup' || a.phase === 'active') {
    const k = a.phase === 'windup' ? 1 - a.t / CFG.PLAYER.WINDUP : a.t / CFG.PLAYER.ACTIVE;
    const spread = a.phase === 'windup' ? 0.35 : 0.95;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.face);
    ctx.strokeStyle = `rgba(255,238,170,${0.35 + k * 0.6})`;
    ctx.lineWidth = 5 - k * 2;
    ctx.beginPath(); ctx.arc(0, 0, CFG.PLAYER.ATTACK_RANGE * 0.62, -spread, spread); ctx.stroke();
    ctx.restore();
  }
}

