# LAST HARBOR — WORLD PLAN: SAFE ISLAND & DANGER ISLAND 1 (binding)

**Phase ref:** Directive Phases 5–6, 11, 13 · **Companion:** `VISUAL_SPEC.md` §4/§9/§11
**Coordinate convention:** origin (0,0) = village center (Zone A). **+Z = toward beach/dock/ocean (south)**,
−Z = inland (north), +X = east. Heights in m above sea level (waterline = 0.0).

---

## 1. SAFE ISLAND — "Driftholm" (128 × 128 m playable heightmap)

A functioning survivor settlement. The player must understand it by walking through:
every zone is reached by the path network (F) and announces itself with props + one landmark.

```
                 (0,-52)  ZONE K  Beacon Hill (+8 m, watch mast & flag)
                        ┌──────────────┐
        ZONE D storage  │  ZONE B res. │  ZONE C food/water
        (-26..-16,-16..-8)│ (-14..14,  │  (16..30, -16..-2)
                        │  -20..-4)    │
                        │  ZONE A ▼    │
                        │  (0,-10)     │
        ZONE E workshop │  campfire    │  ZONE J forest perimeter
        (-20..-10, 2..12)│   ring      │  (ring r=40..62 m, N/W/E)
                        └──────┬───────┘
                    ZONE F main path (0,-10)→(0,30)
                        ZONE G beach (r 34..48, S/E arc)
                        ZONE H dock (0, 34..48)
                        ZONE I boat (2.5, 46)
```

| Zone | Extent (m) | Content (authored, from asset library) | Storytelling beats (Phase 6 — "people are still surviving here") |
|---|---|---|---|
| **A Village center** | circle r=8 @ (0,−10) | campfire ring + log seats, notice board, 2 water barrels, drying clothes line, flag pole | repaired structures, scarce supplies, campfire, tools leaning on rack |
| **B Residential** | (−14..14, −20..−4) | 5 cabins (survivor_cabin variants: rotated, patched roofs, porch clutter), small gardens between | improvised construction, drying clothes, personal props (lantern, crate bench) |
| **C Food / resource** | (16..30, −16..−2) | garden plots (small_plants rows), fish drying racks, rainwater container trio, smokehouse shed | food storage, water containers, fishing equipment |
| **D Storage** | (−26..−16, −16..−8) | storage_shed + crate stacks + barrel rows + pallets, locked gate prop | scarce supplies: half-empty stacks, inventory chalkboard |
| **E Workshop** | (−20..−10, 2..12) | fishing_hut repurposed as workshop, tool wall, scrap metal piles, boat repair cradle | damaged equipment being repaired, tools, sparks-safe lantern |
| **F Path network** | main 2.6 m wide (0,−10)→(0,30); branches 1.6 m to B/C/D/E | dirt splat band in terrain shader + edge stones + worn grass | paths show daily routine (desire lines to water, gardens) |
| **G Beach** | arc r=34..48, S/E | sand shader band, dune grass clusters, driftwood, palm fringe, tide-line debris | fishing equipment, nets on stakes, beached rowboat prop |
| **H Dock** | (0, 34..48), deck +1.0 | dock kit §11: planks, braces, pilings, ropes, crates, barrels, nets, lantern post | weathering gradient, water interaction (algae, wet planks) |
| **I Boat** | moored (2.5, 46) | survivor_boat + cargo hold visualization (12 pip crates), mast lamp | patched hull, coiled rope, ready-to-leave supply crate |
| **J Forest perimeter** | ring r=40..62 (N/W/E) | tropical trees MultiMesh dense (0.03/m²), ferns, bushes; interior trails only at 2 gate points | forest as wall: navigation readability + background layer |
| **K Landmarks** | Beacon Hill (0,−52,+8); Great Boulder (−30, 20); Wreck Rib (35, 25 half-buried hull) | hill = hill shader + watch mast; boulder = cliff_rock scaled ≤9 m; wreck = boat hull variant | landmarks = navigation anchors (Benchmark principle 4) |

Composition check (§9): from Zone A camera → foreground fire ring/grass, midground cabins+NPCs,
background Beacon Hill + forest wall + ocean east. From dock → foreground planks/ropes, midground
boat+beach props, background village roofs + hill. No empty view cones.

NPC placement: 3 survivors with roles (keeper @D, fisherman @H/A, medic @B) on daytime loops
A↔their zone — movement sells "functioning settlement".

## 2. DANGER ISLAND 1 — "Pulau Kabut" (96 × 96 m, Danger I)

Mirror structure with decay: arrival cove (S) → ruined camp (center) → flooded warehouse (E) →
overgrown road (N) → cliff quarry (NW, rare node). Storytelling language (Phase 6 —
"people were here, but survival failed"):

- abandoned structures: collapsed-roof cabin variant, torn tarp shelters
- destroyed equipment: broken carts, rusted tool piles, overturned boat
- barricades: pallet+scrap walls with gaps showing the fight direction
- overgrowth: vines on every structure, ferns through floorboards
- abandoned vehicle: rusted truck wreck (new asset, 4.4 m, §3 vehicle row)
- scattered supplies: loot caches with rarity tell (Benchmark §5/LDoE)
- signs of previous survivors: chalk marks, dead campfire, half-packed crate, blood-free but torn gear (rating-safe damage language)
- fog layer: height fog density 0.016 from §8; visibility ≤45 m in interior

Enemy composition (Danger I): 4 walkers + 1 runner, patrol lanes on the road; quarry guarded by
2 walkers — composition, not HP, is the difficulty (Phase 19).

## 3. ZONE→ASSET MATRIX (authoring backlog, vertical slice)

New assets required: fern ×2, vine ×2, driftwood ×2, grass ×3 rebuild, small_plants ×3 rebuild,
fallen_branch rebuild, truck wreck, fish drying rack, rainwater container, notice board,
clothesline, garden plot kit, barricade kit, chalk/mark decals-as-cards.
Re-texture required: rocks S/M/L, barrel, crate, bush, fishing_hut, storage_shed (audit G4).
Rescale required: barrel, storage_shed, bush, character import (audit G2/G6).

Every authored placement obeys: zone extents above, scale table (`spec/world_scale.json`),
variation contract (`VISUAL_SPEC.md` §5), composition rule (§9), and storytelling beats per zone.
