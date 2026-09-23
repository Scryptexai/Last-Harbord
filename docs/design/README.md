# DESIGN VALIDATION PACKAGE — LAST HARBOR

Established 2026-09-26 per the Master Game Director directive (Phases 0–21).
This package is the **benchmark-driven visual & gameplay specification** that gates all further
world-content implementation. Read in this order:

| # | Document | Directive phases | Purpose |
|---|---|---|---|
| 0 | `BENCHMARK_STUDY.md` | 0 | Lost in Blue · Ocean Is Home · LDoE · Dawn of Zombies → 10 binding design principles (design principles only, no assets copied) |
| 1 | `VISUAL_SPEC.md` | 1–4, 7–15 | identity, camera, world scale, terrain, vegetation, asset quality, materials, lighting, composition, water, dock, mobile budget, renderer strategy, failure taxonomy |
| 2 | `WORLD_PLAN.md` | 5–6, 11, 13 | Safe Island zones A–K + Danger Island 1 plan + environmental storytelling beats |
| 3 | `GAMEPLAY_SPEC.md` | 16–19 | HUD/UX benchmark layout, core loop, boat-capacity tension, island progression |
| 4 | `VERTICAL_SLICE.md` | 20 | scope lock: 13-step acceptance path + definition of done |
| 5 | `VISUAL_QA_PLAN.md` | 21 | six QA shots, 10-criterion rubric, Roblox-tell auto-fails |
| — | `spec/world_scale.json` | 2, 3, 8, 14, 15 | machine-readable LOCKED spec (scale/camera/budget/renderer) |
| — | `audit/SCALE_AUDIT_2026-09-23.md` | — | measured baseline of commit `3569f87`: 80 PASS / 3 WARN / 53 FAIL |

## Enforcement

```bash
python3 tools/validate_world_spec.py            # audit report
python3 tools/validate_world_spec.py --strict   # CI gate: exit 1 while any FAIL remains
```

The validator measures real GLB bounding boxes / pivots / texture counts / triangle counts and the
real scene + camera files against `spec/world_scale.json`. **No visual implementation PR merges with
new FAILs; the vertical slice starts only after this package is approved.**

## Identity (locked)

POST-APOCALYPTIC ISLAND SURVIVAL · STYLIZED-REALISTIC 3D · CHIBI CHARACTER (LOCKED, no redesign) ·
BELIEVABLE ENVIRONMENT · MOBILE-FIRST THIRD-PERSON. The character/world contrast is intentional:
stylized readable hero inside a real-scale, materially believable world.
