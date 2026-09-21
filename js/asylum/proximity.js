// ============ Proximity Trigger — [spec §5.1] ============
// Logika interaksi area (Proximity Trigger Module): pemain TIDAK perlu menekan
// tombol interaksi terpisah; cukup menghentikan karakter di area target.
//
// Selama pemain di dalam radius zona, sumber daya berpindah per TICK
// (default 1 unit per 0.05 detik — persis contoh spesifikasi), dan setiap
// tick memicu efek partikel melayang dari pemain ke zona (dipelakukan oleh
// pemanggil lewat opsi onTick).
//
// Kelas ini adalah port langsung dari pseudocode spesifikasi, digeneralisasi
// tipis untuk biaya multi-resource (bangunan: koin + kayu) tanpa mengubah
// perilaku dasar yang diuji spec.

export class ProximityTrigger {
  /**
   * @param {{x:number, z?:number, y?:number, radius:number}} targetZone
   * @param {string} requiredResource  resource utama (nama kunci di inventory)
   * @param {number} cost              jumlah unit resource utama
   * @param {Function} onComplete
   * @param {object} [opts]
   * @param {object} [opts.extraCost]  resource tambahan: { wood: 16 }
   * @param {number} [opts.tickRate]   detik per unit (default 0.05 sesuai spec)
   * @param {Function} [opts.onTick]   (playerPos, zone) => fx per unit yang terbayar
   */
  constructor(targetZone, requiredResource, cost, onComplete, opts = {}) {
    this.zone = targetZone;
    this.requiredResource = requiredResource;
    this.cost = { [requiredResource]: cost };
    if (opts.extraCost) {
      for (const [k, v] of Object.entries(opts.extraCost)) this.cost[k] = v;
    }
    this.onComplete = onComplete;
    this.tickRate = opts.tickRate != null ? opts.tickRate : 0.05;
    this.onTick = opts.onTick || null;
    this.timer = 0;
    this.done = false;
    this.paid = {};
    for (const k of Object.keys(this.cost)) this.paid[k] = 0;
  }

  remainingOf(t) { return this.cost[t] - (this.paid[t] || 0); }

  // Sisa tick (dibatasi resource yang paling "tinggi" pagunya)
  remainingCost() {
    let m = 0;
    for (const t of Object.keys(this.cost)) m = Math.max(m, this.remainingOf(t));
    return m;
  }

  // 0..1 — dipakai HUD (progress bar ghost tile)
  progress() {
    const total = Object.values(this.cost).reduce((a, b) => a + b, 0);
    const paid = Object.values(this.paid).reduce((a, b) => a + b, 0);
    return total > 0 ? paid / total : 1;
  }

  update(dt, playerPosition, playerInventory) {
    if (this.done) return;
    const z = this.zone;
    // Kompatibel dengan spec (zone.z / playerPosition.z) dan dunia 2D (y):
    // bandingkan y-pemain terhadap z.y ATAU z.z, mana pun yang ada.
    const pz = playerPosition.z !== undefined ? playerPosition.z : playerPosition.y;
    const zy = z.z !== undefined ? z.z : z.y;
    const dist = Math.hypot(playerPosition.x - z.x, pz - zy);

    // Jika pemain berada di dalam radius zona
    if (dist <= z.radius && this.remainingCost() > 0) {
      this.timer += dt;
      if (this.timer >= this.tickRate) {
        this.timer = 0;
        // Bayar 1 unit per resource yang masih kurang
        const types = Object.keys(this.cost).filter((t) => this.remainingOf(t) > 0);
        if (types.every((t) => (playerInventory[t] || 0) >= 1)) {
          for (const t of types) { playerInventory[t] -= 1; this.paid[t] += 1; }
          if (this.onTick) this.onTick(playerPosition, this.zone);
          if (this.remainingCost() === 0) {
            this.done = true;
            this.onComplete();
          }
        }
        // Sumber daya kurang: tick terbuang (timer reset, tanpa utang) —
        // persis perilaku pseudocode spec.
      }
    }
  }
}
