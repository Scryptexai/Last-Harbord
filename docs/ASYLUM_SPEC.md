# Last Asylum: Plague — Technical & Architectural Specification

> Arsip spesifikasi game kedua di repo ini. Implementasi: `asylum.html` +
> `js/asylum/*` (peta detail di bawah). Game pertama (Driftholm / Last Harbor)
> tetap di `index.html` dan tidak tersentuh oleh game ini — keduanya berbagi
> fondasi mesin (proyeksi miring, input, WebAudio, partikel) tapi punya state,
> save, dan loop sendiri.

## 1. Overview & Core Identity

* **Judul Proyek:** "Last Asylum: Plague" (Bisa diganti)
* **Genre:** Arcade Idle / Hospital Management / RPG Simulator
* **Target Platform:** Mobile-first (Portrait 9:16), Web (HTML5 Canvas 2D)
* **Visual Style:** Dark Stylized Low-Poly, Medieval Plague Atmosphere

---

## 2. Game States & Progression (Core Loop)

```
Pasien Masuk -> Bawa Herbal/Obat -> Berdiri di Samping Kasur Pasien ->
Sembuhkan Pasien (Treatment) -> Kumpulkan Koin -> Buka/Upgrade Ruangan Baru
```

### 2.1 Progression System

* **Resource:** Gandum, Daun Herbal, Kayu, Koin.
* **Upgrade:** Membuka bangsal baru (menambah kapasitas pasien).

---

## 3. UI/UX Framework (Mobile-First UI)

UI terbagi dalam dua lapis: HUD Statis (Dashboard) dan Konteks Interaktif.

### 3.1 HUD Statis (Always On)

* **Top Resource Dashboard (Fixed):**
  * `RES 1: Gandum` (Ikon Gandum) + Jumlah (Font Bold).
  * `RES 2: Daun Herbal` (Ikon Daun) + Jumlah.
  * `RES 3: Kayu` (Ikon Kayu) + Jumlah.
  * `CURRENCY: Koin` (Ikon Koin Emas) + Jumlah (Default: 50 saat start).
* **Quest Tracker (Mid-Upper):**
  * Format: `[ICON] Misi Aktif: [Nama Misi]` + `[Progress Bar] (0/1)`
  * Fungsi: Menampilkan tujuan terdekat.

### 3.2 Contextual UI

* **Interactive Floor Tiles (Ghost Tiles):**
  * Kotak/lingkaran bercahaya di lantai dengan Ikon Aksi + Biaya Sumber Daya.
  * Saat pemain BERDIRI di atas area ini, sumber daya berpindah per tick
    (1 koin per 0.05s) dengan efek visual partikel melayang dari pemain ke zona.
* **Contextual Dialog Box:**
  * Ilustrasi Karakter 2D di sudut kanan bawah + Balon Teks di kiri bawah.
  * Pemain mengetuk layar untuk lanjut.

---

## 4. Camera System (Steep Perspective Rig)

| Parameter | Nilai |
|---|---|
| Projection | Perspective |
| FOV | 28°–32° (sudut sempit, meminimalkan edge distortion) |
| Rotation | Pitch: 58° (rentang aman 55–60°), Yaw: 0°, Roll: 0° |
| Offset | `(0, 15, -9.3)` (unit dunia) |
| Follow | Damped Spring (Smooth Damp) + Forward Look-Ahead |
| Look-Ahead | Factor: 1.2 terhadap kecepatan target |
| Spring Params | `SmoothTime: 0.18` |

Algoritma pergerakan kamera:

```
targetPosition = target.position + offset + velocity * lookAheadFactor
camera.position = SmoothDamp(camera.position, targetPosition, smoothTime)
```

---

## 5. Character Movement & Rigging (Inertia & Stride Lock)

Masalah utama purwarupa: karakter berputar instan (snapping).

### 5.1 Movement Logic (Angular Clamping)

```
- Max Turn Rate: 720°/detik
- Turning Penalty: Jika |CurrentFacing - InputAngle| > 90°,
  kurangi LinearSpeed menjadi 60% selama proses belok.
- Saat sudut < 90°, akselerasi kembali ke 100%.
```

### 5.2 Locomotion (Anti-Foot Sliding)

```
AnimSpeedMultiplier = CurrentMoveSpeed / BaseWalkSpeed
```

* Berjalan lurus: Siklus standar.
* Berbelok tajam: Siklus sedikit melambat (inersia).
* Berhenti mendadak: Karakter menyelesaikan 1 langkah kecil penutup sebelum
  masuk ke pose Idle.

### 5.3 Skeletal Rig & Secondary Physics

* **Bone Map:** `Root (Ground Anchor) -> Hips -> Spine -> Head (Mask/Beak)`;
  `Left Hand -> Lantern_Anchor (Damped Pendulum)`;
  `Right Hand -> Potion_Vial (Item Slot)`.
* **Cloak (Jubah Dokter):** `Cloak_Root` dengan 3 sub-chain
  (Left, Mid, Right), masing-masing 3 bone.
  * **Secondary Motion:** Menggunakan Spring Bone.
  * **Params:** Stiffness `0.35`, Damping `0.45`, Drag `0.20`.
  * *Efek Visual:* Menghasilkan kibasan kain yang tertinggal saat berbelok
    dan melipat maju sesaat saat berhenti mendadak.
* **Lantern (Lentera):** Pendulum sederhana di tangan kiri.
  * *Efek Visual:* Menghasilkan gerak ritmis maju-mundur mengikuti langkah
    kaki. Hinge diikat limit `±25°` (agar tidak berputar berlebihan).

---

## 6. Interaction & Resource Gathering (Proximity Trigger Module)

**Konsep Utama:** Pemain tidak perlu menekan tombol interaksi terpisah; cukup
menghentikan karakter di area target.

```javascript
class ProximityTrigger {
  constructor(targetZone, requiredResource, cost, onComplete) {
    this.zone = targetZone;        // { x, z, radius }
    this.requiredResource = requiredResource;
    this.cost = cost;
    this.onComplete = onComplete;
    this.timer = 0;
  }

  update(dt, playerPosition, playerInventory) {
    const dist = Math.hypot(
      playerPosition.x - this.zone.x,
      playerPosition.y - this.zone.z
    );

    // Jika pemain berada di dalam radius zona
    if (dist <= this.zone.radius && this.remainingCost > 0) {
      this.timer += dt;
      if (this.timer >= 0.05) { // Contoh: 1 koin per 0.05 detik
        this.timer = 0;
        if (playerInventory[this.requiredResource] > 0) {
          playerInventory[this.requiredResource] -= 1;
          this.remainingCost -= 1;
          // spawnResourceParticle(playerPosition, this.zone);
          if (this.remainingCost === 0) {
            this.onComplete(); // Bangunan terbuka / Pasien sembuh
          }
        }
      }
    }
  }
}
```

---

## Status Implementasi (repo ini)

| Bagian spec | Implementasi | Catatan |
|---|---|---|
| §3.1 HUD statis | `asylum.html` + `css/asylum.css` + `js/asylum/ui.js` | Chip Gandum/Herbal/Kayu/Koin (inline SVG, bold), quest capsule tengah atas dengan progress bar. Koin start = 12 + reward misi (balance disesuaikan dari angka contoh "50" agar onboarding lebih panjang). |
| §3.2 Ghost tiles | `js/asylum/building.js` + `drawGhostWard` (world.js) | Kotak bercahaya + ikon kasur + biaya (koin & kayu); transfer 1 koin per tick 0.05s + partikel `flyItem` pemain→zona; progress bar saat membangun. |
| §3.2 Dialog box | `js/asylum/dialogue.js` + `#as-dialog` | Ilustrasi bust dokter digambar prosedural (zero aset), teks kiri bawah, tap untuk lanjut. |
| §4 Kamera | `js/asylum/camera.js` | Offset (0,15,−9.3) dimaknai sudut `atan2(15, 9.3) = 58.2°` → `TILT = cos(58°)` di proyeksi 2.5D (bahasa yang sama dengan `js/camera.js` Driftholm); FOV 28–32° → skala kedalaman sempit (`PERSP 0.00042`, range 0.90–1.12); `smoothDamp` = port Unity (dengan guard overshoot); look-ahead `1.2 × velocity`. |
| §5.1 Turn clamp | `js/asylum/doctor.js` | Max turn 720°/s (12.566 rad/s), Turning Penalty 60% saat \|Δ\|>90°, akselerasi balik ke 100%. |
| §5.2 Locomotion | `js/asylum/doctor.js` | `strideMul = speed / SPEED`; accel 0.10s / decel 0.15s (langkah penutup); siklus langkah tersinkron kecepatan. |
| §5.3 Rig | `js/asylum/rig.js` | Jubah: 3 chain × 3 bone verlet + spring (stiffness 0.35 / damping 0.45 / drag 0.20) → melipat maju saat berhenti mendadak, tertinggal saat berbelok. Lentera: pendulum teredam limit ±25°, drive ritmis dari fase langkah. Vial ramuan di tangan kanan (slot item). |
| §6 ProximityTrigger | `js/asylum/proximity.js` | Port langsung pseudocode spec (timer 0.05s, reset, onComplete sekali), digeneralisasi tipis untuk biaya multi-resource (bangunan: koin+kayu; treatment: herbal+gandum) dan zona `z`↔`y`. |
| §2 Core loop | `js/asylum/patients.js`, `building.js`, `quests.js` | Pasien spawn sendiri (idle), antre di gerbang, duduk di kasur otomatis; treatment = berdiri di kasur (12 herbal + 2 gandum, tick 0.22s); koin per pasien; koin+kayu membuka 3 bangsal berikutnya (3 kasur masing-masing). 10 misi berurutan. |

**Test:** `node tests/asylum.test.mjs` — 58 asersi: angka spec §5 (turn clamp,
penalty, accel/decel), §4 (smoothDamp, look-ahead, TILT), §3 (spring jubah,
lentera), §6 (perilaku pseudocode ProximityTrigger), core loop (spawn→kasur→
sembuh→koin→bangsal), save, render pipeline, dan regresi pacing (bot ideal
membangun Bangsal II < 240s simulasi).
