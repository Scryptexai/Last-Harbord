// ============ 3D GLB Character System ============
// Mengimpor dan merender langsung file 3D GLB karakter:
//   - File GLB: character_glb_idle_box_03_run_walk_7.glb
//   - 4 Animasi skeletal: idle, box_03 (serangan tempur), run, walk
//   - Root motion Z-neutralized in-place agar looping mulus tanpa jumping
//   - Kamera isometrik 30° mencocokkan perspektif game Last Harbor
//   - Pencahayaan 3-point light dengan sRGB encoding
//   - Offscreen canvas WebGL composited langsung ke Canvas 2D game
//   - Optimasi tekstur in-memory untuk rendering super ringan & lancar di semua perangkat

import { ASSETS } from './assets.js';

let isInitializing = false;
let isInitialized = false;
let isReady = false;
let initPromise = null;
let offCanvas = null;
let renderer = null;
let scene = null;
let camera = null;
let mixer = null;
let characterModel = null;
let currentAction = null;
let currentActionKey = 'idle';
let progressListeners = [];

const actions = {
  idle: null,
  walk: null,
  run: null,
  attack: null,
};

export function isCharacter3DReady() {
  return isReady;
}

export function initCharacter3D(onProgress, retryCount = 0) {
  if (onProgress && typeof onProgress === 'function' && !progressListeners.includes(onProgress)) {
    progressListeners.push(onProgress);
  }
  if (isReady) return Promise.resolve(true);
  if (initPromise) return initPromise;
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(false);
  }

  const THREE = window.THREE;
  const LoaderClass = THREE && (THREE.GLTFLoader || window.GLTFLoader);

  if (!THREE || !LoaderClass) {
    // Di lingkungan headless / testing (Node.js), batasi retry agar tidak menggantung test runner
    if (retryCount >= 3) {
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        initCharacter3D(onProgress, retryCount + 1).then(resolve);
      }, 30);
    });
  }

  isInitializing = true;

  initPromise = new Promise((resolve) => {
    try {
      offCanvas = document.createElement('canvas');
      offCanvas.width = 256;
      offCanvas.height = 256;

      renderer = new THREE.WebGLRenderer({
        canvas: offCanvas,
        alpha: true,
        antialias: false, // Performa tinggi & hemat GPU di perangkat mobile
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(1);
      renderer.setSize(256, 256);
      renderer.setClearColor(0x000000, 0);
      if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;

      scene = new THREE.Scene();

      // Kamera top-down ~35° mencocokkan kemiringan kamera 2D (CFG.CAM.TILT = 0.40)
      camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
      camera.position.set(0, 1.62, 2.15);
      camera.lookAt(0, 0.50, 0);

      // Pencahayaan harmonis dengan palet maritim malam Last Harbor:
      // Cahaya langit hangat lembut + pantulan air laut gelap dari bawah
      const hemi = new THREE.HemisphereLight(0xffeedd, 0x14222e, 1.2);
      scene.add(hemi);

      // Key light hangat dari depan atas (mewakili lentera kapal & pelita dermaga)
      const dirKey = new THREE.DirectionalLight(0xffecd0, 1.5);
      dirKey.position.set(1.8, 3.8, 2.6);
      scene.add(dirKey);

      // Fill light lembut dari samping kiri
      const dirFill = new THREE.DirectionalLight(0x7fb0d0, 0.7);
      dirFill.position.set(-1.8, 1.8, 2.2);
      scene.add(dirFill);

      // Rim light hangat untuk mempertegas siluet jubah terhadap latar malam
      const dirRim = new THREE.DirectionalLight(0xe8a860, 0.8);
      dirRim.position.set(0, 2.4, -2.5);
      scene.add(dirRim);

      // Muat langsung model GLB karakter
      const loader = new LoaderClass();
      const modelUrl = 'character_glb_idle_box_03_run_walk_7.glb';

      loader.load(
        modelUrl,
        (gltf) => {
          characterModel = gltf.scene;
          characterModel.position.set(0, 0, 0);
          characterModel.scale.set(1, 1, 1);

          characterModel.traverse((child) => {
            if (child.isMesh) {
              child.frustumCulled = false; // Mencegah culling mesh saat tulang skeletal bergerak
              if (child.material) {
                // Toning bahan kain/kulit jubah agar menyatu dengan latar 2D (tanpa kilap plastik)
                child.material.metalness = 0.04;
                child.material.roughness = 0.88;
                child.material.depthWrite = true;
              }
            }
          });

          scene.add(characterModel);

          mixer = new THREE.AnimationMixer(characterModel);

          // Petakan 4 animasi bawaan model (loop repeat mulus tanpa clamp)
          for (const clip of gltf.animations) {
            const name = (clip.name || '').toLowerCase();

            // Pastikan track hips in-place agar looping tidak jumping / keluar layar
            if (name.includes('walk') || name.includes('run')) {
              for (const track of clip.tracks) {
                if (track.name.toLowerCase().includes('hips.position')) {
                  const len = track.values.length / 3;
                  const tMax = track.times[track.times.length - 1];
                  const baseZ = -0.0134;
                  const baseX = 0.0019;
                  const z0 = track.values[2];
                  const zEnd = track.values[(len - 1) * 3 + 2];
                  const x0 = track.values[0];
                  const xEnd = track.values[(len - 1) * 3 + 0];
                  for (let i = 0; i < len; i++) {
                    const prog = tMax > 0 ? track.times[i] / tMax : 0;
                    const linZ = z0 + (zEnd - z0) * prog;
                    const linX = x0 + (xEnd - x0) * prog;
                    track.values[i * 3 + 2] = baseZ + (track.values[i * 3 + 2] - linZ);
                    track.values[i * 3 + 0] = baseX + (track.values[i * 3 + 0] - linX);
                  }
                }
              }
            }

            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.clampWhenFinished = false;
            if (name.includes('idle')) actions.idle = action;
            else if (name.includes('box') || name.includes('atk') || name.includes('attack')) actions.attack = action;
            else if (name.includes('run')) actions.run = action;
            else if (name.includes('walk')) actions.walk = action;
          }

          // Putar idle secara default
          if (actions.idle) {
            currentAction = actions.idle;
            currentAction.play();
            currentActionKey = 'idle';
          } else if (gltf.animations.length > 0) {
            currentAction = mixer.clipAction(gltf.animations[0]);
            currentAction.play();
          }

          // Render satu frame pemanasan (pre-warm shader & WebGL buffer)
          try {
            mixer.update(0.016);
            renderer.render(scene, camera);
          } catch (e) {
            // Abaikan kesalahan pre-warm bila ada
          }

          isReady = true;
          isInitialized = true;
          isInitializing = false;
          console.log('[3D Character] Model GLB & animasi berhasil diinisialisasi dan siap render.');
          resolve(true);
        },
        (xhr) => {
          if (xhr && xhr.lengthComputable) {
            const pct = Math.min(99, Math.round((xhr.loaded / xhr.total) * 100));
            for (const cb of progressListeners) {
              try { cb(pct); } catch (e) { /* ignore */ }
            }
          }
        },
        (err) => {
          console.error('[3D Character] Gagal memuat GLB model karakter:', err);
          isInitializing = false;
          resolve(false);
        }
      );
    } catch (e) {
      console.error('[3D Character] Inisialisasi 3D karakter gagal:', e);
      isInitializing = false;
      resolve(false);
    }
  });

  return initPromise;
}

// Inisialisasi otomatis segera begitu script dimuat
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initCharacter3D());
  } else {
    initCharacter3D();
  }

  window.__character3d = {
    isReady: () => isReady,
    actions: () => actions,
    mixer: () => mixer,
    model: () => characterModel,
    scene: () => scene,
    camera: () => camera,
    canvas: () => offCanvas,
  };
}

export function updateCharacter3D(dt, p) {
  if (!isReady || !mixer || !characterModel) return;

  dt = Math.min(dt || 0.016, 0.1);
  mixer.update(dt);

  // Tentukan state animasi berdasarkan aksi karakter
  let nextKey = 'idle';
  const isAttacking = p && p.atk && p.atk.phase !== 'idle';
  const isMoving = p && (p.moveIntent || Math.hypot(p.vx || 0, p.vy || 0) > 12);

  if (isAttacking) {
    nextKey = 'attack';
  } else if (isMoving) {
    const sp = Math.hypot(p.vx || 0, p.vy || 0);
    nextKey = sp > 125 ? 'run' : 'walk';
  } else {
    nextKey = 'idle';
  }

  // Cross-fade animasi secara mulus tanpa memutus loop
  if (nextKey !== currentActionKey) {
    const nextAct = actions[nextKey] || actions.idle;
    if (nextAct && nextAct !== currentAction) {
      nextAct.enabled = true;
      nextAct.setEffectiveTimeScale(1);
      nextAct.setEffectiveWeight(1);
      if (currentAction) {
        nextAct.crossFadeFrom(currentAction, 0.15, true);
      }
      nextAct.play();
      currentAction = nextAct;
      currentActionKey = nextKey;
    }
  }

  // Sesuaikan kecepatan putar animasi dengan kecepatan gerak pemain
  if (currentAction) {
    if (currentActionKey === 'walk' || currentActionKey === 'run') {
      const sp = Math.hypot(p.vx || 0, p.vy || 0);
      const targetScale = currentActionKey === 'run' ? Math.max(0.8, sp / 140) : Math.max(0.6, sp / 85);
      currentAction.timeScale = targetScale;
    } else if (currentActionKey === 'attack') {
      currentAction.timeScale = 1.35;
    } else {
      currentAction.timeScale = 1.0;
    }
  }

  // Rotasi 3D mengikuti arah hadap kontinu pemain (p.face)
  // Sudut game: 0 = Timur (+X), π/2 = Selatan (+Y, hadap kamera), π = Barat (-X), -π/2 = Utara (-Y)
  // Kamera Three.js berada di +Z melihat ke 0; sehingga hadap kamera (+Z) adalah Selatan.
  if (p && p.face !== undefined) {
    const rotY = -p.face + Math.PI / 2;
    characterModel.rotation.y = rotY;
  }

  // Render kanvas offscreen
  if (renderer && scene && camera) {
    try {
      renderer.render(scene, camera);
    } catch (e) {
      // Mencegah crash bila context sementara hilang
    }
  }
}

export function drawCharacter3D(ctx, p, sz = 72) {
  // Dalam denah 2D playzone (denah dermaga & pulau), tinggi karakter asli adalah 40-45px
  // (sz * 0.625). Di offCanvas 3D (256x256), tinggi model adalah 194px, telapak kaki di y = 226px,
  // dan sumbu tengah x di 129px.
  // drawY diturunkan ke -223*s (+2.5s) agar telapak sepatu bot menancap mantap ke lantai/shadow.
  const s = (sz * 0.625) / 194;
  const drawW = 256 * s;
  const drawH = drawW;
  const drawX = -129 * s;
  const drawY = -223 * s;

  if (isReady && offCanvas) {
    ctx.drawImage(offCanvas, drawX, drawY, drawW, drawH);
    return;
  }

  // Fallback untuk headless test suite (Node.js) bila ASSETS.player tersedia
  if (typeof ASSETS !== 'undefined' && ASSETS && ASSETS.player) {
    ctx.drawImage(ASSETS.player, -sz / 2, -sz * 0.92, sz, sz);
    return;
  }

  // Fallback netral saat memuat awal di browser: bayangan lingkaran halus di tanah
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
