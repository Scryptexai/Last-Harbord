# LAST HARBOR — VISUAL QA PLAN (Phase 21)

**Gate position:** after vertical-slice implementation, before any further gameplay systems.
**Capture:** HUD hidden (`HUD.visible=false`), 1280×720, Compatibility renderer, fixed sun per §8.
Tooling: extend `tools/render_qa_view.py` / `tools/render_pipeline_qa.py` with the six shot rigs below;
file outputs to `docs/design/audit/shots/<date>/SHOT_0X.png` plus Web-export and Android triplets.

## Shot list

| Shot | Location / rig | Must show |
|---|---|---|
| 01 | Safe Island village — cam @ (0,−2,−2) look (0,1.2,−12), d=14.5 | cabins, fire ring, NPCs, path, hill bg |
| 02 | Safe Island beach — cam @ (8,1.6,26) look (0,0.8,36) | sand→water transition, dune grass, palms, tide line |
| 03 | Dock + boat — cam @ (−4,2.2,40) look (1,0.9,47) | dock kit detail, boat, water interaction, lantern |
| 04 | Danger Island arrival — cam @ cove look inland | fog band, wreck signage, overgrowth |
| 05 | Combat environment — cam behind player vs walker+runner | enemy readability, ground lanes, contrast |
| 06 | Resource area — cam @ quarry/gardens | node silhouette-read, gather verbs affordance |

## Scoring rubric (internal, 1–5 each; record in audit doc per shot)

Terrain · Materials · Vegetation · Architecture · Scale · Lighting · Composition · Camera ·
Atmosphere · Asset consistency.

Pass gate: **average ≥3.5 AND no criterion <3** across shots 01–06.
**Auto-fail (Roblox-tells), any one blocks release:**
- visible untextured / single-flat-color surface >5% of frame
- CSG or primitive-shape terrain/structures in frame
- water rendering as flat single-color plane
- repeated identical tree with no variation in one view
- player or prop scale mismatch vs §3 table (miniature/giant tell)
- HUD-visible or UI artifact in shot

If the scene still reads Roblox/low-poly: **stop gameplay work; fix the visual pipeline first**
(Directive Phase 21). Each fail cites the spec section responsible and enters the backlog
(`VISUAL_SPEC.md` §14 taxonomy).

## Regression cadence

Every visual PR: validator run + shots 01–03 triplet (desktop/Web/Android) attached.
Weekly: full 6-shot set scored; scores trend-tabled in `docs/design/audit/QA_TREND.md`.
