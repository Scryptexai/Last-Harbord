# Integrasi Karakter 3D GLB & Dokumentasi Perbaikan Root Motion

Dokumen ini mencatat detail teknis integrasi model 3D GLB karakter dan perbaikan looping animasi pada cabang `arena/01a0c447-last-harbord`.

---

## 1. Spesifikasi Aset Model 3D
- **File Asset**: `character_glb_idle_box_03_run_walk_7.glb`
- **Tipe Format**: Binary glTF 2.0 (GLB), 67 node skeletal bone (Mixamo hierarchy).
- **Dimensi Bounding Box**:
  - X: `[-0.185, +0.185]` (~0.37m lebar)
  - Y: `[0.000, +0.978]` (~0.98m tinggi, pangkal kaki tepat di `Y = 0`)
  - Z: `[-0.143, +0.143]` (~0.29m tebal)
- **Animasi Bawaan**:
  1. `idle`: 15.33s (siklus pernapasan & siaga natural)
  2. `walk`: 2.33s (siklus langkah kaki bergerak)
  3. `run`: 1.25s (siklus berlari cepat)
  4. `box_03`: 2.54s (animasi serangan tempur jarak dekat)

---

## 2. Analisis & Solusi Bug Looping (Root Motion Displacement)

### Permasalahan Sebelumnya:
Animasi bawaan mocap memiliki *Root Motion* linier pada tulang `mixamorig:Hips`:
- Pada `run`: Sumbu Z bergeser maju dari `0.50m` ke `3.36m` (+2.85 meter).
- Pada `walk`: Sumbu Z bergeser maju dari `-0.01m` ke `1.45m` (+1.46 meter).
Karena kamera 2.5D game berfokus pada titik tetap pemain di kanvas, pergeseran fisik maju ini menyebabkan:
1. Karakter bergerak menjauhi jangkar hingga keluar dari kanvas rendering / terkena *frustum culling* (karakter menghilang).
2. Ketika klip mencapai akhir dan me-loop ke frame 0, tulang panggul melompat seketika kembali ke awal (karakter muncul mendadak / *teleport pop*).

### Perbaikan yang Diterapkan:
1. **Netralisasi Root Motion ke True In-Place**:
   Diterapkan formula pengurangan pergeseran linier pada sumbu Z dan X tulang pangkal panggul:
   $$\Delta Z(t) = Z(t) - \text{lerp}(Z_0, Z_{\text{end}}, \frac{t}{T})$$
   $$Z_{\text{inplace}}(t) = Z_0 + \Delta Z(t)$$
   Hasilnya:
   - Nilai Z frame awal dan akhir identik persis (`-0.0134m`).
   - Pantulan vertikal pelvis sumbu Y (stride bobbing) tetap 100% utuh dan alami.
   - Looping berjalan tanpa henti dan tanpa lonjakan (*zero pop / seamless continuous loop*).

2. **Pencegahan Culling Tiga Dimensi**:
   Menyetel `child.frustumCulled = false` pada seluruh mesh agar Three.js tidak mengabaikan mesh skeletal saat sendi bergerak.

3. **Transisi Kontinu (CrossFadeFrom)**:
   Transisi antar animasi (`idle` ⇄ `walk` ⇄ `run` ⇄ `attack`) menggunakan `crossFadeFrom` dengan durasi 0.15 detik, menjaga kelangsungan loop tanpa mereset jam animasi secara tiba-tiba.

---

## 3. Pembersihan Aset Sprite Karakter 2D
Seluruh 29 file sprite 2D pemain lama telah dihapus permanen dari direktori `assets/characters/`:
- `player.png`, `player_atk_0.png`, `player_atk_1.png`
- Seluruh variasi arah: `player_front_*.png`, `player_back_*.png`, `player_side_*.png`, `player_ne_*.png`, `player_se_*.png`, `player_up_*.png`, `player_down_*.png`.
- `manifest.json` dan `js/assets.js` telah diperbarui dan tidak lagi memuat *sheet* pemain 2D.

---

## 4. Hasil Verifikasi Pengujian
- **Smoke Tests**: 156 passed, 0 failed.
- **Render Tests**: Seluruh kanvas laut, pulau, refit, pelabuhan, dan fx lulus tanpa error.
- **Integration Tests**: 57 passed, 0 failed.
