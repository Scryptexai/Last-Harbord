// ============ Asset Loader ============
export const ASSETS = {};

// Karakter arah + animasi (diproduksi dari strip 5 arah × 3 frame). Frame 0 = diam,
// frame 1..n = siklus langkah. 'side' menghadap kanan (di-cermin untuk kiri);
// 'ne'/'se' diagonal, di-cermin untuk NW/SW.
const SHEET_SPEC = { player: 3, zombie_slow: 3, zombie_fast: 3, zombie_tank: 3 };
const SHEET_DIRS = ['front', 'back', 'side', 'ne', 'se'];

const ASSET_PATHS = {
  // Characters & Entities
  boat_lv1: 'assets/characters/boat_lv1.png',
  boat_lv2: 'assets/characters/boat_lv2.png',
  boat_lv3: 'assets/characters/boat_lv3.png',
  player: 'assets/characters/player.png',
  npc_keeper: 'assets/characters/npc_keeper.png',
  zombie_slow: 'assets/characters/zombie_slow.png',
  zombie_fast: 'assets/characters/zombie_fast.png',
  zombie_tank: 'assets/characters/zombie_tank.png',

  // Environment
  island: 'assets/environment/island.png',
  tree: 'assets/environment/tree.png',
  tree2: 'assets/environment/tree2.png',
  tree3: 'assets/environment/tree3.png',
  rock: 'assets/environment/rock.png',
  bush: 'assets/environment/bush.png',
  salvage_buoy: 'assets/environment/salvage_buoy.png',
  stall_flair: 'assets/props/stall_flair.png',
  note_scrap: 'assets/environment/note_scrap.png',
  // Bentuk pulau per flavor (tampilan atas) + siluet pulau jauh di laut/horizon.
  isle_quiet: 'assets/environment/isle_quiet.png',
  isle_reef: 'assets/environment/isle_reef.png',
  isle_wreck: 'assets/environment/isle_wreck.png',
  isle_ash: 'assets/environment/isle_ash.png',
  isle_ruins: 'assets/environment/isle_ruins.png',
  isle_sea1: 'assets/environment/isle_sea1.png',
  isle_sea2: 'assets/environment/isle_sea2.png',
  ocean_bg: 'assets/environment/ocean_bg.png',
  wave_pattern: 'assets/environment/wave_pattern.png',
  land_bg: 'assets/environment/land_bg.png',

  // Resources
  fuel: 'assets/resources/fuel.png',
  wood: 'assets/resources/wood.png',
  food: 'assets/resources/food.png',
  medicine: 'assets/resources/medicine.png',

  // Art peta perkamen + dekor + pose serangan karakter
  bg_parchment: 'assets/ui/bg_parchment.png',
  compass: 'assets/ui/compass.png',
  player_atk_0: 'assets/characters/player_atk_0.png',
  player_atk_1: 'assets/characters/player_atk_1.png',

  // UI Icons
  icon_sail: 'assets/ui/icon_sail.png',
  icon_fish: 'assets/ui/icon_fish.png',
  icon_upgrade: 'assets/ui/icon_upgrade.png',
  icon_inventory: 'assets/ui/icon_inventory.png',
  icon_explore: 'assets/ui/icon_explore.png',
  icon_attack: 'assets/ui/icon_attack.png',
  icon_collect: 'assets/ui/icon_collect.png',
  icon_back: 'assets/ui/icon_back.png',
  icon_fuel: 'assets/ui/icon_fuel.png',
  icon_wood: 'assets/ui/icon_wood.png',
  icon_food: 'assets/ui/icon_food.png',
  icon_medicine: 'assets/ui/icon_medicine.png',
  icon_hp: 'assets/ui/icon_hp.png',

  // Branding
  logo: 'assets/branding/logo.png',
  appicon: 'assets/branding/appicon.png',
};

export function loadAssets() {
  const entries = Object.entries(ASSET_PATHS);
  // tambahkan frame sheet karakter ke dalam daftar muatan yang sama
  const sheetPaths = [];
  ASSETS.sheets = {};
  for (const [name, n] of Object.entries(SHEET_SPEC)) {
    ASSETS.sheets[name] = { front: [], back: [], side: [], ne: [], se: [] };
    for (const dir of SHEET_DIRS) {
      for (let f = 0; f < n; f++) {
        sheetPaths.push({ name, dir, f, src: `assets/characters/${name}_${dir}_${f}.png` });
      }
    }
  }

  const total = entries.length + sheetPaths.length;
  return new Promise((res) => {
    if (total === 0) return res(ASSETS);
    let doneCount = 0;
    const finish = () => { if (++doneCount === total) res(ASSETS); };

    for (const [key, src] of entries) {
      const img = new Image();
      img.src = src;
      img.onload = () => { ASSETS[key] = img; finish(); };
      img.onerror = () => { console.warn(`Failed to load asset: ${src}`); finish(); };
    }
    for (const sp of sheetPaths) {
      const img = new Image();
      img.src = sp.src;
      img.onload = () => { ASSETS.sheets[sp.name][sp.dir][sp.f] = img; finish(); };
      img.onerror = () => { console.warn(`Failed to load sheet frame: ${sp.src}`); finish(); };
    }
  });
}
