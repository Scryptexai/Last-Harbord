# LAST HARBOR — GAME DESIGN AUDIT & REDESIGN
### Game Design Director review · v1 · 2026-09-10
**Scope:** the actual implementation at commit `aea06c9` (`index.html`, `css/style.css`, `js/*.js`, 1,829 LOC).
**Method:** full source read + two headless simulations run against the real game modules (island clearing, sailing distance, upgrade-economy reachability search). Every number below is measured, not estimated. Reproduction method in *Appendix A*.
**Status:** analysis only. **No code was changed.** Direction needs approval first.

---

## 1. EXECUTIVE VERDICT

**Verdict: the shell is worth keeping. The game, as it exists right now, is not yet a game — it is a 25-second content demo wearing a survival roguelike's clothes.**

The code is better than the design. 47/47 smoke tests pass, modules are clean and separated, there are no dependencies, and the boat's inertia movement is the best-feeling thing in the project. The problem is not engineering quality or missing features. **The problem is that the game's central question is never asked.**

The north star is *"How far am I willing to go before I turn back?"* — and the current build has **no mechanism that makes turning back a decision**:

- Nothing can hurt the boat at sea. The only damage source in the entire codebase is one line of zombie contact on land.
- `BACK TO BOAT` teleports, instantly, for free, from anywhere, at any moment (`main.js:78`).
- The world's six islands all sit inside a **706 × 706 px box** — the whole ocean is one screen and the nearest island is **0.64–0.95 s** away.
- A bot that does nothing smarter than "walk at the nearest resource" **strips a full island in 1.9–4.5 s** and finishes with 74–92 / 100 HP.
- Island loot, difficulty and remaining contents are printed as text on the world from **any distance**, so there is nothing to discover.
- The upgrade economy is mathematically unsolvable: an exhaustive reachability search over all 2,002 reachable inventory/upgrade states finds that **exactly one purchase (`Speed L1`) is ever possible. The other five upgrades are dead content.**

So the honest answer to *"what would make a non-hardcore player voluntarily play another run?"* is: **nothing in the current build.** Run 2 is run 1 with a different random arrangement of the same four icons.

### The answer in one line — the smallest set that makes a 10-minute session work
> **Make the return trip the game.** Loot is only yours when it is *on the boat*. The longer you stay, the more the world pushes back. Give the player an escalating reason to leave, three visible ways the boat changes, and a boat silhouette that grows — and the existing loop finally means something. **Four systems, one rule, no new feature categories.**

---

### Scores

| Category | Score | Why |
|---|---|---|
| **Core Loop** | **2 / 10** | The loop *exists* and is instantly legible (sail → land → gather → upgrade). But it completes in ~25 s of content, has zero escalation, and contains no decision with a cost. A loop with no pressure is a checklist, not a game. |
| **Game Feel** | **2.5 / 10** | The one genuinely good area. Boat inertia, drag, wake, and the tiered boat sprites read well. Everything else is flat: no audio anywhere in the project, no attack windup, no hit-stop, no camera response, no player hurt reaction, collection is auto-pickup with a text toast. |
| **Psychological Engagement** | **1.5 / 10** | All four psychological levers are mechanically absent: no *uncertainty* (all island contents are printed), no *loss* (death is nearly unreachable), no *anticipation* (no fog, no reveal), no *goal gradient* (the 2nd upgrade is unreachable). Only *curiosity* has a pulse, and the game kills it by telling you the answer. |
| **Visual Hierarchy** | **3.5 / 10** | The canvas itself is readable and the palette is coherent. But critical and trivial information get the same treatment: island stats are drawn as floating world text, and the HUD shows 5 resource chips + timer + storage + prompt + up to 4 large buttons simultaneously. Nothing prioritizes. |
| **UI/UX** | **3 / 10** | Functional, no layout breakage, responsive. But the entry screen is a SaaS dashboard that hides the world; `SAIL` means "start" on one screen and "quit the run" on another with the same icon and label; `EXPLORE` has two different behaviours under one word; the `COLLECT` button duplicates auto-pickup; the timer measures nothing. |
| **Progression** | **1 / 10** | One reachable purchase in the entire game, obtainable in the first ~60 s (mostly by AFK fishing), after which progression is permanently, silently blocked. The boat's silhouette only changes at 2 and 4 total levels — unreachable. |
| **Replayability** | **1.5 / 10** | The world regenerates but islands are interchangeable (same four resources, same layout, same non-choice). There is no unlock, no variance in play style, no mastery curve, and no reason for run 2 to differ from run 1. |
| **Non-Gamer Accessibility** | **7 / 10** | Genuinely the strongest pillar — WASD/joystick, auto-pickup, no twitch windows, plain-language prompts, effectively no death. It is also partly *why* the game is flat: "forgiving" has been implemented as "harmless". |
| | **Weighted overall: ~2.6 / 10** | *Not fun enough to build on as-is — but structurally sound enough to fix cheaply. Every P0 below is a small diff in an existing file.* |

**Recommendation: do not add a single feature. Rebuild the pressure. The concept's pillars are right; the implementation contradicts all three of them.**

---

## 2. CURRENT GAME REALITY

### 2.1 State machine (as implemented)
`G.state` ∈ `dashboard` | `sea` | `land` | `gameover` (`state.js:3`).

| Transition | Trigger | Code |
|---|---|---|
| dashboard → sea | `SAIL` / `FISH` / `EXPLORE` | `main.js:35 beginRun()` |
| sea → land | proximity (`dist < r+42`) or already-close + `EXPLORE` | `main.js:60 enterIslandFlow()` |
| land → sea | `B` / `BACK TO BOAT` — instant, from any position | `main.js:78 backToBoat()` |
| sea → dashboard | `SAIL` in the sea HUD | `main.js:95 dockHarbor()` |
| land → gameover | HP ≤ 0 | `main.js:104 die()` |

### 2.2 Implementation status

**IMPLEMENTED (works as written)**
- Top-down sea with inertia boat movement, drag, wake, camera smoothing (`boat.js`, `main.js:258`).
- Procedural sea world: 6 islands, name/difficulty/stock, deterministic land shape seeds (`world.js:9`).
- Land mode: player movement, 3 zombie types with distinct stats/aggro/wander, contact damage, knockback, hit-flash, HP bars, aggro `!` (`land.js:112`).
- Auto-pickup at 26 px, manual `COLLECT` at 75 px, zombie drops on kill (`land.js:174`, `land.js:236`).
- 4 resources, capacity-gated inventory, 3 upgrade tracks × 2 levels (`inventory.js`, `config.js:54`).
- localStorage persistence of resources/upgrades/HP/runs/best time (`save.js`).
- Fish (3 s, 75 % yield) and Anchor toggle (`main.js:153`, `main.js:178`).
- Full DOM overlay: dashboard, HUD, upgrade modal, inventory modal, game-over modal, toasts.
- Sprite assets for 3 boat tiers, 3 zombies, player, island, tree, rock, 13 UI icons + vector fallbacks.
- 47/47 smoke tests pass (`node tests/smoke.test.mjs`).

**PARTIALLY IMPLEMENTED (present but inert)**
- *Boat tiers*: `boatLevel()` returns 1–7 and sprites swap at ≥2 and ≥4 — the ≥2 swap is reachable exactly once; ≥4 never.
- *Island revisit*: `visited` flag exists; it only darkens grass and adds the label "· dikunjungi". Zombies respawn on every landing, **loot does not** — so revisits are pure danger with zero reward. The incentive is inverted.
- *Fishing*: implemented as a competing, safer loot faucet. 0.25 items/s, zero risk, zero cost. Fills the entire 10-slot hold in ~40 s of standing still, which is *faster and safer* than island raiding.
- *Autopilot*: pressing `EXPLORE` from anywhere sets a target and drives the boat to the island automatically — it removes the last piece of seamanship from the game.
- *Fog/uncertainty*: not present. All island data is drawn at all times.

**PLACEHOLDER (no mechanical substance)**
- `ANCHOR`: no drift exists to prevent; the toggle only collapses velocity to zero. Solves a non-problem.
- *Timer + Best Time*: `runTime` accumulates because nothing threatens you, so `bestTime` rewards AFK fishing. Presented as a headline stat on the dashboard and the death screen.
- *Level badge*: `Level 1–7` is the arithmetic sum of three unrelated upgrade tracks; it has no gameplay meaning.
- *Healing*: food/medicine are consumables with no cost of use (you can eat to full at any moment, on land, mid-fight).
- *Dashboard "Pulau Terdekat: … Tersedia: ⛽2 🪵1"*: a spoiler, presented as a feature.

**MISSING**
- **Audio: zero.** No audio code, no audio assets, no `AudioContext` anywhere (`grep` confirms empty). This is the single biggest missing feedback channel.
- Sea hazards of any kind (weather, rocks, reefs, night, hostile craft).
- Boat collision with islands — **the boat sails straight through island sprites.**
- Fog of war / unknown regions.
- Escalation over time (per run or global).
- Objectives, tutorial, or onboarding beyond a toast string.
- Any loss on death other than the resource counter.
- Any reason to return to a cleared island.
- Any goal-gradient signal ("you are 4 wood from the next upgrade").

**BROKEN / CONTRADICTORY (verified)**
1. **The progression system is unsolvable.** BFS over all reachable `(upgrades, inventory)` states — *add any resource while under capacity, buy any affordable upgrade* — reaches 2,002 states and finds **only `Speed L1` purchasable**. `Storage L1` costs 15 units against a 10-slot hold; `Defense L1` costs 15; `Storage L2`/`Speed L2`/`Defense L2` cost 20–30 against a hold that can only grow by buying Storage. The meta-wall is reached in the first ~60 s and never announced to the player.
2. **`SAIL` means the opposite of itself.** Dashboard `SAIL` starts a run (`main.js:399`); sea-HUD `SAIL` ends it (`main.js:406`). Same label, same icon, opposite outcome.
3. **`EXPLORE` has two different behaviours.** Dashboard `EXPLORE` = autopilot from anywhere (`main.js:51`); sea `EXPLORE` = land if within 70 px, otherwise autopilot (`main.js:140`).
4. **Island scale contradiction.** An island appears **~98–144 px wide** at sea (sprite drawn at `(r+14)*2`, `r` = 34–58) and becomes **400–520 px wide** on land (`L.r` = 200–260, playable 312–406 px). The same place triples in size when you land on it. The boat is also parked using the *sea* radius, so it is placed inside the land island's footprint.
5. **Auto-pickup makes `COLLECT` redundant** at any moment the player is actually gathering.
6. **`BACK TO BOAT` teleports.** There is no return journey, therefore no return tension — the emotional peak the concept document promises does not exist.

### 2.3 Measured content inventory

| Measured | Value | Source |
|---|---|---|
| Islands per world | 6 | `config.js:25` |
| World bounding box | **706 × 706 px** (all islands visible at once on a 1280×720 screen) | simulated `world.js` |
| Sail time to nearest island | **0.64 – 0.95 s** | 8 simulated worlds |
| Time to strip one island (diff 1 / 2 / 3) | **1.9 s / 4.0 s / 4.5 s** | bot clears all nodes |
| Hits taken while stripping a full island | **1 – 4** (4–22 HP of 100) | same run |
| Player death during a full island clear | **never observed** | 6 runs, all difficulties |
| Total swimmable loot in one world | **44 units** | 6 islands × 7.33 |
| Total cost of all upgrades | **120 units** | `config.js:54` |
| Max hold capacity at any point | **20** (requires unreachable Storage L2) | `inventory.js:6` |
| Fishing load rate | 0.25 items/s, 0 risk → full hold in **~40 s** | `config.js:51` |
| Boat physics | 0.65 s to top speed, speed halves in 0.76 s, coasts 187 px (15 % of screen) | derived from `CFG.BOAT` |
| Player vs zombie speed | 135 vs 42 / 100 px/s → **3.2× / 1.35× faster** | `config.js:14`, `config.js:36` |
| Player DPS | 57.8 (26 dmg / 0.45 s) → Tanks die in 5 swings (2.25 s) | `config.js:18` |
| Collision | boats ↔ islands: none; bullets/projectiles: none | grep |

**Total consumable content in the game: roughly 4 minutes of walking, all of it risk-free, of which ~25 seconds is the actual designed interaction.**

---

## 3. FIRST-TIME PLAYER EXPERIENCE AUDIT

**FIRST 10 SECONDS.** The player sees a dark blue panel with a logo, a 280×110 boat preview with animated wave lines, a Level badge, an HP bar, three stat rows, five buttons, an island info box, a resource box, a meta row, a control-hint paragraph, a reset link, *and a "Lihat Galeri Aset" link to an asset gallery* — a developer tool in the player's first screen. Emotion: *"this is a menu screen."* They learn: nothing about the world. **Fails.**

**FIRST 60 SECONDS.** Most likely path: tap `EXPLORE` (a tempting green button next to "Pulau Terdekat"). The boat **drives itself** to the island in under a second, and the game auto-lands without input. The player is placed on a beach and told to attack, collect, or leave. They walk ~2 s, hoover up 5 icons by proximity, kill or ignore four zombies that cannot catch them, and are told `Storage 6/10`. Emotion: *pleasantly busy, mildly confused about why the boat drove itself.* They learn: movement works; resources fly into you; zombies are slow. **Passes as a tutorial, fails as a hook.**

**FIRST 5 MINUTES.** Repeat for 2–3 islands. Nothing changes. No island behaves differently from another. Every gather is a `+1 Fuel` toast. Nothing is ever at risk. If they open `UPGRADE`, they will find five of six buttons greyed out with "Butuh: 10🪵 5␣" that they cannot satisfy, and — if they are observant — will conclude the game is broken. If they instead fish, they fill the hold in 40 s and buy `Speed L1`, which makes the boat 20 % faster in a world they can already cross in one second. Emotion: *"Is that it?"* **Fails — this is where the player leaves.**

**FIRST DEATH.** Most players will not have one. If they deliberately stand still in a pack of tanks, they will see a full-screen red flash (the same flash used for every zombie bite), the screen locks to a modal, and they lose a resource counter they can refill in 40 s of fishing. They learn: *death is a chore, not a lesson.* **No lesson is available to learn.**

**SECOND RUN.** It is the first run: a new random ring of six islands with the same four resources, the same difficulty labels, and — critically — **the same unreachable upgrade wall**. There is no new capability, no new enemy, no new place, no faster route, no goal. Emotion: none. **There is no answer to "why return", because the game offers no state that changes between runs except the upgrade levels the player cannot buy.**

---

## 4. CORE LOOP AUDIT

Implemented loop, timed by measurement:

```
(dashboard/spoiler panel) → SAIL → [0.8s sail] → [2–4.5s strip island] → teleport back →
(storage 6/10) → UPGRADE (5/6 greyed out) → repeat ×∞
```
**Loop duration: ~6 seconds of designed interaction per cycle. Pressure: none. Decision: none. Escalation: none.**

The loop is *legible* — that is real value and should be preserved. But every stage is missing its psychological payload:

| Stage | Implemented as | Missing | Psychological cost |
|---|---|---|---|
| Leave the boat | 1-second autopilot hop | Farewell moment, provisioning, route choice | No anticipation, no commitment |
| Cross the ocean | Empty 706 px box | Distance, fog, wayfinding, hazard | No uncertainty, no loneliness |
| Arrive at island | Auto-land on proximity | Choice of landing point, first-read of terrain | No agency, no "read the land" |
| Explore inland | 5–9 icons inside a 312–406 px disc | Terrain that slows you, sightlines, dead ends | Exploration is a straight line |
| Gather | Auto-pickup on contact | Interaction time, exposure, interesting placement | Resource collection feels like *walking into icons* — exactly the failure mode named in the brief |
| Fight | Instant 26 dmg + 16 px knockback | Windup, commitment, consequences, audio | Combat is a tax, not a risk |
| Stay | Free. Rewards keep coming. | Any cost per unit time | **The core question is never asked** |
| Turn back | `BACK TO BOAT` teleports | Journey, danger, visible destination | The emotional peak is deleted |
| Bank | Automatic | Ritual, relief, visible reward | No satisfaction, no closure |
| Upgrade | 3 tracks × 2 levels, 1 reachable | Capability, aspiration, goal gradient | Progression dies at minute one |

---

## 5. GAME FEEL AUDIT

**MOVEMENT — SEA (the best thing in the game: 7/10).**
`ACCEL 260`, `MAX 170`, `DRAG 0.985`/frame → 0.65 s to top speed, speed halves in 0.76 s, coasts 187 px. The bow wake appears above 15 px/s and the boat rotates to its velocity vector (`boat.js:47`), so it *reads* as a boat with weight. Two problems: (a) instant auto-landing deletes the skill of docking; (b) there is no arrival beat — you touch the island radius and the screen hard-cuts to land mode.

**MOVEMENT — LAND (4/10).** Direct 135 px/s velocity, no acceleration, no inertia, no footstep rhythm, no turn lag. `p.face` snaps instantly. The contrast between the weighted boat and the weightless walker is jarring; the character feels *slighter than the boat*, which is thematically wrong.

**COMBAT (2/10).** `tryAttack()` picks the nearest zombie in `ATTACK_RANGE + z.radius`, deals 26 instantly, adds 16 px knockback, and provides a 0.22 s arc drawn **after** the hit lands (`land.js:199`, `land.js:416`). So: no windup, no commitment window, no whiff, no recovery punish. Hit feedback = one frame of `brightness(3) saturate(0)` and a HP bar. There is **no audio**. Killing a zombie yields one toast and a random item — no kill confirmation beat, no collapse animation.

**DAMAGE FEEDBACK (2/10).** Zombie contact → `boatHP -= dmg`, `hpFlash = 0.4` → a **full-screen red rectangle at up to 55 % opacity** (`main.js:355`). Used identically for the boat being bitten at sea-adjacent land and for the character. There is no directional indicator, no hit-stop, no invulnerability tell, no hull damage on the boat sprite itself, and no distinction between losing 4 HP and 14 HP.

**COLLECTION (2/10).** Auto-pickup in a 26 px radius while a 22 px sprite bobs up and down. The only feedback is a toast reading `+1 Food · storage 7/10`. No pop, no sound, no arc into the hold, no visual change to the character. And it is *automatic*, so the player never "chooses" to collect. **This is exactly the "walking into icons" failure the brief names.**

**EXPLORATION FEEDBACK (2/10).** Nothing in the world responds to being explored. `visited` darkens grass and appends "· dikunjungi". No landmark, no discovery beat, no cartography, no reward for reaching the far side of an island.

**UPGRADE FEEDBACK (3/10).** A toast (`Storage → Lv.1!`), a panel re-render, and — only if you also cross a total-level threshold — a boat sprite swap. No sound, no hull animation, no sense of work done. The upgrades are numbers, not transformations.

**DEATH FEEDBACK (3/10).** Hard-cut to a modal: `☠ GAME OVER`, a cause string, `Waktu bertahan: 01:12 · Best: 1.2 menit`. No slow-motion, no visible sinking, no moment where the player watches their loot disappear — the only thing they lose is an invisible counter.

**RETURN-TO-BOAT FEEDBACK (1/10).** `backToBoat()` sets state, repositions the boat, and shows a toast: `Kembali ke perahu.` No sound, no light change, no unload animation, no acknowledgement of what was carried. **Leaving the boat and returning to it are emotionally identical.** This is the single clearest gap against Pillar 1 and Pillar 3.

---

## 6. PLAYER PSYCHOLOGY AUDIT

The brief's 11-stage loop, honestly scored:

| # | Stage | Present? | What the player sees / knows / doesn't know | What's missing | Verdict |
|---|---|---|---|---|---|
| 1 | **CURIOSITY** | ✗ | Sees 6 islands with names, difficulty numbers and exact loot counts from any distance. Knows everything. Doesn't know nothing. | Fog, silhouettes, tell-tales, unknown interiors, "what is *inside*" | **Killed by design** — the game answers its own question |
| 2 | **EXPLORATION** | ~ | Movement works and feels good; the destination is deliberately chosen by you never, because autopilot does it | Route choice, landmarks, arrival decisions, terrain that matters | A hop, not a voyage |
| 3 | **UNCERTAINTY** | ✗ | Difficulty number = exact zombie count formula `2+diff*2`; stock is printed | Layout unknown is the *only* unknown, and it's 3 seconds wide | None |
| 4 | **DISCOVERY** | ~ | Empty islands? You saw that on the map. Found loot? It said `⛽2` | Surprise, rarity, risk-tied reward, place identity | Cosmetic |
| 5 | **RISK** | ✗ | Nothing at stake at any moment | Cost of time, cost of distance, cost of greed, meaningful death | **Absent** |
| 6 | **REWARD** | ~ | Resources go up; toasts appear | Weight, rarity, satiety, diminishing returns | Flat |
| 7 | **ESCALATION** | ✗ | Islands are 3 difficulty tiers, rolled at world-gen, unrelated to the player's power or time | Any change over the course of a run | Absent |
| 8 | **RETREAT DECISION** | ✗ | `BACK TO BOAT` is free, instant, always available, and the button is permanently on screen | The decision the game is named after | **The core design failure** |
| 9 | **SAFETY** | ~ | The world brightens? No — nothing changes. HP heals via free food | Relief, homecoming, the boat's warmth | Not communicated |
| 10 | **VISIBLE PROGRESS** | ✗ | One sprite swap, purchasable once; then a wall | The boat growing into *your* boat | Broken |
| 11 | **DESIRE FOR NEXT RUN** | ✗ | Next run = this run | New capability, new place, new risk level, a near-miss goal | Absent |

**Verdict on Pillars:**
- **Pillar 1 (Mobile base / permanent progress): FAILS.** The boat is the player's stat sheet, not their home. It is never seen during a run (you teleport away from it), it cannot be harmed, it cannot be improved past level 1, and it never receives what you loot — the loot goes into an abstract counter.
- **Pillar 2 (Risk vs reward): FAILS.** There is no cost to staying, no loss to fear, and no retreat decision. Risk is a number printed on a label, not a state the player is in.
- **Pillar 3 (Isolation & tension): PARTIALLY.** The art *tries* (dark navy, vignette, lonely ocean) and the palette is coherent — but the ocean is one second wide, and the island transition is a hard cut in both directions, so there is no breathing room to feel.

---

## 7. UI/UX AUDIT

### 7.1 Screen-by-screen

| Screen | Purpose / Emotion now | Primary action | Primary info shown | Problem | Recommended change | Prio |
|---|---|---|---|---|---|---|
| **BOOT** | Load; *neutral* | Wait | Nothing (assets, then dashboard) | Assets load with no progress or identity; a player on a slow connection sees a black screen | Logo + a single loading line over the ocean gradient; preload only what the first screen needs | P2 |
| **HARBOR / DASHBOARD** | Start a run; *"admin"* | `EXPLORE` (accidental) or `SAIL` | 14 data points, 5 buttons, a control-hint paragraph, **an asset-gallery link** | It is a SaaS dashboard that hides the world; the harbor has no physical existence; the button most likely to be pressed is `EXPLORE`, which plays the game for you | Replace with a real harbor scene: walk your character on the deck/pier, the boat visible and *changed*, three diegetic interactables (Workbench, Hold, Chart). Keep the panel only as a compact pre-sail summary | **P1** |
| **OCEAN** | Sail; *"empty"* | Move | 5 chips + timer + storage + prompt + 4 buttons | Whole world visible at once; the ocean carries no information; `SAIL` here means *quit the run* | Heading-compass + fog + one destination marker; HUD reduced to hull + hold + tide + the single context action; rename the quit action `HARBOR` | **P0** |
| **ISLAND** | Explore; *"busy"* | Walk into icons | Same HUD; land buttons appear | 3-second disc; `COLLECT` redundant; no exposure while gathering; auto-collect removes all choice | Timed gather with a visible ring; spread nodes with terrain that blocks; arrival beat (anchor drop) with sound and a brief camera reveal of the island | **P0** |
| **COMBAT** | Threat; *"noise"* | Mash attack | Enemy HP bars, `!` aggro, full-screen red | No windup/commitment; no audio; damage source unreadable at a glance; only one attack pattern | 0.10 s windup + 0.12 s active + 0.23 s recovery; hit-stop 70 ms; knockback 26 px; per-type silhouette + sound identity; directional hurt indicator instead of a full-screen flash | **P0/P1** |
| **LOOT** | Reward; *"bookkeeping"* | Walk near | `+1 Fuel · storage 7/10` | Feedback is pure arithmetic; **"storage 7/10" is a concept, not an experience** | Items arc visibly to the player and then into the boat's hold; the hold is drawn filling up on the deck; show the count only on change, then fade | **P0** |
| **RETURN** | Relief; *"nothing"* | — | — | It is a teleport + toast. There is no journey, no danger, no visible destination | The extraction point is physical (beach/pier/boat). Walking back is the run's climax. On boarding: hull creak, gulls, lantern light, cargo visibly stacking on the deck, the panel counting up | **P0** |
| **UPGRADE** | Progress; *"blocked"* | Close | 3 rows with greyed costs | 5/6 unaffordable forever with no explanation; no picture of *what changes* | Diegetic workbench at the boat; 3 choices, each showing the boat's silhouette *after* the change and the exact cost as icons; a "3 wood short" hint that names the nearest goal | **P0** |
| **DEATH** | Consequence; *"chore"* | `KEMBALI KE HARBOR` | Cause + time + best time | Modal of shame; no slow-motion; no visible loss; the stat shown is meaningless | 0.8 s hull-sinking slow-mo, then a **debrief**: what I lost, what I kept, where my salvage buoy is floating, and one button: the next run's heading | **P1** |
| **RESTART** | Re-entry; *"menu"* | `SAIL` | The same dashboard | Loop closes into a menu instead of into a boat | Restart = a new tide + a new chart + an obvious next goal ("3 wood from Storage") | **P1** |

### 7.2 HUD problems (measured from CSS + `updateHUD`)
- **12 simultaneous readouts**: HP bar, HP text, timer, storage chip, 4 resource chips, contextual prompt, and up to 4 buttons at `min-width: 140px` (110 px on mobile) each.
- The **contextual prompt** (`#hud-prompt`) is a persistent centered banner that most of the time reads `🌊 WASD / Joystick untuk berlayar` — a permanent instruction occupying the screen's focus line. Instructions belong in the first 20 seconds, then never again.
- **Emoji used as iconography in canvas text** (`⛽🪵🍖💊` at `world.js:161`) while 13 hand-made sprite icons sit unused in `assets/ui/`. Emoji render differently on every platform and break the art direction.
- **Critical vs trivial**: `HP` (a number against a number the player can't affect) looks the same as `Fuel` (meaningless) and `Tide` (doesn't exist). Nothing on the HUD is *the* thing.
- **Terminology is mixed**: Indonesian copy (`Kapal`, `Gudang Resource`, `Berlayar!`) with English buttons (`SAIL`, `UPGRADE`, `INVENTORY`, `Storage`, `Speed`, `Best Time`, `Difficulty`) — and `SAIL`/`EXPLORE` each mean two different things.
- **Mobile**: `#hud-bottom` puts a 124 px joystick bottom-left and stacked 110 px buttons bottom-right — with 4 land buttons on a small screen this eats the lower third of a 375 px-wide viewport.

---

## 8. VISUAL DIRECTION AUDIT

**What works.** The navy/teal palette (`#0d283f → #05101b`), the vignette-free ocean gradient, the boat sprite's wood deck + warm lantern, the wake triangle. The boat's warm lantern against cold water is the strongest image in the build — it *is* the game's emotional symbol, and it is currently used only as decoration.

**What fails.**
- **Island sprite geometry mismatch:** a 128×128 clip-art blob drawn at `(r+14)*2` (98–144 px) at sea becomes a 400–520 px landmass in land mode, and the sprite's white halo doesn't exist in the illustrated land version. The two views of "island" share almost no language.
- **Island land art** is three flat dark-green circles on tan — it reads as a placeholder and gives no terrain meaning (no cover, no height, no paths, no landmarks).
- **World text as UI**: names, difficulty, and stock counts drawn directly into the scene (`world.js:148–165`) with `shadowBlur` — this is debug-readout aesthetics, and it destroys mystery.
- **Glassmorphism everywhere**: `backdrop-filter: blur(16px)` panels with 16 px radii on the dashboard, both modals, and the game-over panel with a `0 16px 48px rgba(0,0,0,.65)` shadow and an inner white highlight. That is **2021 web-app styling, and it is in direct conflict with "lonely, beautiful, dangerous."** A survival game's menus should look like objects in the world (wood, canvas, iron, ink), not like frosted glass widgets floating over them.
- **Typography**: Inter for everything, Montserrat for titles, `'Inter', ui-monospace` *as* the monospace font in `.mono` (`style.css:61–64`) — the font stack for numbers is a fallback stack, not a real design decision. Numbers are the game's primary language (HP, slots, costs) and they get the least typographic care.
- **No motion language.** The only animations are toasts (0.25 s), the HP bar width transition, and four sine-wave line loops. Nothing in the *world* animates in response to the player.
- **No day/night, weather, or light state** — so time has no visual meaning, which is why 25 seconds feels like 25 seconds and 5 minutes feels identical.

---

## 9. PROGRESSION AUDIT

**What the player feels when the boat upgrades: nothing, because it can only happen once.**

| Upgrade | Cost | Units vs 10-slot hold | Reachable? | What the player feels |
|---|---|---|---|---|
| Storage L1 | 10🪵 5⛽ | 15 | **No** | — |
| Storage L2 | 20🪵 10⛽ | 30 (needs 20 slots) | **No** | — |
| Speed L1 | 5⛽ 5🪵 | 10 | **Yes (only this)** | *A number changes.* Boat sprite swaps from `boat_lv1` to `boat_lv2` because `boatLevel()` hits 2. |
| Speed L2 | 10⛽ 10🪵 | 20 (needs 15 slots) | **No** | — |
| Defense L1 | 10🪵 5💊 | 15 | **No** | — |
| Defense L2 | 20🪵 10💊 | 30 (needs 20 slots) | **No** | — |

Three structural progression failures:

1. **The ladder is a wall.** Capacity is the gate on every purchase, and the only capacity upgrade costs more than capacity allows. A player who never buys Storage can never buy anything but Speed L1. The intended solution is invisible, and the ordering constraint (Storage *must* be first) is never taught.
2. **The upgrades are statistics, not capabilities.** `+5 slots`, `+20 % speed`, `+20 HP`. None of them opens a new verb, a new route, a new place, or a new way to play. The player's *fantasy* — "this is my boat, I made it" — has nothing to attach to.
3. **The goal gradient starts and ends at the tutorial.** Speed L1 is buyable in ~60 s (mostly by AFK fishing), i.e. the first reward lands during the tutorial and the second one never lands. There is no "the next upgrade is close enough to pursue" moment anywhere in the game's lifetime.

Boat visual progression exists as assets (`boat_lv1/2/3`) and is correctly tiered by intent — but the threshold `boatLevel() >= 4` requires *four* purchases, and only one is possible. **Two of three boat sprites are unreachable content.**

---

## 10. TOP 10 PROBLEMS (ranked by impact)

### P1 — Zero cost to time. The game's core question is never asked.
- **Why it matters:** the design's entire identity is *"how far am I willing to go before I turn back?"* — a question that requires a rising cost. There is no clock, no weather, no reinforcement, no supply burn, no fatigue. Staying longer is strictly better, always.
- **Player impact:** no tension, no rhythm, no anticipation, no relief. All four emotions in the pitch are unreachable. Sessions are short because there is nothing left to do, not because anything pushed them out.
- **Severity: CRITICAL.**
- **Solution (P0):** one pressure system, *the Tide*: a run-level clock that at first is ambience (water tone shifts, gull calls stop, light warms), then becomes information (the water line visibly advances up the beach), then becomes teeth (island reinforcement waves every ~20 s; hull accrual damage if caught at sea in high tide). The player can leave at any moment and always knows it. **Do not add a bar that says "DANGER"** — the world itself must communicate it (brief §14).

### P2 — The progression system is mathematically unsolvable.
- **Why it matters:** this is content the team paid to build and the player can never touch. Only 1 of 6 upgrades is reachable in the entire lifetime of a save (BFS over 2,002 states).
- **Player impact:** the player concludes the game is broken, or (worse) that they are bad at it. The meta-game dies in minute two, silently.
- **Severity: CRITICAL.**
- **Solution (P0):** rescale capacity vs cost so the first two purchases fit inside one good run; reorder the ladder to `Storage → Speed → Hull` with each step *requiring* the previous; replace flat stats with capabilities; add a named next-goal hint on the dashboard; add a `tests/` case that asserts *every* defined upgrade is reachable within N runs (regression guard).

### P3 — Islands are 3-second affairs.
- **Why it matters:** the game's richest space (the island, the risk) hosts 1.9–4.5 s of interaction. 312–406 px of playable disc is smaller than one arm's reach of pacing — you can see every node from the dock.
- **Player impact:** exploration isn't exploration; it's a shopping list you can see in full from the doorway. **The player never gets the feeling of going deeper, only fetching.**
- **Severity: CRITICAL.**
- **Solution (P0):** target 45–90 s per island: expand the land disc 3–4× and make it *push inward*; place nodes in natural clusters with the richest inland; make gathering take 0.8–1.2 s of exposure; add terrain that blocks sightlines and pathing; make the waterline/pier a specific reachable place.

### P4 — The retreat is not a decision: `BACK TO BOAT` is a free teleport from anywhere.
- **Why it matters:** the game is named after the retreat. Making it instant and costless deletes the pillar the project is built on.
- **Player impact:** no tension spike, no relief, no homecoming. Leaving and returning are the same non-event.
- **Severity: CRITICAL.**
- **Solution (P0):** the extraction point is physical — you must reach the boat/pier to leave. `BACK TO BOAT` becomes a *compass hint* ("boat: 40 m that way"), not a teleport. The walk back becomes the run's climax (the player is carrying everything).

### P5 — No loss aversion: nothing of value can be lost, and death is nearly unreachable.
- **Why it matters:** the resource counter is abstracted from any decision, and the naive-bot run took 1–4 hits per full island clear. A survival game where you never die has removed its own genre.
- **Player impact:** the player takes no meaningful action differently because of danger. All of the risk-vs-reward texture in the pitch is absent.
- **Severity: CRITICAL.**
- **Solution (P0):** make carried loot a physical stake — it is only *yours* once it is on the boat, and it drops with you when you fall. Escalate enemy presence so that a greedy, careless, or slow player dies. Then make the loss recoverable so it becomes *meaningful rather than punishing*: the next run reveals a **salvage buoy** at the death site. That converts a frustrating loss into the strongest possible "one more run" hook — **an existing, specific, personal goal**.

### P6 — Omniscient information destroys curiosity (Pillar 3).
- **Why it matters:** island name, difficulty, and exact remaining loot counts are printed into the world from any distance (`world.js:148–165`). Mystery is a design resource and it is being spent at 100 % disclosure on frame one.
- **Player impact:** no anticipation, no discovery, no reason to sail toward anything rather than the nearest thing. The ocean is a spreadsheet with waves.
- **Severity: HIGH.**
- **Solution (P0):** remove numeric readouts from the world. Give each island a *distant identity* that hints without stating — pale smoke plume, circling gulls, a black sand ring, a red sky glow, a wrecked hull, a tower silhouette. The player chooses risk by *reading* the horizon. Exact numbers are revealed only when close enough to see the beach.

### P7 — The ocean is one screen wide and takes one second to cross.
- **Why it matters:** measured 706 × 706 px for the entire world; nearest island 0.64–0.95 s away; boat coasts 187 px (15 % of a screen). The pitch calls for "large, quiet, lonely, uncertain, beautiful" — none of those emotions survive at this scale.
- **Player impact:** no voyage, no distance cost, no loneliness, no navigation decision (which is *also* why autopilot removes nothing — there was nothing to remove).
- **Severity: HIGH.**
- **Solution (P0/P1):** island spacing of 1.5–3 screens (≈2,000–4,000 px), 6–9 islands along a *route* rather than a ring, fog/unknown beyond ~1.5 screens, a heading compass with the last-known positions of charted islands, and a visible horizon that implies more world. Remove the "go to nearest island for me" autopilot; instead allow *setting a heading* that you still have to steer along.

### P8 — The harbor — the emotional centre of the game — does not exist.
- **Why it matters:** Pillar 1 says the boat is the player's home. In the implementation it is a hidden DOM panel with a 280×110 preview canvas and five buttons, plus an asset-viewer link. The player never *is* in the harbor; they are in a menu.
- **Player impact:** no ritual, no pride, no homecoming, no sense of ownership. The player's relationship with the boat is a relationship with a spreadsheet.
- **Severity: HIGH.**
- **Solution (P1):** a real harbor space: walk the deck/pier as the character; the hold visibly full of last run's cargo; the workbench, the chart table, and the boat itself as interactables; the lantern the only warm light in the world. Keep the panel only as an optional summary, never as the primary screen.

### P9 — Feedback desert: no audio, and almost no systemic response.
- **Why it matters:** audio is the cheapest and most powerful feedback channel in the medium, and the project contains **zero** of it — no code, no assets. Visually: the same full-screen red rectangle reports a 4-damage bite and a 14-damage tank hit; attacks land before their animation plays; collection is a text toast.
- **Player impact:** actions feel inert. The single most common complaint about prototypes like this — *"it feels like a tech demo"* — is this problem when everything else is working.
- **Severity: HIGH.**
- **Solution (P0/P1):** a small synthesized (WebAudio) or minimal-file SFX set — gather clunk, item pop, swing whoosh, impact thud, zombie groan (per type), hull creak, water, gulls, upgrade forge-hit, death sink. Add hit-stop 70 ms, knockback 26 px, directional hurt indicator instead of a full-screen flash, and camera shake capped at 3 px. **This is the highest emotion-per-hour change available in the whole document** — and the least risky.

### P10 — Terminology and UI contradictions teach the wrong things.
- **Why it matters:** `SAIL` starts the game in one place and quits the run in another; `EXPLORE` autopilots from the dashboard and lands from the HUD; `COLLECT` duplicates auto-pickup; the timer measures a nothing-event; a developer's asset gallery is linked from the player's first screen; `Level 7` is a meaningless sum; the copy mixes Indonesian and English.
- **Player impact:** ongoing low-grade confusion. Non-gamers in particular will not recover from a button that does the opposite of its name — and they are this project's stated target.
- **Severity: MEDIUM-HIGH** (but very cheap to fix, which is why it ranks here).
- **Solution (P1, cheap):** one verb per concept. `SAIL` = leave harbor. `HARBOR` = end the run (only at the boat). `LAND` = go ashore (near shore only). `PUSH OFF` = return to the boat. Delete the timer, the level badge, and the asset-gallery link. Pick one language for the UI and hold it. Replace emoji with the existing sprite icons.

---

## 11. TOP 10 OPPORTUNITIES (ranked by expected impact, not effort)

| # | Opportunity | What it fixes | Expected impact | Effort | Prio |
|---|---|---|---|---|---|
| 1 | **Bank-at-the-boat** — loot is only yours once it's aboard; it drops with you when you fall | Problems 4, 5, 8 + Pillars 1 & 2 | **Transformative.** Creates the retreat decision, gives the boat a structural role, makes every walk inland a bet. | S — a `carried` vs `banked` split in `inventory.js`, plus a drop-on-death rule | **P0** |
| 2 | **The Tide** — one run clock that is ambience → information → teeth | Problems 1, 6 + Pillar 3 | **Transformative.** The only mechanism that can produce tension→release inside a 10-minute session. | M — a clock, world tinting, 2 spawn triggers | **P0** |
| 3 | **Exposure gathering** — 0.8–1.2 s hold-to-gather with a progress ring | Problem 3 + "walking into icons" | **Very high.** Converts the most repeated verb from walking into *risking*, and gives fast/tank zombies a purpose. | S — one timer, one ring draw, one interruption rule | **P0** |
| 4 | **Capability upgrades + visible boat transformation** — each purchase adds a part you can see and a verb you didn't have | Problem 2 + Pillar 1 | **Very high.** Turns the boat into the player's autobiography; gives the goal gradient something to point at. | M — 3 upgrades redefined, silhouette layers drawn on the deck | **P0** |
| 5 | **Physical extraction point** (beach/pier/boat) | Problems 3, 4, 6 | **Very high.** The run gains a shape: departure, inland push, return. The pier geometry already exists in `land.js:296`. | S | **P0** |
| 6 | **Island identity at a distance** — tell-tales seen from the horizon (smoke, gulls, red sky, black sand, wrecks) | Problem 6 + Pillar 3 | **High.** Restores curiosity and makes risk a *choice between visible options* rather than a dice roll. | M — one hint field per island + horizon rendering | **P0/P1** |
| 7 | **The boat is your life, and they are eating it** — make the shared `boatHP` explicit: the hull *is* your health; when you're bitten ashore, the boat visibly takes the damage | Problem 5 | **High.** Zero new systems: the mechanic already exists (`land.js:161` writes to `G.boatHP`) and is currently hidden. Massive thematic payoff. | S — HUD relabel + hull-hit visual + audio | **P0** |
| 8 | **Salvage buoy** — death leaves a recoverable cargo marker in the world | Problem 5 (the "frustrating vs meaningful" balance) | **High.** The strongest "one more run" hook available: it gives the next run a personal, specific objective. | S/M — one persistent world marker + save field | **P1** |
| 9 | **Arrival & departure beats** — anchor splash, gulls, lantern light, camera reveal on landing; hull creak and cargo stacking on boarding | Problems 4, 8, 9 | **High.** Cheap, and it is the difference between "a state change" and "coming home". | S | **P0/P1** |
| 10 | **Run debrief with a goal gradient** — "you were 3 wood from Storage 2", plus the next heading already chosen | Problem 2, 11-stage loop §11 | **High.** Makes the session end on a *plan* instead of a menu — this is the literal "one more run" trigger. | S | **P1** |

---

## 12. REDESIGNED CORE LOOP (the ideal 8–12 minute session)

**Design law:** the boat is **safety + bank + progress**; the island is **opportunity + clock + loss**. The player must always be able to answer *"how far am I willing to go before I turn back?"* — and the answer must change every 30 seconds.

```
HARBOR (60s) → SAIL (60–90s) → SHORE (20s) → INLAND (2–4min) → THE TURN (a moment) → RETURN (60–90s) → BANK (30s) → DEBRIEF (20s) → NEXT RUN
```

| Stage | Duration | What the player sees / knows / wants | What can go wrong | Feedback | Why they continue |
|---|---|---|---|---|---|
| **1. HARBOR** | 45–90 s | Stands on their own boat. Cargo from last run is stacked on the deck. Three interactables: **Workbench** (spend), **Hold** (see what's aboard), **Chart** (choose the next island from tell-tales). Knows exactly how far they are from the next upgrade. | Wasting a run by provisioning badly; leaving with an empty hold | Lantern light, hull creak, gulls, a full-deck silhouette that changed since last time | A specific, visible, affordable goal sits 1 run away — or 3 wood away |
| **2. SAIL** | 60–120 s | Open water, fog beyond the horizon, a heading marker, the tide tint. One decision: **the near island (safe, thin) or the far one (rich, deep)**. | Getting caught out when the tide turns; drifted off-course; running into a reef/wreck | Bow wave, water tone shift, chart pips, distance-to-shore readout | Anticipation — the island resolves out of fog into a *specific place* |
| **3. SHORE** | 10–20 s | The anchor drops; the camera reveals the island's shape; the climb from beach to interior. | Landing at a bad spot with a bad read on the interior | Anchor splash, sand-to-grass audio change, a 1.5 s wide shot | Curiosity — the interior is *not* legible from the beach |
| **4. INLAND** | 2–4 min in 3 escalating phases | **Calm (0–40 s):** learn the layout, see where the loot clusters, spot the first zombie at a distance. **Contact (40–90 s):** the first chase; the player discovers that gathering locks them in place. **Rising (90 s+):** the light warms, the water climbs, reinforcements arrive in waves from the tree line. The player weighs *one more node* against the load they're carrying. | Being surrounded while gathering; a tank cutting off the path back; the tide reaching the beach while you're still inland | Per-zombie audio identity, gather-ring tension, tide tint, the visible waterline creeping, a hull bar that *is* your life | **THE RISK** — every node deeper is worth the same but costs more |
| **5. THE TURN** | a moment | The player stops, looks at their hold, looks at the water, and decides. There is no prompt. This is the game. | Staying too long → losing everything; leaving too early → not affording the upgrade | Their own judgment, plus the world's signals | Agency — it is *their* decision, with their own information |
| **6. RETURN** | 60–120 s | The run's climax. Carrying everything. The boat is a specific visible object at the waterline, lantern already lit. Zombies follow to the water's edge. | Dying 20 m from the boat — the strongest possible story, and the reason the salvage buoy exists | Hull creak and gull calls rising in the mix as you approach; a warm light pool; shoreline sounds | Relief — **the only place in the world that is safe** |
| **7. BANK** | 15–30 s | Cargo unloads visibly onto the deck. The hold count commits. The hull is patched. | Realizing you came back 2 short | Item-into-box *clunks*, the deck stack growing, a satisfying commit sound | Progress — the number that matters just moved |
| **8. DEBRIEF + UPGRADE** | 20–40 s | "3 wood from Storage 2." The workbench shows the boat's silhouette *after* the change. First visit: buy it and *see the boat change*. | Nothing — this screen should be frictionless | The boat sprite transforms; new part visible; new verb available | **"One more run"** — the next goal is now specific and small |
| **9. NEXT RUN** | — | The chart already shows the tide and two candidate islands. | — | A new world, new tell-tales, the salvage buoy on the chart | The world changed *and* the player changed |

**Session budget: a complete, satisfying session is 8–12 minutes, of which 3–5 minutes is the dangerous middle where the actual decision lives.**

---

## 13. GAME UI ARCHITECTURE

**Rule: world first, HUD second, menus third.** Any element that cannot answer "does the player need this *right now*?" is removed, hidden, or contextualized.

### 13.1 Persistent HUD during play (maximum 4 elements)
1. **HULL** — the player's life, top-left, one compact bar with a numeric only on change. This is health, the boat, and the run, all in one. It must pulse and *sound* when it takes damage, and it must be the most visually authoritative element on screen.
2. **HOLD** — how full you are, drawn as a small deck-stack gauge (pips pile up, they don't just count). **Never show resources as four separate counts during a run** — the composition of the cargo is discoverable at the boat.
3. **TIDE** — a single, thin arc or horizon-tint indicator with three legible states (*calm / turning / high*). Not a number, not a countdown in early play; the world sells it and the arc confirms it.
4. **ONE context action**, bottom-right, whose label is whatever the player can actually do *there* (`LAND`, `GATHER`, `PUSH OFF`). Disabled states are eliminated by hiding the button when the action is impossible.

Explicitly removed from the HUD: run timer, storage counter, four resource chips, level badge, permanent control-hint banner, autopilot indicator, and the second/third/fourth action buttons.

### 13.2 Contextual prompts
Proximity-based, ~14 words maximum, and they **disappear after the player demonstrates the action once** (per-session flag, persisted). Examples: `Hold to gather` (first node only) · `The water is rising` (first tide turn, once) · `The boat is that way` (when the player crosses a distance threshold with a full hold). Never a permanent instruction banner.

### 13.3 World interaction indicators
- **Gatherable**: a subtle ground ring + a soft glint that syncs with a low "shimmer" tone; brightens inside gather range.
- **Gathering**: a 360° progress ring around the node **and** a visible vulnerability tell on the player (they are committed and cannot move).
- **Threat**: silhouette + audio identity per type; an aggro tell that reads at a glance (a lunge, a screech) without floating `!` glyphs; **no HP bars on trash mobs** — instead staggered flinches, a wound state, and a distinct "about to die" tell. Reserve HP bars for the tank/elite only.
- **Safety**: the boat has a warm light pool on the water; the pier is a distinct material with distinct footsteps. Safety must be *visible from inland through the trees* — always give the player one sightline home.

### 13.4 Inventory
Not a modal and not a menu item. The hold is a **physical thing on the boat**: look at the deck, see your cargo stacked; the composition is legible at a glance by silhouette and colour. A textual ledger exists only at the boat, one tap away, and can be closed with the same tap. Medical items are used **in the world** (a quick-use radial or a held slot), never from a menu, because using medicine in a menu during a chase is a design failure.

### 13.5 Upgrade interface
Diegetic: the **Workbench** on the boat. Three choices, one screen, no scroll, each row showing (a) a small silhouette of the boat *after* this upgrade with the new part highlighted, (b) the capability gained in 4–6 words (*"Carry 5 more"*, *"Sail faster than the tide"*, *"Patch the hull"*), (c) the exact cost as the same sprite icons the player has been picking up all game, and (d) — when unaffordable — the **single closest goal**: *"3 wood away."* One purchase per tap, with a forge/knock sound and an immediate visible change on the boat.

### 13.6 Death screen
**Not a modal of shame.** Sequence: 0.8 s slow-motion of the hull going under and the cargo silhouette washing away → a debrief that answers three questions in this order: **what I lost** (with its physical icon stack), **what I kept** (the boat's upgrades, still yours), **where my salvage is** (a floating buoy marker placed on the chart). One primary button: `SAIL AGAIN`, which lands the player in the harbor with a heading already suggested. Secondary: `HARBOR`.

### 13.7 Reward feedback
Three tiers, and every reward must be *placeable on the boat*:
- **Micro (every gather):** 120 ms pop, arc-to-player animation, sound, small hold-pip increment. No text.
- **Medium (a full hold / a rare find):** a distinct audio sting, a brief camera pull-back, the hold gauge visibly fuller, the deck stack growing.
- **Macro (banking a run / buying an upgrade):** the boat visibly changes. New parts, new light, new sound. **The boat is the reward display.**

### 13.8 Progression feedback
Progress must be readable **from the water**, not from a text list. The boat's silhouette, light, and wake change with every purchase. The player should be able to recognize their own boat's growth in a single glance from a distance — that recognition is the entire "This is MY boat" payload.

---

## 14. GAME FEEL BLUEPRINT

| System | Specification |
|---|---|
| **Sea movement** | Keep `ACCEL 260 / MAX 170 / DRAG 0.985` (measured: 0.65 s to speed, 0.76 s half-life, 187 px coast) — it already feels like a small heavy boat. Increase the *readable* weight instead of the numbers: bow wave intensity scales with speed, a wake ribbon persists ~2 s, a subtle hull roll (±2°) on acceleration, camera lags the boat by ~12 % and leads ~6 % in the direction of travel. |
| **Docking** | Remove instant auto-land at `dist < r+42`. Within the dock radius the boat's speed drops (shallow water), and landing requires the `LAND` action or a low-speed touch. **The player must perform the arrival.** |
| **Land movement** | Add a 90 ms accel ramp and a 70 ms decel ramp (currently instant). Player top speed stays 135 px/s (existing zombie speed relationships hold: 3.2× a shambler, 1.35× a runner). Turning: interpolate `p.face` over ~80 ms rather than snapping. Footsteps change material beach↔interior. |
| **Gathering** | 0.8 s for a small node, 1.2 s for a rich one. Movement is blocked during the gather (this is the entire risk mechanic). Interruption *preserves nothing* — being hit mid-gather drops the partial? **No:** interruption cancels and the node remains at its reduced state; punishing, never punishing-with-loss-of-a-completed-item. Sound: a rising 3-note tick ending in a solid "clunk". |
| **Combat** | `windup 0.10 s` (no damage) → `active 0.12 s` (damage + 26 px knockback, hit-stop 70 ms) → `recovery 0.23 s` (vulnerable, cannot act). Total 0.45 s = the current cooldown, so difficulty is unchanged by construction while *commitment* is introduced. Swing arc drawn during windup/active rather than after impact. Whiff = a distinct lighter whoosh so the player hears the miss. |
| **Hit feedback (dealt)** | Hit-stop 70 ms · knockback 26 px · sprite flash 90 ms · impact sound with per-type pitch (shambler low thud, runner wet snap, tank metal clang) · 2 px camera nudge along the hit vector · a 1-frame white impact star at the contact point. |
| **Hit feedback (taken)** | **Delete the full-screen red rectangle.** Replace with: a directional edge arc pointing at the attacker (fades 600 ms) · 2 px screen shake · a sharp hurt sound · 0.25 s of invulnerability with a visible tell · **the hull bar visibly damaged at the top of the screen with a splinter sound**. Severity scales with damage: 4 HP is a grunt, 14 HP is a crack. |
| **Kill confirmation** | Zombie collapses over 0.22 s (sprite squashes, not vanishes), a small loot pop with an arc into the player, a decisive kill sound. Kills are how the player learns they are getting stronger — the feedback must be *satisfying*, not just informative. |
| **Collection** | Item arcs from the node to the player over ~180 ms with a slight overshoot, lands in a "hold" that visibly thickens the deck stack on the boat. Counts appear only on change and fade in 0.8 s. |
| **Exploration** | The camera reveals 1.5 screens of a new island on landing (a 1.2 s pull-back, then settle). Terrain blocks sightlines so the interior is *earned*. Reaching the far side of an island for the first time gives a discovery sting and a chart entry. |
| **Tide / time** | Four sensory channels, no nagging UI: (1) light — warmth at calm, cold blue at turning, near-black with a red horizon at high; (2) water — the line visibly climbs the beach in discrete steps the player can watch; (3) audio — gulls stop, wind rises, and a low tide drone enters; (4) reinforcement — new zombies walk in from the tree line in visible groups (never pop into existence). |
| **Return to boat** | The distinct audio and visual identity of home: gull layer returns, a warm lantern light pool, the hull creak under your feet, the deck stack of previously-banked cargo. On boarding there is a short black-bar "commit" moment (0.6 s) where the cargo silhouette lands on the deck with a sound and the hold count commits. **This beat is the reward for the entire run — it must be the most satisfying 600 ms in the game.** |
| **Upgrade** | Forge sound, 0.3 s of the boat sprite animating its new part into place, a light flare from the lantern, and the boat's idle bob changing slightly (heavier, more stable). Nothing about this screen should feel like a shop; it should feel like *work on your own vessel*. |
| **Death** | 0.8 s slow-motion (time scale 0.25) of the hull sinking, cargo silhouettes drifting away, then the debrief. Audio drops to a low drone and one distant gull — the world is indifferent, not triumphant. No modal styling, no red text, no exclamation marks. |
| **Audio inventory (build this early)** | gather tick + clunk, item pop, swing whoosh, whiff, per-type impact, per-type idle growl, per-type aggro screech, hurt grunt, hull crack, water slap, shore wash, gulls (near/far), wind rise, tide drone, anchor drop, deck creak, forge hit, coin/bank commit, death sink. **~20 sounds; the highest emotion-per-hour investment in this document.** |

---

## 15. PSYCHOLOGICAL DESIGN BLUEPRINT

| Emotion | Mechanism that produces it (in this game, with this codebase) |
|---|---|
| **CURIOSITY** | Islands read as **tell-tales** at a distance (smoke, circling gulls, a red sky glow, a black sand ring, a shipwreck, a tower) and their interiors are never legible from the water. Remove numeric stock/difficulty readouts from the world. The player's question must be *"what is on that one?"*, not *"how much fuel does that one have?"* |
| **ANTICIPATION** | A 60–120 s voyage to a place you chose because of what you think you saw, plus the arrival beat (anchor splash, camera reveal, sand-to-grass audio). The island resolves out of fog — the reveal is the reward for the crossing. |
| **UNCERTAINTY** | Interior layout, node quality, zombie composition, and prize placement are all hidden until you commit. Tell-tales are *honest but imprecise* — enough signal to be a fair bet, never enough to be a certainty. |
| **RISK** | Carried loot is not yet yours. Gathering locks you in place for 0.8–1.2 s. The tide reinforces the island over time. Every step inland is worth the same but costs more. |
| **REWARD** | Three-tier feedback (pop / sting / transformation) with every reward *physically placeable on the boat*. Rarity is tied to risk — the deepest, most tide-battered nodes hold the best cargo. |
| **LOSS** | Death drops the carried hold (not the banked hold, not the boat's upgrades). Loss is bounded, physical, visible, and — crucially — the *player chose* the exposure that caused it. |
| **RELIEF** | A single safe place in the world with a distinct sensory signature (warm light, gulls, creaking deck) that is visible from inland through the trees, and a 600 ms commit beat where the cargo finally lands on the deck. |
| **PROGRESSION** | Three upgrades that each add a **capability** and a **visible boat part**; a first purchase inside one good run; a named nearest goal on every screen ("3 wood away"); a ladder whose rungs *require* each other so the player always knows what to want next. |
| **MASTERY** | Legible emergent knowledge instead of stats: which zombie lures can be out-walked (*shamblers: yes, 3.2× speed margin; runners: only with a head start*), how many gather-cycles fit inside one tide phase, when the waterline cuts off a route, how far inland is too far given what's in your hands, and which region of a charted island still holds cargo from a previous visit. |
| **"ONE MORE RUN"** | Never end a session on a menu. End it on a **plan**: a named goal 1–3 materials away, a salvage buoy waiting at a place the player has already been, and a fresh world with new tell-tales. |

**Failure–frustration balance (explicit design rule):** when the player dies, the *cause* must be traceable to a decision they made and can revise ("I kept gathering while the water was rising"), and the *cost* must be recoverable ("my salvage is floating at the north beach"). Losses that are neither explainable nor recoverable make players quit; losses that are both make them try again.

---

## 16. P0 / P1 / P2 / P3 ROADMAP

### P0 — CORE FUN (the game is fundamentally weak without these)
| # | Change | Files | Effort |
|---|---|---|---|
| P0.1 | **Bank vs carry**: loot is only banked at the boat; carried loot drops on death | `inventory.js`, `main.js die()`, `land.js` | S |
| P0.2 | **The Tide**: one run clock; light/water/audio escalation; land reinforcement waves; sea hull accrual at high tide | new `tide.js`, `main.js`, `land.js`, `world.js` | M |
| P0.3 | **Physical extraction**: must reach the beach/pier/boat to leave; `BACK TO BOAT` becomes a directional hint | `land.js`, `main.js`, `ui.js` | S |
| P0.4 | **Exposure gathering**: 0.8–1.2 s hold-to-gather with a progress ring, movement locked, interrupted by damage | `land.js`, `input.js`, `ui.js` | S |
| P0.5 | **Economy repair**: capacity/cost rescaling, ordered ladder, capability upgrades, nearest-goal hint, regression test | `config.js`, `inventory.js`, `ui.js`, `tests/` | S–M |
| P0.6 | **Island scale & interior**: 3–4× land area, node clusters, richer interior, blocked sightlines, richer nodes deeper | `config.js`, `land.js` | M |
| P0.7 | **De-spoiler the world**: remove numeric readouts; add distant tell-tales; reveal on approach | `world.js`, `ui.js` | S |
| P0.8 | **Sea scale**: island spacing 2,000–4,000 px, route layout, fog beyond ~1.5 screens, compass + last-known chart | `config.js`, `world.js`, `ui.js` | M |
| P0.9 | **Core feedback pass**: hit-stop, knockback, directional hurt arc (delete the full-screen flash), gather/kill/board sounds, camera micro-shake | `land.js`, `main.js`, new `audio.js` | M |
| P0.10 | **Terminology & HUD reduction**: one verb per concept, 4-element HUD, kill the timer/level badge/asset link, sprite icons instead of emoji | `index.html`, `ui.js`, `style.css` | S |

### P1 — MAJOR EXPERIENCE
- **Physical harbor scene** (walk the deck/pier; workbench, hold, chart as interactables) — the single biggest emotional upgrade after P0.
- **Salvage buoy**: death leaves recoverable cargo; shown on the chart; the personal hook for the next run.
- **Arrival / departure / bank beats**: anchor drop, camera reveal, 600 ms cargo-commit moment.
- **Run debrief + goal gradient**: "3 wood from Storage 2", next heading pre-selected.
- **Boat transformation**: layered parts on the hull per purchase; recognisable at a distance.
- **Threat readability**: per-type silhouette, gait, sound, and death tells; HP bars only on elites.
- **Zombie variety within a type** (the tank that blocks a path, the runner that swarms), plus a wolf-pack ambush behaviour so interiors can surprise a confident player.

### P2 — POLISH
- Island art pass: terrain that reads (cover, elevation, paths, landmark silhouettes); matched sea/land island geometry (fix the 3–4× scale contradiction and the boat-parked-inside-the-island bug).
- Weather (rain, fog banks) as a *tide-phase variant*, not a separate system.
- Chart/journal: discovered islands, cargo left behind, salvage markers.
- Full audio mix pass: ducking, distance attenuation, tide-phase music bed.
- Camera work: lead/lag tuning, discovery wides, death framing.
- Mobile ergonomics: one-thumb action placement, safe-area insets, haptics on hits and gathers.
- Landing/island-number readouts revealed only within visual range.

### P3 — FUTURE (do not build now)
- Deeper fishing (a real risk/reward verb instead of an AFK faucet), cooking, crafting — **only** if they add a cost or a decision. Current fishing should be reduced, not expanded.
- A meta-progression tree across runs (permanent unlocks that change *how* you play, not just numbers).
- Multiple biomes / archipelago regions with distinct tide behaviour.
- **Rejected for now:** PvP and multiplayer. They multiply the two things the game lacks (reasons to sail, reasons to be afraid) without creating either. They would also destroy Pillar 3 (isolation). Revisit only after the single-player loop holds a player for 20 minutes voluntarily.

### Cut list (anti-feature-crawl)
| Cut | Reason |
|---|---|
| `ANCHOR` | Solves a non-problem (no drift exists). Fold its one useful effect into fishing. |
| Run timer + `Best Time` | Measures a nothing-event and rewards AFK fishing. |
| `Level 1–7` badge | Sum of unrelated tracks; no gameplay meaning. |
| Dashboard `EXPLORE` (autopilot) | Removes the only piece of seamanship; replaces the player's decision with a button. |
| Storage as a plain +5 stat | Reframe as a *capability* with a visible boat part. |
| Fishing as a free parallel faucet | Currently dominates island raiding in safety and speed (0.25 items/s, 0 risk, full hold in 40 s). Keep it, cost it: bait, a tide/PvE exposure, and reduced yield inland-value. |
| Asset-gallery link in the player's UI | A developer tool in the player's first screen. |
| Full-screen red damage rectangle | Replaced by directional damage feedback. |
| Emoji as world iconography | Replaced by the existing sprite icons. |
| Difficulty/stock text in the world | Replaced by readable tell-tales. |

---

## 17. PHASE-BY-PHASE IMPLEMENTATION PLAN

Each phase is independently shippable, testable, and ordered so the game is *more fun* at the end of every one.

**Phase 0 — Stop the bleeding (1 session).** Fix the contradictions, no design risk: `SAIL`/`HARBOR` split; remove the dashboard autopilot; delete the timer, level badge, asset link, and emoji labels; HUD reduced to four elements; bring the smoke suite green with a new test asserting `SAIL` semantics and economy reachability.
*Acceptance:* a first-time player can correctly state what every visible button does.

**Phase 1 — The stakes (the core-fun phase).** P0.1 + P0.3 + P0.4: bank-vs-carry, physical extraction, exposure gathering; a new `carried`/`banked` split in inventory; the pier becomes a real location; the boat is a reachable object on the beach.
*Acceptance:* median island time ≥ 45 s; **at least 3 retreat decisions per run** (measurable: count of "hold ≥ 60 % full and player still gains cargo"); the game can be lost.

**Phase 2 — The clock.** P0.2: the Tide, with light/water/audio escalation, land reinforcement waves, and sea risk at high tide.
*Acceptance:* unaided players can describe the tide's three states after one run; 15–30 % of runs end in death *or* a forced early exit; run length distribution has a clear peak between 6 and 12 minutes.

**Phase 3 — The ladder and the boat.** P0.5 + P0.6 + P1 boat transformation: economy rescale, capability upgrades, layered hull parts, nearest-goal hints, debrief. Island interiors expanded.
*Acceptance:* ≥ 2 purchases possible in the first two runs; every defined upgrade reachable (regression test); a player can point at the screen and say which part of the boat they bought.

**Phase 4 — The world.** P0.7 + P0.8 + P1 harbor scene + salvage buoy: de-spoilered islands, tell-tales, sea scale, fog, chart, compass, physical harbor, recoverable death.
*Acceptance:* players choose destinations for stated reasons ("I saw smoke") rather than proximity; ≥ 1 instance of a player voluntarily diverting; the harbor is described as a place, not a menu.

**Phase 5 — Feel.** P0.9 + P1 threat readability + P2 audio mix: full feedback pass and audio inventory.
*Acceptance:* blind-playtest — with the screen off, a player can tell gather, hit, hurt, kill, and bank apart from sound alone.

**Phase 6 — Polish & meta.** P2 items, then decide on P3 based on retention data (does anyone voluntarily reach a third run without being asked?).

---

## 18. FINAL GAME DESIGN NORTH STAR

> **Last Harbor is a game about the walk back.**
>
> The boat is the only safe place in the world, and it is also your body: its hull is your life, its hold is your fortune, and its silhouette is the story of what you have survived. The island is a bet you place with your own legs — everything you pick up belongs to the sea until it is stacked on your deck, and the water is always rising while you decide. There is never a prompt telling you it is time to leave. There is only the light going cold, the gulls going quiet, the water climbing the sand, and the question:
>
> **"How far am I willing to go before I turn back?"**
>
> Every system in the game must serve that question. If a feature does not make the player *ask it more often* or *answer it differently*, it does not ship — no matter how impressive it looks in a design document.

**The single test for any future proposal:** *does it change how the player answers the question?* If two mechanics produce the same answer, ship the simpler one.

---

## APPENDIX A — Measurement method (reproducible)

All empirical claims above were produced against the real game modules with **no rendering**, using Node 22 and the project's own ES modules. Two harnesses:

1. **Economy reachability (the "unsolvable progression" finding).** Breadth-first search over `(upgrades, inventory)` states. Transitions: add 1 unit of any resource if `usedStorage() < capacity()`, or pay for any affordable upgrade level. Result: 2,002 reachable states; only `Speed L1` is ever purchasable. Consequences: `Storage L1` (15 units) > capacity 10; `Speed L2` (20) and all level-2 tiers (30) require `Storage L2` (20 slots) which requires `Storage L1`. This is a 30-line script; **it should be turned into a permanent `tests/` assertion so the economy can never silently wall off again.**
2. **Run simulation.** `generateSeaWorld()` + `enterIsland()` + a naive bot (walk to the nearest untaken node; attack when a zombie is within `ATTACK_RANGE + radius`; step `updateLand(1/60, move)`), with `document`/`requestAnimationFrame` stubs and `initUI({})` so `toast()` runs headless. Results: island clear 1.9 / 4.0 / 4.5 s by difficulty; 1–4 hits taken; 74–92 HP remaining; nearest-island sail distance 109–162 px; 8 generated worlds all placed all six islands within a 706 px box.

**Caveat, stated honestly:** the bot is a lower bound on island time. A first-time human will take longer (reading labels, learning the controls, hesitating) — perhaps 20–40 s on their first island — but because nothing in the world resists them, they converge on the bot's timing within two or three islands. The design conclusion is unchanged: **there is no mechanism whose purpose is to make the player slower, more careful, or more afraid.**

Screenshots/browser capture were not possible in this environment (the Playwright browser download is blocked at the egress firewall), so all visual claims are drawn from the source CSS, the canvas draw calls, and direct inspection of the PNG assets. The unmodified build is running at the preview URL for verification — **the 4-second island is worth experiencing once by hand before reading the roadmap, because it is more convincing than any table.**

---

## APPENDIX B — What to keep (do not touch)

1. **Boat inertia movement.** 0.65 s to speed, 187 px coast, velocity-aligned hull, bow wake. It is the one system that already has game feel. Build the rest of the feel around it.
2. **The shared `boatHP`.** `land.js:161` writes zombie damage straight into the boat's health — accidentally the best idea in the codebase, and currently invisible to the player. Make it the game's central metaphor.
3. **The dock geometry** (`land.js:296`) and the boat-parking code — a real extraction point is already half-built.
4. **Three tiered boat sprites.** Visible progression art already exists and is currently unreachable.
5. **Three zombie archetypes with distinct speed/damage/aggro.** The speed relationships already create real tactical texture (3.2× vs 1.35×) — it has simply never been *used* because nothing forces a standoff.
6. **Modular ES-module structure, zero dependencies, 47 passing tests, vector fallbacks.** Every P0 in this document is a small, safe diff. This is why the recommendation is "rebuild the pressure", not "rewrite the game".

---

*No code was modified in producing this audit. On approval of this direction, the first work item is Phase 0 + Phase 1 (stakes + contradictions), which is where the game's fun is either found or not.*

---

# APPENDIX C — IMPLEMENTATION STATUS (post-approval)

Audit ini sudah dieksekusi. Bagian ini adalah peta jujur: apa yang sudah ada di kode,
apa yang diukur, dan apa yang sengaja belum dikerjakan.

## P0 — CORE FUN

| # | Item | Status | Bukti |
|---|---|---|---|
| P0.1 | Bank vs carry | **Selesai** | `inventory.js` memisahkan `carried`/`banked`; `dropCarried()` + pelampung di `main.js die()`; smoke test §7 |
| P0.2 | The Tide | **Selesai** | `tide.js` (0/90/210s), `main.js update()` satu denyut, `world.js` tint + drain laut, `land.js` gelombang bala bantuan |
| P0.3 | Physical extraction | **Selesai** | `land.js` dermaga; tidak ada teleport; integration test §4 membuktikan aksi jauh dari dermaga tidak mengeluarkan pemain |
| P0.4 | Exposure gathering | **Selesai** | 0.8/1.2/1.4s ditahan, gerak terkunci, batal saat kena damage, cincin progres |
| P0.5 | Economy repair | **Selesai** | 6 tingkat, biaya 9/13/14/14/20/20 ≤ kapasitas pra-tingkat; regresi ekonomi di smoke test |
| P0.6 | Island scale & interior | **Selesai** | radius 360–560, kamera 1.45×, pepohonan/batu, node berkelompok, node kaya di pedalaman |
| P0.7 | De-spoiler the world | **Selesai** | `world.js` hanya menggambar tanda (asap/camar/menara/bangkai); nama + kesulitan muncul setelah disurvei |
| P0.8 | Sea scale | **Selesai** | cincin 900–3900px, kabut 940, penunjuk arah, peta |
| P0.9 | Core feedback pass | **Selesai** | hit-stop, knockback, busur arah + guncangan + suara; kotak merah layar penuh dihapus |
| P0.10 | Terminology & HUD | **Selesai** | HUD 4 elemen, satu tombol konteks, tidak ada emoji, tidak ada lencana level, tidak ada tautan galeri aset |

## P1 — MAJOR EXPERIENCE

| Item | Status | Catatan |
|---|---|---|
| Physical harbor scene | **Selesai** | `harbor.js`: berjalan di dek, meja peta / meja kerja / haluan sebagai tempat |
| Salvage buoy | **Selesai** | `G.salvages`, terlihat di peta, jadi node `salvage` saat kembali |
| Arrival / departure / bank beats | **Selesai** | splash pendaratan, `bank-beat` 1.5s, toast tujuan, suara |
| Run debrief + goal gradient | **Selesai** | `renderDebrief`: hilang (bisa diambil) / tetap milikmu / pelampung / tujuan berikutnya |
| Boat transformation | **Selesai** | 6 konfigurasi gambar (`drawBoat`), terverifikasi di `render.test.mjs` |
| Threat readability | **Selesai** | siluet, gaya jalan, suara, pitch per tipe; HP bar hanya untuk Raksasa |
| Zombie variety + wolf-pack ambush | **Selesai** | `CFG.PACK`: satu penemu berteriak (radius 55% playR, min 180), aggro ×2.3 selama 6s; satu lompatan saja |

## P2 — belum dikerjakan (sengaja)

Island art pass (terrain, ketinggian, jalur), cuaca sebagai varian pasang, chart/journal
lengkap, mix audio penuh (ducking, atenuasi), tuning kamera lanjutan, ergonomi mobile
(safe-area, haptik). Semuanya polish — tidak ada satupun yang mengubah keputusan pemain.

## P3 — tidak dibangun (sesuai cut list)

PvP, multiplayer, memasak, crafting, pohon meta-progresi. Memancing **dikurangi**, bukan
diperluas: butuh umpan (1 makanan) dan menahanmu di tempat saat pasang naik.

## Penyimpangan yang disadari

1. **Waktu berlayar 10,1 detik** — di batas bawah target 10–30s. Cukup untuk kabut dan
   keputusan berbalik, tidak untuk pelayaran panjang.
2. **Audio disintesis WebAudio**, bukan file musik. Tujuannya "bisa dibedakan dengan mata
   tertutup" tercapai untuk gather/hit/hurt/kill/bank; belum ada musik.
3. **Sprite**: kapal, zombie, pemain, pohon, batu, ikon UI memakai aset PNG yang ada.
   Garis pantai, air, dan kabut digambar prosedural (v1), belum art final.
4. **`assets/ui/icon_*.png`** sebagian belum dipakai di UI (label teks + warna resource
   dipakai lebih dulu). Asetnya sudah ada, tinggal dipakai kalau HUD mau diperkaya.

## Appendix D — KAMERA MIRING & BAHASA VISUAL KETEGANGAN (revisi arah)

Permintaan setelah audit: kamera tidak boleh monoton dari atas, miringkan seperti game
aksi mobile (3/4), dan **ketegangan harus punya sebab yang terlihat, bukan tertulis.**

### 1. Kamera: miring 3/4

Kamera sekarang **tidak pernah memperlihatkan pulau secara utuh**: pada cincin dekat
(770px dunia) pulau memakan 1217x754 px dari layar 1280x720, dan pulau cincin jauh
memakan lebih dari seluruh layar. `LAND.ZOOM` naik 1.45 -> 1.58 untuk itu.

`js/camera.js` (baru) + `CFG.CAM`:

```
TILT 0.62      tanah diperas 38% di layar — kemiringan ~52 derajat dari datar
LIFT 0.08      titik jangkar naik 8% vh: pemain duduk di bawah-tengah, melihat ke depan
PERSP 0.00034  paralaks kedalaman: 1.16x di depan, 0.86x di belakang
```

Aturannya:
- **tanah** = `beginWorld()` (translate + scale non-seragam)
- **benda berdiri** (pemain, zombie, pohon, batu, node, kapal, meja) = `atUpright()`;
  transformasi lokalnya seragam, jadi sprite tetap tegak dan tidak gepeng
- **urutan gambar** = `y` menaik: yang paling dekat kamera terakhir

Konsekuensi desain yang tidak kosmetik:
1. **Atas layar = jauh/bahaya, bawah layar = dekat/rumah.** "Pulang" secara harfiah
   berarti berjalan turun di layar.
2. Benda punya tinggi: pohon dan zombie menutupi yang di belakangnya.
3. Kedalaman mengubah ukuran: makin dekat, makin besar.

Logika permainan **tidak disentuh**: jarak, tabrakan, jangkauan tebasan tetap di ruang
datar. Karena itu seluruh test lama tetap sahih dan `tests/camera.test.mjs` baru
menguji kontraknya (posisi sprite meleset 0,0 px, urutan kedalaman, framing +38% ke depan).

### 2. Sebab ketegangan, divisualkan

Sebelum ini, pasang hanya mengubah angka di HUD. Sekarang satu rantai sebab yang
semuanya bisa dilihat — dan semuanya berasal dari satu hal: **badai di utara**.

| Waktu | Yang dilihat pemain | Yang dirasakannya |
|---|---|---|
| 0s | cakrawala kuning hangat, camar berputar, laut tenang | — |
| 90s | camar terbang ke utara (`flushGulls`), langit kosong | jalan pulang terasa lebih panjang |
| 120s | garis air naik ke pantai; cakrawala pucat; awan badai muncul di horizon | belum ada hukuman, hanya informasi |
| 150s+ | riak air di kaki pemain saat mengarungi banjir; **langkah jadi 0.78x**; dermaga mulai terendam | pulang mulai berbiaya |
| 210s+ | langit utara menggelap & **menyala** (kilat jauh, `drawStorm`); cakrawala memerah & naik; lentera kapal tumbuh 1.35x dan berdenyut lebih cepat; lambung terkuras di laut terbuka | tekanan penuh |

Pantai sekarang **bisa dijalani sampai garis air** (`PLAY_RATIO` 0.84 -> 0.94), dan batas
gerak mengikuti bentuk blob pulau (`shapeRadius`), bukan lingkaran — jadi pemain tidak
pernah berjalan di atas air pada lekukan pantai. Saat pasang, 64-92px pantai yang bisa
dijalani benar-benar terendam: kau **harus** mengarungi air untuk naik kapal.

Tidak ada satu pun elemen HUD yang ditambahkan untuk ini. Horison, burung, air di kaki,
dan lentera yang lebih terang adalah seluruh antarmukanya.

### 3. Bug nyata yang ditemukan harness baru

`tests/camera.test.mjs` menangkap bug yang tidak mungkin terlihat dari test logika:
`upright()` tidak menyeimbangkan `save/restore`, sehingga transformasi **menumpuk** antar
sprite (pemain meleset 191px, kapal 557px, dan memburuk tiap gambar). Perbaikannya:
`atUpright(ctx, x, y, fn)` yang selalu menyeimbangkan save/restore, dan `upright()`
diberi komentar tegas untuk hanya dipakai di dalam blok save/restore sendiri.

### 4. Hasil pengukuran ulang (bot di atas modul asli)

```
node tests/pacing.test.mjs        -> pulau 77,5s (target 45-90), layar 10,7s (target 10-30)
                                     8 kematian dari 95 run, 1/3 sesi tamat 6/6, sesi lain 5/6
```

## Verifikasi (bukan klaim, hasil perintah)

```
node tests/smoke.test.mjs        -> 136 pass, 0 fail
node tests/integration.test.mjs  ->  57 pass, 0 fail
node tests/render.test.mjs       ->  29 jalur gambar, 0 error
node tests/camera.test.mjs       ->  15 pass, 0 fail   (kontrak kamera miring)
node tests/pacing.test.mjs       ->  alat ukur: lihat Appendix E.4 (malam, bukan run tunggal)
```

Catatan: angka-angka di Appendix D diambil **sebelum** jam pasang menjadi milik malam.
Angka yang berlaku sekarang ada di Appendix E.4.

Harness pengukuran pacing (bot di atas modul asli, 3 seed per gaya main):
rata-rata pulau 43–81s (target 45–90), layar 10,1s (target 10–30), 13–15 run sampai
kapal lengkap, pemain serakah 1–2 kematian vs hati-hati 0–1.

---

# APPENDIX E — VERIFIKASI EKSTERNAL & LOOP "SEKALI LAGI" (revisi 2026-09-10)

Diminta eksplisit: klaim soal ketegangan **tidak boleh asumsi**, harus dari perilaku
pemain manusia sungguhan (sentimen ulasan, laporan/testimoni pemain, studi). Ini yang
ditemukan, dan ini yang mengubah desain. Enam pencarian web dijalankan; ringkasannya di
bawah, dan setiap perubahan kode menunjuk balik ke temuan yang menyebabkannya.

## E.1 Apa yang membuat game tegang (dari data, bukan dari perasaan)

| Sumber | Temuan | Konsekuensi di build ini |
|---|---|---|
| Clark dkk. 2009, *Neuron* 61:481–490 (PMC2658737) | "Hampir berhasil" terasa **kurang menyenangkan** tapi menaikkan keinginan lanjut bermain — **hanya bila pemain sendiri yang menyusunnya**. Near-miss yang ditentukan komputer justru **menurunkan** keinginan bermain. | Tidak ada near-miss buatan. Kehilangan selalu berasal dari keputusan pemain (bertahan lebih lama, masuk lebih dalam). Tidak ada "hampir sampai!" yang dipasang sistem. |
| Berridge & Robinson; Tindell 2009 (incentive salience) | Dopamin = *wanting* (tarikan isyarat), bukan *liking* (kenikmatan). RPE = kalibrasi, bukan hadiah. | Isyarat diperkuat **sebelum** hadiah: bar malam, air naik di dermaga, camar pergi, lentera menyusut. Hadiahnya tetap nyata (muatan benar-benar jadi milikmu di dermaga). |
| Ulasan Dredge (Metacritic pengguna ≈73% positif / 23% campur / 3% negatif; frostilyte.ca "Toothless Tension"; r/patientgamers) | Yang dipuji: ketegangan konstan tanpa jumpscare, kabut, umpan keserakahan. Yang dikritik: **ketegangan menguap setelah jam pertama**, dan konten malam **opsional** sehingga sensasinya bisa dilewati. | Malam tidak bisa dilewati dan tidak bisa ditunggu: jam hanya berjalan saat kau di luar, dan hanya fajar yang memutarnya. |
| Laporan pemain Tarkov/Rust (r/EscapefromTarkov, r/patientgamers, forum resmi) | Ketegangan kehilangan bertahan hanya bila ada **dua** hal: jalan pulih yang murah & terlihat, dan progres yang tidak hilang saat mati. Rust dikritik: "tidak menghargai apa pun selain waktu". | Pelampung muatan (sudah ada), lambung diisi 50% saat mati (sudah ada), gudang + refit tidak hilang (sudah ada). Yang baru: **malam tidak direset** = waktu yang kau pakai tetap terpakai, jadi mati tidak menghapus kemajuan malam. |
| Psikologi "one more run" (roguelike/extraction) | Tiga pilar: kegagalan = informasi, run pendek (10–30 menit) supaya ongkos mengulang rendah, dan meta-progresi membawa sesuatu setiap run sehingga berhenti terasa prematur. | Satu malam ≈7 menit di laut, bisa dipotong kapan saja di dermaga tanpa kehilangan apa pun. Baris "Malam tersisa N%" di debrief adalah pilar ketiga, divisualkan. |
| Benchmark panjang sesi 2026 (mobile P50 ≈3–6 menit, PC P50 ≈18 menit) | Sesi pendek adalah norma, bukan pengecualian. | Malam bisa dimulai/diakhiri kapan saja di dermaga; tidak ada hukuman untuk berhenti. |

## E.2 Masalah nyata yang ditemukan verifikasi ini

1. **Jam pasang di-reset setiap kali berlayar.** Dengan jendela tenang 90 detik saat itu,
   bot efisien menambat di detik 88 — dua detik sebelum fase tegang dimulai. Pemain yang
   bermain bagus **tidak pernah** bertemu gigi permainan; pemain yang bermain buruk
   dihukum berulang. Ini persis kegagalan "toothless" yang dikeluhkan pemain Dredge.
2. **Beat ketegangan terbesar tidak pernah menyala.** `main.js` membaca `ph.justChanged`
   dari tabel fase di `config.js`, sementara flag-nya diset di `G.tide`. Akibatnya camar
   tidak pernah terbang, guncangan tidak pernah terjadi, dan tip peringatan tidak pernah
   muncul — selama ini. Test lama tidak menangkapnya karena menguji mekanismenya
   (`flushGulls`) langsung, bukan pemicunya.
3. **Menutup game adalah mesin waktu.** Karena jam selalu direset di `beginRun()`, reload
   menghapus seluruh malam. Sekarang jam malam ikut disimpan (`save.tideT`, `save.nights`).

## E.3 Perubahan yang diimplementasikan

| Perubahan | File | Alasan (dari tabel E.1) |
|---|---|---|
| Jam pasang milik **malam**, bukan run: tidak direset saat berlayar (0-150-270, fajar 420) | `main.js beginRun()`, `config.js` | Dredge (eskalasi tidak opsional) |
| **Isyarat ≠ ongkos**: `tideTint()` (warna, sudah bergerak sejak detik 0) dipisah dari `tideDanger()` (air yang menelan pantai, baru mulai setelah fase tenang) | `tide.js`, `land.js`, `harbor.js` | wanting/liking: isyarat lebih dulu, hukuman belakangan; fase "tenang" tetap tenang |
| Fajar pada 420s di laut: air turun, cakrawala sembuh, camar kembali, malam baru | `tide.js`, `config.js`, `fx.js returnGulls()`, `main.js` | one-more-run (siklus punya ujung) + wanting/liking (isyarat lalu kelegaan) |
| Dermaga memperlihatkan malam: air naik di dermaga, langit biru→merah, lampu menyusut | `harbor.js drawHarbor()/drawTideLine()` | Tarkov (sesuatu milikmu terancam) + wanting (isyarat di tempat aman) |
| Bilah HUD = panjang **malam**, bukan panjang fase | `ui.js`, `css/style.css` | wanting (isyarat sebelum hadiah) |
| Debrief menambah "Malam tersisa N%" | `ui.js`, `index.html`, `css/style.css` | one-more-run (berhenti terasa prematur) |
| Jam malam ikut disimpan | `save.js` | Tarkov/Rust (kemajuan tidak boleh hilang karena menutup game) |
| Beat `turning`/`high` diperbaiki + beat fajar baru | `main.js` | Bug #2; tanpa ini seluruh bahasa visual ketegangan mati |
| Audio punya RNG sendiri; gelombang bala bantuan tidak lagi di-seed `Date.now()` | `audio.js`, `land.js` | agar pengukuran bisa diulang (lihat E.6) |

## E.4 Hasil pengukuran setelah perubahan (bot di atas modul asli)

```
node tests/pacing.test.mjs 0.42 3     (bot hati-hati: mundur di 42% lambung; 94 run)
fase saat berangkat   run   rata pulau   muatan   lambung hilang   mati
tenang                 40      70s         4,8        -14,1         8%
berubah                20      61s         3,4        -18,1        10%
pasang                 34      51s         3,1         -6,1        32%
fajar: 31 kali dalam 3 sesi. 0 TERJEBAK, 0 NYASAR. rata pulau 61,6s, layar 8,6s.

node tests/pacing.test.mjs 0 3        (bot serakah: tidak pernah mundur; 144 run)
tenang 54 run / mati 41%  ·  berubah 29 run / mati 86%  ·  pasang 61 run / mati 77%
```

Gradient itu adalah bukti ketegangan tidak lagi opsional: **keserakahan di satu run
menaikkan ongkos run berikutnya**, dan itu keputusan pemain, bukan keputusan sistem.

Kejujuran soal regresi: karena malam tidak lagi gratis, bot hati-hati hanya mencapai
**3/6** tingkat refit dalam satu sesi (sebelumnya 1/3 sesi bisa 6/6), dan muatan per run
turun 6,8 → 3,9. Ini konsekuensi yang disengaja dari eskalasi, bukan bug — tapi angkanya
di bawah target "kapal lengkap dalam satu sesi", jadi tuning ekonomi (harga tangga refit)
masih kandidat revisi berikutnya.

## E.5 Bug yang ditemukan verifikasi ini (dan diperbaiki)

1. `main.js` membaca `ph.justChanged` dari **tabel fase** (`config.js`), sementara flag-nya
   diset di `G.tide`. Akibatnya beat camar-pergi dan guncangan **tidak pernah menyala**
   selama ini; seluruh bahasa visual ketegangan yang didokumentasikan di Appendix D mati.
   Sekarang ada test yang memeriksa pemicunya, bukan cuma mekanismenya.
2. `tideTint()` me-lerp sepanjang **fase berikutnya**, bukan fase sekarang
   (`next.until - t0`), sehingga tint melompat di batas fase: 0,35 di detik 90 DAN di
   detik 150 — tidak ada eskalasi yang terlihat. Alat ukur baru (`tests/tension.test.mjs`)
   yang menemukannya; sekarang tint merangkak di dalam setiap fase.
3. `drawLand` menghitung ulang rumus banjir sendiri (`1.06 - FLOOD * tint`) padahal
   `floodRadius()` sudah ada — dua versi rumus yang sama, dan keduanya sempat memakai
   kurva berbeda. Sekarang gambar memanggil `floodRadius(L)`: satu rumus untuk gerak dan
   gambar.
4. Audio memakai `Math.random()` untuk buffer noise sementara pemutarannya di-throttle
   dengan jam dinding (`performance.now()`). Karena RNG itu dibagi dengan game, **suara
   bisa mengubah posisi zombie**: menyetel suara mengubah gameplay. Sekarang audio punya
   RNG sendiri.
5. `spawnWave` memakai `Date.now()` sebagai seed: gelombang bala bantuan tidak pernah sama
   dua kali, jadi tidak ada pengukuran yang bisa diulang. Sekarang di-seed dari
   `worldSeed ^ island ^ waveCount`.

## E.6 Catatan alat ukur

`tests/pacing.test.mjs` sekarang menanam `Math.random` (`tests/_seed.mjs`) dan bot bisa
dijalankan berulang dengan hasil sama; `tests/tension.test.mjs` mencetak busur satu malam
(tint, warna & tinggi cakrawala, badai, radius pantai, garis air dermaga) dan gagal kalau
salah satu kanal berhenti berubah. Dua sesi berikutnya dalam satu proses masih mewarisi
sedikit keadaan proses (kecepatan pemain), jadi angka dibandingkan antar-jalan perintah
yang sama, bukan antar-sesi di dalam satu jalan.

## E.7 Yang **belum** dikerjakan (jujur)

- **P2 (polish)** belum disentuh: art pass pulau, cuaca sebagai varian pasang, chart/journal
  lengkap, mix audio (ducking/atenuasi), tuning kamera lanjutan, ergonomi mobile (safe-area,
  haptik). Tidak satu pun mengubah keputusan pemain — itu sebabnya verifikasi psikologis
  didahulukan.
- **P3** tetap tidak dibangun (PvP, multiplayer, memasak, crafting, pohon meta-progresi).
  Memancing masih belum dikurangi sesuai cut list (masih faucet tanpa umpan).
