import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function capture() {
  const screenshotsDir = 'screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('[Puppeteer] Launching Chromium with @sparticuz/chromium...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--headless=new',
    ],
    defaultViewport: { width: 1280, height: 720 },
  });

  const page = await browser.newPage();
  page.on('console', (msg) => console.log('[Browser Console]', msg.text()));
  page.on('pageerror', (err) => console.error('[Browser Error]', err));

  console.log('[Puppeteer] Navigating to http://localhost:8000 ...');
  await page.goto('http://localhost:8000', { waitUntil: 'domcontentloaded', timeout: 20000 });

  await new Promise((r) => setTimeout(r, 1500));

  // Screenshot 1: Layar Boot / Menu
  await page.screenshot({ path: path.join(screenshotsDir, '01_boot_menu.png') });
  console.log('[Puppeteer] Saved 01_boot_menu.png');

  // Klik tombol MAIN
  console.log('[Puppeteer] Clicking MAIN button...');
  const startBtn = await page.$('#btn-boot-start');
  if (startBtn) {
    await startBtn.click();
  }

  // Tunggu 3.5 detik agar transisi selesai dan toast pembuka menghilang secara alami
  await new Promise((r) => setTimeout(r, 3500));

  // Pastikan layar boot tertutup
  await page.evaluate(() => {
    const el = document.getElementById('screen-boot');
    if (el) el.classList.add('hidden');
    const bl = document.getElementById('boot-loader');
    if (bl) bl.classList.add('hidden');
  });

  // Screenshot 2: Pulau Suaka (Haven Sanctuary Island) - Bersih tanpa overlap
  await page.screenshot({ path: path.join(screenshotsDir, '02_sanctuary_island.png') });
  console.log('[Puppeteer] Saved 02_sanctuary_island.png');

  // Berjalan di Pulau Suaka menuju meja peta / api unggun
  console.log('[Puppeteer] Walking towards chart table...');
  await page.keyboard.down('KeyW');
  await new Promise((r) => setTimeout(r, 1000));
  await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyA');
  await new Promise((r) => setTimeout(r, 800));
  await page.keyboard.up('KeyA');

  await page.screenshot({ path: path.join(screenshotsDir, '03_sanctuary_walking.png') });
  console.log('[Puppeteer] Saved 03_sanctuary_walking.png');

  // Bertolak ke laut lepas (Sailing on 2.5D Sea)
  console.log('[Puppeteer] Sailing out to open sea...');
  await page.evaluate(() => {
    if (window.__drift && window.__drift.beginRun) {
      window.__drift.beginRun();
    }
  });

  // Kendalikan kapal dan kemudi di laut selama 2.5 detik
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyD');
  await new Promise((r) => setTimeout(r, 2200));
  await page.keyboard.up('KeyD');
  await page.keyboard.down('KeyA');
  await new Promise((r) => setTimeout(r, 1000));
  await page.keyboard.up('KeyA');
  await page.keyboard.up('KeyW');

  await page.screenshot({ path: path.join(screenshotsDir, '04_sea_sailing.png') });
  console.log('[Puppeteer] Saved 04_sea_sailing.png');

  // Mendarat di pulau terinfeksi zombie
  console.log('[Puppeteer] Landing on infested island...');
  await page.evaluate(() => {
    if (window.__drift && window.__drift.enterIsland) {
      // Pilih pulau non-suaka pertama
      const islandIdx = window.__drift.G.islands.findIndex((isl) => !isl.isSanctuary);
      window.__drift.enterIsland(islandIdx >= 0 ? islandIdx : 1);
    }
  });

  // Tunggu mendarat dan zombie bereaksi
  await new Promise((r) => setTimeout(r, 1800));

  // Bergerak mendekati pepohonan dan zombie
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyD');
  await new Promise((r) => setTimeout(r, 1200));
  await page.keyboard.up('KeyW');
  await page.keyboard.up('KeyD');

  // Lakukan tebasan / aksi serang (Spasi)
  await page.keyboard.press('Space');
  await new Promise((r) => setTimeout(r, 300));

  await page.screenshot({ path: path.join(screenshotsDir, '05_island_combat.png') });
  console.log('[Puppeteer] Saved 05_island_combat.png');

  // Berjalan lebih dalam ke tengah pulau untuk memicu zombie (zombie encounter)
  console.log('[Puppeteer] Exploring deeper inland towards zombie spawns...');
  await page.keyboard.down('KeyW');
  await new Promise((r) => setTimeout(r, 2000));
  await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyA');
  await new Promise((r) => setTimeout(r, 1000));
  await page.keyboard.up('KeyA');

  // Tunggu zombie mendeteksi pemain dan mendekat
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(screenshotsDir, '06_zombie_encounter.png') });
  console.log('[Puppeteer] Saved 06_zombie_encounter.png');

  await browser.close();
  console.log('[Puppeteer] All visual gameplay captures completed successfully!');
}

capture().catch((e) => {
  console.error('[Puppeteer Error]', e);
  process.exit(1);
});
