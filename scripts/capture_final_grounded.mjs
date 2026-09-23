import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'fs';

async function generateFinalSnapshots() {
  const charPreview = await loadImage('assets/branding/character_preview_rgba.png');
  const keeperImg = await loadImage('assets/characters/npc_keeper.png');
  const zombieSlow = await loadImage('assets/characters/zombie_slow.png');
  const zombieTank = await loadImage('assets/characters/zombie_tank.png');
  const boatImg = await loadImage('assets/characters/boat_lv1.png');
  const treeImg = await loadImage('assets/environment/tree.png');
  const rockImg = await loadImage('assets/environment/rock.png');

  const VW = 800;
  const VH = 480;
  const TILT = 0.40;

  // 1. HARBOR SCENE FINAL
  {
    const canvas = createCanvas(VW, VH);
    const ctx = canvas.getContext('2d');

    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#0a1e2e');
    g.addColorStop(0.6, '#071522');
    g.addColorStop(1, '#040c14');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);

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
    ctx.fillStyle = '#3d2712';
    for (let x = -470; x <= 470; x += 60) ctx.fillRect(x - 3, -26, 8, 26);

    // Boat
    ctx.save();
    ctx.translate(0, 0);
    ctx.scale(1.0, 1.0 / TILT);
    ctx.drawImage(boatImg, -50, -95, 100, 100);
    ctx.restore();

    // Keeper
    ctx.save();
    ctx.translate(-80, 120);
    ctx.scale(1.0, 1.0 / TILT);
    ctx.drawImage(keeperImg, -20, -46, 40, 48);
    ctx.fillStyle = '#caa46a';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Keeper (48px)', 0, -50);
    ctx.restore();

    // Player with new Dual-Layer Contact Shadow + Anchored Feet
    const px = 0, py = 130;
    ctx.save();
    ctx.fillStyle = 'rgba(10, 6, 4, 0.40)';
    ctx.beginPath(); ctx.ellipse(px, py + 1, 14, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(2, 4, 8, 0.70)';
    ctx.beginPath(); ctx.ellipse(px, py + 0.5, 9.5, 3.2, 0, 0, Math.PI * 2); ctx.fill();

    ctx.translate(px, py);
    ctx.scale(1.0, 1.0 / TILT);

    const sz = 68;
    const s = (sz * 0.625) / 194;
    ctx.drawImage(charPreview, -129 * s, -223 * s, 256 * s, 256 * s);

    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Pemain (42.5px — Berpijak Kokoh)', 0, -50);
    ctx.restore();

    ctx.restore();

    // Title banner
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, VW, 38);
    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('FINAL HARBOR: Karakter Berpijak Mantap di Atas Papan Kayu dengan Dual Contact Shadow', 16, 25);

    fs.writeFileSync('snapshots/tkp_harbor_grounded.png', canvas.toBuffer('image/png'));
  }

  // 2. ISLAND SCENE FINAL
  {
    const canvas = createCanvas(VW, VH);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#06131f';
    ctx.fillRect(0, 0, VW, VH);

    const zoom = 1.58;
    ctx.save();
    ctx.translate(VW / 2, VH / 2);
    ctx.scale(zoom, zoom * TILT);

    ctx.fillStyle = '#223318';
    ctx.beginPath();
    ctx.ellipse(0, 0, 240, 200, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#a89066';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.ellipse(0, 0, 234, 194, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.translate(-90, -40);
    ctx.scale(1.0, 1.0 / TILT);
    ctx.drawImage(treeImg, -36, -80, 72, 88);
    ctx.restore();

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

    // Player with new Dual-Layer Contact Shadow
    const px = 5, py = 20;
    ctx.save();
    ctx.fillStyle = 'rgba(8, 14, 10, 0.42)';
    ctx.beginPath(); ctx.ellipse(px, py + 1, 14, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(2, 4, 6, 0.72)';
    ctx.beginPath(); ctx.ellipse(px, py + 0.5, 9.5, 3.2, 0, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 13 + 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.translate(px, py);
    ctx.scale(1.0, 1.0 / TILT);

    const sz = 72;
    const s = (sz * 0.625) / 194;
    ctx.drawImage(charPreview, -129 * s, -223 * s, 256 * s, 256 * s);

    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Pemain (45px — Berpijak Kokoh)', 0, -52);
    ctx.restore();

    ctx.restore();

    // Title banner
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, VW, 38);
    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('FINAL PULAU: Karakter Berpijak Alami di Tanah/Pasir Menyatu Sempurna dengan Denah', 16, 25);

    fs.writeFileSync('snapshots/tkp_island_grounded.png', canvas.toBuffer('image/png'));
  }

  console.log('Generated snapshots/tkp_harbor_grounded.png & snapshots/tkp_island_grounded.png');
}

generateFinalSnapshots().catch(console.error);
