# ⚓ GODOT 4 PIVOT & GAME DESIGN DIRECTIVE
**Dokumen Arahan Game Director & Desain Arsitektur Pivot Godot 4**  
*Project: Last Harbor (Suaka & Samudra Apocalypse)*

---

## 1. VISI UTAMA & PILAR GAMEPLAY (Game Director Vision)

Sebagai **Game Director Design**, fokus utama dari iterasi ini adalah menciptakan ketegangan psikologis yang mendalam dan memuaskan (*high-stakes survival tension*).

### Kalimat Inti yang Menjiwai Seluruh Desain:
> **"Seberapa jauh aku berani berlayar sebelum pasang menenggelamkan perahu, zombie mengepung, dan pengungsi di pulau suaka mati kelaparan?"**

Game ini bukan sekadar simulasi memanen (*idle farming*), melainkan **ekspedisi pertaruhan hidup-mati di era apocalypse**.

---

## 2. LATAR CERITA & DUNIA APOCALYPSE: PULAU SUAKA (SANCTUARY ISLAND)

### Konsep Inti:
1. **Satu-satunya Pulau Aman (Pulau Suaka / Safe Haven Island)**:
   - Tidak ada zombie di pulau ini.
   - Dihuni oleh sekelompok kecil korban selamat (*survivors*) yang bertahan hidup di tenda-tenda darurat:
     - **Kakek Aris (Tetua Nelayan)**: Menjaga api unggun dan memantau cadangan ransum.
     - **Dokter Maya (Medis Camp)**: Merawat pengungsi yang luka dan demam di tenda medis.
     - **Budi Si Tukang Kapal**: Mengelola meja kerja perbaikan kapal dan perluasan palka.
     - **Keluarga Pengungsi & Anak-Anak**: Tinggal di tenda terpal, bergantung penuh pada hasil ekspedisi pemain.
2. **Dermaga Berada di Pantai Pulau, Bukan Mengapung di Laut**:
   - Dermaga kayu solid (*wooden pier*) dibangun di bibir pantai utara pulau suaka, menjorok ke perairan tenang tempat perahu pemain bersandar (*bertambat*).
   - Terdapat tanggul batu dam pemecah ombak (*breakwater seawall*) yang melindungi perkampungan dari pasang naik.
   - Api suar dan api unggun pusat dengan kolom asap tinggi yang membubung ke langit — menjadi penuntun navigasi (*lighthouse beacon*) dari kejauhan di tengah kabut laut.
3. **Krisis Sumber Daya (The Survival Need)**:
   - Penduduk Pulau Suaka kekurangan segala hal: makanan untuk anak-anak, obat untuk luka infeksi, solar untuk generator suar, dan kayu untuk memperkuat tanggul dam.
   - Pemain adalah satu-satunya pelaut yang sanggup menembus lautan pasang ke pulau-pulau luar demi mengumpulkan logistik.

---

## 3. PROBLEM & TANTANGAN PSIKOLOGIS PEMAIN

### Problem 1: Kapasitas Palka Perahu Sangat Terbatas (*Cargo Dilemma*)
- Perahu awal hanya memiliki **10 slot palka**.
- Pemain **tidak bisa membawa semua resource sekaligus**.
- Ini menciptakan dilema keputusan nyata setiap detik:
  - *"Apakah aku prioritaskan Makanan & Obat untuk menyelamatkan nyawa warga suaka yang sakit?"*
  - *"Atau Kayu & Solar untuk memperbesar palka kapal ke 16 slot dan memperkuat lambung kapal?"*
  - *"Palkaku sudah 9/10 penuh, malam pasang mulai naik, dan ada peti medis di pedalaman... apakah aku nekat mengambilnya atau segera lari kembali ke perahu?"*
- Pemain dipaksa bolak-balik berlayar, menghafal rute, dan mengelola risiko.

### Problem 2: Ancaman Berjenjang (*Tiered Zombie Threat*) & Imbalan Pulau
Setiap cincin kepulauan memiliki tingkat bahaya zombie dan kekayaan resource yang sangat kontras:

| Cincin Perairan | Tingkat Ancaman | Musuh Utama | Karakteristik Zombi | Cadangan Resource |
|---|---|---|---|---|
| **Perairan Dekat (Ring 1)** | **Level 1 (Rendah)** | Zombi Lapar (*Scavenger*) | Gerak lambat (42 px/s), mudah di-kite, HP 60, serangan terbaca | Kayu hanyut, solar dasar, tangkapan ikan |
| **Perairan Tengah (Ring 2)** | **Level 2 (Sedang)** | Zombi Zirah (*Armored Brute*) & Pelari (*Stalker*) | Raksasa berzirah lempeng besi (HP 130, tahan knockback, hantaman gada) + Pelari cepat (104 px/s) | Drum solar melimpah, peti kayu konstruksi |
| **Perairan Jauh (Ring 3)** | **Level 3 (Maut)** | Teror Malam Mutasi (*Night Terror*) & Spitter | Mutasi merah gelap, mata merah menyala (2D Point Light), jeritan lolongan membangunkan kawanan, racun mematikan (HP 180, DMG 22) | Peti medis langka, solar terkonsentrasi, cetak biru perahu |

---

## 4. DESAIN VISUAL 2.5D (KAMERA 3/4 DOWN ~30° PITCH)

Visual didesain ulang total dengan estetika **2.5D Dimetric / 3/4 Down Projection**:

### 1. Kamera & Kedalaman Spasial:
- Sudut kemiringan kamera ~30° dari vertikal (proyeksi 3/4 down ala isometric ARPG).
- Tanah, pasir, dan permukaan laut diperas vertikal (~0.4 - 0.75 rasio aspek), sementara semua objek berdiri (karakter, pohon, zombi, tebing, tiang dermaga, perahu) tetap tegak lurus (*upright*).
- Objek yang lebih dekat kamera (Y lebih besar) merender di atas objek di belakangnya (*Y-Sort* ketat), memberikan kedalaman ruang alami tanpa tabrakan visual.

### 2. Laut & Pesisir Pantai:
- **Laut Berlapis**: Transisi dari laut dalam (*deep abyss navy*) ke rak karang dangkal toska (*shallow turquoise*).
- **Ombak Buih Prosedural**: Garis buih putih dinamis yang berayun membasahi pasir pantai dan surut mengikuti ritme waktu.
- **Kilau Pasir Basah**: Refleksi tipis di area pasang surut.

### 3. Pohon Organik & Dedaunan:
- Batang kayu *gnarled* (berurat dan berakar) dengan percabangan alami.
- Kanopi daun bervolume bola bertingkat dengan *spherical shading*:
  - Sisi kiri-atas: *Sunlit golden-green highlight*.
  - Bagian tengah: *Rich forest green*.
  - Sisi bawah: *Deep ambient occlusion shadow*.
- Animasi *harmonic wind sway* (goyangan angin) yang otomatis mengencang saat fase pasang/badai mendekat.

### 4. Tanggul Batu Dam & Tebing Pesisir (*Breakwater Dam*):
- Balok-balok batu granit persegi bertumpuk di pesisir pulau, menahan hantaman ombak.
- Permukaan atas balok batu memantulkan cahaya matahari, sisi vertikal memiliki bayangan jatuh (*drop shadow*).
- Percikan air laut (*foam spray*) saat ombak menghantam dinding dam.

### 5. Efek Tempur & Juice (*Combat Feedback*):
- Ayunan bilah dayung menghasilkan **busur tebasan energi bercahaya emas-ungu** (*glowing slash arc*).
- Pukulan ke zombi memicu **cipratan darah gelap (*blood splatter*)**, serpihan partikel, dan getaran benturan (*kinetic hitstop & screen shake*).
- **Indikator Telegraph Zombi**: Busur merah di tanah saat zombi raksasa bersiap mengayunkan gada, memberi pemain jendela taktis untuk menghindar (*dodge*).

---

## 5. PENGUNCIAN MODEL KARAKTER 3D (LOCKED & PRESERVED)

Sesuai instruksi mutlak user:
- Model **`character_glb_idle_box_03_run_walk_7.glb`** dipertahankan 100% dan dikunci agar tidak tersentuh.
- Memiliki 4 alur animasi skeletal:
  1. `idle` (diam waspada)
  2. `walk` (langkah mengintai)
  3. `run` (lari cepat)
  4. `box_03` (serangan ayunan senjata dayung)
- Rotasi 360° kontinu mengikuti arah hadap pemain.
- Di Web/JS saat ini: Dirender melalui Three.js WebGL offscreen canvas ke dalam ruang 2.5D.
- Di Godot 4: Model GLB yang sama diimpor langsung ke node 3D/SubViewport dalam node 2.5D pemain.

---

<<<<<<< HEAD
## 6. ARSITEKTUR TEKNIS PIVOT KE GODOT ENGINE 4 (HEADLESS VERIFIED)

Struktur proyek lengkap yang telah dibangun dan divalidasi di folder `/godot_project/`:
=======
## 6. ARSITEKTUR TEKNIS PIVOT KE GODOT ENGINE 4

Struktur proyek lengkap telah dibuat di folder `/godot_project/`:
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5

```
godot_project/
├── project.godot               # Konfigurasi Godot 4 (GL Compatibility, 1280x720, Autoloads)
<<<<<<< HEAD
├── export_presets.cfg          # Preset Export to Web (Wasm/WebGL) + Headless
├── scenes/
│   ├── Main.tscn               # Root coordinator + WorldEnvironment + Dynamic scene loading
│   ├── SanctuaryIsland.tscn    # Pulau Suaka aman + high-fidelity boardwalk + lumbung + NPC survivor
│   ├── InfestedIsland.tscn     # Pulau terinfeksi Tier 1-3 + breakwaters + tiered zombies + loot
│   ├── World.tscn              # Lautan lepas terbuka + kepulauan berjenjang + navigasi kompas
│   ├── Player.tscn             # Karakter 2.5D + integrasi GLB 3D + OmniLight3D lentera
│   ├── Boat.tscn               # Perahu inersia + lentera haluan + indikator kargo palka
│   ├── Zombie.tscn             # Zombi berjenjang (Tier 1-3) + mata bersinar + telegraph
│   └── SurvivorNPC.tscn        # NPC survivor di suaka (Aris, Maya, Budi, Keluarga pengungsi)
├── scripts/
│   ├── Main.gd                 # Inisialisasi dan transisi antar-adegan
│   ├── GameManager.gd          # Autoload singleton ekonomi, status koloni, dan limit palka
│   ├── TideSystem.gd           # Autoload singleton siklus pasang surut & naiknya air laut
│   ├── PlayerController.gd     # Kendali gerak 2.5D, tebasan dayung, panen resource
│   ├── SanctuaryIsland.gd      # Manajemen Pulau Suaka, interaksi meja kerja & bongkar kargo
│   ├── InfestedIsland.gd       # Spawning prosedural pulau Tier 1-3, breakwater, dan zombi
│   ├── World.gd                # Pelayaran laut lepas, penanda kepulauan, dan pasang surut
│   ├── BoatController.gd       # Fisika berlayar laut lepas & inersia lambung
│   ├── ZombieAI.gd             # AI zombi berjenjang + panggilan kawanan + serangan
│   ├── SurvivorNPC.gd          # Dialog & kebutuhan penyintas di suaka
│   └── run_headless_validation.gd # Automated test suite pengujian headless
=======
├── export_presets.cfg          # Preset Export to Web (Wasm/WebGL) + PWA
├── scenes/
│   ├── Main.tscn               # Root scene + WorldEnvironment (Glow) + CanvasModulate
│   ├── SanctuaryIsland.tscn    # Pulau Suaka aman + pengungsi + api unggun + dermaga
│   ├── CombatIsland.tscn       # Pulau ekspedisi zombi + tanggul dam + pohon organik
│   ├── Player.tscn             # Karakter 2.5D + integrasi GLB 3D + PointLight2D
│   ├── Boat.tscn               # Perahu inersia + lentera haluan + GPUParticles buih
│   └── Zombie.tscn             # Zombi berjenjang (Lv 1-3) + mata bersinar + telegraph
├── scripts/
│   ├── GameManager.gd          # Singleton ekonomi, status koloni, dan palka
│   ├── TideSystem.gd           # Siklus pasang air naik & kegelapan malam
│   ├── PlayerController.gd     # Kendali 2.5D, serangan combo, panen
│   ├── SanctuaryIsland.gd      # Logika Pulau Suaka & pembongkaran kargo
│   ├── BoatController.gd       # Fisika berlayar laut lepas
│   ├── ZombieAI.gd             # AI zombi berjenjang + panggilan kawanan
│   └── SurvivorNPC.gd          # Dialog & kebutuhan korban selamat
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5
├── shaders/
│   ├── water_25d.gdshader      # Shader air laut 2.5D + riak kaustik & buih pantai
│   ├── foliage_sway.gdshader   # Shader goyangan angin pohon & semak
│   └── glow_fire.gdshader      # Shader cahaya api unggun & lentera
└── assets/
<<<<<<< HEAD
    ├── character_glb_idle_box_03_run_walk_7.glb # Model 3D Karakter Utuh (TERKUNCI)
    ├── branding/
    ├── environment/
    └── ui/
```

### Fitur Unggulan Godot 4 yang Dimaksimalkan:
1. **WorldEnvironment & 3D/2.5D Lighting**:
   - Menghidupkan cahaya lentera badai, api unggun suaka, dan mata merah zombi menggunakan `OmniLight3D` dan `DirectionalLight3D`.
2. **Dynamic 2.5D Camera Angle (35° Pitch Elevation)**:
   - Menghasilkan kedalaman ruang dramatis yang menonjolkan ketinggian pohon, dinding dam pemecah ombak, dan siluet model 3D karakter.
3. **Gerstner Wave Water & Shoreline Attenuation**:
   - Air laut yang hidup dengan buih ombak di sekitar dermaga dan batas pasang surut yang naik menggenangi pantai rendah.
4. **Sistem Kargo Palka Terbatas & Dilema Survival**:
   - Membatasi perahu awal ke 10 slot muatan, memicu ketegangan antara menyelamatkan warga suaka atau meningkatkan kapal.

---

## 7. CARA MENJALANKAN SECARA HEADLESS DI TERMINAL SANDBOX

Engine Godot 4 headless telah terintegrasi di terminal:

```bash
# 1. Menjalankan game Godot 4 headless (memuat Sanctuary Island & arena)
godot --headless --path godot_project --quit-after 5

# 2. Menjalankan automated test suite validasi arena & loop survival
godot --headless --path godot_project --script /scripts/run_headless_validation.gd
```

=======
    ├── character_glb_idle_box_03_run_walk_7.glb
    ├── branding/
    └── environment/
```

### Fitur Unggulan Godot 4 yang Dimaksimalkan:
1. **WorldEnvironment & CanvasItem Glow**:
   - Menghidupkan cahaya lentera, api unggun, dan mata merah zombi tanpa komputasi manual.
2. **2D PointLight2D & DirectionalLight2D**:
   - Pencahayaan dinamis yang memanjang saat senja dan pasang malam.
3. **GPUParticles2D**:
   - Bara api unggun melayang, buih ombak membentur dam, dan jejak buih di belakang perahu.
4. **TileMapLayer Organik**:
   - Transisi autotile pasir pantai, tanggul batu, dan padang rumput.
5. **Export to Web (HTML5/Wasm/WebGL)**:
   - Game bisa langsung di-export via satu klik di Godot 4 (`export_presets.cfg` sudah dikonfigurasi) dan dimainkan di browser desktop maupun mobile.

---

## 7. CARA MENJALANKAN & MENGEKSPOR DI GODOT 4

1. Buka **Godot Engine 4.3+**.
2. Klik **Import**, pilih folder `/home/user/Last-Harbord/godot_project/project.godot`.
3. Klik **Run** (`F5`) untuk langsung memainkan adegan `Main.tscn`.
4. Untuk Web Export: Buka menu **Project > Export**, pilih preset **Web**, lalu klik **Export Project**.
>>>>>>> d86a06ef6fccb232b9a4bc382d6f451c571063d5
