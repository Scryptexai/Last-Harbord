// ============ Dialog cerita — [spec §4.1.4] Contextual Dialog Box ============
// Ilustrasi karakter 2D di sudut kanan bawah + balon teks di kiri bawah.
// Pemain mengetuk layar untuk lanjut. Ilustrasi digambar prosedural
// (bust dokter wabah) — zero aset, konsisten dengan gaya repo.
import { ACFG } from './config.js';
import { A } from './state.js';

export const DIALOGUE_LINES = ACFG.DIALOGUE;

export function dialogueDone() { return A.dialogue.i >= DIALOGUE_LINES.length; }
export function dialogueLine() { return DIALOGUE_LINES[Math.min(A.dialogue.i, DIALOGUE_LINES.length - 1)]; }

export function advanceDialogue() {
  if (dialogueDone()) return false;
  A.dialogue.i += 1;
  if (dialogueDone()) {
    A.phase = 'play';
    A.saveDirty = true;
  }
  return true;
}

// Bust dokter wabah (dipanggil tiap frame selama dialog — ringan, ±20 primitif)
export function drawPortrait(ctx, w, h, t) {
  ctx.clearRect(0, 0, w, h);
  // latar: gelap dengan cahaya tepian
  const g = ctx.createRadialGradient(w * 0.5, h * 0.42, 6, w * 0.5, h * 0.5, w * 0.72);
  g.addColorStop(0, '#1c2530');
  g.addColorStop(1, '#0a0e14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const bob = Math.sin(t * 1.1) * 1.2;
  ctx.save();
  ctx.translate(w / 2, h * 0.5 + bob);
  const s = w / 96;
  ctx.scale(s, s);

  // bahu / jubah
  ctx.fillStyle = '#333a48';
  ctx.beginPath();
  ctx.moveTo(-30, 34);
  ctx.lineTo(-24, 6);
  ctx.quadraticCurveTo(0, -4, 24, 6);
  ctx.lineTo(30, 34);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // ikat pinggang kulit
  ctx.fillStyle = '#262b36';
  ctx.fillRect(-24, 14, 48, 5);

  // leher + kepala
  ctx.fillStyle = '#cfc0aa';
  ctx.fillRect(-6, -2, 12, 8);
  ctx.beginPath();
  ctx.arc(2, -12, 13, 0, Math.PI * 2);
  ctx.fill();

  // goggles: dua lensa dengan rim kuningan
  for (const [gx, gy] of [[-4, -14], [8, -13]]) {
    ctx.fillStyle = '#b9c8d2';
    ctx.beginPath();
    ctx.arc(gx, gy, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6a28';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(gx - 1.4, gy - 1.6, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // topeng paruh: menghadap kanan-bawah
  ctx.fillStyle = '#c8913f';
  ctx.beginPath();
  ctx.moveTo(9, -16);
  ctx.lineTo(30, -8);
  ctx.lineTo(33, -4.5);
  ctx.lineTo(30, -2.5);
  ctx.lineTo(9, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#8a6a28';
  ctx.beginPath();
  ctx.ellipse(31, -5.4, 2, 1.3, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // topi lebar
  ctx.fillStyle = '#23201c';
  ctx.beginPath();
  ctx.ellipse(0, -22, 20, 6.4, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a2622';
  ctx.beginPath();
  ctx.arc(0, -24, 12.5, Math.PI, Math.PI * 2);
  ctx.fill();
  // pita penutup (wabah)
  ctx.strokeStyle = '#4a4038';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, -21);
  ctx.lineTo(14, -18);
  ctx.stroke();

  ctx.restore();
  // bingkai
  ctx.strokeStyle = 'rgba(216,170,90,0.35)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0.75, 0.75, w - 1.5, h - 1.5);
}
