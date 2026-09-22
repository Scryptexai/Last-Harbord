// ============ 3D GLB Character System ============
// Menggantikan 2D photo frame sprite dengan model 3D GLB beralur animasi nyata:
//   - File GLB: character_glb_idle_box_03_run_walk_7.glb
//   - 4 Animasi tulang skeletal: idle, box_03 (serangan dayung/tinju), run, walk
//   - Kamera 3/4 isometrik top-down (~30° pitch) mencocokkan perspektif game
//   - Rotasi 360° kontinu mengikuti arah hadap pemain (p.face)
//   - Cross-fade mulus antar state animasi
//   - Fallback teruji untuk lingkungan non-WebGL / headless Node test suite

let isInitialized = false;
let isReady = false;
let offCanvas = null;
let renderer = null;
let scene = null;
let camera = null;
let mixer = null;
let characterModel = null;
let currentAction = null;
let currentActionKey = 'idle';

const actions = {
  idle: null,
  walk: null,
  run: null,
  attack: null,
};

export function isCharacter3DReady() {
  return isReady;
}

export function initCharacter3D() {
  if (isInitialized) return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!window.THREE) {
    // Tunggu bila Three.js sedang dimuat asinkron
    window.addEventListener('load', () => initCharacter3D(), { once: true });
    return;
  }

  try {
    const THREE = window.THREE;
    offCanvas = document.createElement('canvas');
    offCanvas.width = 256;
    offCanvas.height = 256;

    renderer = new THREE.WebGLRenderer({
      canvas: offCanvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(1);
    renderer.setSize(256, 256);
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();

    // Sudut kamera miring ~30° matching perspektif 2.5D Last Harbor
    camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    camera.position.set(0, 1.42, 2.12);
    camera.lookAt(0, 0.48, 0);

    // Pencahayaan atmosferik laut & karakter
    const hemi = new THREE.HemisphereLight(0xffeedd, 0x223344, 1.4);
    scene.add(hemi);

    const dirKey = new THREE.DirectionalLight(0xfff2dd, 1.8);
    dirKey.position.set(2, 4, 3);
    scene.add(dirKey);

    const dirRim = new THREE.DirectionalLight(0x77bbee, 1.1);
    dirRim.position.set(-2, 2, -2);
    scene.add(dirRim);

    // Muat GLB model
    const LoaderClass = THREE.GLTFLoader || (window.THREE && window.THREE.GLTFLoader);
    if (!LoaderClass) {
      console.warn('THREE.GLTFLoader belum tersedia, menunggu...');
      return;
    }

    const loader = new LoaderClass();
    const modelUrl = 'character_glb_idle_box_03_run_walk_7.glb';

    loader.load(
      modelUrl,
      (gltf) => {
        characterModel = gltf.scene;
        characterModel.position.set(0, 0, 0);
        characterModel.scale.set(1, 1, 1);

        characterModel.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.metalness = 0.15;
            child.material.roughness = 0.82;
            child.material.depthWrite = true;
          }
        });

        scene.add(characterModel);

        mixer = new THREE.AnimationMixer(characterModel);

        // Petakan 4 animasi bawaan model
        for (const clip of gltf.animations) {
          const name = (clip.name || '').toLowerCase();
          const action = mixer.clipAction(clip);
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

        isReady = true;
        isInitialized = true;
      },
      undefined,
      (err) => {
        console.warn('Gagal memuat GLB model karakter:', err);
      }
    );
  } catch (e) {
    console.warn('Inisialisasi 3D karakter gagal:', e);
  }
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

  // Cross-fade animasi
  if (nextKey !== currentActionKey) {
    const nextAct = actions[nextKey] || actions.idle;
    if (nextAct && nextAct !== currentAction) {
      nextAct.reset();
      nextAct.fadeIn(0.12);
      nextAct.play();
      if (currentAction) currentAction.fadeOut(0.12);
      currentAction = nextAct;
      currentActionKey = nextKey;
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
    renderer.render(scene, camera);
  }
}

export function drawCharacter3D(ctx, p, sz) {
  if (isReady && offCanvas) {
    ctx.drawImage(offCanvas, -sz * 0.58, -sz * 0.98, sz * 1.16, sz * 1.16);
    return;
  }

  // ---- PROSEDURAL GOTHIC HUNTER FALLBACK ----
  // Digunakan saat 3D GLB sedang dimuat atau pada lingkungan test (Node/headless).
  // Karakter: Jubah duster hitam-kelabu dengan keliman lebar, kerah tinggi, boot kulit gelap.
  const bob = Math.sin((p.walkT || 0)) * 2;
  const lean = (p.vx || 0) * 0.02;

  ctx.save();
  ctx.translate(lean, bob);

  // Jubah panjang / coat tails
  ctx.fillStyle = '#20242c';
  ctx.beginPath();
  ctx.moveTo(-11, -38);
  ctx.lineTo(11, -38);
  ctx.lineTo(15, -4);
  ctx.lineTo(-15, -4);
  ctx.closePath();
  ctx.fill();

  // Celana & Boot
  ctx.fillStyle = '#161920';
  ctx.fillRect(-8, -12, 6, 12);
  ctx.fillRect(2, -12, 6, 12);
  ctx.fillStyle = '#3a2c24';
  ctx.fillRect(-9, -4, 7, 5);
  ctx.fillRect(2, -4, 7, 5);

  // Rompi / Vest dalam
  ctx.fillStyle = '#383e4a';
  ctx.beginPath();
  ctx.ellipse(0, -28, 9, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sabuk & Gesper emas
  ctx.fillStyle = '#1a1d24';
  ctx.fillRect(-8, -20, 16, 3.5);
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(-2.5, -20.5, 5, 4.5);

  // Kerah jubah tinggi
  ctx.fillStyle = '#2c3340';
  ctx.beginPath();
  ctx.moveTo(-9, -38);
  ctx.lineTo(-12, -48);
  ctx.lineTo(0, -42);
  ctx.lineTo(12, -48);
  ctx.lineTo(9, -38);
  ctx.closePath();
  ctx.fill();

  // Kepala & Rambut Gothic
  ctx.fillStyle = '#e8d3b8';
  ctx.beginPath();
  ctx.arc(0, -46, 6, 0, Math.PI * 2);
  ctx.fill();

  // Rambut gelap terurai
  ctx.fillStyle = '#14171d';
  ctx.beginPath();
  ctx.arc(0, -48, 6.5, Math.PI * 0.8, Math.PI * 2.2);
  ctx.fill();

  ctx.restore();
}
