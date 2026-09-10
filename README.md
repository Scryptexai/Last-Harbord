# ⚓ Last Harbor

Game survival HTML5: berlayar dari dermaga, mendarat di pulau, memanen sebelum air pasang
menutup jalan pulang, dan membangun kapalmu satu bagian demi satu bagian.

Vanilla JavaScript (ES modules) + Canvas 2D + overlay HTML/CSS. **Tanpa build step,
tanpa dependency.** Audio disintesis penuh dengan WebAudio — tidak ada file suara.

```bash
python3 -m http.server 8000
# buka http://localhost:8000
```

---

## Kalimat yang harus dijawab game ini

> **"Seberapa jauh aku mau pergi sebelum aku berbalik?"**

Semua sistem melayani pertanyaan itu. Kalau ada fitur yang tidak membuat pemain
menanyakan hal itu lebih sering, fitur itu tidak ada di sini.

| Elemen | Arti |
|---|---|
| Perahu | rumah, bank, dan nyawa. Hull = nyawa pemain. |
| Pulau | tawaran. Makin dalam, makin kaya, makin mahal. |
| Laut | ketidakpastian. Kabut, dan waktu yang terus berjalan. |
| Pasang | jam. Ambience → informasi → gigi. |
| Pelampung | kematian yang bisa ditebus. |

---

## Aturan inti (yang membedakan build ini dari versi lama)

1. **Muatan hanya jadi milikmu setelah dibongkar di dermaga.**
   `carried` (bisa hilang) vs `banked` (aman). Bertemu kapal bukan berarti aman —
   kau harus sampai ke dermaga. Mati = muatan di tangan jatuh menjadi **pelampung**
   yang bisa diambil kembali di pulau itu.
2. **Memanen menahanmu di tempat** (0.8 / 1.2 / 1.4 detik). Menahan tombol = risiko.
   Melepas = batal, dan node-nya tidak hilang. Tidak ada auto-pickup.
3. **Kau harus berjalan kembali ke kapal.** Tidak ada tombol teleport.
   Dermaga adalah satu-satunya jalan keluar.
4. **Zombie melambat di pantai.** Kalau kau bisa mencapai air, kau bisa lolos.
   Ini aturan yang bisa dipelajari, bukan hukuman acak.
5. **Pasang terus naik selama kau di luar.**

   | Fase | Mulai | Yang terjadi |
   |---|---|---|
   | **Tenang** | 0s | camar, laut tenang, tidak ada ancaman |
   | **Berubah** | 90s | garis air naik ke pantai, camar berhenti, angin naik, gelombang zombie mulai datang |
   | **Pasang** | 210s | gelap, horizon merah, gelombang lebih sering & lebih besar, lambung terkuras di laut terbuka, mengarungi air banjir melambatkanmu |

6. **Satu tombol konteks.** Tidak ada deretan tombol. Aksi yang muncul = apa pun
   yang masuk akal dilakukan saat itu (`MENDARAT`, `PANEN`, `AMBIL MUATAN`, `NAIK KAPAL`,
   `BERTAMBAT`, `MEMANCING`, `BUKA PETA`, `PERBAIKI KAPAL`, `BERLAYAR`).
7. **Refit adalah satu tangga berurutan** (6 tingkat). Selalu ada satu tujuan bernama,
   dan layar selalu memberitahu berapa lagi yang dibutuhkan.
8. **Tidak ada angka yang dibocorkan dari kejauhan.** Pulau punya tanda-tanda: asap,
   camar, menara roboh, bangkai kapal. Kau memilih risiko dengan membaca horizon.

---

## Kamera: miring 3/4, bukan dari atas

Kamera duduk **di belakang dan sedikit di atas** bahu pemain — sekitar 52° dari datar (setara kamera aksi mobile).
Itu bukan perubahan gaya, itu perubahan bahasa:

| Di layar | Artinya di dunia |
|---|---|
| **atas layar** | jauh, pedalaman, bahaya, hal yang belum kau lihat |
| **bawah layar** | dekat, pantai, dermaga, kapal |
| **benda tumbuh** | benda itu lebih dekat ke kamera (paralaks) |
| **benda menutupi benda lain** | benda itu ada di depan (urut kedalaman) |

Konsekuensinya: **pulang selalu berarti berjalan turun di layar, menuju cahaya.**
Tidak ada teks yang mengatakannya, dan tidak perlu ada.

Yang berubah hanya cara dunia diproyeksikan. Semua logika (tabrakan, jarak, jangkauan
tebasan) tetap di ruang dunia yang datar — karena itu seluruh test logika tetap sahih.

```js
CFG.CAM = { TILT: 0.66, LIFT: 0.08, PERSP: 0.00034, PERSP_MIN: 0.86, PERSP_MAX: 1.16 };
//          ^ tanah diperas 38%   ^ pemain duduk di bawah-tengah    ^ paralaks kedalaman
```
Semua gambar memakai satu jalur: `beginWorld()` untuk tanah, `atUpright()` untuk benda
berdiri, lalu urutkan menurut `y`. Pelabuhan memakai bahasa kamera yang sama.

## Bahasa visual ketegangan: sebabnya terlihat, tidak ditulis

Pemain baru tidak bisa membaca pasang dari angka. Ia membacanya dari dunia. Setiap
tahap di bawah ini **bisa dilihat tanpa satu kata**, dan semuanya berasal dari satu
sebab: badai di utara yang mendorong air naik.

| Fase | Yang berubah di layar | Yang berubah di tubuhmu |
|---|---|---|
| **Tenang** | cakrawala kuning hangat; camar berputar; bayangan panjang; laut tenang | tidak ada tekanan |
| **Camar pergi** (90s) | burung-burung terbang ke utara, langit tiba-tiba kosong; garis air naik ke pantai | jalan pulang jadi lebih panjang dari yang kau duga |
| **Air menyentuh kakimu** (150s+) | riak air di sepatu bot; pasir basah melebar; dermaga mulai terendam | langkahmu lebih pendek di air |
| **Pasang** (210s+) | langit utara menggelap dan **kadang menyala** (kilat jauh); cakrawala memerah; lentera kapal tumbuh & berdenyut lebih cepat | lambungmu terkuras sepanjang kau di luar |

Tidak ada satu pun elemen HUD untuk ini. Yang memberi tahu kau harus pulang adalah
horizon, air di kakimu, dan cahaya kapal yang terus memanggil.

## Kontrol

| | Keyboard | Sentuh |
|---|---|---|
| Gerak | `WASD` / panah | joystick kiri bawah |
| Aksi konteks | `E` (tahan untuk memanen) | tombol kanan bawah (tahan) |
| Serang | `SPASI` | tombol SERANG |
| Bekal | tombol yang muncul saat hull turun | sama |
| Suara | `M` | tombol ♪ |
| Tutup menu | `ESC` | ✕ |

---

## Perjalanan pemain

```
DERMAGA (berjalan di dek: peta → meja kerja → haluan)
   → BERLAYAR (8-20 detik, kabut terbuka, tanda pulau muncul)
   → MENDARAT (sekoci jatuh, kamera membuka pulau)
   → PULAU (memanen = rentan; makin dalam = makin kaya)
   → KEPUTUSAN BERBALIK (tidak ada prompt; hanya garis air dan waktumu sendiri)
   → KEMBALI (berjalan ke dermaga membawa semuanya)
   → NAIK KAPAL → BERTAMBAT (muatan dibongkar, terlihat)
   → MEJA KERJA (satu tingkat terpasang, kapal berubah)
   → tujuan berikutnya sudah menunggu
```

## Pulau

Jarak dari dermaga **adalah** tingkat kesulitannya. Tidak ada label "Difficulty 3".

| Cincin | Jarak | Pulau | Muatan per pulau | Zombie | Tank |
|---|---|---|---|---|---|
| Perairan Dekat | 900–1600 px | 5 | ~12 unit | 5 | — |
| Perairan Tengah | 2000–2700 px | 5 | ~18 unit | 8 | kadang |
| Perairan Jauh | 3100–3900 px | 5 | ~24 unit | 11 | sering |

Lima varian pulau (Sunyi / Karam / Abu / Reruntuhan / Karang) mengubah komposisi muatan,
kepadatan zombie, dan tanda yang terlihat dari laut.

## Zombie

| Tipe | HP | Kecepatan | Damage | Ciri |
|---|---|---|---|---|
| Berjalan | 60 | 42 px/s | 6 | lambat, aggro 150 |
| Pelari | 25 | 104 px/s | 4 | cepat, aggro 210 — masih bisa dikejar (pemain 148) |
| Raksasa | 130 | 30 px/s | 14 | 5 tebasan, aggro 130 |

Di pantai (di luar `SAND_RATIO`) semua zombie bergerak **setengah kecepatan**.

## Serangan

`windup 0.10s` (tanpa damage) → `active 0.12s` (damage mendarat di sini) →
`recovery 0.23s` (gerak penuh, tapi kau tidak bisa menyerang). Total 0.45s.
Damage tidak instan: serangan adalah komitmen. Saat memanen atau di windup/active,
kau **tidak bisa bergerak**.

---

## Struktur

```
index.html            markup HUD + 3 modal (peta, meja kerja, debrief)
css/style.css         HUD instrumen gelap, bukan dashboard
js/
  main.js             bootstrap, state machine, loop, onboarding bertahap
  config.js           SEMUA angka balancing ada di sini
  state.js            state global
  refit.js            tangga progresi + stat turunan (palka/layar/lambung)
  inventory.js        carried vs banked
  tide.js             the tide: fase, jadwal gelombang, drain laut
  world.js            kepulauan, kabut laut, tanda pulau, penunjuk arah
  land.js             pulau: kabut eksplorasi, memanen, zombie, gelombang, salvage
  camera.js           proyeksi miring 3/4: beginWorld, atUpright, urut kedalaman
  harbor.js           dermaga yang bisa dijalani (peta / meja kerja / haluan)
  boat.js             inersia + bagian refit yang terlihat
  zombie.js           factory zombie
  input.js            keyboard + joystick + aksi konteks (ditahan)
  ui.js               HUD, peta, meja kerja, debrief, toast
  audio.js            seluruh SFX & ambience (WebAudio, disintesis, tanpa file)
  fx.js               partikel, hit-stop, guncangan, indikator arah
  save.js             localStorage v2 (muatan TIDAK disimpan)
  util.js             rng, clamp, lerp, format
tests/
  smoke.test.mjs       logika + regresi ekonomi + bahasa visual pasang
  integration.test.mjs loop game sungguhan (main.js) di atas DOM palsu
  render.test.mjs      semua jalur gambar dengan canvas tiruan
  camera.test.mjs      kontrak proyeksi miring (posisi sprite, kedalaman, framing)
  pacing.test.mjs      alat ukur: bot bermain di atas modul asli
assets/               sprite (kapal 3 tier, zombie, pemain, pulau, ikon UI, branding)
asset_viewer.html     galeri aset (alat pengembang, tidak ada di UI pemain)
scripts/              generator aset (Python/PIL)
```

`smoke.test.mjs` memuat **regresi ekonomi**: versi lama game punya progresi yang
secara matematis mustahil (hanya 1 dari 6 upgrade bisa dibeli, terbukti dengan BFS
atas 2.002 state). Test ini memastikan setiap tingkat refit selalu bisa dibeli dan
tidak pernah ada tembok yang tidak terlihat.

`integration.test.mjs` menjalankan `main.js` apa adanya: boot di dermaga, berjalan ke
meja peta, berlayar, mendarat, memanen, kembali ke dermaga, tambat, membuka meja kerja,
sampai mati di pulau dan mengambil pelampungnya. Semua lewat input palsu (WASD/E/SPASI/ESC),
tanpa browser.

## Catatan desain

- **Hull adalah nyawa.** Lambung kapal dan tubuhmu adalah satu hal — kalau kau
  dikoyak di darat, kapalmu yang menerima lukanya. Ini metafora inti game, bukan
  angka terpisah.
- **Tidak ada kotak merah layar penuh.** Damage memakai busur arah + guncangan +
  hit-stop + suara. Kau tahu dari mana pukulan datang dan seberapa besar.
- **Tidak ada auto-pickup.** Resource diambil dengan waktu, bukan dengan menyentuh.
- **Reload bukan jalan pintas.** Muatan yang dibawa tidak disimpan; kalau kau
  memuat ulang di tengah run, muatannya hilang seperti kau mati di sana.

## Hasil pengukuran (simulasi bot atas modul asli)

Bot dijalankan di atas **modul asli** (bukan tiruan): 3 seed per gaya main, main sampai kapal lengkap.

Bot bermain di atas modul asli, termasuk kamera dan pasang yang baru (`node tests/pacing.test.mjs`).

| Metrik | Hasil | Target desain |
|---|---|---|
| Waktu di pulau per run | **77,5 detik** (45–90 di sesi berbeda) | 45–90 detik |
| Waktu berlayar per run | **10,7 detik** | 10–30 detik |
| Muatan dibawa pulang | 6,8 unit (bot mundur lebih awal saat terluka) | 8–14 |
| Tingkat refit yang bisa dicapai | **6 / 6** (1/3 sesi tamat, sesi lain 5/6) | 6 / 6 (build lama: 1 / 6) |
| Kematian | 8 dari 95 run (8%) | keserakahan punya ongkos |
| Pasang saat tambat | rata 88s — sebagian besar run berakhir di fase "Berubah" | keputusan berbalik terjadi sebelum air pasang penuh |

Catatan kejujuran: waktu berlayar rata-rata 10 detik ada di **batas bawah** target — cukup untuk
kabut, penunjuk arah, dan keputusan "lanjut atau berbalik", tapi bukan pelayaran yang panjang.

## Test

```bash
node tests/smoke.test.mjs        # 127: logika, ekonomi, pasang, bentuk pulau, kawanan
node tests/integration.test.mjs  #  38: LOOP GAME SUNGGUHAN lewat main.js, tanpa browser
node tests/render.test.mjs       #  28: semua jalur gambar dengan canvas tiruan
node tests/camera.test.mjs       #  15: kontrak kamera miring (posisi & kedalaman sprite)
node tests/pacing.test.mjs       # alat ukur, bukan test: laporan pacing bot
```
