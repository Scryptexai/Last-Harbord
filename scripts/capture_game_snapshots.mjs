import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('snapshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  const charPreview = await loadImage('assets/branding/character_preview_rgba.png');
  const keeperImg = await loadImage('assets/characters/npc_keeper.png');
  const zombieSlow = await loadImage('assets/characters/zombie_slow.png');
  const zombieFast = await loadImage('assets/characters/zombie_fast.png');
  const zombieTank = await loadImage('assets/characters/zombie_tank.png');
  const boatImg = await loadImage('assets/characters/boat_lv1.png');
  const treeImg = await loadImage('assets/environment/tree.png');
  const rockImg = await loadImage('assets/environment/rock.png');

  const VW = 800;
  const VH = 480;
  const TILT = 0.40;

  // Exact function for drawing 3D character
  function drawChar3D(ctx, sz, mode) {
    if (mode === 'old') {
      // Old over-scaled code:
      ctx.drawImage(charPreview, -sz * 0.67, -sz * 1.05, sz * 1.34, sz * 1.34);
    } else {
      // New mathematically proportioned code:
      // sz represents sprite box size (68 for harbor, 72 for land)
      // Character height = sz * 0.625 (42.5px in harbor, 45px on land)
      const s = (sz * 0.625) / 194;
      const drawW = 256 * s;
      const drawH = drawW;
      const drawX = -129 * s;
      const drawY = -226 * s;
      ctx.drawImage(charPreview, drawX, drawY, drawW, drawH);
    }
  }

  // 1. RENDER HARBOR SCENE
  async function renderHarborScene(mode) {
    const canvas = createCanvas(VW, VH);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#0a1e2e');
    g.addColorStop(0.6, '#071522');
    g.addColorStop(1, '#040c14');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);

    // World camera transform (harbor zoom = 1.35)
    const zoom = 1.35;
    ctx.save();
    ctx.translate(VW / 2, VH / 2 + 10);
    ctx.scale(zoom, zoom * TILT);
    ctx.translate(0, -60);

    // Boardwalk
    const x0 = -500, x1 = 500, y1 = 470, top = -4;
    const w = x1 - x0;
    ctx.fillStyle = '#33200f';
    ctx.fillRect(x0, top, w, y1 - top);

    for (let y = top; y < y1; y += 14) {
      ctx.fillStyle = 'rgb(107, 69, 34)';
      ctx.fillRect(x0, y, w, 11);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x0, y + 11, w, 3);
    }
    // Pilings
    ctx.fillStyle = '#3d2712';
    for (let x = -470; x <= 470; x += 60) ctx.fillRect(x - 3, -26, 8, 26);

    // Boat at dock
    ctx.save();
    ctx.translate(0, 0);
    ctx.scale(1.0, 1.0 / TILT);
    ctx.drawImage(boatImg, -50, -95, 100, 100);
    ctx.restore();

    // Keeper NPC at x: -80, y: 120
    ctx.save();
    ctx.translate(-80, 120);
    ctx.scale(1.0, 1.0 / TILT);
    ctx.drawImage(keeperImg, -20, -46, 40, 48);
    ctx.fillStyle = '#caa46a';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Keeper (48px)', 0, -50);
    ctx.restore();

    // Crates at x: 90, y: 120
    ctx.save();
    ctx.translate(90, 120);
    ctx.scale(1.0, 1.0 / TILT);
    ctx.fillStyle = '#5c3a1e';
    ctx.fillRect(-15, -24, 30, 24);
    ctx.strokeStyle = '#3d2510';
    ctx.strokeRect(-15, -24, 30, 24);
    ctx.fillStyle = '#bdc3c7';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Peti (24px)', 0, -28);
    ctx.restore();

    // Player at x: 0, y: 130
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(0, 130 + 3, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, 130);
    ctx.scale(1.0, 1.0 / TILT);

    const sz = 68;
    drawChar3D(ctx, sz, mode);

    const actualH = mode === 'old' ? Math.round(sz * 1.34 * (194 / 256)) : Math.round(sz * 0.625);
    ctx.fillStyle = mode === 'old' ? '#ff5555' : '#2ecc71';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Pemain (${actualH}px)`, 0, -actualH - 8);

    ctx.restore();
    ctx.restore();

    // Banner
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, VW, 36);
    ctx.fillStyle = mode === 'old' ? '#e74c3c' : '#2ecc71';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      mode === 'old'
        ? 'TKP PELABUHAN [SEBELUM]: Karakter 70px (Terlalu Raksasa vs Papan & Keeper)'
        : 'TKP PELABUHAN [SESUDAH]: Karakter 42.5px (Sempurna & Sinkron Denah)',
      16, 24
    );

    return canvas.toBuffer('image/png');
  }

  // 2. RENDER ISLAND SCENE
  async function renderIslandScene(mode) {
    const canvas = createCanvas(VW, VH);
    const ctx = canvas.getContext('2d');

    // Ocean background
    ctx.fillStyle = '#06131f';
    ctx.fillRect(0, 0, VW, VH);

    // World camera transform (land zoom = 1.58)
    const zoom = 1.58;
    ctx.save();
    ctx.translate(VW / 2, VH / 2);
    ctx.scale(zoom, zoom * TILT);

    // Island landmass
    ctx.fillStyle = '#223318';
    ctx.beginPath();
    ctx.ellipse(0, 0, 240, 200, 0, 0, Math.PI * 2);
    ctx.fill();

    // Beach
    ctx.strokeStyle = '#a89066';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.ellipse(0, 0, 234, 194, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Tree
    ctx.save();
    ctx.translate(-90, -40);
    ctx.scale(1.0, 1.0 / TILT);
    ctx.drawImage(treeImg, -36, -80, 72, 88);
    ctx.restore();

    // Rock
    ctx.save();
    ctx.translate(100, -20);
    ctx.scale(1.0, 1.0 / TILT);
    ctx.drawImage(rockImg, -28, -28, 56, 36);
    ctx.restore();

    // Zombie Slow
    ctx.save();
    ctx.translate(-45, 20);
    ctx.scale(1.0, 1.0 / TILT);
    ctx.drawImage(zombieSlow, -21, -38, 42, 42);
    ctx.fillStyle = '#bdc3c7';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Zombie Slow (34px)', 0, -40);
    ctx.restore();

    // Zombie Tank
    ctx.save();
    ctx.translate(65, 30);
    ctx.scale(1.0, 1.0 / TILT);
    ctx.drawImage(zombieTank, -34, -62, 68, 68);
    ctx.fillStyle = '#e67e22';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Zombie Tank (62px)', 0, -66);
    ctx.restore();

    // Player
    ctx.save();
    // "You are here" ring
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(5, 20, 13 + 6, 0, Math.PI * 2);
    ctx.stroke();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(5, 20 + 3, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(5, 20);
    ctx.scale(1.0, 1.0 / TILT);

    const sz = 72;
    drawChar3D(ctx, sz, mode);

    const actualH = mode === 'old' ? Math.round(sz * 1.34 * (194 / 256)) : Math.round(sz * 0.625);
    ctx.fillStyle = mode === 'old' ? '#ff5555' : '#2ecc71';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Pemain (${actualH}px)`, 0, -actualH - 8);

    ctx.restore();
    ctx.restore();

    // Banner
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, VW, 36);
    ctx.fillStyle = mode === 'old' ? '#e74c3c' : '#2ecc71';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      mode === 'old'
        ? 'TKP PULAU [SEBELUM]: Karakter 75px (Raksasa vs Zombie Slow 34px & Tank 62px)'
        : 'TKP PULAU [SESUDAH]: Karakter 45px (Proporsional & Seimbang vs Zombie & Arena)',
      16, 24
    );

    return canvas.toBuffer('image/png');
  }

  fs.writeFileSync('snapshots/tkp_harbor_before.png', await renderHarborScene('old'));
  fs.writeFileSync('snapshots/tkp_harbor_after.png', await renderHarborScene('new'));
  fs.writeFileSync('snapshots/tkp_island_before.png', await renderIslandScene('old'));
  fs.writeFileSync('snapshots/tkp_island_after.png', await renderIslandScene('new'));

  console.log('Generated tkp_harbor_before.png, tkp_harbor_after.png, tkp_island_before.png, tkp_island_after.png');
}

run().catch(console.error);
