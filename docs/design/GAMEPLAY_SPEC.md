# LAST HARBOR — GAMEPLAY & UI/UX SPECIFICATION (binding)

**Phase ref:** Directive Phases 16–19 · **Companion:** `BENCHMARK_STUDY.md` §3/§4 (HUD ergonomics),
`VERTICAL_SLICE.md` (scope), existing `scripts/systems/game_manager.gd` (loop backbone to keep).

---

## §1 HUD / UX (Phase 16) — benchmark-derived, not imagined

Canonical mobile-survival ergonomics (LDoE/DoZ/LiB-mobile all converge): **joystick left, contextual
actions right, menus full-screen, play HUD near-zero.** Required elements mapped to screen regions
(landscape 16:9, notch-safe margins 24 px):

| Region | Element | Spec |
|---|---|---|
| Bottom-left | MOVE joystick | dynamic-origin virtual stick, r=120 px, 60% alpha ring |
| Above joystick | PLAYER STATUS | HP bar + STAMINA bar, 8 px tall × 96 px, no numbers in play |
| Bottom-right | ACTION cluster | primary CONTEXTUAL button 84 px (icon swaps: board/harvest/talk/loot/repair), ATTACK 72 px, DODGE 64 px arc-placed; icons only post-tutorial |
| Right edge | QUICK INVENTORY | vertical 4-slot strip (last gathered); long-press → full cargo overlay (12 pips) |
| Top-left | MINIMAP + LOCATION | 96 px circular map, north ring, objective arrow, zone name chip under it; tap → full map |
| Top-right | OBJECTIVE + DAY | one-line objective chip (≤40 chars) + day/time icon |
| World-space | INTERACTION prompt | billboard label over target at 1.8 m (replaces current screen-center PromptBox) |
| Full-screen (paused play) | Inventory / Map / Settlement / Debrief | rich grids allowed here (Ocean Is Home pattern) |

Budget: HUD ≤12% screen area; panels 60–75% alpha; no persistent top bar (current `TopBar`
full-width panel is retired — audit of `scenes/ui/HUD.tscn`); RESOURCE SUMMARY (community
stockpile) lives in Settlement screen + debrief, not in play HUD.
UI must remain subordinate to the world: no giant dashboard panels (Directive).

Touch rules: all buttons thumb-reachable in landscape both hands; min hit 56 px; no simultaneous
two-hand requirements except joystick+attack (standard).

## §2 CORE LOOP (Phase 17) — the foundation

```
SAFE ISLAND → check settlement needs (Settlement screen: stockpile vs daily_needs)
→ prepare equipment (cargo crates at dock, tool pick) → choose destination (map/objective)
→ board boat (Zone I) → travel (sail beat 20–40 s, tide window visible) → arrive Danger Island
→ explore (anchors + fog) → fight/avoid → gather (hold-to-harvest, rooted = risk)
→ inventory pressure (12 pips fill; choice moments) → risk assessment (tide/enemy/audio cues)
→ return to boat → return home → deliver (debrief: carried → community)
→ upgrade settlement/player/boat → unlock next island → repeat
```

Beat time budgets (10-min session): Safe Island 90–150 s · sail 20–40 s · expedition 240–420 s ·
return sail 20–40 s · debrief+upgrade 60–90 s. Existing `game_manager.gd` states
(SAFE_ISLAND/SAILING/EXPEDITION_ISLAND/DEBRIEF) already match — keep, do not redesign.

## §3 BOAT CAPACITY (Phase 18) — tension mechanic, not a number

- Hold = **12 slots**, visualized as 12 pips on boat + quick-inventory strip.
- Stack rules: wood/food stack 3/slot; metal/medicine/fuel 2/slot; rare_parts 1/slot (never stack) →
  a "full hold" still presents choices between rarities.
- Choice design: every expedition must present ≥1 moment where hold is full and a higher-value
  node appears (guaranteed by loot tables: rare spawn after 70% fill).
- DROP is one tap (hold pip → drag out); LEAVE is free (node persists, regrows on day tick).
- Death/loss: carried cargo becomes recoverable buoy at that island (existing README rule) —
  risk without cruelty.
- Returning to boat under pressure = the game's question: "how far do I go before I turn back?"

## §4 ISLAND PROGRESSION (Phase 19)

Difficulty = environment + enemy composition + scarcity + distance + navigation + visibility +
risk + time + inventory pressure. **Never HP inflation alone.**

| Island | Danger | Resource tier | Enemy tier / composition | Environment identity | Navigation | Visibility | Loot density | Return risk |
|---|---|---|---|---|---|---|---|---|
| 1 Pulau Kabut | I | basic (wood/food/metal) | 4 walker + 1 runner | fog cove, ruined camp | single loop road | ≤45 m fog | medium | tide window 1 |
| 2 Pulau Karang | II | better (fuel/meds) | walkers + 2 runners + 1 bruiser | reef cliffs, night-fog | branch paths, cave shortcut | ≤60 m | medium-high | tide + storm cue |
| 3 Pulau Merah | III | rare (rare_parts) | high density mixed + hunter | ash field, red haze, wreck town | maze lanes | ≤35 m haze | high but contested | tide + horde wake |
| 4 Pulau Utara | IV | high-value | major threats, coordinated | frozen north, whiteout bands | vertical cliffs, ropes | ≤25 m bands | cache spikes | double tide window |

Unlock gate: gear/boat tier from settlement upgrades (workshop Zone E), not player level.
Scarcity curve: basic resources denser on near islands; rares only far — travel cost = price.

## §5 AUDIO ATMOSPHERE (benchmark R, binding summary)

Layered bed per island: wind + surf + birds (safe) / wind + creaks + distant groans (danger);
event stingers (gull flock startle, hull creak, zombie alert); tide phases change bed mix
(existing README tension language). WebAudio-synthesized legacy from HTML build may seed presets;
final = streamed loops + one-shots, ≤6 simultaneous voices on mobile.
