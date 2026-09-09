// ============ Input: keyboard WASD/arrow + touch joystick ============
export const input = {
  keys: new Set(),
  joy: { active: false, id: null, cx: 0, cy: 0, dx: 0, dy: 0 },
  attackQueued: false,
  actionQueued: null, // 'explore' | 'back'
};

const PREVENT = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ']);

export function initInput() {
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (PREVENT.has(k)) e.preventDefault();
    if (e.repeat) return;
    input.keys.add(k);
    if (k === ' ') input.attackQueued = true;
    if (k === 'e') input.actionQueued = 'explore';
    if (k === 'b') input.actionQueued = 'back';
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => { input.keys.clear(); resetJoy(); });

  // ---- virtual joystick (kiri bawah) ----
  const joy = document.getElementById('joystick');
  const knob = document.getElementById('joy-knob');
  const R = 48;

  function setKnob(dx, dy) {
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  function resetJoy() {
    input.joy.active = false;
    input.joy.dx = 0; input.joy.dy = 0;
    setKnob(0, 0);
  }
  function handleMove(e) {
    if (!input.joy.active || e.pointerId !== input.joy.id) return;
    let dx = e.clientX - input.joy.cx;
    let dy = e.clientY - input.joy.cy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    input.joy.dx = dx / R;
    input.joy.dy = dy / R;
    setKnob(dx, dy);
    e.preventDefault();
  }

  joy.addEventListener('pointerdown', (e) => {
    input.joy.active = true;
    input.joy.id = e.pointerId;
    const rect = joy.getBoundingClientRect();
    input.joy.cx = rect.left + rect.width / 2;
    input.joy.cy = rect.top + rect.height / 2;
    try { joy.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    handleMove(e);
    e.preventDefault();
  });
  joy.addEventListener('pointermove', handleMove);
  joy.addEventListener('pointerup', (e) => { if (e.pointerId === input.joy.id) resetJoy(); });
  joy.addEventListener('pointercancel', (e) => { if (e.pointerId === input.joy.id) resetJoy(); });
  joy.addEventListener('contextmenu', (e) => e.preventDefault());
}

// Vektor gerak ternormalisasi dari keyboard atau joystick.
export function getMove() {
  let x = 0, y = 0;
  const k = input.keys;
  if (k.has('a') || k.has('arrowleft')) x -= 1;
  if (k.has('d') || k.has('arrowright')) x += 1;
  if (k.has('w') || k.has('arrowup')) y -= 1;
  if (k.has('s') || k.has('arrowdown')) y += 1;
  if (x || y) {
    const d = Math.hypot(x, y);
    return { x: x / d, y: y / d };
  }
  if (input.joy.active) return { x: input.joy.dx, y: input.joy.dy };
  return { x: 0, y: 0 };
}
