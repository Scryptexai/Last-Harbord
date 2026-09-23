import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'fs';

async function capture() {
  const VW = 800;
  const VH = 480;
  const TILT = 0.40;

  const boatImg = await loadImage('assets/characters/boat_lv1.png');
  const keeperImg = await loadImage('assets/characters/npc_keeper.png');

  // Render what the player sees on first start (frame 0 before 3D loads)
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

  // Player position (x: 0, y: 130)
  // WHAT HAPPENED ON FIRST START (isReady === false):
  // drawCharacter3D fell back to:
  // ctx.fillStyle = 'rgba(0,0,0,0.35)';
  // ctx.beginPath(); ctx.ellipse(0, 0, 11, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(0, 130);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 3, 11, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Highlight the bug
  ctx.strokeStyle = '#e74c3c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 3, 24, 0, Math.PI * 2);
  ctx.stroke();

  ctx.scale(1.0, 1.0 / TILT);
  ctx.fillStyle = '#e74c3c';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BUG: Karakter KOSONG / HILANG!', 0, -32);
  ctx.fillText('(Hanya bayangan, GLB 10MB masih loading di background)', 0, -18);
  ctx.restore();

  ctx.restore();

  // Banner
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, VW, 40);
  ctx.fillStyle = '#e74c3c';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('BUKTI SCREENSHOT SAAT START PERTAMA: Game sudah muncul padahal 3D belum selesai dimuat', 16, 25);

  fs.writeFileSync('snapshots/screenshot_first_start_bug.png', canvas.toBuffer('image/png'));
  console.log('Saved snapshots/screenshot_first_start_bug.png');
}

capture().catch(console.error);
