# LAST HARBOR — VISUAL SPECIFICATION (binding)

**Phase ref:** Directive Phases 1–4, 7–15 · **Date:** 2026-09-23 · **Status:** LOCKED for vertical slice
**Companion files:** `spec/world_scale.json` (machine-readable), `BENCHMARK_STUDY.md` (principles),
`WORLD_PLAN.md` (zones), `audit/SCALE_AUDIT_2026-09-23.md` (measured baseline).
**Enforcement:** `python3 tools/validate_world_spec.py` must reach 0 FAIL before Visual QA gate.

---

## §1 VISUAL IDENTITY (Phase 1)

> POST-APOCALYPTIC ISLAND SURVIVAL · STYLIZED-REALISTIC 3D · CHIBI CHARACTER · BELIEVABLE ENVIRONMENT · MOBILE-FIRST THIRD PERSON

The intentional contrast is the product identity:

| Layer | Language | Locked? |
|---|---|---|
| Character | stylized, chibi (~3 heads), readable silhouette, expressive animation | **LOCKED — no redesign. Uniform scale only.** |
| World | realistic proportions, detailed PBR materials, natural terrain, believable handmade structures | binding spec below |
| UI | subordinate, diegetic-leaning, <12% screen area | `GAMEPLAY_SPEC.md` |

Anti-goals: photorealism; Roblox/low-poly primitivism; "texture-on-a-box" pseudo-realism.
Realism = SCALE + SHAPE + MATERIAL + LIGHT + TERRAIN + DENSITY + VARIATION + COMPOSITION +
ENVIRONMENTAL STORYTELLING (all nine, together — Directive FINAL RULE).

## §2 CAMERA (Phase 2)

Perspective `Camera3D`, third-person 3/4. **Forbidden:** orthographic, top-down RTS, fixed isometric.

| Parameter | Value | Rationale |
|---|---|---|
| Vertical FOV | 42° (range 38–48) | mobile landscape 16:9 → ~66° horizontal; no fish-eye |
| Pitch down | 40° default (35–50) | shows ground lanes + horizon line simultaneously |
| Yaw | 18° offset, auto-aligns to travel heading (damped), manual drag override | 3/4 depth read |
| Distance default | 14.5 m (13–17) | player = 13.4% screen height (see formula) |
| Distance explore | 16.0 m (15–18) | 12.2% — navigation read |
| Distance combat | 10.5 m (9–12) | 18.6% — combat exception, allowed >14% |
| Screen ratio target | player 8–14% of screen height (exploration) | benchmark window (Study §5.2) |
| Follow damping | 8.0/s position (6–10), 4.5/s rotation (3.5–6) | smooth, no swim |
| Look-ahead | +1.5 m along heading; player sits ~58% screen height | path visibility on mobile |
| Collision | spring-arm raycast, min distance 3.0 m, push-out from foliage | never inside geometry |
| Zoom | pinch, clamped [10.5, 18] m, damped 6/s | controlled |

Screen-height formula (validator uses it): `ratio = char_h / (2 · d · tan(fov/2))`, char_h = 1.5 m.
Current build measures 9.5 m → 19.5% (**FAIL**, audit #131): the diorama feeling starts here.

## §3 WORLD SCALE (Phase 3)

Master reference: FINAL CHARACTER GLB (authored 0.98 m) × **import scale 1.53** = **1.50 m** in game.
Collision capsule 1.6 m stays (0.1 m head margin). Full table in `spec/world_scale.json`.

| Object | Spec (m) | Measured today | Verdict |
|---|---|---|---|
| Character (game height) | 1.44–1.56 | 0.98 (scale 1.0 in Player.tscn) | **FIX scale → 1.53** |
| Door | 1.95–2.10 h × 0.90–1.05 w | cabin door ~1.7 h | FIX in cabin rebuild |
| House ridge | 3.0–4.6 | survivor_cabin 4.22 | OK |
| House footprint | 3.5–7.0 | 5.06 × 6.18 | OK |
| fishing_hut ridge | 3.0–4.6 | 3.06 | OK but 0 textures → FIX |
| storage_shed ridge | 3.0–4.6 | 2.74 | FIX (+0.3 m) |
| Palm | 6.0–9.5 | 7.90 | OK |
| Tropical tree | 5.0–9.0 | 7.60 | OK |
| Dead tree | 3.5–6.5 | (see audit) | check |
| Bush | 0.7–1.8 | 1.91, pivot −0.27 | FIX scale/pivot |
| Grass clump | 0.25–0.7 above ground | 0.12 tall, buried at −0.23 | **REBUILD** (flat sunken patch) |
| Small plants | 0.15–0.6 | 0.07 at −0.19 | **REBUILD** |
| Fallen branch | 0.1–0.9 | 2.91 at −2.45 | **REBUILD pivot+scale** |
| Rock S/M/L | 0.3–0.9 / 0.8–1.9 / 1.9–3.6 | L=3.54 | OK sizes; **0 textures → FIX** |
| Boat | 4.2–6.0 LOA, 1.6–2.4 beam | 4.84 × 1.90 | OK |
| Dock | 9–16 long, 2.2–3.4 wide, deck 0.7–1.3 | 11.2 × 3.15, deck 0.63 | OK (deck +0.1) |
| Barrel | 0.85–1.10 h | 1.40, pivot −0.23 | **FIX** (mini-giant tell) |
| Crate | 0.5–1.0 | 0.85 | OK; 0 textures → FIX |
| Path main / branch | 2.4–3.0 / 1.4–1.8 | CSG 3.8 wide | FIX in terrain pass |
| Beach width | 8–14 | ~10 (CSG) | rebuild in terrain |
| Island sector | Safe 128×128, Danger-1 96×96 | 48×48 prototype terrain | **EXPAND** |

Rule: no miniature-looking objects, no giants, no random per-node scale. Placement scale jitter is
allowed only inside ±12% and only on vegetation/rocks (see §5).

## §4 TERRAIN (Phase 4)

**No flat planes, no CSG terrain in production scenes.** Workflow (Compatibility-safe by design;
Terrain3D addon is excluded because its shader is not fully supported on the Compatibility/Web
renderer — see Study/§13 note and [Terrain3D mobile/web docs](https://terrain3d.readthedocs.io/en/0.9.2/docs/mobile_web.html)):

1. **Heightmap authoring offline** (Python/NumPy in `tools/build_terrain_mesh.py`, extended):
   fBm base + ridge noise for hills + radial falloff to sea; carved path splines; beach shelf.
2. **Export GLB grid mesh** (1 m resolution: Safe 129×129 verts ≈ 32k tris; Danger-1 97×97 ≈ 18k tris)
   with **vertex colors = splat weights** (R sand, G grass, B dirt, A rock/forest floor).
3. **Splat shader** (`terrain_splat.gdshader`, GLSL ES 3.0-safe): 4 tiling texture sets blended by
   vertex color + slope mask (rock on >35° slope), height band for wet sand, distance texel-fade to
   avoid moiré. No Texture2DArrays (Compatibility limit), no decals (unsupported).
4. **Collision**: StaticBody3D from the same mesh (concave) — single body, no CSG unions.

Required transition chain, implemented as height bands in the shader:
`DEEP WATER → SHALLOW WATER → WET SAND → DRY SAND → GRASS → DIRT → FOREST FLOOR`
with 0.4–0.8 m soft blend widths and a foam line at the water contact band (§10).

Ecological zones drive both shader masks and vegetation scatter (§5): beach / meadow / forest /
rocky crest / wetland pocket (Danger: + ruins floor / ash patch).

## §5 VEGETATION SYSTEM (Phase 7)

Library target = 10 categories × 2–3 variants = **26 assets** (today: 7 assets, 3 of them broken).

| Category | Variants | Ecological zone | Density (stems/m²) |
|---|---|---|---|
| PALM | 3 | beach edge, village fringe | 0.010 cluster-biased |
| TROPICAL TREE | 3 | forest | 0.030 |
| DEAD TREE | 2 | danger island, forest edge | 0.006 |
| BUSH | 3 | forest edge, meadow border | 0.020 |
| GRASS | 3 | meadow, dune | 0.35 (instanced tufts) |
| SMALL PLANTS | 3 | garden, forest floor | 0.15 |
| FERNS | 2 | forest shade | 0.12 |
| VINES | 2 | forest trunks, ruins (danger) | attach |
| FALLEN BRANCH | 2 | forest floor, beach (as driftwood kin) | 0.004 |
| DRIFTWOOD | 2 | beach high-tide line | 0.003 |

Variation contract (validator + authoring checklist): scale ±12%, full-random yaw, tilt ≤4°,
per-instance hue/value jitter ±6% via MultiMesh custom data, clustering via Poisson-disc with
cluster seeds (never grid, never single-asset repeats in view). Grass/ferns/small plants render
through **MultiMeshInstance3D** (one draw call per category per island). Trees: MultiMesh for
LOD1, real nodes only within 40 m of player if interaction needed.

## §6 ASSET QUALITY BAR (Phase 8)

Final assets = GLB/glTF with mesh + materials + textures + normals + roughness (+ metallic where
applicable), correct scale and ground pivot (y=0 at contact point).

- Texture maps per hero asset: BaseColor, Normal, Roughness (packed ORM), AO baked into BaseColor alpha or vertex color. 1024² hero / 512² props, ETC2/ASTC on import.
- Triangle budgets per category in `spec/world_scale.json` (e.g. cabin ≤3.5k, palm ≤4k, prop ≤0.9k).
- **Zero-texture assets are FAILs** (audit): rocks, barrel, crate, bush, grass, small plants, fallen branch, fishing_hut, storage_shed → texture pass or rebuild.
- Primitive geometry (CSG*) is authoring scratch only; production scenes instance GLB/terrain only.
- Shape language: hand-made improvisation (uneven planks, patched roofs, rope lashings) — believability comes from asymmetry, not poly count.

## §7 MATERIAL SYSTEM (Phase 9)

PBR language, one family table, no flat single-color materials anywhere:

| Family | BaseColor character | Roughness | Extra |
|---|---|---|---|
| WOOD weathered | gray-brown grain, silvered edges, scratches | 0.75–0.92 | normal grain + plank seams |
| STONE | irregular mottling, lichen hints | 0.85–0.95 | strong normal detail |
| SAND dry/wet | fine matte pale gold | 0.95 dry / 0.35 wet | wetness band by height |
| METAL rust | rust blooms over dull steel | 0.4–0.85 variable | metallic 0.6–0.9 on bare spots |
| VEGETATION | hue-varied greens, dry tips | 0.6–0.8 | alpha-tested or double-sided cards |
| WATER | depth-graded teal→navy | 0.05–0.2 | §10 system |
| FABRIC (sails, clothes) | faded dye, patches | 0.8–0.95 | slight translucency fake via rim |

Texel density target: ~512 px/m hero, ~256 px/m props, consistent across sets (Study §5.10).
Grime/unification pass: shared 1024² "grime overlay" multiplied in shader on props & structures.

## §8 LIGHTING (Phase 10)

Two authored Environment presets (`SafeIslandEnv.tres`, `DangerIslandEnv.tres`), values:

| Param | Safe Island | Danger Island |
|---|---|---|
| Sun color / energy | (1.00, 0.95, 0.86) / 1.6 | (1.00, 0.82, 0.66) / 1.2 |
| Sun elevation / azimuth | 40° / from sea (S) | 26° / raking cross-light |
| Ambient (sky contrib) | cool (0.66,0.73,0.82) ×0.6 | desat (0.55,0.58,0.60) ×0.5 |
| Tonemap | Filmic, exposure 1.05 | Filmic, exposure 0.98 |
| Fog | depth, density 0.006, sea-haze blue | depth+height, density 0.016, gray-green |
| Glow | 0.35 (lanterns, fire) | 0.25 |
| Shadows | directional 2048, bias 0.03, 2 splits | same + tighter range for contrast |

Rules: one shadow-casting sun + ≤3 dynamic omni (lantern/campfire/boat lamp); AO faked via baked
vertex AO + contact-shadow decal-cards under props (Compatibility has no SSAO); **no flat white
light, no overexposure** — QA rubric checks histogram clipping.

## §9 WORLD COMPOSITION (Phase 11)

Every camera position must resolve three depth layers:
FOREGROUND (0–6 m: grass tufts, rocks, props, player) · MIDGROUND (6–30 m: houses, NPCs, paths,
dock, vegetation clusters) · BACKGROUND (30 m+: forest wall, hill, cliff, ocean, sky).
Authoring rule: no view cone >25° of screen may be empty single-material surface. Landmark per zone
(`WORLD_PLAN.md` Zone K) guarantees background interest from every village point.

## §10 WATER (Phase 12)

Compatibility-safe two-layer system (`water_ocean.gdshader` + `WaterSurface` mesh):

1. **Body**: opaque sea disc/box-top with depth gradient by world-Y vs seabed height:
   shallow #2E8F96 → mid #14606E → deep #0B3D4A; specular from sun; sky contribution for reflection fake (no SSR on Compatibility).
2. **Surface**: transparent scrolling dual-normal wave layer (2 tiled normal maps, UV drift 0.6/0.35 m/s) + vertex Gerstner-lite (2 waves, amp 0.06–0.12 m, λ 6–11 m).
3. **Shore**: foam band where terrain height ∈ [waterline−0.05, +0.25] modulated by noise; wet-sand darkening band to +0.6 m (shader height band, not decals).
4. Motion states: calm / changed / tide (tie into existing tide design from README) via uniform scalars.

## §11 DOCK (Phase 13)

Spatial chain, authored and walkable: VILLAGE → PATH → BEACH → DOCK → BOAT → OCEAN.
Dock kit (GLB, ≤3k tris, 2×1024 textures): planks with gap+height jitter, support beams + diagonal
braces, pilings with waterline algae band, rope coils & cleats, crate+barrel+net clutter set,
lantern post (one of the 3 allowed omni), weathering gradient stronger toward sea end.
Deck 0.9–1.1 m above waterline; boat gunwale 0.3–0.5 m below deck (step-down read).

## §12 MOBILE TECHNICAL TARGET (Phase 14)

Budget per scene (validator + profiler gate): ≤120 draw calls, ≤150k visible tris, ≤4 dynamic lights
(≤2 shadow-casting), ≤80 MB compressed texture VRAM, 30 fps mid-range (SD 6-gen class) at 720–1080p.
Tools: MultiMesh instancing (vegetation), 2 LODs per tree/rock (LOD0 <25 m, LOD1 25–60 m, cull >90 m),
distance + region culling per island zone, 512² props / 1024² hero textures, CPUParticles3D ≤64/emitter,
shadow map 2048, no post beyond tonemap+glow+adjustments. **Optimize implementation, never art direction.**

## §13 GODOT RENDERER STRATEGY (Phase 15)

Targets: Android native (Mobile renderer on new hw, Compatibility fallback) + Web (Compatibility).
**Design floor = Compatibility.** Forbidden everywhere (unsupported on floor): SSR, SSAO/SSIL, SDFGI,
VoxelGI, volumetric fog, decals, DoF, VRS, GPU-particles-only effects, Texture2DArray splatting
([Godot renderer matrix](https://docs.godotengine.org/en/4.4/tutorials/rendering/renderers.html)).
Allowed and used: directional+omni shadows, depth/height fog, tonemapping, glow, adjustments,
reflection probes (≤2/mesh), LightmapGI rendering (bake on desktop), vertex-color blending, MultiMesh.
Test matrix per visual change: desktop editor (Compatibility) + Web export (Chrome) + Android device;
screenshot triplets filed in `docs/design/audit/`.

## §14 FAILURE TAXONOMY (from audit 2026-09-23, 53 FAIL)

| Group | FAILs | Fix |
|---|---|---|
| G1 Production scenes on CSG primitives + flat water | 6 | terrain pipeline §4 + water §10 rebuild of SafeIsland/ZombieIsland |
| G2 Character scale 0.98 in scene | 2 | import scale 1.53 (§3) |
| G3 Camera distances too close (19.5% screen) | 3 | §2 values |
| G4 Texture-less assets | 18 | texture pass §6/§7 |
| G5 Broken vegetation (buried/flat/mis-pivoted) | 12 | rebuild §5 |
| G6 Scale outliers (barrel 1.4 m, shed 2.74 m, bush 1.91 m) | 6 | rescale §3 |
| G7 Camera collision avoidance missing | WARN | spring-arm §2 |

Gate: `validate_world_spec.py --strict` exits 0 before Visual QA (Phase 21) may be run.
