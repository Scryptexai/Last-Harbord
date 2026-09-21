// ============ HUD Last Asylum — [spec §4] portrait mobile-first ============
//   §4.1.1 top dashboard: Gandum / Daun Herbal / Kayu + Koin (bold, ikon mini)
//   §4.1.2 quest tracker capsule tengah atas + progress bar
//   §4.1.4 dialog box: teks kiri bawah + ilustrasi kanan bawah
// Konteks (zona aktif) TIDAK butuh tombol: ProximityTrigger sudah cukup.

import { A } from './state.js';
import { activeQuest, questDone } from './quests.js';
import { dialogueLine, drawPortrait } from './dialogue.js';

const $ = (id) => document.getElementById(id);
let els = {};

// ikon misi sebagai inline SVG kecil (zero aset)
const ICONS = {
  walk: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="5" r="2.6" fill="currentColor" stroke="none"/><path d="M10 9l-3 5M10 9l4 3 3 5M10 9l-2 8"/></svg>',
  herb: '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 21c0-7 2-11 8-14-1 8-3 12-8 14z" fill="currentColor"/><path d="M12 21c0-5-1.6-8-6-10 .8 6 2.4 8.6 6 10z" fill="currentColor" opacity=".7"/></svg>',
  wheat: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 21V6M12 6l-4 4M12 6l4 4M12 11l-4 4M12 11l4 4"/></svg>',
  bed: '<svg viewBox="0 0 24 24" width="14" height="14"><rect x="3" y="10" width="18" height="7" rx="1.5" fill="currentColor"/><rect x="5" y="7" width="5" height="4" rx="1" fill="currentColor" opacity=".7"/></svg>',
  wood: '<svg viewBox="0 0 24 24" width="14" height="14"><ellipse cx="12" cy="12" rx="8.5" ry="5" fill="currentColor"/><ellipse cx="18" cy="13" rx="2.4" ry="3.8" fill="currentColor" opacity=".6"/></svg>',
  build: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 19L15 9"/><rect x="13" y="4" width="7" height="5" fill="currentColor" stroke="none"/></svg>',
  cross: '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5z" fill="currentColor"/></svg>',
};

export function initAsUI(handlers = {}) {
  els = {
    wheat: $('as-wheat'), herb: $('as-herb'), wood: $('as-wood'), coins: $('as-coins'),
    quest: $('as-quest'), qLabel: $('as-quest-label'), qFill: $('as-quest-fill'),
    qCount: $('as-quest-count'), qIcon: $('as-quest-icon'),
    hint: $('as-hint'), toasts: $('as-toasts'),
    dialog: $('as-dialog'), dLine: $('as-dialog-line'), dTap: $('as-dialog-tap'),
    portrait: $('as-portrait'),
    veil: $('as-pause-veil'),
  };
  const mute = $('as-mute');
  if (mute) mute.addEventListener('click', () => handlers.onMute && handlers.onMute());
  const pause = $('as-pause');
  if (pause) pause.addEventListener('click', () => handlers.onPause && handlers.onPause(!A.paused));
  const resume = $('as-resume');
  if (resume) resume.addEventListener('click', () => handlers.onPause && handlers.onPause(false));
  const home = $('as-veil-home');
  if (home) home.addEventListener('click', () => { try { location.href = 'index.html'; } catch (e) {} });
  // indikator mute
  if (mute) mute.textContent = A.muted ? '✕♪' : '♪';
}

let _qIcon = null;
function setQuestIcon(icon) {
  if (!els.qIcon || _qIcon === icon) return;
  _qIcon = icon;
  els.qIcon.innerHTML = ICONS[icon] || ICONS.cross;
}

export function toastAs(msg, ms = 3200) {
  const el = els.toasts;
  if (!el) return;
  try {
    const d = document.createElement('div');
    d.className = 'as-toast';
    d.textContent = msg;
    el.appendChild(d);
    // rAF ganda supaya transisi CSS punya frame awal
    const r = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (f) => setTimeout(f, 16);
    r(() => r(() => d.classList.add('show')));
    setTimeout(() => {
      d.classList.remove('show');
      setTimeout(() => { try { d.remove(); } catch (e) {} }, 380);
    }, ms);
    while (el.children.length > 3) el.firstChild.remove();
  } catch (e) { /* noop */ }
}

export function hintAs(text, ms = 5200) {
  const el = els.hint;
  if (!el) return;
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), ms);
}

export function updateAsUI(t = 0) {
  if (els.wheat) els.wheat.textContent = A.res.wheat;
  if (els.herb) els.herb.textContent = A.res.herb;
  if (els.wood) els.wood.textContent = A.res.wood;
  if (els.coins) els.coins.textContent = A.res.coins;

  // quest capsule (spec §4.1.2)
  const q = activeQuest();
  if (q && els.quest) {
    els.quest.classList.remove('hidden');
    els.qLabel.textContent = q.label;
    els.qCount.textContent = `${Math.floor(Math.min(A.quests.progress, q.target))}/${q.target}`;
    els.qFill.style.width = `${Math.round((Math.min(A.quests.progress, q.target) / q.target) * 100)}%`;
    setQuestIcon(q.icon);
  } else if (els.quest) {
    if (questDone()) {
      els.quest.classList.remove('hidden');
      els.qLabel.textContent = 'Rumah sakit ini hidup';
      els.qCount.textContent = '✓';
      els.qFill.style.width = '100%';
      setQuestIcon('cross');
    } else els.quest.classList.add('hidden');
  }

  // dialog box (spec §4.1.4)
  if (A.phase === 'dialog' && els.dialog) {
    els.dialog.classList.remove('hidden');
    els.dLine.textContent = dialogueLine();
    els.dTap.classList.toggle('hidden', false);
    if (els.portrait && els.portrait.getContext) {
      const pc = els.portrait.getContext('2d');
      if (pc) drawPortrait(pc, els.portrait.width, els.portrait.height, t);
    }
  } else if (els.dialog) {
    els.dialog.classList.add('hidden');
  }

  if (els.veil) els.veil.classList.toggle('hidden', !A.paused);
}
