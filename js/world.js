// ============ Dunia: kepulauan tetap ============
// Jarak dari harbor ADALAH dial kesulitan. Pulau dekat: miskin, aman, cepat.
// Pulau jauh: kaya, padat zombie, perjalanan panjang yang memakan waktu pasang.
// Tidak ada angka yang dibocorkan dari kejauhan — hanya tanda-tanda.
import { CFG } from './config.js';
import { G } from './state.js';
import { makeRng, clamp } from './util.js';
import { ASSETS } from './assets.js';
import { tideTint } from './tide.js';
import { drawFxWorld } from './fx.js';
import { drawBoat, drawLanternPool } from './boat.js';
import { beginWorld, endWorld, upright, atUpright, byDepth, toScreen } from './camera.js';

export const HARBOR = { x: 0, y: 0, r: 120 };

export function generateWorld(seed) {
  G.worldSeed = seed >>> 0 || 1;
  const rng = makeRng(G.worldSeed);
  const list = [];
  const names = [...CFG.ISLAND_NAMES];
  // acak nama tanpa mengubah array sumber
  for (let i = names.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [names[i], names[j]] = [names[j], names[i]]; }
  const flavorKeys = Object.keys(CFG.FLAVORS);
  let id = 0;

  CFG.SEA.RINGS.forEach((ring, ringIdx) => {
    for (let i = 0; i < ring.count; i++) {
      const ang = (i / ring.count) * Math.PI * 2 + (rng() - 0.5) * 0.9 + ringIdx * 0.4;
      const dist = ring.dist[0] + rng() * (ring.dist[1] - ring.dist[0]);
      const r = ring.radius[0] + rng() * (ring.radius[1] - ring.radius[0]);
      const flavor = flavorKeys[Math.floor(rng() * flavorKeys.length)];
      const nodes = ring.nodes + Math.floor(rng() * 3) - 1;
      const zombies = Math.max(2, Math.round((ring.zombies + Math.floor(rng() * 3) - 1) * CFG.FLAVORS[flavor].zombieMul));

      // stok: jumlah unit = jumlah node, tipe mengikuti bias varian pulau
      const bias = CFG.FLAVORS[flavor].bias;
      const weighted = [];
      for (const [t, w] of Object.entries(bias)) for (let k = 0; k < w; k++) weighted.push(t);
      const stock = { fuel: 0, wood: 0, food: 0, medicine: 0 };
      for (let k = 0; k < nodes; k++) stock[weighted[Math.floor(rng() * weighted.length)]]++;

      list.push({
        id, name: names[id % names.length], flavor, ringIdx, ringKey: ring.key,
        x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, r,
        stock, lootMult: ring.loot, zombies,
        shape: makeBlob(r, makeRng(G.worldSeed * 7919 + id * 104729)),
        seed: (G.worldSeed * 2654435761 + id * 40503) >>> 0,
        tellPhase: rng() * Math.PI * 2,
      });
      id++;
    }
  });
  G.islands = list;
}

function makeBlob(r, rng) {
  const pts = [];
  const n = 26;
  for (let i = 0; i < n; i++) pts.push({ a: (i / n) * Math.PI * 2, rr: r * (0.86 + rng() * 0.22) });
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

// ---------- stok pulau (persisten: yang sudah diambil tetap hilang) ----------
export function takenOf(island) {
  if (!G.tabbed[island.id]) G.tabbed[island.id] = { fuel: 0, wood: 0, food: 0, medicine: 0 };
  return G.tabbed[island.id];
}

export function islandRemaining(island) {
  const tk = takenOf(island);
  const out = {};
  for (const t of Object.keys(island.stock)) out[t] = Math.max(0, island.stock[t] - (tk[t] || 0));
  return out;
}

export function islandTotalRemaining(island) {
  return Object.values(islandRemaining(island)).reduce((a, b) => a + b, 0);
}

export function isDepleted(island) {
  return islandTotalRemaining(island) <= 0;
}

export function markTaken(island, type, n = 1) {
  const tk = takenOf(island);
  tk[type] = (tk[type] || 0) + n;
}

export function survey(island) {
  if (!G.surveyed[island.id]) {
    G.surveyed[island.id] = true;
    G.saveDirty = true;
    return true;
  }
  return false;
}

export function nearestIsland(x, y) {
  let best = null, bd = Infinity;
  for (const isl of G.islands) {
    const d = Math.hypot(isl.x - x, isl.y - y) - isl.r;
    if (d < bd) { bd = d; best = isl; }
  }
  return { island: best, dist: Math.max(0, bd) };
}

export function islandById(id) {
  return G.islands.find((i) => i.id === id) || null;
}

// ---------- warna & suasana ----------
export function seaPalette() {
  const k = tideTint();
  const top = mix('#123049', '#1c1410', k);
  const mid = mix('#0a1f30', '#150e0c', k);
  const bot = mix('#050f19', '#0a0605', k);
  return { top, mid, bot, k };
}

function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

// CAKRAWALA — jawaban visual atas pertanyaan "kenapa aku harus tegang".
// Warnanya bukan hiasan: ia satu-satunya hal yang bisa kau lihat dari mana pun,
// dan ia memberi tahu fase pasang tanpa satu kata pun.
//   tenang  -> kuning hangat, cakrawala rendah dan tenang
//   berubah -> pucat, dingin, kabut naik
//   pasang  -> merah, gelap, horizon naik menelan cahaya
export function horizonBand() {
  const k = tideTint();
  const calmGlow = { r: 255, g: 208, b: 138 };
  const turnGlow = { r: 150, g: 156, b: 168 };
  const highGlow = { r: 190, g: 52, b: 30 };
  const lerp = (a, b, t) => Math.round(a + (b - a) * t);
  let glow;
  if (k < 0.35) {
    const t = Math.min(1, k / 0.35);
    glow = { r: lerp(calmGlow.r, turnGlow.r, t), g: lerp(calmGlow.g, turnGlow.g, t), b: lerp(calmGlow.b, turnGlow.b, t) };
  } else {
    const t = Math.min(1, (k - 0.35) / 0.45);
    glow = { r: lerp(turnGlow.r, highGlow.r, t), g: lerp(turnGlow.g, highGlow.g, t), b: lerp(turnGlow.b, highGlow.b, t) };
  }
  return {
    k, glow,
    css: `rgba(${glow.r},${glow.g},${glow.b},`,
    height: 0.13 + k * 0.16,   // cakrawala naik saat pasang: laut menyempit
  };
}

// BADAI DI CAKRAWALA — inilah jawabannya: "kenapa aku harus pulang?"
// Bukan angka, bukan peringatan. Langit di utara menggelap, dan kadang menyala.
// Pemain yang melihat ke atas akan mengerti tanpa satu kata pun.
export function stormLevel() { return clamp((tideTint() - 0.16) / 0.54, 0, 1); }

export function drawStorm(ctx, vw, vh, strength = 1) {
  const s = stormLevel() * strength;
  if (s <= 0.02) return;
  const t = G.time;
  const ly = vh * (0.115 + tideTint() * 0.17);        // sejajar garis cakrawala
  const bandH = vh * (0.05 + 0.22 * s);

  // massa awan yang bergerigi: puncaknya naik-turun pelan
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, ly + 26);
  for (let x = 0; x <= vw; x += 40) {
    const h = Math.sin(x * 0.004 + t * 0.22) * 0.5 + Math.sin(x * 0.011 - t * 0.31) * 0.5;
    ctx.lineTo(x, ly - bandH * (0.5 + h * 0.5));
  }
  ctx.lineTo(vw, ly + 26);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, ly - bandH, 0, ly + 26);
  g.addColorStop(0, `rgba(9,11,18,${0.32 * s})`);
  g.addColorStop(0.72, `rgba(11,12,18,${(0.34 + 0.42 * s)})`);
  g.addColorStop(1, `rgba(26,13,10,${(0.3 + 0.5 * s)})`);
  ctx.fillStyle = g;
  ctx.fill();

  // kilat jauh: dua denyut jarang yang bertumpuk, jadi tidak pernah berirama
  const pulse = Math.pow(Math.max(0, Math.sin(t * 0.41 + 2.1)), 44)
              + 0.6 * Math.pow(Math.max(0, Math.sin(t * 0.97 + 0.4)), 70);
  const flash = Math.min(1, pulse) * s;
  if (flash > 0.04) {
    const fx0 = vw * (0.18 + 0.6 * ((Math.sin(t * 0.13) + 1) / 2));
    const fg = ctx.createRadialGradient(fx0, ly, 4, fx0, ly, vw * 0.5);
    fg.addColorStop(0, `rgba(196,206,255,${0.5 * flash})`);
    fg.addColorStop(0.35, `rgba(150,140,190,${0.16 * flash})`);
    fg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(0, 0, vw, ly + 60);
  }
  ctx.restore();
}

// Hanya denyut kilatnya — dipakai di darat, di mana pita awan akan menutupi pulau.
export function drawStormPulse(ctx, vw, vh, strength = 0.5) {
  const s = stormLevel() * strength;
  if (s <= 0.02) return;
  const t = G.time;
  const pulse = Math.pow(Math.max(0, Math.sin(t * 0.41 + 2.1)), 44)
              + 0.6 * Math.pow(Math.max(0, Math.sin(t * 0.97 + 0.4)), 70);
  const flash = Math.min(1, pulse) * s;
  if (flash <= 0.04) return;
  const ly = vh * 0.08;
  const fx0 = vw * (0.18 + 0.6 * ((Math.sin(t * 0.13) + 1) / 2));
  const fg = ctx.createRadialGradient(fx0, ly, 4, fx0, ly, vw * 0.55);
  fg.addColorStop(0, `rgba(198,206,255,${0.34 * flash})`);
  fg.addColorStop(0.4, `rgba(150,140,190,${0.11 * flash})`);
  fg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fg;
  ctx.fillRect(0, 0, vw, vh * 0.5);
}

// Pita cakrawala + cahaya yang jatuh di atasnya. Digambar sebelum dunia.
export function drawHorizon(ctx, vw, vh) {
  const h = horizonBand();
  const bandH = vh * (0.30 + h.k * 0.16);
  const g = ctx.createLinearGradient(0, 0, 0, bandH);
  g.addColorStop(0, seaPalette().top);
  g.addColorStop(0.72, `rgba(${h.glow.r},${h.glow.g},${h.glow.b},${0.05 + h.k * 0.16})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, bandH);

  // garis cakrawala itu sendiri: satu garis tipis yang membuat laut punya ujung
  const ly = vh * h.height;
  ctx.strokeStyle = `rgba(${h.glow.r},${h.glow.g},${h.glow.b},${0.22 + h.k * 0.4})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x <= vw; x += 18) {
    const y = ly + Math.sin(x * 0.006 + G.time * 0.5) * (2 + h.k * 3);
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  drawStorm(ctx, vw, vh, 1);

  // pasang: tepi atas layar ikut memerah, seolah cahaya mundur
  if (h.k > 0.36) {
    const rg = ctx.createLinearGradient(0, 0, 0, vh * 0.5);
    rg.addColorStop(0, `rgba(120,24,12,${(h.k - 0.36) * 0.55})`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, vw, vh * 0.5);
  }
}

export function drawOceanBackground(ctx, vw, vh, parX = 0, parY = 0) {
  const p = seaPalette();
  const g = ctx.createLinearGradient(0, 0, 0, vh);
  g.addColorStop(0, p.top);
  g.addColorStop(0.55, p.mid);
  g.addColorStop(1, p.bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);

  const bg = ASSETS.ocean_bg;
  if (bg && bg.complete && bg.naturalWidth > 0) {
    ctx.save();
    ctx.globalAlpha = 0.22 * (1 - p.k * 0.6);
    ctx.drawImage(bg, 0, 0, vw, vh);
    ctx.restore();
  }

  // gelombang: makin tinggi pasang, makin cepat & besar
  const chop = 1 + p.k * 2;
  ctx.strokeStyle = `rgba(180,225,255,${0.05 + p.k * 0.07})`;
  ctx.lineWidth = 2;
  const rows = 9;
  const rh = vh / rows;
  for (let i = 0; i < rows; i++) {
    const yb = i * rh + ((G.time * 16 * chop) % rh);
    ctx.beginPath();
    for (let x = -24; x <= vw + 24; x += 26) {
      const y = yb
        + Math.sin((x - parX) * 0.02 + G.time * 1.8 * chop + i * 1.7) * (4 + p.k * 4)
        + Math.cos((x - parX) * 0.011 - G.time * chop) * 2;
      if (x === -24) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

// ---------- tanda-tanda pulau dari kejauhan ----------
// Ini pengganti angka "Difficulty 3 · ⛽2🪵1". Pemain memilih risiko dengan membaca horizon.
function drawTell(ctx, isl, alpha) {
  // Tanda-tanda ini benda LANGSUNG di atas pulau (asap, menara, camar): digambar
  // dalam ruang tegak supaya tidak ikut rebah oleh kemiringan kamera.
  const x = isl.x, y = isl.y - isl.r - 40;
  const t = G.time + isl.tellPhase;
  ctx.save();
  ctx.globalAlpha = alpha;
  upright(ctx, x, y);            // sudah di dalam save/restore milik fungsi ini
  ctx.translate(-x, -y);
  switch (isl.flavor) {
    case 'ash': // asap naik
      for (let i = 0; i < 4; i++) {
        const k = ((t * 0.35 + i * 0.25) % 1);
        ctx.fillStyle = `rgba(210,200,190,${0.42 * (1 - k)})`;
        ctx.beginPath();
        ctx.arc(x - 14 + Math.sin(t * 0.7 + i) * 12, y - k * 60, 6 + k * 14, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'ruins': // menara roboh
      ctx.fillStyle = 'rgba(60,58,54,0.9)';
      ctx.fillRect(x - 34, y - 40, 16, 44);
      ctx.beginPath(); ctx.moveTo(x - 34, y - 40); ctx.lineTo(x - 26, y - 54); ctx.lineTo(x - 18, y - 40); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,120,60,0.5)';
      ctx.beginPath(); ctx.arc(x - 26, y - 46, 3, 0, Math.PI * 2); ctx.fill();
      break;
    case 'wreck': // bangkai kapal
      ctx.fillStyle = 'rgba(40,36,32,0.92)';
      ctx.beginPath();
      ctx.moveTo(x - 40, y - 6); ctx.lineTo(x - 24, y - 26); ctx.lineTo(x - 6, y - 22);
      ctx.lineTo(x - 2, y - 4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(90,80,70,0.9)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 22, y - 26); ctx.lineTo(x - 16, y - 48); ctx.stroke();
      break;
    default: { // camar berputar
      const n = isl.flavor === 'reef' ? 6 : 3;
      for (let i = 0; i < n; i++) {
        const a = t * 0.6 + (i / n) * Math.PI * 2;
        const gx = x + Math.cos(a) * 30;
        const gy = y - 18 + Math.sin(a * 1.6) * 10;
        ctx.strokeStyle = 'rgba(240,246,255,0.85)';
        ctx.lineWidth = 1.6;
        const flap = Math.sin(t * 7 + i) * 2.4;
        ctx.beginPath();
        ctx.moveTo(gx - 4, gy + flap); ctx.lineTo(gx, gy);
        ctx.lineTo(gx + 4, gy + flap);
        ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}

function drawIslandSea(ctx, isl, detail) {
  const { x, y, r } = isl;
  const fl = CFG.FLAVORS[isl.flavor];

  // air dangkal (rata di air)
  ctx.fillStyle = 'rgba(46,120,155,0.30)';
  ctx.beginPath(); ctx.arc(x, y, r * 1.16, 0, Math.PI * 2); ctx.fill();

  // DINDING PANTAI: sisi selatan (menghadap kamera) sedikit lebih tinggi, jadi pulau
  // terbaca sebagai daratan yang MENEKAN ke atas layar — bukan noda pipih di air.
  blobPath(ctx, x, y + r * 0.07, isl.shape, 1.02);
  ctx.fillStyle = shade(fl.sand, -0.34);
  ctx.fill();

  // pasir
  blobPath(ctx, x, y, isl.shape, 1);
  ctx.fillStyle = fl.sand;
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,105,70,0.5)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // busa di garis air, hanya di tepi yang menghadap kamera
  ctx.strokeStyle = `rgba(196,232,255,${0.14 + Math.sin(G.time * 1.1 + isl.tellPhase) * 0.05})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.72, r * 0.86, r * 0.16, 0, 0, Math.PI * 2);
  ctx.stroke();

  // rumput
  blobPath(ctx, x, y, isl.shape, 0.72);
  ctx.fillStyle = isl.surveyed ? shade(fl.grass, -0.12) : fl.grass;
  ctx.fill();

  if (detail) {
    // pepohonan: BERDIRI di atas pulau, diurutkan menurut kedalaman
    const rng = makeRng(isl.seed);
    const trees = [];
    for (let i = 0; i < 12; i++) {
      const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * r * 0.55;
      trees.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, s: r * 0.10 * (0.8 + rng() * 0.5) });
    }
    trees.sort(byDepth);
    for (const t of trees) {
      atUpright(ctx, t.x, t.y, (p) => {
        const sz = t.s * 2.6 * p;
        const img = ASSETS.tree;
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -sz / 2, -sz * 0.86, sz, sz);
        } else {
          ctx.fillStyle = 'rgba(16,42,26,0.9)';
          ctx.beginPath(); ctx.arc(0, -t.s * 0.9 * p, t.s * 0.9 * p, 0, Math.PI * 2); ctx.fill();
        }
      });
    }

    // label hanya kalau sudah dekat — dan selalu tegak, tidak ikut miring
    atUpright(ctx, x, y + r, () => {
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 6;
      ctx.fillText(isl.name, 0, -r * 1.55);
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,231,170,0.92)';
      const left = islandTotalRemaining(isl);
      ctx.fillText(isDepleted(isl) ? 'sudah habis' : (left > 0 ? 'masih ada muatan' : ''), 0, -r * 1.55 + 16);
      ctx.shadowBlur = 0;
    });
  }

  // penanda pelampung salvage — selalu di atas, supaya terlihat dari jauh
  const sv = G.salvages.find((sv2) => sv2.islandId === isl.id);
  if (sv) {
    atUpright(ctx, x + r * 0.55, y - r * 0.1, () => {
      ctx.fillStyle = '#ffcf6a';
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,207,106,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 10 + Math.sin(G.time * 3) * 2, 0, Math.PI * 2); ctx.stroke();
    });
  }
}

function shade(hex, k) {
  const p = parseInt(hex.slice(1), 16);
  const r = clamp(Math.round(((p >> 16) & 255) * (1 + k)), 0, 255);
  const g = clamp(Math.round(((p >> 8) & 255) * (1 + k)), 0, 255);
  const b = clamp(Math.round((p & 255) * (1 + k)), 0, 255);
  return `rgb(${r},${g},${b})`;
}

// ---------- penunjuk arah navigasi (menggantikan autopilot) ----------
export function drawNavPointer(ctx, vw, vh, wx, wy, label, color, sub = '') {
  const scr = toScreen(wx, wy, vw, vh);
  const sx = scr.x;
  const sy = scr.y;
  const m = 54;
  const onScreen = sx > m && sx < vw - m && sy > m && sy < vh - m;
  const ang = Math.atan2(sy - vh / 2, sx - vw / 2);
  const rad = Math.min(vw, vh) * 0.36;
  const px = onScreen ? sx : vw / 2 + Math.cos(ang) * rad;
  const py = onScreen ? sy : vh / 2 + Math.sin(ang) * rad;

  ctx.save();
  ctx.globalAlpha = onScreen ? 0.85 : 0.75;
  if (!onScreen) {
    ctx.translate(px, py);
    ctx.rotate(ang);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(16, 0); ctx.lineTo(-8, -10); ctx.lineTo(-3, 0); ctx.lineTo(-8, 10);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 5;
    ctx.fillText(label, px + Math.cos(ang) * 26, py + Math.sin(ang) * 26 + 4);
    if (sub) {
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(sub, px + Math.cos(ang) * 26, py + Math.sin(ang) * 26 + 17);
    }
  } else {
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 5;
    ctx.fillText(sub, px, py + 26);
  }
  ctx.restore();
}

// ---------- render laut ----------
export function drawSea(ctx, vw, vh) {
  const tint = tideTint();
  drawOceanBackground(ctx, vw, vh, G.cam.x * 0.3, G.cam.y * 0.3);
  drawHorizon(ctx, vw, vh);

  beginWorld(ctx, vw, vh);

  const boat = G.boat;
  // urut dari yang paling utara: yang dekat kamera digambar terakhir, jadi
  // pulau di depan benar-benar menutupi pulau di belakangnya.
  const visible = [];
  for (const isl of G.islands) {
    const d = Math.hypot(isl.x - boat.x, isl.y - boat.y);
    if (d > CFG.SEA.FOG + isl.r + 200) continue;
    visible.push(isl);
  }
  visible.sort(byDepth);
  for (const isl of visible) {
    const d = Math.hypot(isl.x - boat.x, isl.y - boat.y);
    drawIslandSea(ctx, isl, d < CFG.SEA.FOG * 0.85);
  }

  // pelampung salvage yang jauh tetap tidak terlihat — hanya di pulau yang sudah disurvei
  drawLanternPool(ctx, boat.x, boat.y, 130 + (G.refit >= 6 ? 40 : 0));
  drawFxWorld(ctx, null);            // camar terbang & percikan laut
  // kapal: benda berdiri terakhir sebelum kita keluar dari ruang dunia
  atUpright(ctx, boat.x, boat.y, () => {
    ctx.translate(-boat.x, -boat.y);   // batalkan translate drawBoat: asal = posisi kapal
    drawBoat(ctx, boat, 1);
  });
  drawFxWorld(ctx, null);              // partikel hidup di ruang dunia biasa
  endWorld(ctx);

  // kabut: dunia di luar jarak pandang tidak ada (posisi memakai proyeksi miring)
  const scr = toScreen(boat.x, boat.y, vw, vh);
  const cx = scr.x;
  const cy = scr.y;
  const fog = ctx.createRadialGradient(cx, cy, CFG.SEA.FOG * 0.58, cx, cy, CFG.SEA.FOG * 1.06);
  fog.addColorStop(0, 'rgba(4,10,18,0)');
  fog.addColorStop(0.75, 'rgba(4,10,18,0.72)');
  fog.addColorStop(1, 'rgba(3,8,14,0.985)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, 0, vw, vh);

  // tanda-tanda di atas kabut — horizon menjawab
  beginWorld(ctx, vw, vh);
  for (const isl of G.islands) {
    const d = Math.hypot(isl.x - boat.x, isl.y - boat.y) - isl.r;
    if (d > CFG.SEA.HINT || d < -isl.r) continue;
    const alpha = clamp(1 - (d - CFG.SEA.FOG * 0.5) / (CFG.SEA.HINT - CFG.SEA.FOG * 0.5), 0.15, 1);
    if (d > CFG.SEA.FOG * 0.8) drawTell(ctx, isl, alpha);
  }
  ctx.restore();

  // penunjuk arah: target pilihan + harbor (kapal selalu bisa pulang)
  if (G.target) {
    const d = Math.hypot(G.target.x - boat.x, G.target.y - boat.y);
    drawNavPointer(ctx, vw, vh, G.target.x, G.target.y, G.target.name.toUpperCase(), '#8fe3a0',
      Math.round(d / 10) + ' m');
  }
  const hd = Math.hypot(HARBOR.x - boat.x, HARBOR.y - boat.y);
  if (hd > 400) drawNavPointer(ctx, vw, vh, HARBOR.x, HARBOR.y, 'HARBOR', '#ffcf6a', Math.round(hd / 10) + ' m');
  if (hd < 260) {
    // dermaga terlihat
    beginWorld(ctx, vw, vh);
    drawHarborMarker(ctx);
    endWorld(ctx);
  }

  // pasang: gelap + horizon merah
  if (tint > 0.36) {
    const g = ctx.createLinearGradient(0, 0, 0, vh);
    g.addColorStop(0, `rgba(90,20,10,${(tint - 0.36) * 0.5})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh * 0.6);
  }
}

// Dermaga kecil di dunia laut — selalu bisa dilihat saat mendekat.
function drawHarborMarker(ctx) {
  const { x, y } = HARBOR;
  const s = 1.6;
  ctx.save();
  upright(ctx, x, y);            // di dalam save/restore fungsi ini
  ctx.fillStyle = '#6b4522';
  ctx.fillRect(-14 * s, -4 * s, 28 * s, 46 * s);
  ctx.fillStyle = '#8a5c30';
  for (let i = 0; i < 10; i++) ctx.fillRect(-14 * s, (-4 + i * 5) * s, 28 * s, 1.6 * s);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-14 * s, -4 * s, 28 * s, 2);
  // lentera dermaga
  const flick = 0.85 + Math.sin(G.time * 6) * 0.1;
  const g = ctx.createRadialGradient(22 * s, 30 * s, 2, 22 * s, 30 * s, 70 * flick);
  g.addColorStop(0, 'rgba(255,200,120,0.55)');
  g.addColorStop(1, 'rgba(255,170,80,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(22 * s, 30 * s, 70 * flick, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd79a';
  ctx.beginPath(); ctx.arc(22 * s, 30 * s, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function harborDist() {
  return Math.hypot(HARBOR.x - G.boat.x, HARBOR.y - G.boat.y);
}
