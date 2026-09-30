# Godot Universal Setup — Sandbox & Local untuk Semua Project

Dokumen universal cara install, setup, dan pakai Godot di environment apapun — sandbox headless Arena maupun lokal desktop — agar bisa dipakai di project game lain, bukan hanya Last-Harbord.

## 1. Overview

Godot adalah engine open-source cross-platform. Di sandbox Arena (Debian 12 tanpa GUI/GPU) kita tidak bisa jalankan Editor visual, tapi bisa kerja via text, headless, dan preview alternatif. Dokumen ini menjelaskan setup universal.

**Prinsip universal:**
- `.tscn` dan `.gd` adalah text — bisa diedit tanpa Editor
- `project.godot` adalah INI — bisa dibaca/edit manual
- GLB/GLTF bisa dianalisa pakai Python tanpa Godot
- Headless Godot bisa untuk validasi, export, CI/CD di server
- Preview bisa pakai Three.js atau 2D Canvas kalau tidak ada Godot viewport

## 2. Install Godot — Universal (Semua Project)

### A. Desktop (Windows/macOS/Linux) — Untuk Semua Project

1. **Download Godot:**
   - Official: https://godotengine.org/download/archive/
   - Pilih versi LTS terbaru (4.3 stable untuk project ini, 4.4 untuk project baru)
   - Pilih **Standard** (GDScript) atau **.NET** (C#) — universal, pilih sesuai project

2. **Install:**
   ```bash
   # Linux
   wget https://github.com/godotengine/godot/releases/download/4.3-stable/Godot_v4.3-stable_linux.x86_64.zip
   unzip Godot_v4.3-stable_linux.x86_64.zip
   chmod +x Godot_v4.3-stable_linux.x86_64
   sudo mv Godot_v4.3-stable_linux.x86_64 /usr/local/bin/godot
   godot --version

   # Windows: extract .exe, double-click
   # macOS: extract .app, drag ke Applications
   ```

3. **Export Templates (universal, untuk build):**
   - Di Godot Editor: `Editor → Manage Export Templates → Download`
   - Atau download manual: https://godotengine.org/download/archive/
   - Simpan di:
     - Linux: `~/.local/share/godot/export_templates/4.3.stable/`
     - Windows: `%APPDATA%\Godot\export_templates\`
     - macOS: `~/Library/Application Support/Godot/export_templates/`

4. **Buat Project Baru (universal):**
   ```bash
   mkdir MyNewGame && cd MyNewGame
   # Godot akan buat project.godot saat pertama save
   godot --path . -e # buka editor
   ```

### B. Sandbox / Server / CI/CD (Headless) — Universal

Sandbox Arena: Debian 12, no X11, no GPU, no Godot binary. Untuk semua project Godot, setup headless:

```bash
# 1. Dependencies universal
sudo apt update && sudo apt install -y wget unzip python3 python3-pip

# 2. Install Godot headless (semua project)
cd /tmp
# Pilih versi — ganti 4.3-stable dengan versi project kamu (4.2, 4.4, dll)
VERSION="4.3-stable"
wget -q https://github.com/godotengine/godot/releases/download/${VERSION}/Godot_v${VERSION}_linux.x86_64.zip
unzip -q Godot_v${VERSION}_linux.x86_64.zip
chmod +x Godot_v${VERSION}_linux.x86_64
sudo mv Godot_v${VERSION}_linux.x86_64 /usr/local/bin/godot
godot --version

# 3. Install export templates headless (untuk semua project)
mkdir -p ~/.local/share/godot/export_templates/4.3.stable/
cd ~/.local/share/godot/export_templates/4.3.stable/
wget -q https://github.com/godotengine/godot/releases/download/4.3-stable/Godot_v4.3-stable_export_templates.tpz
unzip -q Godot_v4.3-stable_export_templates.tpz
mv templates/* .
rm -rf templates *.tpz

# 4. Validasi project apapun tanpa GUI
cd /path/to/any-godot-project
godot --headless --path . --check-only
# Cek syntax GDScript
godot --headless --path . --script res://scripts/test.gd --check-only

# 5. Export universal (butuh export_presets.cfg di project)
godot --headless --path . --export-release "Web" ./build/web/index.html
godot --headless --path . --export-release "Linux/X11" ./build/linux/game.x86_64
godot --headless --path . --export-release "Windows Desktop" ./build/win/game.exe

# 6. Run test / validasi custom (GDScript)
godot --headless --path . -s res://tools/validate.py
```

**Catatan sandbox Arena:** Folder `.cache`, `.local`, `.godot` di-ignore snapshot, jadi setiap session baru harus re-download Godot binary. Simpan script install di `tools/install_godot.sh` agar reusable untuk semua project.

Buat `tools/install_godot.sh` universal:

```bash
#!/bin/bash
# Universal Godot installer untuk sandbox — bisa dipakai semua project
set -e
VERSION=${1:-4.3-stable}
BIN_DIR="/usr/local/bin"
TEMPLATE_DIR="$HOME/.local/share/godot/export_templates/${VERSION}/"

if command -v godot &> /dev/null; then
  echo "Godot $(godot --version) already installed"
  exit 0
fi

echo "Installing Godot $VERSION..."
cd /tmp
wget -q https://github.com/godotengine/godot/releases/download/${VERSION}/Godot_v${VERSION}_linux.x86_64.zip
unzip -q Godot_v${VERSION}_linux.x86_64.zip
chmod +x Godot_v${VERSION}_linux.x86_64
sudo mv Godot_v${VERSION}_linux.x86_64 $BIN_DIR/godot

echo "Installing export templates..."
mkdir -p $TEMPLATE_DIR
cd $TEMPLATE_DIR
wget -q https://github.com/godotengine/godot/releases/download/${VERSION}/Godot_v${VERSION}_export_templates.tpz
unzip -q Godot_v${VERSION}_export_templates.tpz
mv templates/* . 2>/dev/null || true
rm -rf templates *.tpz

godot --version
echo "Godot $VERSION ready for any project"
```

## 3. Struktur Project Universal Godot

Semua project Godot punya struktur mirip — ini template universal:

```
MyGame/
├── project.godot # Config utama — main_scene, InputMap, rendering, autoload
├── export_presets.cfg # Export settings — Web, Linux, Windows, Android, iOS
├── icon.svg # Icon project
├── scenes/
│   ├── world/ # World / level
│   │   ├── Main.tscn # Main scene
│   │   └── SafeIsland.tscn # Contoh world
│   ├── player/
│   │   ├── Player.tscn # CharacterBody3D + Collision + Visual
│   │   └── IsometricCamera.tscn # Camera rig
│   └── ui/
│       └── HUD.tscn
├── scripts/
│   ├── player/
│   │   └── player_controller.gd # Movement, animation, health
│   ├── systems/
│   │   ├── camera_controller.gd # Camera follow, pitch/yaw/distance
│   │   └── game_manager.gd # Global state
│   └── world/
│       └── terrain_loader.gd # Terrain + collision
├── assets/
│   ├── characters/ # GLB, textures
│   ├── models/ # architecture, vegetation, props
│   ├── textures/ # albedo, normal, etc
│   └── shaders/ # .gdshader
├── tools/
│   ├── install_godot.sh # Universal installer
│   ├── validate.py # Universal validator
│   └── build.py # Universal builder
└── docs/
    └── GODOT_SANDBOX_SETUP.md # Doc ini
```

**project.godot universal minimal:**

```ini
; Engine config — bisa dipakai semua project
config_version=5

[application]
name="MyGame"
run/main_scene="res://scenes/world/Main.tscn"
config/features=PackedStringArray("4.3", "GL Compatibility")
boot_splash/bg_color=Color(0.14, 0.14, 0.14, 1)

[input]
move_left={
"deadzone": 0.2,
"events": [Object(InputEventKey,"physical_keycode":65)] # A
}
move_right={
"deadzone": 0.2,
"events": [Object(InputEventKey,"physical_keycode":68)] # D
}
move_up={
"deadzone": 0.2,
"events": [Object(InputEventKey,"physical_keycode":87)] # W
}
move_down={
"deadzone": 0.2,
"events": [Object(InputEventKey,"physical_keycode":83)] # S
}
sprint={
"deadzone": 0.5,
"events": [Object(InputEventKey,"physical_keycode":4194325)] # Shift
}
attack={
"deadzone": 0.5,
"events": [Object(InputEventKey,"physical_keycode":32)] # Space
}
interact={
"deadzone": 0.5,
"events": [Object(InputEventKey,"physical_keycode":69)] # E
}

[rendering]
renderer/rendering_method="gl_compatibility" # universal untuk Web & mobile
environment/defaults/default_environment="res://scenes/world/DefaultEnv.tres"
```

## 4. Workflow Universal Tanpa Editor (Sandbox)

Cara kerja di sandbox tanpa GUI — bisa dipakai semua project:

### Edit Scene & Script (Text)

```bash
# .tscn adalah text — bisa edit manual
cat scenes/player/Player.tscn
# Edit via python atau sed
python3 - << 'PY'
import pathlib
p = pathlib.Path("scenes/player/Player.tscn")
txt = p.read_text()
txt = txt.replace("fov = 42.0", "fov = 18.0")
p.write_text(txt)
PY

# .gd edit langsung
cat scripts/player/player_controller.gd
```

### Buat Collision Wrapper Universal (Anti Tembus)

Semua project butuh collision agar tidak tembus — template universal:

```gd_scene
[gd_scene load_steps=3 format=3]

[ext_resource type="PackedScene" path="res://assets/models/my_model.glb" id="1_model"]

[sub_resource type="BoxShape3D" id="BoxShape3D_col"]
size = Vector3(2.0, 2.0, 2.0) # sesuaikan dengan model

[node name="MyModel" type="StaticBody3D"]
collision_layer = 1
collision_mask = 0

[node name="Visual" parent="." instance=ExtResource("1_model")]

[node name="Collision" type="CollisionShape3D" parent="."]
transform = Transform3D(1,0,0,0,1,0,0,0,1,0,1.0,0) # y = half height
shape = SubResource("BoxShape3D_col")
```

Buat via Python universal:

```python
# tools/make_collision_wrapper.py — universal untuk semua project
import pathlib
def make_wrapper(glb_path, tscn_path, size, y):
    content = f"""[gd_scene load_steps=3 format=3]
[ext_resource type="PackedScene" path="{glb_path}" id="1_model"]
[sub_resource type="BoxShape3D" id="col"]
size = Vector3({size[0]}, {size[1]}, {size[2]})
[node name="{pathlib.Path(tscn_path).stem}" type="StaticBody3D"]
collision_layer = 1
[node name="Visual" parent="." instance=ExtResource("1_model")]
[node name="Collision" type="CollisionShape3D" parent="."]
transform = Transform3D(1,0,0,0,1,0,0,0,1,0,{y},0)
shape = SubResource("col")
"""
    pathlib.Path(tscn_path).write_text(content)

make_wrapper("res://assets/models/house.glb", "scenes/models/House.tscn", (4,3,4), 1.5)
```

### Analisa GLB Universal

```bash
# Tanpa Godot, cek GLB pakai Python — universal semua project
pip install pygltflib
python3 - << 'PY'
import pygltflib
glb = pygltflib.GLTF2().load("assets/models/house.glb")
print(f"Meshes: {len(glb.meshes)}, Animations: {len(glb.animations)}, Materials: {len(glb.materials)}")
for anim in glb.animations:
    print(f"  Anim: {anim.name}")
PY
```

### Camera Isometric Universal (52°/40°/28m)

Template camera premium mobile isometric — bisa dipakai semua project:

```gdscript
# scripts/systems/isometric_camera.gd — universal
extends Node3D
@export var target: Node3D
@export var pitch_angle_deg: float = 52.0 # 50-55° roof 70% top 30% side
@export var yaw_angle_deg: float = 40.0   # 35-45° classic isometric
@export var ortho_size: float = 28.0      # half-height meters, 28 = 56m tall 80m diameter
@export var is_orthographic: bool = true
@export var perspective_fov: float = 18.0
@export var perspective_distance: float = 42.0

@onready var camera_node: Camera3D = $Camera3D

func _ready():
    rotation_degrees = Vector3(-pitch_angle_deg, yaw_angle_deg, 0.0)
    if camera_node:
        if is_orthographic:
            camera_node.projection = Camera3D.PROJECTION_ORTHOGONAL
            camera_node.size = ortho_size
        else:
            camera_node.projection = Camera3D.PROJECTION_PERSPECTIVE
            camera_node.fov = perspective_fov
            camera_node.position = Vector3(0,0,perspective_distance)
```

### Player Controller 8 Arah 360° Universal

```gdscript
# scripts/player/player_controller.gd — universal 8 arah
extends CharacterBody3D
@export var walk_speed: float = 2.2
@export var run_speed: float = 4.2
@export var turn_speed: float = 20.0 # 360° snappy

func _physics_process(delta):
    var input_dir = Input.get_vector("move_left","move_right","move_up","move_down")
    var move_dir = Vector3.ZERO
    if input_dir != Vector2.ZERO:
        # World-relative 8 arah: W=north -Z, S=south +Z, A=west -X, D=east +X
        move_dir = Vector3(input_dir.x, 0, input_dir.y).normalized()
    
    var target_speed = run_speed if Input.is_action_pressed("sprint") else walk_speed
    velocity.x = move_toward(velocity.x, move_dir.x * target_speed, 14.0 * delta)
    velocity.z = move_toward(velocity.z, move_dir.z * target_speed, 14.0 * delta)
    
    if move_dir != Vector3.ZERO:
        var target_angle = atan2(move_dir.x, move_dir.z) # 360° facing
        $VisualRoot.rotation.y = lerp_angle($VisualRoot.rotation.y, target_angle, turn_speed * delta)
    
    if not is_on_floor():
        velocity.y -= 9.8 * delta
    move_and_slide()
```

## 5. Preview Tanpa Godot Editor — Universal

### Three.js Preview (untuk semua project 3D)

`index.html` universal template — load GLB apapun:

```html
<script src="js/vendor/three.min.js"></script>
<script src="js/vendor/GLTFLoader.js"></script>
<script>
let scene, camera, renderer;
let playerPos = new THREE.Vector3(0,0,0);
let camPitch = 52 * Math.PI/180, camYaw = 40 * Math.PI/180, camDist = 28.0;

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(18, window.innerWidth/window.innerHeight, 0.1, 150);
  renderer = new THREE.WebGLRenderer({canvas: document.getElementById('canvas')});
  
  const loader = new THREE.GLTFLoader();
  loader.load('assets/models/my_model.glb', (gltf) => {
    scene.add(gltf.scene);
  });
}

function updateCamera() {
  const offset = new THREE.Vector3(
    Math.sin(camYaw) * Math.cos(camPitch) * camDist,
    Math.sin(camPitch) * camDist,
    Math.cos(camYaw) * Math.cos(camPitch) * camDist
  );
  camera.position.copy(playerPos).add(offset);
  camera.lookAt(playerPos);
}
</script>
```

Jalankan:

```bash
python3 -m http.server 8000 --bind 0.0.0.0
# Buka https://8000-{sandboxId}.e2b.app
```

### 2D Canvas Preview (untuk semua project 2D/isometric)

`js/config.js` universal:

```js
export const CFG = {
  CAM: {
    TILT: 0.62, // cos(52°) — isometric 52°
    LIFT: 0.08,
    PERSP: 0.00034,
  }
}
```

## 6. Validasi & Testing Universal

Buat validator universal yang bisa dipakai semua project:

```python
# tools/validate_universal.py — cek semua project
import pathlib, re

def check_camera():
    for f in pathlib.Path(".").rglob("*.gd"):
        txt = f.read_text()
        if "pitch_angle_deg" in txt:
            print(f"{f}: pitch 52={ '52' in txt } yaw 40={ '40' in txt }")

def check_collision():
    for f in pathlib.Path("scenes").rglob("*.tscn"):
        txt = f.read_text()
        if "assets/models" in txt and ".glb" in txt and "StaticBody3D" not in txt:
            print(f"FAIL: {f} direct GLB without collision — tembus!")

def check_player():
    p = pathlib.Path("scenes/player/Player.tscn")
    if p.exists():
        txt = p.read_text()
        print(f"Player capsule: {'height = 1.06' in txt} (should be 1.70m total)")

check_camera()
check_collision()
check_player()
```

Jalankan:

```bash
python3 tools/validate_universal.py
```

## 7. Setup untuk Project Lain — Langkah Universal

Untuk pakai setup ini di project game lain (bukan Last-Harbord):

1. **Copy tools universal:**
   ```bash
   cp -r Last-Harbord/tools/ MyNewGame/tools/
   cp Last-Harbord/docs/GODOT_SANDBOX_SETUP.md MyNewGame/docs/
   ```

2. **Install Godot:**
   ```bash
   cd MyNewGame
   bash tools/install_godot.sh 4.3-stable
   ```

3. **Buat project.godot minimal** (lihat template di atas)

4. **Buat scene dengan collision wrapper** pakai `make_collision_wrapper.py`

5. **Setup camera & player** pakai template universal di atas (52°/40°/28m, 8 arah 360°)

6. **Preview:** `python3 -m http.server 8000` atau `godot --path . -e` di desktop

## 8. Troubleshooting Universal

| Masalah | Solusi Universal |
|---------|------------------|
| Character tidak render | Cek path GLB — harus `res://assets/...` bukan root, cek scale, cek AnimationPlayer |
| Tembus / tenggelam | Tambah `StaticBody3D+CollisionShape`, capsule center y = half height, pier y0.25 top0.5 walkable |
| Control terbalik kanan-kiri | Pakai world-relative `Vector3(input_dir.x,0,input_dir.y)` bukan camera-relative |
| Camera terlalu dekat | Perbesar `ortho_size` 22→28→32, `default_distance` 14→28→36, FOV 42→18 |
| GLB tidak import | Cek `import` di Godot, atau pakai `pygltflib` untuk validasi |
| Export gagal | Install export templates, cek `export_presets.cfg` |
| Conflict git terus | Jangan `force-push`, pakai fast-forward, atau `git checkout -B branch origin/branch` |

## 9. Checklist Universal Setup

- [ ] Install Godot binary (`godot --version`)
- [ ] Install export templates
- [ ] Buat `project.godot` dengan InputMap 8 arah
- [ ] Buat `Player.tscn` dengan capsule 1.06 height 0.32 radius y0.85 (1.70m)
- [ ] Buat camera 52°/40°/28m ortho 28 FOV 18
- [ ] Buat collision wrapper untuk semua GLB (anti tembus)
- [ ] Buat validator `tools/validate_universal.py`
- [ ] Setup preview HTML Three.js atau `godot -e` di desktop
- [ ] Git: `arena/xxx` branch, fast-forward only, no force-push

---

**Universal:** Dokumen ini bisa dipakai untuk semua project Godot — ganti versi, path, dan scale sesuai project kamu. Untuk Last-Harbord spesifik, lihat `QA_FIXES_2026-09-25.md` dan `HARBOR_INTEGRATION.md`.
