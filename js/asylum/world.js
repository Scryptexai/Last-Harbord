// ============ Last Asylum: dunia — pelataran, node, & seluruh gambar ============
// Bahasa visual: dark stylized low-poly, medieval plague atmosphere.
// Semua "benda berdiri" lewat aAtUpright() supaya tegak di kamera miring;
// tanah/jubah/bayangan digambar di ruang dunia (tergencet TILT).
import { ACFG } from './config.js';
import { A } from './state.js';
import { clamp, dist, makeRng } from '../util.js';
import { sfx } from '../audio.js';
import { flyItem } from '../fx.js';
import { bumpQuest } from './quests.js';
import { aAtUpright } from './camera.js';
import { lanternPos } from './rig.js';
import { makeBeds } from './building.js';

const N = ACFG.WORLD.NODES;
const W = ACFG.WORLD;

// ---------- tata letak (deterministik, tanpa seed acak) ----------
export const WARD_DEFS = [
  { id: 0, name: 'Bangsal I',   x: -128, y: 268 },
  { id: 1, name: 'Bangsal II',  x: 128,  y: 268 },
  { id: 2, name: 'Bangsal III', x: -128, y: 470 },
  { id: 3, name: 'Bangsal IV',  x: 128,  y: 470 },
];

export function createWorld() {
  A.wards = WARD_DEFS.map((w) => ({
    ...w, built: w.id === 0, beds: makeBeds(w), trigger: null, progress: 0,
  }));
  A.nodes = [
    // ladang gandum (barat laut)
    { id: 'wheat-0', type: 'wheat', x: -268, y: 24,  stock: N.STOCK, cool: 0, ht: 0 },
    { id: 'wheat-1', type: 'wheat', x: -212, y: 52,  stock: N.STOCK, cool: 0, ht: 0 },
    { id: 'wheat-2', type: 'wheat', x: -244, y: 108, stock: N.STOCK, cool: 0, ht: 0 },
    // taman herbal (timur laut)
    { id: 'herb-0', type: 'herb', x: 228, y: 24,  stock: N.STOCK, cool: 0, ht: 0 },
    { id: 'herb-1', type: 'herb', x: 290, y: 54,  stock: N.STOCK, cool: 0, ht: 0 },
    { id: 'herb-2', type: 'herb', x: 254, y: 110, stock: N.STOCK, cool: 0, ht: 0 },
    // tumpukan kayu (barat daya) — stok lebih besar (maxStock agar regrow
    // mengembalikan 8, bukan 5 default)
    { id: 'wood-0', type: 'wood', x: -286, y: 296, stock: 8, maxStock: 8, cool: 0, ht: 0 },
    { id: 'wood-1', type: 'wood', x: -248, y: 338, stock: 8, maxStock: 8, cool: 0, ht: 0 },
  ];
}

// ---------- panen node: berdiri = memetik (tanpa tombol) ----------
export function updateNodes(dt) {
  const d = A.doctor;
  for (const nd of A.nodes) {
    if (nd.cool > 0) {
      nd.cool -= dt;
      if (nd.cool <= 0) { nd.stock = nd.maxStock != null ? nd.maxStock : N.STOCK; nd.ht = 0; }
      continue;
    }
    if (nd.stock <= 0 || !d) continue;
    if (dist(d.x, d.y, nd.x, nd.y) > N.RADIUS) continue;
    if (d.speed > 12) continue;              // harus berdiri di tempat
    nd.ht += dt;
    let got = 0;
    while (nd.ht >= N.TICK && nd.stock > 0) {
      nd.ht -= N.TICK;
      nd.stock -= 1;
      got += 1;
      A.res[nd.type] += 1;
      A.stats.harvest[nd.type] += 1;
      sfx('gather_tick');
      flyItem(nd.x, nd.y - 10, { x: d.x, y: d.y - 6 }, nd.type);
    }
    if (got > 0) {
      if (nd.stock <= 0) {
        nd.maxStock = nd.maxStock || N.STOCK;
        nd.cool = N.REGROW;
        sfx('gather_done');
      }
      const metric = nd.type === 'herb' ? 'harvestHerb' : nd.type === 'wheat' ? 'harvestWheat' : 'harvestWood';
      bumpQuest(metric, got);
    }
  }
}

// ================= gambar =================

const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h >>> 0; };

export function drawWorld(ctx, t) {
  const B = W.BOUNDS;

  // luar pelataran: tanah malam gelap
  ctx.fillStyle = '#141920';
  ctx.fillRect(B.x0 - 300, B.y0 - 300, (B.x1 - B.x0) + 600, (B.y1 - B.y0) + 600);

  // lantai batu pelataran
  ctx.fillStyle = '#222933';
  ctx.fillRect(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0);
  // ubin: grid samar + variasi tone stabil
  ctx.strokeStyle = 'rgba(0,0,0,0.20)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = B.x0; x <= B.x1; x += 26) { ctx.moveTo(x, B.y0); ctx.lineTo(x, B.y1); }
  for (let y = B.y0; y <= B.y1; y += 26) { ctx.moveTo(B.x0, y); ctx.lineTo(B.x1, y); }
  ctx.stroke();
  const rng = makeRng(1234);
  for (let i = 0; i < 60; i++) {
    const x = B.x0 + rng() * (B.x1 - B.x0);
    const y = B.y0 + rng() * (B.y1 - B.y0);
    ctx.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, 26, 26);
  }

  // jalan dari gerbang ke tengah
  ctx.fillStyle = '#2c3440';
  ctx.beginPath();
  ctx.moveTo(-26, B.y0);
  ctx.lineTo(26, B.y0);
  ctx.lineTo(56, 240);
  ctx.lineTo(120, 300);
  ctx.lineTo(120, 560);
  ctx.lineTo(-120, 560);
  ctx.lineTo(-120, 300);
  ctx.lineTo(-56, 240);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.lineWidth = 1;
  for (let y = B.y0 + 18; y < 560; y += 24) {
    ctx.beginPath();
    ctx.moveTo(-26 - (y / 560) * 30, y);
    ctx.lineTo(26 + (y / 560) * 30, y);
    ctx.stroke();
  }

  // tanda salib rumah sakit di tengah (catan di batu)
  ctx.fillStyle = 'rgba(184,178,162,0.30)';
  ctx.fillRect(-10, 150, 20, 52);
  ctx.fillRect(-26, 166, 52, 20);

  // kolam cahaya (di lantai, di bawah semua entitas)
  drawLightPools(ctx, t);

  // pagar batu + gerbang
  drawWalls(ctx);
  drawGate(ctx, t);

  // node sumber daya
  for (const nd of A.nodes) {
    if (nd.type === 'wheat') drawWheatPlot(ctx, nd, t);
    else if (nd.type === 'herb') drawHerbPlot(ctx, nd, t);
    else drawWoodPile(ctx, nd, t);
  }
  drawHut(ctx, t);

  // api unggun tengah: titik ambience
  drawBrazier(ctx, t);
}

function lightPool(ctx, x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 2, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawLightPools(ctx, t) {
  const flick = 0.82 + Math.sin(t * 11) * 0.09 + Math.sin(t * 23.7) * 0.05;
  lightPool(ctx, 0, 340, 96, '255,150,60', 0.13 * flick);          // api unggun
  lightPool(ctx, 0, -104, 74, '255,190,110', 0.10);                // pelita gerbang
  lightPool(ctx, 300, 60, 46, '255,205,130', 0.07 * flick);        // jendela apotek
  const d = A.doctor;
  if (d && A.rig) {
    const lp = lanternPos(d);
    lightPool(ctx, lp.x, lp.y + 6, 58, '255,200,120', 0.15 * flick); // lentera dokter
  }
}

function drawWalls(ctx) {
  const B = W.BOUNDS;
  ctx.fillStyle = '#2c3440';
  // utara (dua segmen, gerbang di tengah)
  ctx.fillRect(B.x0, B.y0 - 12, 330, 14);
  ctx.fillRect(-70, B.y0 - 12, 140, 14);
  ctx.fillRect(70, B.y0 - 12, B.x1 - 70, 14);
  // barat, timur, selatan
  ctx.fillRect(B.x0 - 12, B.y0, 14, B.y1 - B.y0);
  ctx.fillRect(B.x1 - 2, B.y0, 14, B.y1 - B.y0);
  ctx.fillRect(B.x0, B.y1 - 2, B.x1 - B.x0, 14);
  // garis batu
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = B.x0; x < B.x1; x += 34) {
    ctx.moveTo(x, B.y0 - 12); ctx.lineTo(x, B.y0 + 2);
    ctx.moveTo(x, B.y1 - 2); ctx.lineTo(x, B.y1 + 12);
  }
  for (let y = B.y0; y < B.y1; y += 34) {
    ctx.moveTo(B.x0 - 12, y); ctx.lineTo(B.x0 + 2, y);
    ctx.moveTo(B.x1 - 2, y); ctx.lineTo(B.x1 + 12, y);
  }
  ctx.stroke();
  // tepi atas pagar: lebih terang
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(B.x0, B.y0 - 12, 330, 3);
  ctx.fillRect(70, B.y0 - 12, B.x1 - 70, 3);
}

function drawGate(ctx, t) {
  const g = W.GATE;
  ctx.fillStyle = '#33241506';
  // tiang
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(g.x - 48, g.y - 14, 10, 38);
  ctx.fillRect(g.x + 38, g.y - 14, 10, 38);
  ctx.fillStyle = '#463322';
  ctx.fillRect(g.x - 52, g.y - 18, 18, 6);
  ctx.fillRect(g.x + 34, g.y - 18, 18, 6);
  // lintel
  ctx.fillStyle = '#33251a';
  ctx.fillRect(g.x - 50, g.y - 30, 100, 12);
  // pintu setengah terbuka (tergores, wabah)
  ctx.save();
  ctx.translate(g.x + 28, g.y - 18);
  ctx.rotate(-0.5);
  ctx.fillStyle = 'rgba(74,54,32,0.92)';
  ctx.fillRect(-4, 0, 34, 44);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-4, 0, 34, 44);
  ctx.beginPath();
  ctx.moveTo(13, 2); ctx.lineTo(13, 42);
  ctx.stroke();
  ctx.restore();
  // pelita gantung
  const sw = Math.sin(t * 1.3) * 2;
  ctx.strokeStyle = '#1d150d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y - 28);
  ctx.lineTo(g.x + sw, g.y - 14);
  ctx.stroke();
  ctx.fillStyle = '#2a2013';
  ctx.fillRect(g.x + sw - 4, g.y - 14, 8, 10);
  const fl = 0.75 + Math.sin(t * 9) * 0.2;
  ctx.fillStyle = `rgba(255,205,130,${0.75 * fl})`;
  ctx.beginPath();
  ctx.arc(g.x + sw, g.y - 9, 2.6 * fl, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- node ----------

function drawWheatPlot(ctx, nd, t) {
  const rng = makeRng(hash(nd.id));
  ctx.fillStyle = '#2a2418';
  ctx.fillRect(nd.x - 30, nd.y - 40, 60, 80);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(nd.x - 30, nd.y - 40, 60, 80);
  const maxBright = 20;
  const bright = Math.round((nd.stock / (nd.maxStock || N.STOCK)) * maxBright);
  const growing = nd.cool > 0;
  for (let i = 0; i < maxBright; i++) {
    const rx = (i % 5) * 12 - 24;
    const ry = Math.floor(i / 5) * 22 - 33;
    const x = nd.x + rx + (rng() - 0.5) * 4;
    const y = nd.y + ry + (rng() - 0.5) * 4;
    const on = !growing && i < bright;
    const h = on ? 13 : 7;
    const sway = on ? Math.sin(t * 1.6 + i) * 1.2 : 0;
    ctx.strokeStyle = on ? '#d9a94e' : '#5c4f2c';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + sway, y - h);
    ctx.stroke();
    ctx.fillStyle = on ? '#ffd98a' : '#5c4f2c';
    ctx.beginPath();
    ctx.arc(x + sway, y - h, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  nodeRing(ctx, nd);
}

function drawHerbPlot(ctx, nd, t) {
  const rng = makeRng(hash(nd.id));
  ctx.fillStyle = '#202a1a';
  ctx.fillRect(nd.x - 26, nd.y - 34, 52, 68);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(nd.x - 26, nd.y - 34, 52, 68);
  const maxTuft = 9;
  const bright = Math.round((nd.stock / N.STOCK) * maxTuft);
  const growing = nd.cool > 0;
  for (let i = 0; i < maxTuft; i++) {
    const x = nd.x + ((i % 3) * 16 - 16) + (rng() - 0.5) * 4;
    const y = nd.y + (Math.floor(i / 3) * 20 - 20) + (rng() - 0.5) * 4;
    const on = !growing && i < bright;
    const h = on ? 9 : 5;
    ctx.strokeStyle = on ? '#6fae5c' : '#3d4a30';
    ctx.lineWidth = 1.6;
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + k * 3, y - h * 0.6, x + k * 4.5, y - h);
      ctx.stroke();
    }
  }
  nodeRing(ctx, nd);
}

function drawWoodPile(ctx, nd, t) {
  const rng = makeRng(hash(nd.id));
  const maxLog = 6;
  const bright = Math.round((nd.stock / 8) * maxLog);
  const growing = nd.cool > 0;
  for (let i = 0; i < maxLog; i++) {
    const x = nd.x + ((i % 3) * 16 - 16) + (rng() - 0.5) * 2;
    const y = nd.y + (Math.floor(i / 3) * 13 - 6) + (rng() - 0.5) * 2;
    const on = !growing && i < bright;
    // batang membaring (elips + ujung cincin)
    ctx.fillStyle = on ? '#7a5230' : '#463320';
    ctx.beginPath();
    ctx.ellipse(x, y, 11, 5.5, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = on ? '#9a6a3c' : '#54402a';
    ctx.beginPath();
    ctx.ellipse(x + 10, y + 1.3, 2.6, 4.6, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = on ? 'rgba(60,38,18,0.8)' : 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(x + 10, y + 1.3, 1.2, 2.2, 0.12, 0, Math.PI * 2);
    ctx.stroke();
  }
  nodeRing(ctx, nd);
}

// cincin samar: radius berdiri (baca zona interaksi, bukan kotak UI)
function nodeRing(ctx, nd) {
  if (nd.stock <= 0) return;
  const d = A.doctor;
  const near = d && dist(d.x, d.y, nd.x, nd.y) < N.RADIUS + 16;
  ctx.strokeStyle = near ? 'rgba(216,170,90,0.34)' : 'rgba(216,170,90,0.12)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.ellipse(nd.x, nd.y, 34, 40, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

// apotek: gubuk kecil di samping taman herbal
function drawHut(ctx, t) {
  const x = 316, y = 40;
  aAtUpright(ctx, x, y, () => {
    // badan
    ctx.fillStyle = '#33261a';
    ctx.fillRect(-34, -46, 68, 46);
    ctx.fillStyle = '#2a2016';
    for (let i = 0; i < 4; i++) ctx.fillRect(-34 + i * 17, -46, 2, 46);
    // atap
    ctx.fillStyle = '#232a33';
    ctx.beginPath();
    ctx.moveTo(-42, -44);
    ctx.lineTo(0, -74);
    ctx.lineTo(42, -44);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // jendela (cahaya hangat)
    const fl = 0.7 + Math.sin(t * 8.3) * 0.2;
    ctx.fillStyle = `rgba(255,205,130,${0.5 * fl})`;
    ctx.fillRect(12, -32, 12, 12);
    ctx.strokeStyle = '#171209';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(12, -32, 12, 12);
    // pintu
    ctx.fillStyle = '#1d150d';
    ctx.fillRect(-22, -26, 16, 26);
    // tanda salib hijau
    ctx.fillStyle = '#5f8a4a';
    ctx.fillRect(-8, -40, 5, 15);
    ctx.fillRect(-13, -35, 15, 5);
  });
}

function drawBrazier(ctx, t) {
  const x = 0, y = 340;
  // ring batu
  ctx.fillStyle = '#39414d';
  ctx.beginPath();
  ctx.ellipse(x, y, 20, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#232a33';
  ctx.beginPath();
  ctx.ellipse(x, y - 2, 15, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // bara + api
  ctx.fillStyle = 'rgba(255,110,40,0.85)';
  ctx.beginPath();
  ctx.ellipse(x, y - 4, 10, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const ph = t * 11 + i * 2.1;
    const h = 13 + Math.sin(ph) * 4 + Math.sin(ph * 1.7) * 2;
    const dx = (i - 1) * 6;
    ctx.fillStyle = i === 1 ? '#ffd98a' : '#ff9a3d';
    ctx.beginPath();
    ctx.moveTo(x + dx - 4, y - 4);
    ctx.quadraticCurveTo(x + dx - 2, y - 4 - h * 0.6, x + dx + Math.sin(ph) * 2, y - 4 - h);
    ctx.quadraticCurveTo(x + dx + 3, y - 4 - h * 0.55, x + dx + 4, y - 4);
    ctx.closePath();
    ctx.fill();
  }
}

// ---------- bangsal ----------

export function drawGhostWard(ctx, w, t) {
  const pulse = 0.5 + Math.sin(t * 2.1 + w.id * 1.7) * 0.3;
  const x0 = w.x - 78, y0 = w.y - 64;
  const x1 = w.x + 78, y1 = w.y + 64;
  // lantai bercahaya (ghost tile)
  ctx.fillStyle = `rgba(216,170,90,${0.04 + 0.05 * pulse})`;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = `rgba(216,170,90,${0.22 + 0.3 * pulse})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([9, 7]);
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.setLineDash([]);
  // ikon kasur di tengah
  ctx.globalAlpha = 0.4 + 0.4 * pulse;
  drawMiniIcon(ctx, 'bed', w.x, w.y - 12, 30);
  ctx.globalAlpha = 1;
  // nama + biaya: [ikon aksi + biaya sumber daya] — spec §4.1.3
  ctx.font = '700 11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(216,178,150,${0.5 + 0.4 * pulse})`;
  ctx.fillText(w.name, w.x, w.y + 14);
  drawMiniIcon(ctx, 'coin', w.x - 26, w.y + 30, 13);
  ctx.fillStyle = '#e0c896';
  ctx.font = '700 11px Inter, system-ui, sans-serif';
  ctx.fillText(String(ACFG.WARD.COST_COINS), w.x - 10, w.y + 34);
  drawMiniIcon(ctx, 'wood', w.x + 12, w.y + 30, 13);
  ctx.fillText(String(ACFG.WARD.COST_WOOD), w.x + 28, w.y + 34);
  // progress saat sedang dibangun
  if (w.progress > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(w.x - 55, w.y + 44, 110, 6);
    ctx.fillStyle = '#ffd98a';
    ctx.fillRect(w.x - 55, w.y + 44, 110 * clamp(w.progress, 0, 1), 6);
  }
}

export function drawBuiltWard(ctx, w) {
  const x0 = w.x - 78, y0 = w.y - 64;
  // lantai
  ctx.fillStyle = '#2b323c';
  ctx.fillRect(x0, y0, 156, 128);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x0, y0, 156, 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let y = y0 + 24; y < y0 + 128; y += 24) {
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + 156, y); ctx.stroke();
  }
  // kanopi: dua tiang + kain (tenda bangsal)
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(x0 + 8, y0 - 34, 6, 36);
  ctx.fillRect(x0 + 142, y0 - 34, 6, 36);
  // kain: digambar di dunia (pipih mengikuti tanah)
  ctx.fillStyle = 'rgba(198,188,166,0.85)';
  ctx.beginPath();
  ctx.moveTo(x0 - 4, y0 - 44);
  ctx.lineTo(x0 + 160, y0 - 44);
  ctx.lineTo(x0 + 156, y0 - 6);
  ctx.quadraticCurveTo(w.x, y0 + 4, x0 + 4, y0 - 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(146,64,48,0.8)';
  for (let i = 0; i < 3; i++) ctx.fillRect(x0 + 24 + i * 44, y0 - 44, 12, 42);
  // salib kecil di kain
  ctx.fillStyle = 'rgba(90,30,24,0.9)';
  ctx.fillRect(w.x - 4, y0 - 40, 8, 26);
  ctx.fillRect(w.x - 11, y0 - 33, 22, 8);
}

export function drawBed(ctx, b, t) {
  // kerangka
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(b.x, b.y + 3, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  aAtUpright(ctx, b.x, b.y, () => {
    // kaki + rangka
    ctx.fillStyle = '#4a2f17';
    ctx.fillRect(-15, -34, 30, 40);
    // kasur
    ctx.fillStyle = '#cfc4ae';
    ctx.fillRect(-13, -32, 26, 36);
    // bantal
    ctx.fillStyle = '#e4dcc8';
    ctx.fillRect(-11, -31, 22, 8);
    const p = b.patient;
    if (p) {
      // selimut (kondisi terlihat: pucat -> keabu-abuan)
      const k = clamp(p.condition / 100, 0, 1);
      ctx.fillStyle = `rgb(${Math.round(70 + 20 * (1 - k))},${Math.round(98 * k + 40)},${Math.round(96 * k + 36)})`;
      ctx.beginPath();
      ctx.moveTo(-12, -20);
      ctx.lineTo(12, -20);
      ctx.lineTo(11, 2);
      ctx.quadraticCurveTo(0, 6, -11, 2);
      ctx.closePath();
      ctx.fill();
      // kepala + kain penutup wajah
      ctx.fillStyle = '#d8c4a8';
      ctx.beginPath();
      ctx.arc(0, -25, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9fb0ba';
      ctx.fillRect(-5, -25, 10, 3);
    } else {
      // kasur kosong: lipatan
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-11, -12); ctx.lineTo(11, -12);
      ctx.moveTo(-11, -2); ctx.lineTo(11, -2);
      ctx.stroke();
    }
  });
  // bar kondisi (di atas bed, ruang layar)
  if (b.patient) {
    const k = clamp(b.patient.condition / 100, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(b.x - 14, b.y - 44, 28, 4);
    ctx.fillStyle = k > 0.5 ? '#7cb45e' : k > 0.25 ? '#d9a94e' : '#c0563f';
    ctx.fillRect(b.x - 14, b.y - 44, 28 * k, 4);
  }
  // progress treatment: busur melingkar (satu sumber kebenaran: trigger)
  if (b.progress > 0) {
    const pulse = 1 + Math.sin(t * 6) * 0.06;
    ctx.strokeStyle = 'rgba(255,217,138,0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 27 * pulse, -Math.PI / 2, -Math.PI / 2 + clamp(b.progress, 0, 1) * Math.PI * 2);
    ctx.stroke();
  }
}

// ---------- pasien berjalan ----------
export function drawPatient(ctx, p) {
  const moving = p.state === 'entering' || p.state === 'toBed' || p.state === 'leaving';
  const bob = Math.sin(p.walkT * 2.2) * (moving ? 1.4 : 0.7);
  const step = Math.sin(p.walkT * 2.2) * (moving ? 3 : 0);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 2, 8, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  aAtUpright(ctx, p.x, p.y, () => {
    ctx.translate(0, bob);
    // kaki
    ctx.strokeStyle = '#20242c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-3, -8); ctx.lineTo(-3 + step, 0);
    ctx.moveTo(3, -8); ctx.lineTo(3 - step, 0);
    ctx.stroke();
    // jubah warga (warnanya berbeda-beda, kusam)
    const light = p.cured ? 38 : 28;
    ctx.fillStyle = `hsl(${p.hue},14%,${light}%)`;
    ctx.beginPath();
    ctx.moveTo(-7, -6);
    ctx.lineTo(-9, -22);
    ctx.quadraticCurveTo(0, -27, 9, -22);
    ctx.lineTo(7, -6);
    ctx.closePath();
    ctx.fill();
    // kepala + penutup kain
    ctx.fillStyle = '#d8c4a8';
    ctx.beginPath();
    ctx.arc(0, -27, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9fb0ba';
    ctx.fillRect(-5, -27, 10, 2.6);
    // jubah kecil (hood)
    ctx.fillStyle = `hsl(${p.hue},14%,${light - 6}%)`;
    ctx.beginPath();
    ctx.arc(0, -28, 6.4, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    // pasien sembuh: tas silang hijau di dada
    if (p.cured) {
      ctx.fillStyle = '#6fae5c';
      ctx.fillRect(-2.4, -18, 4.8, 1.6);
      ctx.fillRect(-0.8, -19.6, 1.6, 4.8);
    }
  });
}

// ---------- dokter wabah (billboard + proyeksi hadap) ----------
export function drawDoctor(ctx, t) {
  const d = A.doctor, r = A.rig;
  if (!d || !r) return;
  const T = ACFG.CAM.TILT;
  const fx = Math.cos(d.face), fy = Math.sin(d.face);
  const th = Math.atan2(fy * T, fx);      // hadap diproyeksikan ke layar
  const ct = Math.cos(th), st = Math.sin(th);

  // bayangan (lantai)
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath();
  ctx.ellipse(d.x, d.y + 2, 13, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // ---- Jubah: 3 chain spring-bone (spec §3.1) — digambar di ruang dunia ----
  const pts = r.chains;
  const back = { x: -fx, y: -fy };
  ctx.beginPath();
  ctx.moveTo(d.x + back.x * 8 - fy * 7, d.y + back.y * 8 + fx * 7);
  for (let c = 0; c < pts.length; c++) {
    const chain = pts[c];
    for (let i = 0; i < chain.length; i++) ctx.lineTo(chain[i].x, chain[i].y);
    if (c < pts.length - 1) {
      const tip = chain[chain.length - 1];
      const nxt = pts[c + 1][0];
      ctx.quadraticCurveTo(
        (tip.x + nxt.x) / 2 + back.x * 3,
        (tip.y + nxt.y) / 2 + back.y * 3,
        nxt.x, nxt.y
      );
    }
  }
  ctx.lineTo(d.x + back.x * 8 + fy * 7, d.y + back.y * 8 - fx * 7);
  ctx.closePath();
  ctx.fillStyle = '#2e3440';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // garis jahitan jubah
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let c = 0; c < pts.length; c++) {
    const chain = pts[c];
    ctx.beginPath();
    ctx.moveTo(chain[0].x, chain[0].y);
    for (let i = 1; i < chain.length; i++) ctx.lineTo(chain[i].x, chain[i].y);
    ctx.stroke();
  }

  // ---- Badan (billboard tegak) ----
  aAtUpright(ctx, d.x, d.y, () => {
    const s = Math.sin(d.walkT) * d.walkAmp;   // fase langkah -1..1
    const bob = Math.abs(Math.cos(d.walkT)) * d.walkAmp * 1.6;
    ctx.translate(0, -bob);
    // kaki: penapakan terkunci ke arah gerak (spec §2.2)
    ctx.strokeStyle = '#23262e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-3, -10); ctx.lineTo(ct * 4.5 * s - 2, st * 4.5 * s);
    ctx.moveTo(3, -10); ctx.lineTo(-ct * 4.5 * s + 2, -st * 4.5 * s);
    ctx.stroke();
    // sepatu bot
    ctx.fillStyle = '#191c22';
    ctx.beginPath();
    ctx.ellipse(ct * 4.5 * s - 2, st * 4.5 * s - bob, 3.4, 2.2, th, 0, Math.PI * 2);
    ctx.ellipse(-ct * 4.5 * s + 2, -st * 4.5 * s - bob, 3.4, 2.2, th, 0, Math.PI * 2);
    ctx.fill();
    // badan: jubah kulit gelap
    ctx.fillStyle = '#3a4050';
    ctx.beginPath();
    ctx.moveTo(-9, -8);
    ctx.lineTo(-11, -25);
    ctx.quadraticCurveTo(0, -29, 11, -25);
    ctx.lineTo(9, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // sabuk kulit
    ctx.fillStyle = '#262b36';
    ctx.fillRect(-10, -15, 20, 3.4);
    ctx.fillStyle = '#8a6a28';
    ctx.fillRect(-1.6, -15.4, 3.2, 4.2);
    // lengan KANAN + vial ramuan (slot item)
    ctx.strokeStyle = '#333947';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(8, -22);
    ctx.lineTo(-ct * 10, -19 - st * 4);
    ctx.stroke();
    ctx.fillStyle = '#7cb45e';
    ctx.beginPath();
    ctx.arc(-ct * 10, -19 - st * 4, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // lengan KIRI + lentera (diputar sesuai hadap layar)
    ctx.beginPath();
    ctx.moveTo(-8, -22);
    ctx.lineTo(ct * 10, -18 + st * 4);
    ctx.stroke();
    // lentera: pendulum (sudut dari rig)
    const la = r.lantern.a;
    const hx = ct * 10, hy = -18 + st * 4;
    const lx2 = hx + Math.sin(la) * ACFG.RIG.LANTERN_LEN;
    const ly2 = hy + Math.cos(la) * ACFG.RIG.LANTERN_LEN * 0.75;
    ctx.strokeStyle = '#1d150d';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(lx2, ly2);
    ctx.stroke();
    ctx.fillStyle = '#3d3226';
    ctx.fillRect(lx2 - 3, ly2, 6, 7);
    const fl = 0.75 + Math.sin(t * 12) * 0.2;
    ctx.fillStyle = `rgba(255,214,140,${0.85 * fl})`;
    ctx.fillRect(lx2 - 1.8, ly2 + 1.4, 3.6, 4.2);
    // kepala
    ctx.fillStyle = '#d8cbb8';
    ctx.beginPath();
    ctx.arc(ct * 2.5, -32, 7.2, 0, Math.PI * 2);
    ctx.fill();
    // topi lebar
    ctx.fillStyle = '#23201c';
    ctx.beginPath();
    ctx.ellipse(ct * 2, -36.5, 11.5, 4.2, th * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2622';
    ctx.beginPath();
    ctx.arc(ct * 1.5, -38.5, 6.4, Math.PI, Math.PI * 2);
    ctx.fill();
    // pelindung mata (goggles)
    ctx.fillStyle = '#b9c8d2';
    ctx.beginPath();
    ctx.arc(ct * 5 - st * 2.4, -33 + ct * 2, 2.3, 0, Math.PI * 2);
    ctx.arc(ct * 5 + st * 2.4, -33 - ct * 2, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6b5426';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ct * 5 - st * 2.4, -33 + ct * 2, 2.3, 0, Math.PI * 2);
    ctx.stroke();
    // topeng paruh: menghadap arah hadap
    ctx.save();
    ctx.translate(ct * 3.5, -32 + st * 3.5);
    ctx.rotate(th);
    ctx.fillStyle = '#c8913f';
    ctx.beginPath();
    ctx.moveTo(1, -3.4);
    ctx.lineTo(13, -1.6);
    ctx.lineTo(16.5, 0.2);
    ctx.lineTo(13, 1.6);
    ctx.lineTo(1, 3.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#8a6a28';
    ctx.beginPath();
    ctx.ellipse(14.4, 0.3, 1.7, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ---------- ikon mini (dipakai fx flyItem, ghost tile, HUD) ----------
export function drawMiniIcon(ctx, type, x, y, s = 14) {
  const k = s / 14;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  switch (type) {
    case 'wheat':
      ctx.strokeStyle = '#d9a94e';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, 7); ctx.lineTo(0, -7);
      ctx.moveTo(0, -7); ctx.lineTo(-4, -2);
      ctx.moveTo(0, -4); ctx.lineTo(4, 1);
      ctx.stroke();
      ctx.fillStyle = '#ffd98a';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse((i % 2 ? -2.6 : 2.6), -6 + i * 3.4, 1.6, 2.6, (i % 2 ? -0.5 : 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'herb':
      ctx.strokeStyle = '#6fae5c';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, 7); ctx.lineTo(0, -2);
      ctx.stroke();
      ctx.fillStyle = '#7cb45e';
      for (const [dx, dy, rot] of [[-1, -3, -0.6], [1, -5, 0.6], [0, -7.5, 0]]) {
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.2, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    case 'wood':
      ctx.fillStyle = '#7a5230';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7.5, 4, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#9a6a3c';
      ctx.beginPath();
      ctx.ellipse(6.4, 1.4, 2, 3.4, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,38,18,0.9)';
      ctx.beginPath();
      ctx.ellipse(6.4, 1.4, 0.9, 1.6, 0.2, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'coin':
      ctx.fillStyle = '#e8c25a';
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a6a24';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = '#8a6a24';
      ctx.fillRect(-1, -4, 2, 8);
      ctx.fillRect(-4, -1, 8, 2);
      break;
    case 'bed':
      ctx.fillStyle = '#8a6a3c';
      ctx.fillRect(-8, -5, 16, 10);
      ctx.fillStyle = '#e4dcc8';
      ctx.fillRect(-6.5, -3.5, 13, 7);
      ctx.fillStyle = '#cfc4ae';
      ctx.fillRect(-6.5, -3.5, 4, 7);
      break;
    case 'cross':
      ctx.fillStyle = '#d8d2c4';
      ctx.fillRect(-2, -7, 4, 14);
      ctx.fillRect(-7, -2, 14, 4);
      break;
    case 'walk':
      ctx.strokeStyle = '#d8d2c4';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-2, 7); ctx.lineTo(0, 1); ctx.lineTo(2, 7);
      ctx.moveTo(-1, 1); ctx.lineTo(3, -2);
      ctx.stroke();
      ctx.fillStyle = '#d8d2c4';
      ctx.beginPath();
      ctx.arc(1, -5, 2.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'build':
      ctx.strokeStyle = '#d8d2c4';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-6, 6); ctx.lineTo(3, -3);
      ctx.stroke();
      ctx.fillStyle = '#d8d2c4';
      ctx.fillRect(1, -7, 7, 4);
      break;
  }
  ctx.restore();
}

// ambience: kabut tipis bergeser + gagak melingkar (di atas dunia, di bawah vignette)
export function drawAmbience(ctx, vw, vh, t) {
  // gradasi malam: utara (atas layar) lebih gelap
  const g = ctx.createLinearGradient(0, 0, 0, vh);
  g.addColorStop(0, 'rgba(6,10,18,0.5)');
  g.addColorStop(0.45, 'rgba(8,12,20,0.12)');
  g.addColorStop(1, 'rgba(4,7,12,0.28)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);
  // kabut
  ctx.fillStyle = 'rgba(150,170,190,0.045)';
  for (let i = 0; i < 3; i++) {
    const x = ((t * (9 + i * 4) + i * 400) % (vw + 500)) - 250;
    const y = vh * (0.2 + i * 0.22) + Math.sin(t * 0.4 + i * 2) * 14;
    ctx.beginPath();
    ctx.ellipse(x, y, 190 + i * 60, 26 + i * 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // gagak melingkar (jam yang bisa dilihat: pelataran tetap hidup)
  ctx.strokeStyle = 'rgba(20,24,30,0.8)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    const a = t * (0.5 + i * 0.13) + i * 2.1;
    const cx = vw / 2 + Math.cos(a) * (vw * 0.3);
    const cy = vh * 0.16 + Math.sin(a) * 22;
    const flap = Math.sin(t * 7 + i * 2) * 3;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + flap);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + 7, cy + flap);
    ctx.stroke();
  }
  // vignette
  const vg = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.32, vw / 2, vh / 2, Math.max(vw, vh) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(2,4,8,0.6)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, vw, vh);
}
