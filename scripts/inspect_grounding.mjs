import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'fs';

async function test() {
  const char = await loadImage('assets/branding/character_preview_rgba.png');
  const cv = createCanvas(400, 300);
  const ctx = cv.getContext('2d');

  // Boardwalk planks
  ctx.fillStyle = '#33200f';
  ctx.fillRect(0, 0, 400, 300);
  for (let y = 0; y < 300; y += 14) {
    ctx.fillStyle = 'rgb(107, 69, 34)';
    ctx.fillRect(0, y, 400, 11);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, y + 11, 400, 3);
  }
  // Seams
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  for (let x = 20; x < 400; x += 46) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 300); ctx.stroke();
  }

  // Draw 3 variations of player grounding at y = 180:
  // Variation 1: Current implementation
  const drawVariation = (x, y, label, shadowOffset, charOffset, shadowStyle) => {
    ctx.save();
    ctx.translate(x, y);

    // Shadow
    if (shadowStyle === 'current') {
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.beginPath();
      ctx.ellipse(0, 3 + shadowOffset, 11, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (shadowStyle === 'grounded') {
      // 2-layer ambient occlusion contact shadow:
      // Outer soft shadow
      ctx.fillStyle = 'rgba(10,5,2,0.40)';
      ctx.beginPath();
      ctx.ellipse(0, 1, 14, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Inner deep contact shadow right under the boots
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Character
    const sz = 68;
    const s = (sz * 0.625) / 194;
    const drawW = 256 * s;
    const drawH = drawW;
    const drawX = -129 * s;
    const drawY = -226 * s + charOffset;
    ctx.drawImage(char, drawX, drawY, drawW, drawH);

    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, -52);

    ctx.restore();
  };

  drawVariation(80, 180, '1. Saat Ini', 0, 0, 'current');
  drawVariation(200, 180, '2. Kaki Diturunkan (+4px)', 0, 4, 'current');
  drawVariation(320, 180, '3. Contact Shadow + Pijakan Pas', 0, 3, 'grounded');

  fs.writeFileSync('snapshots/test_grounding.png', cv.toBuffer('image/png'));
  console.log('Saved snapshots/test_grounding.png');
}

test().catch(console.error);
