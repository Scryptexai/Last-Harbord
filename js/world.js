// ============ Laut & Pulau ============
import { CFG } from './config.js';
import { G } from './state.js';
import { makeRng } from './util.js';
import { drawBoat } from './boat.js';

// Spawn pulau random di radius 200-400px mengelilingi posisi perahu (0,0).
export function generateSeaWorld() {
  const names = [...CFG.ISLAND_NAMES].sort(() => Math.random() - 0.5);
  const types = Object.keys(CFG.RESOURCES);
  const list = [];

  for (let i = 0; i < CFG.SEA.ISLAND_COUNT; i++) {
    const difficulty = 1 + Math.floor(Math.random() * 3); // 1-3
    const ang = (i / CFG.SEA.ISLAND_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.9;
    const dist = CFG.SEA.ISLAND_DIST_MIN + Math.random() * (CFG.SEA.ISLAND_DIST_MAX - CFG.SEA.ISLAND_DIST_MIN);
    const r = 26 + difficulty * 8 + Math.random() * 8;

    // resource yang tersedia di pulau — makin sulit makin banyak
    const stock = { fuel: 0, wood: 0, food: 0, medicine: 0 };
    const total = 3 + difficulty * 2;
    for (let k = 0; k < total; k++) {
      const t = types[Math.floor(Math.random() * types.length)];
      stock[t]++;
    }

    list.push({
      id: i,
      name: names[i % names.length],
      difficulty,
      x: Math.cos(ang) * dist,
      y: Math.sin(ang) * dist,
      r,
      stock,
      remaining: { ...stock },
      visited: false,
      inRange: false,
      landSeed: (Math.random() * 1e9) >>> 0,
      shape: makeBlob(r, makeRng((Math.random() * 1e9) >>> 0)),
    });
  }
  G.islands = list;
}

function makeBlob(r, rng) {
  const pts = [];
  const n = 22;
  for (let i = 0; i < n; i++) {
    pts.push({ a: (i / n) * Math.PI * 2, rr: r * (0.82 + rng() * 0.32) });
  }
  return pts;
}

export function blobPath(ctx, cx, cy, pts, scale = 1) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const px = cx + Math.cos(p.a) * p.rr * scale;
    const py = cy + Math.sin(p.a) * p.rr * scale;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// Pulau terdekat (jarak dihitung dari tepi pulau).
export function nearestIsland(x, y) {
  let best = null, bd = Infinity;
  for (const isl of G.islands) {
    const d = Math.hypot(isl.x - x, isl.y - y) - isl.r;
    if (d < bd) { bd = d; best = isl; }
  }
  return { island: best, dist: Math.max(0, bd) };
}

// Background laut: gradasi biru + animasi sin wave.
export function drawOceanBackground(ctx, vw, vh, parX = 0, parY = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, vh);
  g.addColorStop(0, '#15628d');
  g.addColorStop(0.55, '#0d4266');
  g.addColorStop(1, '#082a45');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);

  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 2;
  const rows = 9;
  const rh = vh / rows;
  for (let i = 0; i < rows; i++) {
    const yb = i * rh + ((G.time * 14) % rh);
    ctx.beginPath();
    for (let x = -24; x <= vw + 24; x += 26) {
      const y = yb
        + Math.sin((x - parX) * 0.02 + G.time * 1.6 + i * 1.7) * 4
        + Math.cos((x - parX) * 0.011 - G.time) * 2;
      if (x === -24) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function drawIslandSea(ctx, isl) {
  const { x, y, r } = isl;

  // air dangkal
  ctx.fillStyle = 'rgba(120,210,235,0.22)';
  ctx.beginPath();
  ctx.arc(x, y, r + 16, 0, Math.PI * 2);
  ctx.fill();

  // pasir
  blobPath(ctx, x, y, isl.shape, 1);
  ctx.fillStyle = '#e6cf94';
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,95,45,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // rumput
  blobPath(ctx, x, y, isl.shape, 0.66);
  ctx.fillStyle = isl.visited ? '#3f8a4b' : '#4c9a4f';
  ctx.fill();

  // pohon kecil di tengah
  ctx.fillStyle = '#2e7d32';
  ctx.beginPath();
  ctx.arc(x, y, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // highlight saat dalam jangkauan
  if (isl.inRange) {
    ctx.strokeStyle = '#ffd166';
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r + 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // label
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(isl.name, x, y - r - 26);
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = '#ffd166';
  ctx.fillText(`Difficulty ${isl.difficulty}${isl.visited ? ' · dikunjungi' : ''}`, x, y - r - 11);

  const stock = Object.entries(isl.remaining)
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `${CFG.RESOURCES[t].icon}${n}`)
    .join(' ');
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(stock || 'habis', x, y + r + 18);
}

// Render mode laut (dipanggil dengan transform screen bersih).
export function drawSea(ctx, vw, vh) {
  drawOceanBackground(ctx, vw, vh, G.cam.x * 0.3, G.cam.y * 0.3);

  ctx.save();
  ctx.translate(vw / 2 - G.cam.x, vh / 2 - G.cam.y);

  for (const isl of G.islands) drawIslandSea(ctx, isl);

  // garis autopilot
  if (G.autopilotTarget) {
    const t = G.autopilotTarget;
    ctx.save();
    ctx.strokeStyle = '#ffd166';
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(G.boat.x, G.boat.y);
    ctx.lineTo(t.x, t.y);
    ctx.stroke();
    ctx.restore();
  }

  drawBoat(ctx, G.boat, 1);
  ctx.restore();
}
