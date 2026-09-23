# PHASE 0 — BENCHMARK STUDY (internal)

**Project:** LAST HARBOR / Survival Island · **Date:** 2026-09-23 · **Status:** internal reference
**Rule:** extract DESIGN PRINCIPLES only. No assets, branding, characters, maps or UI are copied from any benchmark title.

Sources are listed per game. Where a fact comes from web research it is linked; where it comes from
first-hand analysis of gameplay footage/reviews of the current mobile builds it is marked *(analysis)*.

---

## 1. LOST in BLUE (mobile, 2023– ; franchise since DS 2005)

Modern mobile entry: 3D island survival with crafting, shelter building, semi-open world and
zombie/expedition content layered on a castaway fantasy *(analysis, TapTap player reports)*.
The classic DS/Wii entries are a cautionary tail: fixed cameras and stat micromanagement are the
most-criticized decisions across the franchise's reviews.

| Cat | Observation | Principle extracted |
|---|---|---|
| A Camera | Mobile entry: third-person follow, close-ish, behind shoulder. DS/Wii entries used **fixed** cameras; reviewers called navigation with them frustrating ("impossible to tell if you can make your way down until you walk up to an edge") | Follow-cam must show traversability: slope/ledge readability is a camera duty, not a level-design luxury |
| B Player scale | Human-proportioned survivor, ~10–15% of screen height in mobile entry *(analysis)* | Keep player small enough that environment reads as world, not diorama |
| C Terrain | Island divided into named biome areas (beach/jungle/lake/ruins); transitions are zone-gated in old entries | Biome identity per area is good; hard zone gates are not — use continuous terrain |
| D Vegetation | Old entries: "poorly textured 3D island populated with 2D trees" — remembered as the visual failure of the franchise | Billboard/flat vegetation is a franchise-killing tell; volume + variation required |
| E Buildings | Shelter building is a headline feature; structures are readable silhouettes | Buildables must silhouette-read at 15 m |
| F Props | Gatherables placed as visible world objects, not icons | Loot is geometry first, icon second |
| G Lighting | Bright clean tropical light in mobile entry; old entries flat | Tropical brightness ≠ flat white; needs shadow shaping |
| H Materials | Franchise's low point is flat textures | Material detail is the difference between "2005" and "current" |
| I World density | DS review praised: "areas are well-organized and free of clutter… good amount of detail but nothing in your way" | Density with lane clarity: detail yes, obstruction no |
| J Navigation | Backtracking punished players ("you'll wear the same path smooth"); landmarks weak | Path loops + landmarks; never force identical backtracking |
| K HUD | Mobile: compact joystick-left / actions-right; old: dual-screen stat dashboards | Stats belong in world + minimal HUD; dashboards killed the old games' mood |
| L Inventory | 20-slot backpack forced many trips — praised as tension, criticized as tedium | Capacity pressure is fun only when trips are short and choices meaningful |
| M Interaction | Context minigames everywhere became "gimmicks" | One contextual verb; no minigame per verb |
| N Combat | Light melee/zombie skirmish, not the core | Combat = pressure valve, not the game |
| O Gathering | Pick-up vs dig vs shake distinctions gave texture | 2–3 gather verbs with different risk/time is enough variety |
| P Progression | Shelter + tool tiers | Tier gates via tools, not levels |
| Q Island structure | One island, ring of biomes + mystery interior | Ring composition works for small islands |
| R Audio | "Music ranges from forgettable to irritatingly repetitive" | Loop variation + event-driven stingers, never one loop |

**Adopt:** biome ring island, visible gatherables, organized-density, capacity pressure.
**Reject:** fixed cameras, stat dashboards, minigame-per-interaction, flat/billboard vegetation.

Sources: [GameSpot DS review](https://www.gamespot.com/reviews/lost-in-blue-review/1900-6135231/),
[GameSpot Shipwrecked review](https://www.gamespot.com/reviews/lost-in-blue-shipwrecked-review/1900-6199346/),
[GameSpot Lost in Blue 3](https://www.gamespot.com/reviews/lost-in-blue-3-review/1900-6188803/),
[TapTap LOST in BLUE](https://www.taptap.io/app/217310).

---

## 2. Ocean Is Home: Survival Island

Long-lived mobile survival sandbox: sail/raft between multiple islands (home island, farmer's
island, military island…), free-form building, hunting, day/night; praised repeatedly for
"good graphics for a survival mobile game" and for the freedom of its loop; criticized for glitchy
placement and sparse map logic ("the map makes absolutely zero sense… random shops in remote
places… they all look the same").

| Cat | Observation | Principle extracted |
|---|---|---|
| A Camera | Ground-level third-person follow; player fully visible while building/traveling *(analysis)* | Ground-level cam makes building & sailing legible |
| B Player scale | Realistic adult proportions; player ≈ 12–18% screen height *(analysis)* | Works because world is real-scale; our chibi needs same world scale, smaller hero |
| C Terrain | Rolling hills, beaches, inland lakes per island; islands differ in palette | Per-island palette identity is cheap and powerful |
| D Vegetation | Trees are harvestable AND visual; forests dense enough to get lost in | Vegetation = resource + navigation hazard + set dressing, one system |
| E Buildings | Player-built + prefab settlements; reviewer wish: "structures should all be close together like a little city" | Settlements must CLUSTER; scattered buildings read as noise |
| F Props | Loot in containers/bunkers; discovery moments ("the bunker is KRAZY full of loot") | Cache density spikes create stories |
| G Lighting | Simple mobile daylight cycle; adequate, not atmospheric | Day/night exists for risk, not graphics showoff |
| H Materials | Stylized-realistic mid-fi; consistent texel density | Consistency beats resolution |
| I World density | Mixed: cities sparse and samey → criticized | Repeat structures need variation passes (rotation, damage, clutter) |
| J Navigation | Map confusion is the top complaint | Every zone needs a visual anchor readable from 30 m |
| K HUD | Minimal in-world; menus are full-screen grids | Keep play HUD near-zero; menus can be rich |
| L Inventory | Grid inventory + weight-free stacks; boat/store storage | Secondary storage (boat/base) relieves pocket pressure |
| M Interaction | Hold-to-harvest with progress | Time-locked harvest = risk window (we already do this) |
| N Combat | Animals/zombies optional; melee simple | Keep combat optional-pressure on safe routes |
| O Gathering | Node depletion + regrowth over days | Nodes regenerate on day tick, not instantly |
| P Progression | Tool/material tiers gate islands (military island = risk run) | Island tiers gated by gear, matching our Danger I–IV |
| Q Island structure | Archipelago = progression ladder | Our boat-loop matches genre-proven structure |
| R Audio | Sparse ambient; not a reference | We must exceed: tide/wind/birds layering |

**Adopt:** archipelago progression, clustered settlements, per-island palette, node regrowth on day tick.
**Reject:** sparse samey structure repetition, navigation without anchors.

Sources: [AppGamer reviews](https://www.appgamer.com/ocean-is-home-survival-island/reviews/),
[App Store listing](https://apps.apple.com/us/app/ocean-is-home-survival-island/id1144501644),
[Game Solver user reviews](https://game-solver.com/ocean-is-home-survival-island/).

---

## 3. Last Day on Earth: Survival (LDoE)

The genre's mobile template: top-down/isometric zombie survival, zone-node world map, base
building, energy-gated expeditions. Compact touch UI: virtual joystick left, contextual action
buttons right, inventory one tap away. Mood carries the product: "moody enough to convey a
post-apocalyptic wasteland… ambient atmosphere with zombies moaning, wind rustling… nails the
lonely survivor feeling".

| Cat | Observation | Principle extracted |
|---|---|---|
| A Camera | Fixed-ish isometric top-down (~50°) — great for touch targeting, weak for "being there" | We reject it for presence (Directive Phase 2) but keep its touch-ergonomics |
| B Player scale | Small figure (~8–12% screen height) in readable diorama | Small player + big readable world = mobile legibility |
| C Terrain | Per-zone handcrafted tiles: pine forest, quarry, bunker floors | Zone theming > continuous open world on mobile |
| D Vegetation | Trees as harvest nodes with clear silhouettes, sparse decoration | Harvest nodes must silhouette-read instantly |
| E Buildings | Base = grid of walls/furniture; enemy bases too | Grid building is NOT our scope; settlement is authored |
| F Props | Loot containers with rarity tell (color/size) | Rarity must be visible before opening |
| G Lighting | Gloomy desaturated palette, vignette-ish mood | Desaturation = danger language (our Danger Island) |
| H Materials | Low-fi but consistent, painted detail | Painted detail in textures compensates low geometry |
| I World density | Tight, lane-based zones; no empty hectares | Small dense zones beat large empty ones |
| J Navigation | World map nodes eliminate traversal boredom | Travel = choice screen + short sail, never long empty walk |
| K HUD | Joystick-left / actions-right / one-tap inventory; almost nothing persistent | The canonical mobile survival HUD; we adopt its ergonomics |
| L Inventory | Grid + durability; looting UI is fast | Looting must be one-tap fast or tension becomes chore |
| M Interaction | Single contextual action button | One verb button (our README rule #6 already matches) |
| N Combat | Kiting melee, weapon durability | Combat = position + resource, not reflex spectacle |
| O Gathering | Hold-to-harvest with tool requirement | Tool-gated nodes = progression pressure |
| P Progression | Base + gear tiers unlock farther zones | Zone unlock via gear tiers (matches Directive Phase 19) |
| Q Island structure | Node graph of locations | Our islands = nodes; interiors = dense authored zones |
| R Audio | Ambient loneliness is the remembered quality | Ambient bed (wind/water/distant groans) is mandatory |

**Adopt:** touch ergonomics, node-based travel, desaturated danger palette, ambient bed, rarity tell.
**Reject:** isometric camera for our game (presence goal), energy gates, grid base building.

Sources: [pgyer review 2025](https://www.pgyer.com/apk/article/news/last-day-earth-survival-android-review-2025-can-you-still-survive-the-wasteland-),
[androidayuda](https://en.androidayuda.com/games/recomendados/last-day-earth-survival/),
[BlueStacks keymapping guide](https://www.bluestacks.com/blog/game-guides/last-day-earth-survival-pc/surviving-last-day-on-earth-with-the-bluestacks-keymapping-tool.html).

---

## 4. Dawn of Zombies: Survival (DoZ)

Atmospheric top-down survival with strong base-building and a grim, foggy art mood. Player praise:
atmosphere and genre standing; player complaints are our design warnings: "gameplay is monotonous
with static combat", "resource gathering can become repetitive", "phone keeps heating up after a
few minutes".

| Cat | Observation | Principle extracted |
|---|---|---|
| A Camera | Top-down with slight tilt; cinematic intro cam abandoned in play — players noticed and disliked the switch | Camera language must be consistent intro→play |
| B Player scale | Small figure in large readable frame | Same as LDoE |
| C Terrain | Snow/forest/urban ruins variety; fog layers sell mood | Weather/fog = identity layer, cheap on mobile |
| D Vegetation | Overgrowth reads as "abandonment" language | Overgrowth is storytelling, not just dressing |
| E Buildings | Ruins + player base contrast tells the story | Damaged vs repaired = our two-island language |
| F Props | Scattered loot piles, cars, barricades | Vehicle wrecks & barricades = apocalypse shorthand |
| G Lighting | Heavy mood lighting, contrast, haze | Contrast + haze = tension without new assets |
| H Materials | Grimy painted textures | Grime pass unifies mismatched assets |
| I World density | Dense clutter in ruins; open snow fields for tension beats | Alternate density: clutter (safe story) vs emptiness (threat) |
| J Navigation | Lane-based ruins; fog limits sight | Limited visibility as difficulty (Phase 19) |
| K HUD | Busy HUD + monetization banners — criticized | Monetization/banner clutter destroys immersion; keep HUD diegetic-min |
| L Inventory | Deep grids; management fatigue | Inventory depth belongs in menus, not HUD |
| M Interaction | Tap-to-act, hold-to-loot | Same canonical pattern |
| N Combat | **Static combat criticized** — enemies stand and trade | Enemies must move: approach angles, stagger, retreat |
| O Gathering | **Repetitive gathering criticized** | Vary gather verbs + risk (exposed node vs safe node) |
| P Progression | Base/gear walls + difficulty spikes complained about | Smooth tier curve; spike via composition, not HP |
| Q Island structure | Region locks by gear | Same as LDoE |
| R Audio | Atmosphere praised, combat audio thin | Ambient strong + combat foley must match |

**Adopt:** fog/haze identity, overgrowth-as-story, clutter/emptiness alternation, moving enemies.
**Reject:** static combat, repetitive single-verb gathering, banner-cluttered HUD, thermal-neglect.

Sources: [TapTap DoZ](https://www.taptap.io/app/169051), [updatestar overview](https://dawn-of-zombies-survival-game.updatestar.com/).

---

## 5. CROSS-BENCHMARK SYNTHESIS → DESIGN PRINCIPLES FOR LAST HARBOR

1. **Presence over omniscience.** Every benchmark that kept a ground/third-person cam is remembered
   for atmosphere; every top-down one is remembered for ergonomics. We take presence (Phase 2 cam)
   and borrow top-down ergonomics for touch UI only.
2. **Small player, real world.** Player 8–14% screen height in a real-scale world is the shared
   legibility window of all four titles.
3. **Density with lanes.** Organized density (Lost in Blue) + clutter/emptiness alternation (DoZ).
   No empty hectares; no obstacle soup.
4. **Anchors everywhere.** Each zone owns one landmark readable at ≥30 m (Ocean Is Home's map
   confusion is the counter-example).
5. **Capacity is the game.** 20-slot tedium (LiB) vs boat-slot tension (ours): pressure is fun when
   the trip is short and the choice is between two good things.
6. **One contextual verb.** All four converge on a single contextual action button.
7. **Mood is audio+light, not geometry.** Desaturation/haze (LDoE/DoZ) and ambient beds carry
   apocalypse cheaper than models do.
8. **Moving enemies or no enemies.** Static combat is the most-cited combat failure (DoZ).
9. **Thermal budget is a feature.** DoZ's heating complaints = our Phase 14 budget is player-facing
   quality, not engineering vanity.
10. **Consistency beats resolution.** Mixed-quality assets unified by texel density + grime pass
    outperform a few hero assets (Ocean Is Home vs Lost in Blue old gens).

These ten principles are binding for the specs in `VISUAL_SPEC.md`, `WORLD_PLAN.md`,
`GAMEPLAY_SPEC.md` and for the QA rubric in `VISUAL_QA_PLAN.md`.
