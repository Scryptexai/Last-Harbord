// ============ Misi — [spec §4.1.2] Quest Tracker Capsule ============
// Satu jalur misi berurutan; capsule di tengah atas selalu menyebut tujuan
// berikutnya + progress bar. Misi memberi koin (reward), bukan kekuatan.
import { ACFG } from './config.js';
import { A } from './state.js';
import { sfx } from '../audio.js';
import { toastAs } from './ui.js';

export function activeQuest() {
  const q = ACFG.QUESTS[A.quests.idx];
  if (!q) return null;
  return A.quests.progress < q.target ? q : null;
}

export function questDone() { return !ACFG.QUESTS[A.quests.idx]; }

// Panggil saat sebuah metrik bertambah (harvest, sembuh, build, jalan).
// n boleh float (mis. walkPx).
export function bumpQuest(metric, n = 1) {
  const q = activeQuest();
  if (!q || q.metric !== metric) return false;
  A.quests.progress = Math.min(q.target, A.quests.progress + n);
  A.saveDirty = true;
  if (A.quests.progress >= q.target) {
    A.res.coins += q.reward;
    A.stats.coinsEarned += q.reward;
    sfx('newGoal');
    toastAs(`Misi selesai: ${q.label} · +${q.reward} koin`);
    A.quests.idx += 1;
    A.quests.progress = 0;
    const next = activeQuest();
    if (next) toastAs(`Misi baru: ${next.label}`, 4200);
    else toastAs('Semua misi selesai. Rumah sakit ini hidup.', 5200);
  }
  return true;
}
