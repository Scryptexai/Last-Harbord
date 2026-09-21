// ============ Save Last Asylum — kunci sendiri, tidak menyentuh save Driftholm ============
// Skema v1: koin & bahan, statistik, bangsal terbangun (urutan), misi, dialog, mute.
// Pasien yang sedang berjalan/di kasur TIDAK disimpan (transient) — keputusan
// desain: muatan yang sudah dikumpulkan aman, pasien adalah urusan sesi.

import { ACFG } from './config.js';
import { A } from './state.js';

const int = (v, d = 0) => (Number.isFinite(+v) ? Math.max(0, Math.floor(+v)) : d);

export function saveAsylum() {
  try {
    const data = {
      version: 1,
      res: {
        wheat: int(A.res.wheat), herb: int(A.res.herb),
        wood: int(A.res.wood), coins: int(A.res.coins),
      },
      stats: {
        cured: int(A.stats.cured), lost: int(A.stats.lost),
        wardsBuilt: int(A.stats.wardsBuilt), walkPx: int(A.stats.walkPx),
        coinsEarned: int(A.stats.coinsEarned),
        harvest: {
          wheat: int(A.stats.harvest.wheat), herb: int(A.stats.harvest.herb),
          wood: int(A.stats.harvest.wood),
        },
      },
      quests: { idx: int(A.quests.idx), progress: int(A.quests.progress) },
      dialogueDone: A.dialogue.i >= ACFG.DIALOGUE.length,
      muted: !!A.muted,
    };
    localStorage.setItem(ACFG.SAVE_KEY, JSON.stringify(data));
    A.saveDirty = false;
  } catch (e) { /* noop */ }
}

export function loadAsylum() {
  try {
    const raw = localStorage.getItem(ACFG.SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || d.version !== 1) return false;
    A.res.wheat = int(d.res && d.res.wheat);
    A.res.herb = int(d.res && d.res.herb);
    A.res.wood = int(d.res && d.res.wood);
    A.res.coins = int(d.res && d.res.coins);
    A.stats.cured = int(d.stats && d.stats.cured);
    A.stats.lost = int(d.stats && d.stats.lost);
    A.stats.wardsBuilt = int(d.stats && d.stats.wardsBuilt);
    A.stats.walkPx = int(d.stats && d.stats.walkPx);
    A.stats.coinsEarned = int(d.stats && d.stats.coinsEarned);
    A.stats.harvest.wheat = int(d.stats && d.stats.harvest && d.stats.harvest.wheat);
    A.stats.harvest.herb = int(d.stats && d.stats.harvest && d.stats.harvest.herb);
    A.stats.harvest.wood = int(d.stats && d.stats.harvest && d.stats.harvest.wood);
    A.quests = {
      idx: int(d.quests && d.quests.idx),
      progress: int(d.quests && d.quests.progress),
    };
    A.dialogue.i = d.dialogueDone ? ACFG.DIALOGUE.length : 0;
    A.muted = !!d.muted;
    A.loaded = true;
    return true;
  } catch (e) { return false; }
}

export function clearAsylum() {
  try { localStorage.removeItem(ACFG.SAVE_KEY); } catch (e) { /* noop */ }
}
