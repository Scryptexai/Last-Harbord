# LAST HARBOR — VERTICAL SLICE DEFINITION (Phase 20)

**Scope lock:** ONE complete slice = Safe Island + Danger Island 1. Nothing else is built until the
slice passes Visual QA (`VISUAL_QA_PLAN.md`) and the spec validator (`--strict`, 0 FAIL).

## Playable acceptance path (all 13 steps must work end-to-end)

1. Spawn at Safe Island (Zone B porch) — character at 1.5 m, camera per §2.
2. Walk through settlement (A→C→D beats; NPCs on loops; prompts world-space).
3. Reach dock via main path (F→G→H chain readable without UI).
4. Enter boat (contextual BOARD button; hold pips visible).
5. Travel (sail beat 20–40 s; tide window shown; skip-after-first optional).
6. Arrive Danger Island cove (fog band, wreck signage).
7. Explore (loop road; anchors; 2 cache moments).
8. Fight (walker + runner encounter; moving enemies; dodge works).
9. Collect resources (hold-to-harvest rooted; 3 gather verbs: pick / chop / pry).
10. Reach cargo pressure (hold full; rare node appears → TAKE-or-LEAVE moment).
11. Return to boat (risk cues; no teleport).
12. Return home (debrief modal → stockpile updated).
13. Deliver resources (Settlement screen shows needs met; day ticks; node regrowth).

## Definition of done (slice)

- [ ] `tools/validate_world_spec.py --strict` → 0 FAIL (scale, textures, camera, terrain, water, lights).
- [ ] Visual QA: 6 shots scored, average ≥3.5/5, no criterion <3, no Roblox-tell auto-fail.
- [ ] Renderer triplet: desktop-Compatibility / Web export / Android device screenshots match intent (§13 matrix).
- [ ] Mobile budget: ≤120 draw calls, ≤150k tris, ≤4 lights, 30 fps on mid-range device or profile report filed.
- [ ] HUD: ≤12% screen area; 13-step path completable with touch-only input.
- [ ] Loop: game_manager debrief → stockpile → daily needs → regrowth verified by `tests/` bot run.
- [ ] Audio bed present on both islands with tide-phase mix change.

## Explicitly OUT of slice (anti-crawl)

Islands 2–4 · base building · crafting tree beyond 3 tools · multiplayer · monetization ·
vehicle driving · fishing minigame · NPC quests beyond greet/role lines · day/night full cycle
(fixed authored time-of-day per island + tide phases only).
