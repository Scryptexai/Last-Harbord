// ============ Mode Daratan (top-down survival di pulau) ============
import { CFG } from './config.js';
import { G } from './state.js';
import { makeRng } from './util.js';
import { addResource, capacity, usedStorage } from './inventory.js';
import { makeZombie } from './zombie.js';
import { toast } from './ui.js';
import { blobPath } from './world.js';
import { ASSETS } from './assets.js';

let fullToastCd = 0;

// Masuk mode daratan. Membuat world daratan sekali lalu dipakai ulang saat revisit
export function enterIsland(island) {
  island.visited = true;
  if (!island.landState) island.landState = buildLand(island);
  const L = island.landState;

  const dockA = Math.PI / 2; // dock di bawah pulau
  L.player = {
    x: Math.cos(dockA) * L.r * 0.62,
    y: Math.sin(dockA) * L.r * 0.62,
    face: -Math.PI / 2,
    attackCd: 0,
    swing: 0,
  };
  L.zombies = spawnZombies(island, L);
  fullToastCd = 0;
  G.land = L;
}

function buildLand(island) {
  const rng = makeRng(island.landSeed);
  const r = CFG.LAND.BASE_RADIUS + island.difficulty * CFG.LAND.RADIUS_PER_DIFF;

  const shape = [];
  const n = 26;
  for (let i = 0; i < n; i++) {
    shape.push({ a: (i / n) * Math.PI * 2, rr: r * (0.8 + rng() * 0.32) });
  }

  const place = (rad) => {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * rad;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d };
  };

  const trees = [];
  for (let i = 0, nT = 8 + island.difficulty * 3; i < nT; i++) {
    const p = place(r * 0.7);
    trees.push({ x: p.x, y: p.y, s: 12 + rng() * 8 });
  }
  const rocks = [];
  for (let i = 0, nR = 4 + island.difficulty * 2; i < nR; i++) {
    const p = place(r * 0.66);
    rocks.push({ x: p.x, y: p.y, s: 8 + rng() * 6 });
  }

  // resource tersebar; jangan terlalu dekat titik dock/spawn
  const resources = [];
  const sx = 0, sy = Math.sin(Math.PI / 2) * r * 0.62;
  for (const [type, cnt] of Object.entries(island.remaining)) {
    for (let k = 0; k < cnt; k++) {
      let p = place(r * 0.68);
      let tries = 0;
      while (tries++ < 25 && Math.hypot(p.x - sx, p.y - sy) < 110) p = place(r * 0.68);
      resources.push({ type, x: p.x, y: p.y, taken: false, drop: false });
    }
  }

  return { island, r, shape, trees, rocks, resources, zombies: [], player: null };
}

// Jumlah zombie & keberagaman tipe naik mengikuti difficulty.
function spawnZombies(island, L) {
  const rng = makeRng((island.landSeed + (Date.now() & 0xffff) + G.totalRuns * 7919) >>> 0);
  const diff = island.difficulty;
  const count = 2 + diff * 2; // d1:4, d2:6, d3:8

  const pickType = () => {
    const roll = rng();
    if (diff === 1) return roll < 0.7 ? 'slow' : 'fast';
    if (diff === 2) return roll < 0.45 ? 'slow' : (roll < 0.85 ? 'fast' : 'tank');
    return roll < 0.3 ? 'slow' : (roll < 0.7 ? 'fast' : 'tank');
  };

  const sx = L.player.x, sy = L.player.y;
  const arr = [];
  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, tries = 0;
    do {
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng()) * L.r * 0.72;
      x = Math.cos(a) * d;
      y = Math.sin(a) * d;
    } while (tries++ < 25 && Math.hypot(x - sx, y - sy) < 130);
    arr.push(makeZombie(pickType(), x, y));
  }
  return arr;
}

function clampToIsland(e, L) {
  const d = Math.hypot(e.x, e.y);
  const max = L.r * 0.78;
  if (d > max && d > 0) {
    e.x = e.x / d * max;
    e.y = e.y / d * max;
  }
}

// Update daratan: gerak player, AI zombie, damage kontak, auto-pickup.
export function updateLand(dt, move) {
  const L = G.land;
  if (!L || !L.player) return;
  const p = L.player;

  p.attackCd -= dt;
  p.swing = Math.max(0, p.swing - dt);
  fullToastCd -= dt;

  const ml = Math.hypot(move.x, move.y);
  if (ml > 0.01) {
    const nx = move.x / Math.max(1, ml);
    const ny = move.y / Math.max(1, ml);
    p.x += nx * CFG.PLAYER.SPEED * dt;
    p.y += ny * CFG.PLAYER.SPEED * dt;
    p.face = Math.atan2(ny, nx);
  }
  clampToIsland(p, L);

  for (const z of L.zombies) {
    z.attackCd -= dt;
    z.hitFlash = Math.max(0, z.hitFlash - dt * 5);

    const dx = p.x - z.x, dy = p.y - z.y;
    const d = Math.hypot(dx, dy) || 1;

    if (d < z.aggro) {
      // kejar player
      z.x += dx / d * z.speed * dt;
      z.y += dy / d * z.speed * dt;
      z.chasing = true;
      z.face = Math.atan2(dy, dx);
    } else {
      // wander acak
      z.chasing = false;
      z.wanderT -= dt;
      if (z.wanderT <= 0) {
        z.wanderT = 1 + Math.random() * 2;
        z.wanderA = Math.random() * Math.PI * 2;
      }
      z.x += Math.cos(z.wanderA) * z.speed * 0.45 * dt;
      z.y += Math.sin(z.wanderA) * z.speed * 0.45 * dt;
      z.face = z.wanderA;
    }
    clampToIsland(z, L);

    // kontak → HP berkurang
    if (d < z.radius + CFG.PLAYER.RADIUS + 4 && z.attackCd <= 0) {
      z.attackCd = 1.0;
      G.boatHP -= z.dmg;
      G.hpFlash = 0.4;
      G.saveDirty = true;
      p.x -= dx / d * 16;
      p.y -= dy / d * 16;
      clampToIsland(p, L);
      if (G.boatHP <= 0) {
        G.boatHP = 0;
        G.pendingDeath = true;
      }
    }
  }

  // auto-collect dengan mendekati
  let full = false;
  for (const res of L.resources) {
    if (res.taken) continue;
    if (Math.hypot(res.x - p.x, res.y - p.y) < CFG.PLAYER.PICKUP_RADIUS) {
      const added = addResource(res.type, 1);
      if (added > 0) {
        res.taken = true;
        if (!res.drop) {
          L.island.remaining[res.type] = Math.max(0, (L.island.remaining[res.type] || 0) - 1);
        }
        toast(`+1 ${CFG.RESOURCES[res.type].label} · storage ${usedStorage()}/${capacity()}`);
        G.saveDirty = true;
      } else {
        full = true;
      }
    }
  }
  if (full && fullToastCd <= 0) {
    toast('Storage penuh! Upgrade storage di harbor.');
    fullToastCd = 2.5;
  }
}

// Serang zombie terdekat dalam jangkauan.
export function tryAttack() {
  const L = G.land;
  if (!L || !L.player) return;
  const p = L.player;
  if (p.attackCd > 0) return;
  p.attackCd = CFG.PLAYER.ATTACK_COOLDOWN;
  p.swing = 0.22;

  let best = null, bd = Infinity;
  for (const z of L.zombies) {
    const d = Math.hypot(z.x - p.x, z.y - p.y);
    if (d < CFG.PLAYER.ATTACK_RANGE + z.radius && d < bd) { bd = d; best = z; }
  }
  if (!best) return;

  best.hp -= CFG.PLAYER.ATTACK_DAMAGE;
  best.hitFlash = 1;
  const a = Math.atan2(best.y - p.y, best.x - p.x);
  best.x += Math.cos(a) * 16;
  best.y += Math.sin(a) * 16;
  clampToIsland(best, L);

  if (best.hp <= 0) killZombie(L, best);
}

// Zombie mati → drop resource random di tanah.
function killZombie(L, z) {
  const i = L.zombies.indexOf(z);
  if (i >= 0) L.zombies.splice(i, 1);
  const types = Object.keys(CFG.RESOURCES);
  const type = types[Math.floor(Math.random() * types.length)];
  L.resources.push({ type, x: z.x, y: z.y, taken: false, drop: true });
  toast(`${CFG.ZOMBIES[z.type].label} zombie mati! Drop: ${CFG.RESOURCES[type].icon}`);
  G.saveDirty = true;
}

// Tombol COLLECT: ambil semua resource dalam radius.
export function collectNearby() {
  const L = G.land;
  if (!L || !L.player) return;
  const p = L.player;
  let n = 0, full = false;
  for (const res of L.resources) {
    if (res.taken) continue;
    if (Math.hypot(res.x - p.x, res.y - p.y) < CFG.PLAYER.COLLECT_RADIUS) {
      if (addResource(res.type, 1) > 0) {
        res.taken = true;
        if (!res.drop) {
          L.island.remaining[res.type] = Math.max(0, (L.island.remaining[res.type] || 0) - 1);
        }
        n++;
        G.saveDirty = true;
      } else {
        full = true;
      }
    }
  }
  if (n > 0) toast(`Mengumpulkan ${n} resource!`);
  else if (full) toast('Storage penuh!');
  else toast('Tidak ada resource di dekatmu.');
}

// ============ Render daratan ============
export function drawLand(ctx, vw, vh) {
  const L = G.land;
  if (!L) return;

  // Background laut sekitar pulau
  ctx.fillStyle = '#061a29';
  ctx.fillRect(0, 0, vw, vh);

  ctx.save();
  ctx.translate(vw / 2 - G.cam.x, vh / 2 - G.cam.y);

  // Air dangkal halo
  ctx.fillStyle = 'rgba(30, 95, 130, 0.35)';
  ctx.beginPath();
  ctx.arc(0, 0, L.r * 1.15, 0, Math.PI * 2);
  ctx.fill();

  // Pasir pantai
  blobPath(ctx, 0, 0, L.shape, 1);
  ctx.fillStyle = '#deca8e';
  ctx.fill();
  ctx.strokeStyle = 'rgba(140, 110, 60, 0.7)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Rumput daratan
  blobPath(ctx, 0, 0, L.shape, 0.78);
  ctx.fillStyle = '#2e6e3f';
  ctx.fill();
  ctx.strokeStyle = 'rgba(20, 60, 30, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Dock (dermaga kayu) di bawah
  ctx.fillStyle = '#6b4522';
  ctx.fillRect(-16, L.r * 0.70, 32, L.r * 0.36);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  for (let yy = L.r * 0.74; yy < L.r * 1.04; yy += 8) {
    ctx.beginPath();
    ctx.moveTo(-16, yy);
    ctx.lineTo(16, yy);
    ctx.stroke();
  }

  // Dekorasi: Batu (menggunakan ASSETS.rock jika ada)
  for (const rk of L.rocks) {
    const rockImg = ASSETS.rock;
    if (rockImg && rockImg.complete && rockImg.naturalWidth > 0) {
      const sz = rk.s * 2.2;
      ctx.drawImage(rockImg, rk.x - sz / 2, rk.y - sz / 2, sz, sz);
    } else {
      ctx.fillStyle = '#52606d';
      ctx.beginPath();
      ctx.arc(rk.x, rk.y, rk.s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Dekorasi: Pohon (menggunakan ASSETS.tree jika ada)
  for (const t of L.trees) {
    const treeImg = ASSETS.tree;
    if (treeImg && treeImg.complete && treeImg.naturalWidth > 0) {
      const sz = t.s * 2.6;
      ctx.drawImage(treeImg, t.x - sz / 2, t.y - sz / 2, sz, sz);
    } else {
      ctx.fillStyle = '#1c4627';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Resource di tanah (menggunakan ASSETS[res.type])
  for (const res of L.resources) {
    if (res.taken) continue;
    const bob = Math.sin(G.time * 3 + res.x * 0.13) * 2.5;
    const resImg = ASSETS[res.type];
    if (resImg && resImg.complete && resImg.naturalWidth > 0) {
      const sz = 22;
      // Soft item shadow beneath
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(res.x, res.y + 10, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(resImg, res.x - sz / 2, res.y - sz / 2 + bob, sz, sz);
    } else {
      const def = CFG.RESOURCES[res.type];
      ctx.fillStyle = def.color;
      ctx.fillRect(res.x - 9, res.y - 9 + bob, 18, 18);
    }
  }

  // Zombie (menggunakan ASSETS['zombie_' + z.type])
  for (const z of L.zombies) {
    const def = CFG.ZOMBIES[z.type];
    const zImg = ASSETS['zombie_' + z.type];

    ctx.save();
    ctx.translate(z.x, z.y);
    const zAngle = (z.face !== undefined ? z.face : 0) + Math.PI / 2;
    ctx.rotate(zAngle);

    if (z.hitFlash > 0.35) {
      ctx.filter = 'brightness(3) saturate(0)';
    }

    if (zImg && zImg.complete && zImg.naturalWidth > 0) {
      const sz = z.radius * 2.4;
      ctx.drawImage(zImg, -sz / 2, -sz / 2, sz, sz);
    } else {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(0, 0, z.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // HP Bar zombie
    const bw = 26;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(z.x - bw / 2, z.y - z.radius - 12, bw, 4);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(z.x - bw / 2, z.y - z.radius - 12, bw * Math.max(0, z.hp / z.maxHp), 4);

    // Indikator tanda seru saat mengejar
    if (z.chasing) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText('!', z.x, z.y - z.radius - 18);
    }
  }

  // Player (menggunakan ASSETS.player)
  const p = L.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.face + Math.PI / 2); // sprite faces UP (North)

  const pImg = ASSETS.player;
  if (pImg && pImg.complete && pImg.naturalWidth > 0) {
    const sz = 32;
    ctx.drawImage(pImg, -sz / 2, -sz / 2, sz, sz);
  } else {
    ctx.fillStyle = '#e67e22';
    ctx.beginPath();
    ctx.arc(0, 0, CFG.PLAYER.RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Efek tebasan ayunan senjata saat attack
  if (p.swing > 0) {
    ctx.strokeStyle = `rgba(255, 235, 150, ${(p.swing / 0.22) * 0.95})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 24, p.face - 0.75, p.face + 0.75);
    ctx.stroke();
  }

  ctx.restore();
}
