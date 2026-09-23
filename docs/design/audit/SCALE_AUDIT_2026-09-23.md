# SCALE & SPEC AUDIT — 2026-09-23

Automated audit of the repository against the locked specification
(`docs/design/spec/world_scale.json`), produced by `tools/validate_world_spec.py --markdown`.

Reproduce with:

```bash
python3 tools/validate_world_spec.py --markdown
```

This audit is the evidence base for the design-validation phase: it measures the
current build (commit `3569f87`) instead of assuming its state. FAIL rows are the
work backlog for the vertical-slice implementation phase; they are grouped in
§"Failure taxonomy" of `docs/design/VISUAL_SPEC.md`.

| # | Section | Check | Result | Measured | Spec |
|---|---------|-------|--------|----------|------|
| 1 | assets | assets/character.glb | **WARN** | no spec category | category assigned |
| 2 | assets/character | assets/characters/character.glb game height (authored 0.98 x scene scale 1.00) | **FAIL** | 0.98 m | 1.4-1.6 m |
| 3 | assets/character | assets/characters/character_glb_idle_box_03_run_walk_7.glb game height (authored 0.98 x scene scale 1.00) | **FAIL** | 0.98 m | 1.4-1.6 m |
| 4 | assets/scale | assets/models/architecture/fishing_hut.glb height | **PASS** | 3.06 m | 3.0-4.6 m |
| 5 | assets/origin | assets/models/architecture/fishing_hut.glb pivot ymin | **PASS** | -0.00 m | -0.1..0.1 m |
| 6 | assets/quality | assets/models/architecture/fishing_hut.glb textures | **FAIL** | 0 images | >= 3 |
| 7 | assets/quality | assets/models/architecture/fishing_hut.glb triangles | **PASS** | 168 | <= 3500 |
| 8 | assets/scale | assets/models/architecture/storage_shed.glb height | **FAIL** | 2.74 m | 3.0-4.6 m |
| 9 | assets/origin | assets/models/architecture/storage_shed.glb pivot ymin | **PASS** | 0.00 m | -0.1..0.1 m |
| 10 | assets/quality | assets/models/architecture/storage_shed.glb textures | **FAIL** | 0 images | >= 3 |
| 11 | assets/quality | assets/models/architecture/storage_shed.glb triangles | **PASS** | 60 | <= 3500 |
| 12 | assets/scale | assets/models/architecture/survivor_cabin.glb height | **PASS** | 4.22 m | 3.0-4.6 m |
| 13 | assets/origin | assets/models/architecture/survivor_cabin.glb pivot ymin | **PASS** | 0.01 m | -0.1..0.1 m |
| 14 | assets/quality | assets/models/architecture/survivor_cabin.glb textures | **PASS** | 6 images | >= 3 |
| 15 | assets/quality | assets/models/architecture/survivor_cabin.glb triangles | **PASS** | 972 | <= 3500 |
| 16 | assets | assets/models/architecture/test_dock.glb | **WARN** | no spec category | category assigned |
| 17 | assets/scale | assets/models/architecture/wooden_dock.glb height | **PASS** | 1.11 m | 0.7-1.6 m |
| 18 | assets/origin | assets/models/architecture/wooden_dock.glb pivot ymin | **PASS** | -0.48 m | -1.2..0.1 m |
| 19 | assets/quality | assets/models/architecture/wooden_dock.glb textures | **PASS** | 2 images | >= 1 |
| 20 | assets/quality | assets/models/architecture/wooden_dock.glb triangles | **PASS** | 1748 | <= 3000 |
| 21 | assets/scale | assets/models/boats/survivor_boat.glb height | **PASS** | 1.05 m | 0.9-1.6 m |
| 22 | assets/origin | assets/models/boats/survivor_boat.glb pivot ymin | **PASS** | -0.60 m | -0.8..0.1 m |
| 23 | assets/quality | assets/models/boats/survivor_boat.glb textures | **PASS** | 2 images | >= 1 |
| 24 | assets/quality | assets/models/boats/survivor_boat.glb triangles | **PASS** | 944 | <= 3000 |
| 25 | assets/scale | assets/models/props/barrel.glb height | **FAIL** | 1.40 m | 0.85-1.1 m |
| 26 | assets/origin | assets/models/props/barrel.glb pivot ymin | **FAIL** | -0.23 m | -0.1..0.05 m |
| 27 | assets/quality | assets/models/props/barrel.glb textures | **FAIL** | 0 images | >= 1 |
| 28 | assets/quality | assets/models/props/barrel.glb triangles | **PASS** | 432 | <= 700 |
| 29 | assets/scale | assets/models/props/campfire.glb height | **PASS** | 0.90 m | 0.1-1.8 m |
| 30 | assets/origin | assets/models/props/campfire.glb pivot ymin | **FAIL** | -0.42 m | -0.3..0.1 m |
| 31 | assets/quality | assets/models/props/campfire.glb textures | **FAIL** | 0 images | >= 1 |
| 32 | assets/quality | assets/models/props/campfire.glb triangles | **FAIL** | 928 | <= 900 |
| 33 | assets/scale | assets/models/props/debris.glb height | **PASS** | 0.48 m | 0.1-1.8 m |
| 34 | assets/origin | assets/models/props/debris.glb pivot ymin | **FAIL** | -0.30 m | -0.3..0.1 m |
| 35 | assets/quality | assets/models/props/debris.glb textures | **FAIL** | 0 images | >= 1 |
| 36 | assets/quality | assets/models/props/debris.glb triangles | **PASS** | 80 | <= 900 |
| 37 | assets/scale | assets/models/props/fishing_net.glb height | **PASS** | 0.48 m | 0.1-1.8 m |
| 38 | assets/origin | assets/models/props/fishing_net.glb pivot ymin | **FAIL** | 0.56 m | -0.3..0.1 m |
| 39 | assets/quality | assets/models/props/fishing_net.glb textures | **FAIL** | 0 images | >= 1 |
| 40 | assets/quality | assets/models/props/fishing_net.glb triangles | **PASS** | 320 | <= 900 |
| 41 | assets/scale | assets/models/props/fuel_container.glb height | **PASS** | 0.61 m | 0.1-1.8 m |
| 42 | assets/origin | assets/models/props/fuel_container.glb pivot ymin | **PASS** | 0.00 m | -0.3..0.1 m |
| 43 | assets/quality | assets/models/props/fuel_container.glb textures | **FAIL** | 0 images | >= 1 |
| 44 | assets/quality | assets/models/props/fuel_container.glb triangles | **PASS** | 24 | <= 900 |
| 45 | assets/scale | assets/models/props/lantern.glb height | **PASS** | 0.67 m | 0.1-1.8 m |
| 46 | assets/origin | assets/models/props/lantern.glb pivot ymin | **PASS** | -0.06 m | -0.3..0.1 m |
| 47 | assets/quality | assets/models/props/lantern.glb textures | **FAIL** | 0 images | >= 1 |
| 48 | assets/quality | assets/models/props/lantern.glb triangles | **PASS** | 160 | <= 900 |
| 49 | assets/scale | assets/models/props/rope.glb height | **PASS** | 0.73 m | 0.1-1.8 m |
| 50 | assets/origin | assets/models/props/rope.glb pivot ymin | **PASS** | -0.27 m | -0.3..0.1 m |
| 51 | assets/quality | assets/models/props/rope.glb textures | **FAIL** | 0 images | >= 1 |
| 52 | assets/quality | assets/models/props/rope.glb triangles | **PASS** | 504 | <= 900 |
| 53 | assets/scale | assets/models/props/scrap_metal.glb height | **PASS** | 1.76 m | 0.1-1.8 m |
| 54 | assets/origin | assets/models/props/scrap_metal.glb pivot ymin | **FAIL** | -1.34 m | -0.3..0.1 m |
| 55 | assets/quality | assets/models/props/scrap_metal.glb textures | **FAIL** | 0 images | >= 1 |
| 56 | assets/quality | assets/models/props/scrap_metal.glb triangles | **PASS** | 36 | <= 900 |
| 57 | assets/scale | assets/models/props/toolbox.glb height | **PASS** | 0.33 m | 0.1-1.8 m |
| 58 | assets/origin | assets/models/props/toolbox.glb pivot ymin | **PASS** | 0.00 m | -0.3..0.1 m |
| 59 | assets/quality | assets/models/props/toolbox.glb textures | **FAIL** | 0 images | >= 1 |
| 60 | assets/quality | assets/models/props/toolbox.glb triangles | **PASS** | 24 | <= 900 |
| 61 | assets/scale | assets/models/props/water_container.glb height | **PASS** | 0.76 m | 0.1-1.8 m |
| 62 | assets/origin | assets/models/props/water_container.glb pivot ymin | **FAIL** | 0.11 m | -0.3..0.1 m |
| 63 | assets/quality | assets/models/props/water_container.glb textures | **FAIL** | 0 images | >= 1 |
| 64 | assets/quality | assets/models/props/water_container.glb triangles | **PASS** | 72 | <= 900 |
| 65 | assets/scale | assets/models/props/wooden_crate.glb height | **PASS** | 0.85 m | 0.5-1.0 m |
| 66 | assets/origin | assets/models/props/wooden_crate.glb pivot ymin | **PASS** | 0.00 m | -0.05..0.05 m |
| 67 | assets/quality | assets/models/props/wooden_crate.glb textures | **FAIL** | 0 images | >= 1 |
| 68 | assets/quality | assets/models/props/wooden_crate.glb triangles | **PASS** | 60 | <= 700 |
| 69 | assets/scale | assets/models/props/wooden_plank.glb height | **FAIL** | 0.06 m | 0.1-1.8 m |
| 70 | assets/origin | assets/models/props/wooden_plank.glb pivot ymin | **PASS** | 0.00 m | -0.3..0.1 m |
| 71 | assets/quality | assets/models/props/wooden_plank.glb textures | **FAIL** | 0 images | >= 1 |
| 72 | assets/quality | assets/models/props/wooden_plank.glb triangles | **PASS** | 12 | <= 900 |
| 73 | assets/scale | assets/models/rocks/cliff_rock.glb height | **FAIL** | 2.02 m | 3.5-9.0 m |
| 74 | assets/origin | assets/models/rocks/cliff_rock.glb pivot ymin | **PASS** | -0.60 m | -1.0..0.1 m |
| 75 | assets/quality | assets/models/rocks/cliff_rock.glb textures | **PASS** | 2 images | >= 1 |
| 76 | assets/quality | assets/models/rocks/cliff_rock.glb triangles | **PASS** | 1280 | <= 4000 |
| 77 | assets/scale | assets/models/rocks/rock_large.glb height | **PASS** | 3.54 m | 1.9-3.6 m |
| 78 | assets/origin | assets/models/rocks/rock_large.glb pivot ymin | **PASS** | -0.34 m | -0.4..0.1 m |
| 79 | assets/quality | assets/models/rocks/rock_large.glb textures | **FAIL** | 0 images | >= 1 |
| 80 | assets/quality | assets/models/rocks/rock_large.glb triangles | **PASS** | 1280 | <= 2500 |
| 81 | assets/scale | assets/models/rocks/rock_medium.glb height | **PASS** | 1.87 m | 0.8-1.9 m |
| 82 | assets/origin | assets/models/rocks/rock_medium.glb pivot ymin | **PASS** | -0.07 m | -0.4..0.1 m |
| 83 | assets/quality | assets/models/rocks/rock_medium.glb textures | **FAIL** | 0 images | >= 1 |
| 84 | assets/quality | assets/models/rocks/rock_medium.glb triangles | **PASS** | 320 | <= 1500 |
| 85 | assets/scale | assets/models/rocks/rock_small.glb height | **PASS** | 0.68 m | 0.3-0.9 m |
| 86 | assets/origin | assets/models/rocks/rock_small.glb pivot ymin | **FAIL** | 0.18 m | -0.4..0.1 m |
| 87 | assets/quality | assets/models/rocks/rock_small.glb textures | **FAIL** | 0 images | >= 1 |
| 88 | assets/quality | assets/models/rocks/rock_small.glb triangles | **PASS** | 320 | <= 800 |
| 89 | assets/scale | assets/models/terrain/pipeline_terrain.glb height | **PASS** | 8.61 m | 5.0-14.0 m |
| 90 | assets/origin | assets/models/terrain/pipeline_terrain.glb pivot ymin | **PASS** | -3.40 m | -6.0..0.1 m |
| 91 | assets/quality | assets/models/terrain/pipeline_terrain.glb textures | **PASS** | 4 images | >= 2 |
| 92 | assets/quality | assets/models/terrain/pipeline_terrain.glb triangles | **PASS** | 12482 | <= 40000 |
| 93 | assets/scale | assets/models/vegetation/coconut_palm.glb height | **PASS** | 7.90 m | 6.0-9.5 m |
| 94 | assets/origin | assets/models/vegetation/coconut_palm.glb pivot ymin | **PASS** | 0.00 m | -0.1..0.1 m |
| 95 | assets/quality | assets/models/vegetation/coconut_palm.glb textures | **PASS** | 4 images | >= 2 |
| 96 | assets/quality | assets/models/vegetation/coconut_palm.glb triangles | **PASS** | 1428 | <= 4000 |
| 97 | assets/scale | assets/models/vegetation/dead_tree.glb height | **PASS** | 4.51 m | 3.5-6.5 m |
| 98 | assets/origin | assets/models/vegetation/dead_tree.glb pivot ymin | **PASS** | -0.06 m | -0.1..0.1 m |
| 99 | assets/quality | assets/models/vegetation/dead_tree.glb textures | **FAIL** | 0 images | >= 1 |
| 100 | assets/quality | assets/models/vegetation/dead_tree.glb triangles | **PASS** | 104 | <= 3000 |
| 101 | assets/scale | assets/models/vegetation/fallen_branch.glb height | **FAIL** | 2.91 m | 0.1-0.9 m |
| 102 | assets/origin | assets/models/vegetation/fallen_branch.glb pivot ymin | **FAIL** | -2.45 m | -0.1..0.15 m |
| 103 | assets/quality | assets/models/vegetation/fallen_branch.glb textures | **FAIL** | 0 images | >= 1 |
| 104 | assets/quality | assets/models/vegetation/fallen_branch.glb triangles | **PASS** | 56 | <= 500 |
| 105 | assets/scale | assets/models/vegetation/small_plants.glb height | **FAIL** | 0.07 m | 0.15-0.6 m |
| 106 | assets/origin | assets/models/vegetation/small_plants.glb pivot ymin | **FAIL** | -0.19 m | -0.05..0.05 m |
| 107 | assets/quality | assets/models/vegetation/small_plants.glb textures | **FAIL** | 0 images | >= 1 |
| 108 | assets/quality | assets/models/vegetation/small_plants.glb triangles | **PASS** | 64 | <= 600 |
| 109 | assets/scale | assets/models/vegetation/tall_grass.glb height | **FAIL** | 0.12 m | 0.25-0.7 m |
| 110 | assets/origin | assets/models/vegetation/tall_grass.glb pivot ymin | **FAIL** | -0.23 m | -0.05..0.05 m |
| 111 | assets/quality | assets/models/vegetation/tall_grass.glb textures | **FAIL** | 0 images | >= 1 |
| 112 | assets/quality | assets/models/vegetation/tall_grass.glb triangles | **PASS** | 112 | <= 400 |
| 113 | assets/scale | assets/models/vegetation/tropical_bush.glb height | **FAIL** | 1.91 m | 0.7-1.8 m |
| 114 | assets/origin | assets/models/vegetation/tropical_bush.glb pivot ymin | **FAIL** | -0.27 m | -0.1..0.1 m |
| 115 | assets/quality | assets/models/vegetation/tropical_bush.glb textures | **FAIL** | 0 images | >= 1 |
| 116 | assets/quality | assets/models/vegetation/tropical_bush.glb triangles | **PASS** | 1280 | <= 1500 |
| 117 | assets/scale | assets/models/vegetation/tropical_tree.glb height | **PASS** | 7.60 m | 5.0-9.0 m |
| 118 | assets/origin | assets/models/vegetation/tropical_tree.glb pivot ymin | **PASS** | 0.00 m | -0.1..0.1 m |
| 119 | assets/quality | assets/models/vegetation/tropical_tree.glb textures | **PASS** | 4 images | >= 2 |
| 120 | assets/quality | assets/models/vegetation/tropical_tree.glb triangles | **PASS** | 6760 | <= 8000 |
| 121 | scenes/terrain | scenes/world/SafeIsland.tscn: CSG primitive terrain/structures | **FAIL** | 10 CSG nodes (OceanWater, BeachShore, VillageTerrace, BackHills...) | 0 (heightmap mesh or GLB terrain) |
| 122 | scenes/terrain | scenes/world/SafeIsland.tscn: real terrain asset instanced | **FAIL** | no | terrain glb / heightmap |
| 123 | scenes/water | scenes/world/SafeIsland.tscn: water system per spec §WATER | **FAIL** | flat single-material plane/box | depth-graded shader water w/ waves+shore blend |
| 124 | scenes/lights | scenes/world/SafeIsland.tscn: light count | **PASS** | 2 | <= 4 |
| 125 | scenes/terrain | scenes/world/ZombieIsland.tscn: CSG primitive terrain/structures | **FAIL** | 9 CSG nodes (OceanWater, BeachLanding, ForestPlateau, RuinsPlateau...) | 0 (heightmap mesh or GLB terrain) |
| 126 | scenes/terrain | scenes/world/ZombieIsland.tscn: real terrain asset instanced | **FAIL** | no | terrain glb / heightmap |
| 127 | scenes/water | scenes/world/ZombieIsland.tscn: water system per spec §WATER | **FAIL** | flat single-material plane/box | depth-graded shader water w/ waves+shore blend |
| 128 | scenes/lights | scenes/world/ZombieIsland.tscn: light count | **PASS** | 1 | <= 4 |
| 129 | camera | vertical FOV | **PASS** | 44.0 | 38.0-48.0 |
| 130 | camera | pitch down angle | **PASS** | 42.0 | 35.0-50.0 |
| 131 | camera | default_distance | **FAIL** | 9.5 m, player 19.5% screen height | 13.0-17.0 m |
| 132 | camera | explore_distance | **FAIL** | 12.0 m, player 15.5% screen height | 15.0-18.0 m |
| 133 | camera | combat_distance | **FAIL** | 7.5 m | 9.0-12.0 m |
| 134 | camera | follow damping | **PASS** | 6.0 | 6.0-10.0 |
| 135 | camera | projection type | **PASS** | perspective | perspective only |
| 136 | camera | collision avoidance implemented | **WARN** | no | spring-arm / raycast pull-in |

TOTAL: 80 PASS, 3 WARN, 53 FAIL
