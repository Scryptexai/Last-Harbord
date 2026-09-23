import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'fs';

async function run() {
  const charPreview = await loadImage('assets/branding/character_preview_rgba.png');
  const keeperImg = await loadImage('assets/characters/npc_keeper.png');
  const boatImg = await loadImage('assets/characters/boat_lv1.png');

  const VW = 800;
  const VH = 480;
  const TILT = 0.40;

  const canvas = createCanvas(VW, VH);
  const ctx = canvas.getContext('2d');

  // Background
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#0a1e2e');
  g.addColorStop(0.6, '#071522');
  g.addColorStop(1, '#040c14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, VH);

  // Camera
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
  ctx.restore();

  // Draw 2 variations of Player at y=130:
  // Option A (at x = -20): Previous (floating feel)
  {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(-20, 130 + 3, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(-20, 130);
    ctx.scale(1.0, 1.0 / TILT);
    const sz = 68;
    const s = (sz * 0.625) / 194;
    ctx.drawImage(charPreview, -129 * s, -226 * s, 256 * s, 256 * s);

    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sebelumnya (Mengambang)', 0, -48);
    ctx.restore();
  }

  // Option B (at x = 60): Grounded Contact Shadow + Calibrated Foot Grounding
  {
    ctx.save();
    // 1. Outer ambient shadow pool (in world space with tilt)
    ctx.fillStyle = 'rgba(10, 5, 2, 0.38)';
    ctx.beginPath();
    ctx.ellipse(60, 130 + 1, 14, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Inner dense contact shadow (ambient occlusion right where boots press wood)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
    ctx.beginPath();
    ctx.ellipse(60, 130 + 0.5, 9.5, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(60, 130);
    ctx.scale(1.0, 1.0 / TILT);
    const sz = 68;
    const s = (sz * 0.625) / 194;
    // Lower foot by +2.5px so soles sink firmly onto the wood contact shadow
    ctx.drawImage(charPreview, -129 * s, -223 * s, 256 * s, 256 * s);

    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Baru: Berpijak Kokoh (Grounded)', 0, -48);
    ctx.restore();
  }

  ctx.restore();

  // Banner
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, VW, 40);
  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PERBANDINGAN PIJAKAN: Kiri (Mengambang) vs Kanan (Berpijak Kokoh pada Papan Dermaga)', 16, 25);

  fs.writeFileSync('snapshots/comparison_grounding.png', canvas.toBuffer('image/png'));
  console.log('Saved snapshots/comparison_grounding.png');
}

run().catch(console.error);
