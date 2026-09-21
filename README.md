# ⚓ Last Harbor (+ Last Asylum: Plague)

Repo ini berisi **dua game HTML5** (vanilla JS + Canvas 2D, **tanpa build step,
tanpa dependency**; audio disintesis penuh dengan WebAudio):

| Game | Entry | Genre |
|---|---|---|
| **Last Harbor / "Driftholm"** | `index.html` | Survival naval + rogue-lite + tycoon refit |
| **Last Asylum: Plague** | `asylum.html` | Arcade idle / hospital tycoon (medieval plague) |

Keduanya berbagi fondasi mesin (proyeksi kamera miring, input joystick,
WebAudio, partikel, pola test Node + DOM palsu) tapi state, save, dan loop-nya
terpisah. Pintu antar-game: dashboard boot Driftholm → tombol **⚕ LAST ASYLUM**;
pause Last Asylum → **KE DERMAGA (DRIFTHOLM)**.

```bash
python3 -m http.server 8000
# Driftholm:  http://localhost:8000/          (index.html)
# Last Asylum: http://localhost:8000/asylum.html
```

## Last Asylum: Plague (game kedua — 2026-09)

Kamu dokter wabah terakhir di rumah sakit kota yang lumpuh. Pasien datang sendiri
lewat gerbang utara (idle); kamu memanen **gandum**, **daun herbal**, dan **kayu**;
**berdiri** di samping kasur untuk menangani pasien (12 herbal + 2 gandum, tanpa
tombol interaksi — `ProximityTrigger`); koin per pasien yang sembuh; koin + kayu
membuka bangsal baru di atas **ghost tile** bercahaya (transfer 1 koin per tick
0.05s + partikel melayang).

Angka spesifikasi terpenuhi di kode (dan diuji):

- **Kamera** §1 — pitch 58° (`TILT = cos 58°`), FOV telephoto 28–32° (skala
  kedalaman sempit), damped follow `smoothDamp` (port Unity, smoothTime 0.18,
  tanpa overshoot) + look-ahead `1.2 × velocity`.
- **Gerak** §2 — rotasi diklamp **720°/s** (tanpa snapping), **Turning Penalty
  60%** saat berbalik >90°, akselerasi 0.10s / deselerasi 0.15s, animasi
  tersinkron kecepatan (`AnimSpeedMultiplier = speed / base`).
- **Rig** §3 — jubah: 3 chain × 3 bone verlet + spring (stiffness 0.35, damping
  0.45, drag 0.20) — melipat maju saat berhenti mendadak, tertinggal saat
  berbelok; lentera: pendulum teredam limit **±25°**, berayun ritmis mengikuti
  langkah; vial ramuan di tangan kanan.
- **UI** §4 — portrait 9:16 mobile-first: top dashboard (4 resource, bold + ikon
  mini), quest capsule + progress bar, dialog pembuka (ilustrasi prosedural
  kanan bawah + teks kiri bawah, tap untuk lanjut).

Spesifikasi lengkap + peta implementasi: [`docs/ASYLUM_SPEC.md`](docs/ASYLUM_SPEC.md).
Test: `node tests/asylum.test.mjs` (58 asersi, termasuk regresi pacing — bot
ideal harus membangun Bangsal II < 240 detik simulasi).

---

## Driftholm — Last Harbor

Game survival HTML5: berlayar dari dermaga, mendarat di pulau, memanen sebelum air pasang
menutup jalan pulang, dan membangun kapalmu satu bagian demi satu bagian.

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
2. **Memanen otomatis saat berhenti di dekat node** (PANEN LANGSUNG — hasil
   langsung masuk palka, tanpa bar progres dan tanpa terkunci di tempat).
   Berjalan melewati node tidak memetik apa pun; risikonya bukan lagi waktu
   terkurung, melainkan jarak — node kaya selalu lebih dalam pulau.
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
   yang masuk akal dilakukan saat itu (`MENDARAT`, `NAIK KAPAL`, `BERTAMBAT`,
   `MEMANCING`, `BUKA PETA`, `PERBAIKI KAPAL`, `BERLAYAR`). Panen tidak butuh tombol —
   mendekat saja sudah memanen.
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
| **Camar pergi** (150s) | burung-burung terbang ke utara, langit tiba-tiba kosong | jalan pulang jadi lebih panjang dari yang kau duga |
| **Air menyentuh kakimu** (155s+) | riak air di sepatu bot; pasir basah melebar; dermaga mulai terendam | langkahmu lebih pendek di air |
| **Pasang** (270s+) | langit utara menggelap dan **kadang menyala** (kilat jauh); cakrawala memerah; lentera kapal tumbuh & berdenyut lebih cepat | lambungmu terkuras sepanjang kau di luar |
| **Fajar** (420s) | air turun, cakrawala sembuh ke kuning hangat, camar kembali dari utara | malam tamat; napasmu kembali |

**Isyarat lebih dulu, ongkos belakangan.** Warna langit dan cakrawala sudah mengeras
sejak detik pertama (`tideTint()`), sementara air yang benar-benar menelan pantai baru
bergerak setelah fase tenang habis (`tideDanger()`). Kalau keduanya memakai satu kurva,
fase "tenang" berhenti jadi tenang — dan pemain baru dihukum sebelum dia sempat belajar.
Angka busurnya bisa diperiksa ulang kapan saja: `node tests/tension.test.mjs`.

Tidak ada satu pun elemen HUD untuk ini. Yang memberi tahu kau harus pulang adalah
horizon, air di kakimu, dan cahaya kapal yang terus memanggil.

## Satu malam, bukan satu run (jantung "sekali lagi")

Dulu jam pasang **di-reset setiap kali kau berlayar**. Bot yang efisien menambat di detik
88 — tepat sebelum fase tegang dimulai di detik 90. Artinya pemain yang bermain bagus
tidak pernah bertemu gigi permainan ini, dan yang bermain buruk dihukum dua kali. Itu
persis penyakit yang paling banyak dikeluhkan pemain Dredge ("toothless", ketegangan
hilang setelah jam pertama).

Sekarang jam pasang adalah **milik malam, bukan milik satu run**, dan aturannya tiga:

1. **Jam hanya berjalan saat kau di luar** (laut/pulau). Di dermaga ia membeku — pulang
   membeli keamanan, bukan kemajuan.
2. **Ia tidak pernah mundur.** Berlayar lagi = melanjutkan malam yang sama dari detik
   terakhir kau menambat. Jadi keserakahanmu di run pertama menaikkan ongkos run berikutnya.
3. **Fajar memutarnya** (`TIDE.DAWN_AT`, 420 detik di laut): air turun, cakrawala sembuh,
   camar kembali. Malam tamat dengan sendirinya, lalu malam baru mulai dari nol.

Satu malam = 7 menit di laut: **150s tenang → 120s berubah → 150s pasang → fajar**.
Jendela tenang sengaja cukup untuk ~2 kali panen; kalau lebih pendek, seluruh malam
berjalan di jendela yang miskin dan tangga refit jadi tidak mungkin dinaiki.

Konsekuensinya bisa diukur, dan inilah yang membuat "sekali lagi" masuk akal:

| Berangkat saat | Run | Rata di pulau | Muatan | Mati |
|---|---|---|---|---|
| Tenang | 40 | 70s | 4,8 | 8% |
| Berubah | 20 | 61s | 3,4 | 10% |
| Pasang | 34 | 51s | 3,1 | 32% |

Bot serakah (tidak pernah mundur) menunjukkan bentuk yang sama, lebih tajam:
mati 41% saat berangkat tenang, **86% saat berubah**, 77% saat pasang.

Dermaga ikut memperlihatkan malam yang sedang berjalan: air naik di sepanjang dermaga,
langit bergeser dari biru ke merah, dan lingkaran lampu menyusut. Di debrief kematian ada
satu baris baru: **Malam tersisa N%** — malam hanya berjalan kalau kau keluar, dan itu
alasan untuk menekan "berlayar" sekali lagi.

Dasar eksternalnya (bukan asumsi — ini data perilaku pemain sungguhan):

- **Clark dkk. 2009, *Neuron* 61:481–490** — "hampir berhasil" hanya memotivasi kalau
  **pemain** yang menyusunnya; near-miss yang dipilih komputer justru menurunkan keinginan
  bermain. Karena itu tidak ada "hampir sampai" buatan di game ini: kerugian selalu
  berasal dari keputusan pemain sendiri (bertahan lebih lama, masuk lebih dalam).
- **Berridge & Robinson (incentive salience)** — dopamin adalah *wanting* (tarikan isyarat),
  bukan *liking*. Karena itu jam malam, bar sisa malam, dan air yang naik adalah isyarat
  sebelum hadiahnya; hadiahnya sendiri tetap nyata (muatan benar-benar jadi milikmu).
- **Ulasan Dredge** (Metacritic pengguna ≈73% positif/23% campur/3% negatif) — yang dipuji:
  ketegangan terus-menerus tanpa jumpscare, kabut, umpan keserakahan. Yang dikritik:
  ketegangan menguap setelah jam pertama dan konten malam **opsional**. Karena itu malam
  di sini tidak bisa dilewati dan tidak bisa ditunggu sampai selesai.
- **Laporan pemain Tarkov/Rust** — ketegangan kehilangan bertahan hanya kalau ada dua hal:
  jalan pulih yang murah dan terlihat (pelampung muatan, lambung 50%, gudang tetap) dan
  progres yang tidak hilang saat mati. Rust dikritik karena "tidak menghargai apa pun
  selain waktu".
- **Panjang sesi** (benchmark 2026: mobile P50 ≈3–6 menit, PC P50 ≈18 menit) — satu malam
  ≈7 menit di laut, bisa dipotong kapan saja di dermaga tanpa kehilangan apa pun.

## Kontrol

| | Keyboard | Sentuh |
|---|---|---|
| Gerak | `WASD` / panah | joystick kiri bawah |
| Aksi konteks | `E` (naik kapal, buka peta/meja, berlayar) | tombol kanan bawah |
| Serang | `SPASI` | tombol SERANG |
| Bekal | tombol yang muncul saat hull turun | sama |
| Suara | `M` | tombol ♪ |
| Tutup menu | `ESC` | ✕ |

---

## Perjalanan pemain

```
DERMAGA (berjalan di dek: peta → meja kerja → haluan; malam membeku di sini)
   ↑ FAJAR (420s di laut): air turun, camar kembali, malam baru mulai
   ↺ MALAM: jam tidak mundur saat kau berlayar lagi — makin lama kau di luar, makin keras
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
asylum.html           game kedua: HUD Last Asylum (spec §4)
css/style.css         HUD instrumen gelap, bukan dashboard
css/asylum.css        HUD Last Asylum (dark medieval, portrait 9:16)
js/
  main.js             bootstrap, state machine, loop, onboarding bertahap
  config.js           SEMUA angka balancing Driftholm ada di sini
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
  input.js            keyboard + joystick + aksi konteks (dipakai kedua game)
  ui.js               HUD, peta, meja kerja, debrief, toast
  audio.js            seluruh SFX & ambience (WebAudio, disintesis, tanpa file)
  fx.js               partikel, hit-stop, guncangan, indikator arah
  save.js             localStorage v2 (muatan TIDAK disimpan)
  util.js             rng, clamp, lerp, format
js/asylum/            GAME KEDUA — Last Asylum: Plague (lihat docs/ASYLUM_SPEC.md)
  config.js           semua angka Last Asylum (konstanta spec §1-§5)
  state.js            state global A (terpisah dari G)
  camera.js           spec §1: smoothDamp (port Unity) + look-ahead + TILT=cos58°
  doctor.js           spec §2: turn clamp 720°/s, penalty 60%, accel/decel, stride
  rig.js              spec §3: jubah spring-bone (3 chain × 3 bone) + lentera ±25°
  proximity.js        spec §6: ProximityTrigger (port pseudocode, multi-resource)
  patients.js         core loop §5: spawn, antre, kasur, treatment, koin
  building.js         ghost tile bangsal: trigger build 1 koin/0.05s + partikel
  quests.js           quest tracker (spec §4.1.2)
  dialogue.js         dialog pembuka + ilustrasi prosedural (spec §4.1.4)
  world.js            pelataran, node gandum/herbal/kayu, seluruh gambar 2.5D
  ui.js               HUD: dashboard resource, quest capsule, toast, dialog
  save.js             localStorage v1 (kunci last-asylum-save-v1)
  main.js             loop + state machine + input
tests/
  smoke.test.mjs       logika + regresi ekonomi + bahasa visual pasang
  integration.test.mjs loop game sungguhan (main.js) di atas DOM palsu
  render.test.mjs      semua jalur gambar dengan canvas tiruan
  camera.test.mjs      kontrak proyeksi miring (posisi sprite, kedalaman, framing)
  pacing.test.mjs      alat ukur: bot bermain di atas modul asli
  asylum.test.mjs      Last Asylum: angka spec + core loop + regresi pacing
docs/
  ASYLUM_SPEC.md       spesifikasi Last Asylum + peta implementasi
  LAST_HARBOR_DESIGN_AUDIT.md  audit desain Driftholm (analysis only)
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
- **Panen otomatis dengan ongkos.** Mendekati node langsung memanen tanpa tombol,
  tapi tetap butuh waktu (0.8–1.4 detik) dan menahanmu di tempat — jadi dekat dengan
  barang bukan berarti gratis dari zombie.
- **Reload bukan jalan pintas.** Muatan yang dibawa tidak disimpan; kalau kau
  memuat ulang di tengah run, muatannya hilang seperti kau mati di sana.

## Hasil pengukuran (simulasi bot atas modul asli)

Bot dijalankan di atas **modul asli** (bukan tiruan): 3 seed per gaya main, main sampai kapal lengkap.

Bot bermain di atas modul asli, termasuk kamera dan pasang yang baru (`node tests/pacing.test.mjs`).

| Metrik | Hasil | Target desain |
|---|---|---|
| Waktu di pulau per run | **61,6 detik** (bot hati-hati) / >100s (serakah) | 45–90 detik |
| Waktu berlayar per run | **8,6 detik** | 10–30 detik |
| Muatan dibawa pulang | 3,9 unit (turun dari 6,8 karena malam tidak lagi gratis) | 8–14 |
| Tingkat refit yang bisa dicapai | **3 / 6** per sesi (3 sesi, 94 run) | 6 / 6 (build lama: 1 / 6) |
| Kematian per fase saat berangkat | 8% tenang · 10% berubah · **32% pasang** | keserakahan punya ongkos |
| Pasang saat tambat | rata 214s — malam diteruskan, bukan direset | keputusan berbalik terjadi sebelum air pasang penuh |
| Fajar | 31 kali dalam 3 sesi | malam tamat dengan sendirinya, tanpa jalan buntu |

Angka di atas **bisa diulang**: RNG bot ditanam (`tests/_seed.mjs`) dan audio tidak lagi
memakai aliran acak permainan, jadi dua jalan perintah yang sama memberi keluaran sama
(`sidik jari 28613.69|3|45`).

Catatan kejujuran: waktu berlayar rata-rata 10 detik ada di **batas bawah** target — cukup untuk
kabut, penunjuk arah, dan keputusan "lanjut atau berbalik", tapi bukan pelayaran yang panjang.

## Test

```bash
# Driftholm (Last Harbor)
node tests/smoke.test.mjs        # 153: logika, ekonomi, malam, bentuk pulau, kawanan
node tests/integration.test.mjs  #  58: LOOP GAME SUNGGUHAN lewat main.js, tanpa browser
node tests/render.test.mjs       #  29: semua jalur gambar dengan canvas tiruan
node tests/tension.test.mjs      # busur ketegangan satu malam, 6 kanal visual sekaligus
node tests/camera.test.mjs       #  15: kontrak kamera miring (posisi & kedalaman sprite)
node tests/pacing.test.mjs       # alat ukur, bukan test: laporan pacing bot

# Last Asylum: Plague
node tests/asylum.test.mjs       #  58: angka spec (kamera/gerak/rig/proximity),
                                 #     core loop pasien->koin->bangsal, save, render,
                                 #     + regresi pacing (bot bangun Bangsal II < 240s)
```
