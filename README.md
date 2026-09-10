# ⚓ Last Harbor

Game HTML5 survival — berlayar di laut, jelajahi pulau, kumpulkan resource, hadapi zombie, upgrade perahumu, dan bertahan hidup selama mungkin.

Dibuat dengan **vanilla JavaScript (ES6 modules) + Canvas 2D + HTML/CSS overlay + localStorage**. Tanpa build step, tanpa dependency.

## Cara Menjalankan

Module ES6 perlu disajikan lewat HTTP (bukan `file://`):

```bash
python3 -m http.server 8000
# buka http://localhost:8000
```

## Cara Main

1. **Dashboard** — lihat status perahu, lalu tekan `SAIL` untuk berlayar (atau `EXPLORE` untuk autopilot ke pulau terdekat).
2. **Laut** — kendalikan perahu dengan `WASD`/Arrow/joystick (perahu punya inertia). Dekati pulau → tekan `EXPLORE` / `E` untuk mendarat. `FISH` untuk memancing (dapat Food/Wood), `ANCHOR` untuk berhenti, `SAIL` untuk kembali ke harbor.
3. **Daratan** — gerakkan karakter (lingkaran hijau), kumpulkan resource (⛽ Fuel, 🪵 Wood, 🍖 Food, 💊 Medicine) dengan mendekati, serang zombie (`SPACE` / tombol ATTACK), lalu `BACK TO BOAT` (`B`) untuk pulang.
4. **Upgrade** — belanjakan resource di menu UPGRADE: Storage (+5 slot), Speed (+20%), Defense (+20 HP), masing-masing 2 level.
5. **Mati** = seluruh resource di inventory hilang. Upgrade perahu tetap tersimpan (localStorage).

## Tipe Zombie

| Tipe | HP | Speed | Damage | Ciri |
|------|----|-------|--------|------|
| Slow | 60 | Lambat | 6 | Merah gelap, aggro jarak menengah |
| Fast | 25 | Cepat | 4 | Merah terang, aggro jarak jauh |
| Tank | 130 | Sangat lambat | 14 | Ungu, besar, HP sangat tinggi |

Difficulty pulau (1–3) menentukan jumlah zombie & resource.

## Struktur

```
index.html          — markup + overlay UI
asset_viewer.html   — galeri untuk melihat semua aset visual
css/style.css       — styling UI (dark & moody, glassmorphism)
assets/             — suite aset visual (perahu 3 level, zombie, player, pulau, ikon UI, branding)
scripts/            — generator aset (Python/PIL)
tests/
  smoke.test.mjs    — smoke test logika (jalankan: node tests/smoke.test.mjs)
js/
  main.js           — bootstrap, state machine, game loop
  assets.js         — loader aset PNG (dengan fallback vector bila gagal load)
  config.js         — konstanta & balance
  state.js          — state global shared
  save.js           — localStorage save/load
  input.js          — keyboard WASD + virtual joystick
  ui.js             — DOM overlay (dashboard, HUD, modal)
  boat.js           — perahu (gerak inertia, stat, render sprite/fallback)
  world.js          — laut, gelombang, pulau
  land.js           — mode daratan (player, zombie AI, resource)
  zombie.js         — factory zombie (Slow/Fast/Tank)
  inventory.js      — inventory & kapasitas storage
  util.js           — util kecil (rng, format waktu)
```

Semua render Canvas memakai sprite dari `assets/` dan otomatis jatuh kembali ke
gambar vector (shape dasar) bila aset gagal dimuat.
