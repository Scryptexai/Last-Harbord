# Godot di Environment Sandbox Arena — Install & Setup

Dokumen ini menjelaskan bagaimana saya (Arena Agent) menggunakan Godot di sandbox Linux tanpa GUI, dan bagaimana kamu setup Godot secara lokal.

## 1. Environment Sandbox Saat Ini

**OS:** Debian 12 (bookworm) — container tanpa display server (no X11/Wayland), no GPU
**Godot binary:** TIDAK terinstall (`which godot` → not found)
**Workspace:** `/home/user/Last-Harbord` — clone dari `Scryptexai/Last-Harbord`
**Branch aktif:** `arena/01a0cdca-last-harbord` (session ini)

Karena tidak ada GUI, saya **TIDAK menjalankan Godot Editor**. Semua kerja dilakukan via text editing.

### Cara Saya Bekerja Tanpa Godot Editor

1. **Edit file langsung (text):**
   - `.tscn` = text format Godot scene — bisa dibaca/edit pakai `read_file` / `edit_file`
   - `.gd` = GDScript — edit langsung
   - `.tres` = resource text
   ```bash
   cat scenes/player/Player.tscn
   cat scripts/player/player_controller.gd
   ```

2. **Analisa GLB tanpa Godot:**
   - GLB adalah binary glTF — pakai Python `pygltflib` atau baca JSON chunk manual
   - Cek animasi, tri count, dimensions
   ```bash
   python3 - << 'PY'
   # baca GLB animations
   with open("assets/characters/character_glb_idle_box_03_run_walk_7.glb","rb") as f:
       data=f.read(100000)
       print(data[0:100])
   PY
   ```

3. **Validator Python:**
   - `tools/validate_harbor_scale.py` — cek scale 1.70m locked
   - `tools/validate_harbor_camera.py` — cek ortho 52/40/24
   - `tools/validate_scale.py` — cek semua asset scale
   ```bash
   python3 tools/validate_harbor_scale.py
   ```

4. **Buat collision wrapper manual:**
   - Godot butuh `StaticBody3D + CollisionShape3D + BoxShape3D` agar tidak tembus
   - Saya buat `.tscn` baru via `write_file`:
   ```
   [gd_scene load_steps=3 format=3]
   [ext_resource type="PackedScene" path="res://assets/models/architecture/headquarters.glb" id="1_model"]
   [sub_resource type="BoxShape3D" id="BoxShape3D_col"]
   size = Vector3(5.2, 5.0, 6.0)
   [node name="Headquarters" type="StaticBody3D"]
   [node name="VisualModel" parent="." instance=ExtResource("1_model")]
   [node name="CollisionShape3D" type="CollisionShape3D" parent="."]
   shape = SubResource("BoxShape3D_col")
   ```

5. **Preview HTML (Three.js) sebagai pengganti Godot viewport:**
   - Karena tidak bisa render Godot, saya pakai `index.html` Three.js preview
   - Jalankan server:
   ```bash
   python3 -m http.server 8000 --bind 0.0.0.0
   # Preview di https://8000-{sandboxId}.e2b.app
   ```

6. **Git untuk sync:**
   - Semua perubahan di-commit ke `arena/01a0cdca-last-harbord`
   - Push via `git push origin arena/01a0cdca-last-harbord`
   - Kamu pull di local: `git fetch origin && git checkout -B arena/01a0cdca-last-harbord origin/arena/01a0cdca-last-harbord`

### Keterbatasan Sandbox

- Tidak bisa buka Godot Editor (butuh GUI)
- Tidak bisa render visual Godot (butuh GPU & display)
- Tidak bisa run game Godot (butuh export & display)
- Hanya bisa edit text & validasi logic

## 2. Install Godot Secara Lokal (Rekomendasi)

Untuk development full dengan visual editor:

### Windows / macOS / Linux Desktop

1. **Download Godot 4.3** (versi project ini):
   - https://godotengine.org/download/archive/ — pilih 4.3 stable
   - Pilih **.NET** atau **Standard** — project ini pakai Standard (GL Compatibility)

2. **Extract & Run:**
   ```bash
   # Linux
   chmod +x Godot_v4.3-stable_linux.x86_64
   ./Godot_v4.3-stable_linux.x86_64
   ```

3. **Import Project:**
   - Buka Godot → Import → pilih folder `Last-Harbord` yang ada `project.godot`
   - Tunggu import GLB (karakter 10MB, harbor 2.18MB)

4. **Setup InputMap (sudah ada di project.godot):**
   - `move_left` = A / Left
   - `move_right` = D / Right
   - `move_up` = W / Up
   - `move_down` = S / Down
   - `sprint` = Shift
   - `attack` = Space / Mouse Left
   - `interact` = E / Enter

5. **Run Main Scene:**
   - Main scene: `res://scenes/world/SafeIsland.tscn` (di project.godot `run/main_scene`)
   - Tekan F5 atau ▶️
   - Kontrol: WASD 8 arah 360°, Shift lari, Space pukul, E interaksi perahu

### Struktur Project Penting

```
project.godot # main_scene = SafeIsland.tscn
scenes/
  world/SafeIsland.tscn # Hub utama — village -> path -> dock -> boat
  player/Player.tscn # CharacterBody3D + VisualRoot/CharacterModel + Collision
  player/IsometricCamera.tscn # Ortho 52°/40°/28m size 28
scripts/
  player/player_controller.gd # _find_animation_player() + scale 1.738 + 8 arah world-relative
  systems/isometric_camera.gd # pitch 52 yaw 40 ortho 28 dist 42
  systems/camera_controller.gd # pitch 52 yaw 40 default 28 explore 36 combat 22
  world/safe_island.gd # target = player
  world/terrain_loader.gd # build trimesh collision dari GLB
assets/
  characters/character_glb_idle_box_03_run_walk_7.glb # 10MB idle/box_03/run/walk
  environment/harbor/scenes/working_harbor.glb # 2.18MB 12x4.439x12
  models/architecture/*.glb # headquarters, shop, workshop, etc
scenes/models/architecture/*.tscn # Wrapper dengan StaticBody+CollisionShape (anti tembus)
scenes/models/harbor/WorkingHarbor.tscn # Harbor dengan collision 12x0.5x12 walkable
```

## 3. Setup Godot di Sandbox (Headless, Jika Butuh)

Kalau mau install Godot headless di sandbox Debian untuk export / validasi:

```bash
# 1. Install dependencies
sudo apt update
sudo apt install -y wget unzip

# 2. Download Godot 4.3 headless (tanpa GUI, bisa run di server)
cd /tmp
wget https://github.com/godotengine/godot/releases/download/4.3-stable/Godot_v4.3-stable_linux.x86_64.zip
unzip Godot_v4.3-stable_linux.x86_64.zip
chmod +x Godot_v4.3-stable_linux.x86_64
sudo mv Godot_v4.3-stable_linux.x86_64 /usr/local/bin/godot

# 3. Cek versi
godot --version # 4.3.stable

# 4. Validasi project tanpa GUI (headless)
cd ~/Last-Harbord
godot --headless --path . --check-only # cek syntax

# 5. Export (butuh export_presets.cfg)
godot --headless --export-release "Web" ./build/index.html

# 6. Run script validasi (tanpa editor)
godot --headless -s tools/validate_scale.py
```

**Catatan:** Di sandbox Arena, binary Godot tidak persist antar session (folder .cache, .local di-ignore). Jadi setiap session harus re-download kalau butuh.

## 4. Workflow Saya di Sandbox (Tanpa Godot Editor)

```bash
# 1. Baca file
read_file scenes/world/SafeIsland.tscn
read_file scripts/player/player_controller.gd

# 2. Edit fix bug
edit_file path old_text new_text

# 3. Buat wrapper collision baru
write_file scenes/models/architecture/Headquarters.tscn "[gd_scene...]"

# 4. Validasi
python3 tools/validate_harbor_scale.py
python3 tools/validate_harbor_camera.py

# 5. Buat QA doc
write_file QA_FIXES_2026-09-25.md "..."

# 6. Commit & push
git add -A
git commit -m "Fix ..."
git push origin arena/01a0cdca-last-harbord
```

## 5. Preview Alternatif (Tanpa Godot)

Karena tidak ada Godot Editor, saya pakai 2 preview:

1. **Three.js HTML** (`index.html`):
   - Load GLB via `THREE.GLTFLoader`
   - Camera 52°/40°/28m FOV 18°
   - Control WASD 8 arah world-relative
   - `python3 -m http.server 8000`

2. **2D Canvas** (`classic_2d.html` + `js/`):
   - `js/config.js` CAM TILT 0.62 (~52°)
   - `js/land.js`, `js/harbor.js` untuk logic

## 6. Tips Hindari Conflict (User Laporan)

User lapor: setiap perubahan saya selalu conflict, padahal tidak pernah sentuh local.

**Penyebab:** Saya sebelumnya pakai `git push --force` rewrite history → local kamu di `3569f87` vs remote `079cdba` diverge → `git pull --no-rebase` merge conflict.

**Fix:** Mulai sekarang saya hanya fast-forward (tanpa --force). Kamu cukup:

```bash
git fetch origin
git checkout -B arena/01a0cdca-last-harbord origin/arena/01a0cdca-last-harbord
```

`-B` = buang local, pakai remote terbaru (ada dermaga, harbor, dll).

## 7. Checklist Setup Lokal Lengkap

- [ ] Install Godot 4.3 stable
- [ ] Clone repo: `git clone -b arena/01a0cdca-last-harbord https://github.com/Scryptexai/Last-Harbord.git`
- [ ] Buka Godot → Import project.godot
- [ ] Tunggu import (karakter 10MB, harbor 2.18MB)
- [ ] Cek `SafeIsland.tscn` ada `WorkingHarbor`, `DockDetailed` di beach edge, `BeachPalms` 7, `IslandDesign` FG/MG/BG
- [ ] Cek `Player.tscn` capsule height 1.06 radius 0.32 y0.85 (tidak tenggelam)
- [ ] Cek `IsometricCamera.tscn` size 28.0
- [ ] Run F5 — karakter render, control 8 arah WASD 360°, bisa naik dermaga (y0.5 walkable), bisa naik perahu (E), camera jauh 28m
- [ ] HTML preview: `python3 -m http.server 8000` → buka `http://localhost:8000`

---

**Kontak:** Jika butuh Godot binary di sandbox, saya bisa download headless, tapi untuk visual QA tetap butuh local Godot Editor.
