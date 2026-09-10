// ============ Input: keyboard WASD/arrow + joystick + aksi konteks ============
export const input = {
  keys: new Set(),
  joy: { active: false, id: null, cx: 0, cy: 0, dx: 0, dy: 0 },
  attackQueued: false,
  actionQueued: false,
  held: { action: false },   // ditahan -> memanen berjalan; dilepas -> batal
  anyGesture: false,         // untuk membuka AudioContext
  onGesture: null,
};

const PREVENT = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ']);

function gesture() {
  if (input.anyGesture) return;
  input.anyGesture = true;
  if (input.onGesture) input.onGesture();
}

export function initInput(handlers = {}) {
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (PREVENT.has(k)) e.preventDefault();
    if (e.repeat) return;
    gesture();
    input.keys.add(k);
    if (k === ' ') input.attackQueued = true;
    if (k === 'e' || k === 'f') { input.actionQueued = true; input.held.action = true; }
    if (k === 'm' && handlers.mute) handlers.mute();
    if (k === 'escape' && handlers.escape) handlers.escape();
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    input.keys.delete(k);
    if (k === 'e' || k === 'f') input.held.action = false;
  });
  window.addEventListener('blur', () => { input.keys.clear(); resetJoy(); input.held.action = false; });

  const joy = document.getElementById('joystick');
  const knob = document.getElementById('joy-knob');
  if (!joy || !knob) return;
  const R = 46;

  function setKnob(dx, dy) { knob.style.transform = `translate(${dx}px, ${dy}px)`; }
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
    gesture();
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

// Tombol konteks (HTML) memakai API yang sama dengan tombol E.
export function pressContext() { gesture(); input.actionQueued = true; input.held.action = true; }
export function releaseContext() { input.held.action = false; }
export function pressAttack() { gesture(); input.attackQueued = true; }

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

export function clearQueued() {
  input.attackQueued = false;
  input.actionQueued = false;
  input.held.action = false;
}
