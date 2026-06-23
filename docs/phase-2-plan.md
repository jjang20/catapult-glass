# Phase 2 — Game systems: design & decision plan

**Status:** interview complete — all 12 decisions (D1–D12) recorded. Ready for designer review.
**Scope:** GitHub issue #3 ("Phase 2 — Game systems"): materials/damage + TNT,
particle bursts, scoring/stars, level schema + loader, Title + Conquest-map screens,
result/pause overlays, persistence, debug params, and `node --test` units.

This document is **additive** to [`SPEC.md`](../SPEC.md), which stays the normative design
bible. Where SPEC already decides something, this plan points to it instead of
re-deciding. The job of this file is to pin down the precise, build-ready details that
SPEC left open, with the reasoning behind each choice.

## How to read this

Each entry in the decision log records four things: the **question**, the **options**
weighed, the **decision**, and **why**. "Open / tunable later" notes the parts we
deliberately defer to play-testing (per SPEC, exact feel numbers are tuned, not guessed).

---

## Terminology (aligned)

Precise names, kept consistent everywhere so the plan never gets ambiguous. (A fuller
DDD-style glossary can be generated later with the `ubiquitous-language` skill.)

| Term | Definition (one line) | Don't call it |
|---|---|---|
| **Boulder** | The rock **projectile** the catapult launches — the player's ammunition (the thing thrown). | stone, rock, ball |
| **Projectile** | The general category for anything fired; in v1 the only projectile is the boulder. | — |
| **Shot** | One use of a boulder; a zone grants 3–5 shots. | — |
| **Block** | One structural piece of the castle, made of some material. | brick, tile |
| **Material** | A block's type, which sets its behavior: wood / stone / glass / TNT. | — |
| **Stone** | A building **material** for blocks — a hard, shield-like wall that forces arc shots. Never thrown. | boulder, rock |
| **Defender** | An enemy unit that must be destroyed to win the zone. | target, enemy |
| **King** | The final zone's special defender — higher HP, takes 2–3 solid hits. | boss |
| **Target** | Umbrella term for a win-condition unit (a defender or the King). | — |
| **Zone** | One level = one castle zone; the two words are interchangeable here. | — |

---

## Decision log

### D1 — How a collision becomes damage (the impact measure)

**Question:** SPEC §3.4 gives `damage = max(0, impactImpulse − materialThreshold)`. How do
we measure "impact impulse" from a matter.js collision?

**Options weighed:**
- *Speed × mass* — relative impact speed × the heavier body's mass at the moment of
  contact. Approximates real impulse; extends the crush rule already in `physics.js`.
- *matter.js solver impulse* — read the engine's internal collision impulse. Most
  physically faithful, but an internal per-iteration value: fragile and hard to test.
- *Speed only* — ignore mass. Simplest, but a pebble and a boulder at equal speed would
  do equal damage.

**Decision:** **Speed × mass.** At the moment two bodies touch (matter.js `collisionStart`),
the impact = relative impact speed × the heavier body's mass. Damage for that hit =
`max(0, impact − materialThreshold)`. Every breakable body carries an **HP pool**; each
hit subtracts its damage; at **HP ≤ 0** the body is removed and replaced by a particle
burst (no debris body — SPEC §3.4 / §5.1).

**Why:** it builds on the relative-speed logic already in `physics.js` (the defender
"crush" rule), mass makes heavy bodies feel weightier, and the whole thing is a pure
function of `(speed, mass, threshold, hp)` — so it is straightforward to cover with a
`node --test` unit (SPEC §5.7).

**Open / tunable later (play-test):** the exact HP and threshold numbers per material, and
the scaling constant that turns matter's raw mass into the impulse figure.

---

### D2 — Material durability & "unbreakable" stone

**Question:** How is each material's toughness represented, and how does "unbreakable"
stone work?

**Decision:** Every block carries three per-material values:
- **threshold** — the minimum impact before *any* damage is done (light taps bounce off),
- **HP** — the total damage needed to destroy it,
- **points** — score awarded when destroyed (fixed by SPEC §3.4).

Stone's default is **high threshold + high HP** — *breakable but tough*: a heavy boulder
hit or a TNT blast can still shatter it, which gives level variety. On top of that, a
level may mark any block **`unbreakable: true`**, which makes that block ignore all damage
— a guaranteed permanent wall for arc-shot puzzles.

**Why:** matches SPEC §3.4 ("per-level may be unbreakable") and gives the level designer
exact control — tough-but-destructible stone by default, hard shields on demand. Keeping
`unbreakable` an opt-in (not the default) means most stone stays interactive.

**Starter material table** (threshold/HP are qualitative here; exact numbers tuned in
play-test — points are fixed by SPEC §3.4):

| Material | Threshold | HP | Points | Behavior |
|---|---|---|---|---|
| Wood | low–medium | medium | 100 | default structure; breaks at moderate impact |
| Glass | very low | very low | 200 | shatters at light impact; risk/reward |
| Stone | high | high | 300 | shield; forces arc shots; optional `unbreakable` |
| TNT | (see D4) | low | 150 | detonates on solid impact |
| Defender | (see D3) | (see D3) | 500 | win-condition unit |
| King | (see D3) | (see D3) | 2000 | final target; multi-hit |

---

### D3 — Defender / King hit model

**Question:** How do defenders and the King take damage?

**Decision:** Defenders and the King are **destructible bodies using the same
`damage = max(0, impact − threshold)` + HP model** as blocks (D1). A **defender's HP** is
about one solid hit; the **King's HP** is 2–3 solid hits. A graze below the threshold does
nothing; a **hard crush from a toppled tower also deals damage**, so chain-collapse wins
(SPEC §3.4) still work, and a TNT blast (D4) can damage targets too. The **win check
becomes "no target with HP > 0 remains"**, replacing the current binary `defenderAlive`
flag in `physics.js`.

**Why:** one consistent, unit-testable code path for every destructible body; matches
SPEC "1 solid hit" (defender) / "multi-hit" (King); preserves the crush and chain-collapse
win paths the level design relies on.

**Open / tunable later:** defender threshold + HP, and the King's HP (how many solid hits).
**Phase note:** the King's health pips + pulsing highlight are Phase 4 polish, but HP is
tracked from Phase 2.

---

### D4 — TNT detonation

**Question:** When does a TNT crate detonate, and what does the blast do?

**Decision:** A TNT crate is a block with **very low HP** that **detonates the instant its
HP reaches 0** — from a solid boulder hit, a hard crush, or another crate's blast.
Detonation applies, to every *dynamic* body within blast radius **R**:
- a **radial impulse** (an outward push from the crate's centre), and
- **damage**,

both **falling off linearly with distance** (full at the centre → 0 at R). Because a blast
can drive a neighbouring crate's HP to 0, **chain reactions happen automatically**; a
**per-detonation guard** ensures each crate fires only once (no infinite loop in a step).

**Why:** reuses the single damage path from D1–D3, so chains/crushes/boulder-hits all flow
through one place; matches SPEC §3.4. Easy to unit-test: apply an impact, assert HP→0 →
blast applied to bodies in range.

**Affects:** all dynamic bodies in radius (blocks, defenders/King, other TNT, the boulder);
the static ground is unaffected.

**Open / tunable later:** radius R, peak impulse, peak damage, exact falloff curve.
**Open implementation detail (revisit at D7):** a true `unbreakable` wall should ignore the
blast's *impulse* as well as its damage — which likely means building unbreakable blocks as
matter.js **static** (immovable) bodies rather than dynamic ones.

---

### D5 — Particle bursts

**Question:** How much particle work belongs in Phase 2?

**Decision:** Phase 2 builds the particle **system**: a **capped pool of non-physics
particles** — each a small bright point with a position, a velocity, and a short lifetime —
**spawned when a body is destroyed**, **colored by the destroyed material's palette**, and
**fading out** over its lifetime. Particles are **never matter.js bodies** (SPEC §3.4/§5.1:
no debris bodies). Per-material *shapes* (wood splinters, glass shards, stone dust, TNT
flash) are deferred to **Phase 4** (issue #5), where SPEC already lists them.

**Why:** matches SPEC's phase split, keeps Phase 2 on *systems*, and satisfies issue #3's
"destroyed blocks → particle burst (no debris bodies)" with minimal plumbing Phase 4 refines.

**How it's driven:** particles are purely visual, so they update on the **per-frame time
tick** (`game.tick(dt)`), *not* the fixed physics step, and are drawn by `render.js`.

**Open / tunable later:** particles per burst, lifetime, speed spread, and the total pool
cap (performance).

---

### D6 — Scoring & stars

**Question:** How and when is score counted, and what does a result save?

**Decision:**
- **Live accumulation:** the moment a block or target is destroyed, its material points are
  added to a running score, so the HUD `SCORE` ticks up during flight/settle.
- **On win:** add a bonus of **1000 × unused projectiles** (shots left). Final score =
  destroyed-material points + bonus.
- **Stars** come from the level's `starThresholds: [_, twoStar, threeStar]`:
  **1★ = win** (any score), **2★** if final ≥ `twoStar`, **3★** if final ≥ `threeStar`
  (index 0 unused — SPEC §5.5). Because the unused-projectile bonus is part of the total,
  3★ naturally rewards winning with shots to spare (SPEC §3.5).
- **Save on win only:** a win records the **best** (highest-ever) score and **best** stars
  for that zone and unlocks the next (D9). A loss saves nothing — just retry.

**Why:** live scoring gives satisfying feedback and matches SPEC's formula exactly; saving
only on a win keeps progression tied to "beating a zone" (SPEC §3.5 / §5.6); storing the
max means a replay can improve but never downgrade a result.

**Open / tunable later:** each level's `starThresholds` (set during content tuning, Phase 3).

---

### D7 — Level schema & loader

**Question:** What is the exact level format, how is it loaded, and how many levels ship in
Phase 2?

**Decision — coordinates:** every position is a **center** in logical 200×200 space (origin
top-left, y down), matching matter.js and the current code — the loader passes coordinates
straight to `Bodies.rectangle`, no conversion.

**Decision — schema** (one JS module per level; no `fetch`/async — SPEC §5.3/§5.5):

```js
export default {
  id: "zone-01",
  name: "Outer Rim",
  projectiles: 3,                    // shots granted this zone
  starThresholds: [0, 5500, 8000],  // [unused, 2★ score, 3★ score]
  blocks: [                          // dynamic structure (centers)
    { material: "wood",  x: 154, y: 174, w: 12, h: 12 },
    { material: "stone", x: 140, y: 150, w: 24, h: 8, unbreakable: true },
    { material: "tnt",   x: 150, y: 170, w: 10, h: 10 },
  ],
  targets: [ { type: "defender", x: 154, y: 150, w: 10, h: 10 } ], // "defender" | "king"
  statics: [ { x: 100, y: 184, w: 200, h: 8 } ],                   // ground/ramps (immovable)
};
```

- `material` ∈ `wood | stone | glass | tnt`; each material's threshold/HP/points live in the
  material table (D2), **not** the level file.
- `unbreakable: true` is optional (D2); unbreakable blocks are built as matter.js **static**
  bodies so a blast can't shove them (D4).
- Targets are ordinary destructible **boxes** (`w/h`) now that D3 folded them into the HP
  model — this refines SPEC §5.5's example (which showed a circle `r`); a round/sprite look
  can return with Phase 3 art. *(Minor SPEC §5.5 update to propose later.)*

**Decision — loader:** `createWorld(level)` takes a level object and builds bodies from
`statics`, `blocks`, `targets` (replacing the hardcoded `LEVEL` in `physics.js`).
`src/levels/index.js` exports an ordered `LEVELS` array plus helpers to fetch a level by
index (for `?level=N`, D12) or by `id`. Win = "no target with HP > 0 remains" (D3).

**Decision — file layout** (SPEC §5.3): `src/levels/level01.js …` plus `src/levels/index.js`.

**Decision — starter content:** Phase 2 ships **2–3 throwaway test levels** (colored
rectangles, no art) whose only purpose is to exercise the loader, the conquest map's
locked/unlocked states, unlock-on-win, and "Next zone." They are **not** tutorials and get
replaced by the real designed zones in Phase 3 (issue #4).

**Open / tunable later:** the per-level geometry and thresholds (Phase 3 content).

---

### D8 — Title & Conquest-map screens

**Question:** How do the Title and Conquest-map screens look and behave in Phase 2?

**Decision — Title:** a placeholder logo/wordmark with two focusable items — **Continue**
(focused by default) and **Levels**. *Continue* jumps straight into the first unconquered
zone; *Levels* opens the conquest map. (SPEC §4.1.)

**Decision — Conquest map:** a **simple node layout** — a line of numbered zone nodes, each
drawn with placeholder shapes and showing its state:
- **conquered:** a small banner + earned stars (★ / ☆),
- **next** (first unconquered): a **pulsing** highlight,
- **locked:** dimmed.

The D-pad moves focus **sequentially in a fixed order** (outer→inner = left→right here);
A/confirm enters the focused unlocked zone; **Escape/back → Title**. The real concentric-ring
castle map is deferred to Phase 3/4 art.

**Why:** matches issue #3's "placeholder art" and the fixed focus order needed for
gamepad/remote navigation; lets us test the unlock/progression flow now without blocking on
the signature map art.

**Screens & stack:** Title, ConquestMap, the gameplay screen, and overlays all live on the
existing screen **stack** (`screens.js`) — push to enter, pop to go back, Escape pops.
(Overlays = D10.)

**Open / tunable later:** the concentric-ring spatial layout and castle art (Phase 3/4).

---

### D9 — Persistence

**Question:** What is saved, how is it shaped, and what happens when storage fails?

**Decision — what & shape:** a **single versioned JSON blob** under one `localStorage` key
(e.g. `catapult-glass:save`), holding **only per-zone results** — best score and best stars:

```json
{ "version": 1, "zones": { "zone-01": { "bestScore": 7200, "stars": 3 } } }
```

**Unlock is derived, not stored:** zone N is unlocked once zone N−1 is conquered (stars ≥ 1);
zone 1 is always open. One source of truth → unlock can never contradict the results.

**Decision — when:** written **only on a win** (D6), keeping the new result only if it beats
the stored best (max of score, max of stars). A loss writes nothing.

**Decision — graceful failure:** every read/write is wrapped in try/catch. If `localStorage`
is unavailable (private mode, disabled) or the blob is missing / corrupt / wrong-`version`,
the game **falls back to in-memory progress** (treats it as a fresh save) and never crashes —
it simply won't persist between sessions. The `version` stamp lets a future format change be
detected and reset rather than mis-read.

**Why:** the smallest possible saved state, with no derivable or duplicated facts (single
source of truth), resilient to the messy reality of browser storage (SPEC §5.6).

**Open / tunable later:** the exact key name; a possible debug reset (relates to D12 `?unlock`).

---

### D10 — Result & Pause overlays (resolving Q-11)

**Question:** What overlays exist, and how does pausing reconcile with the glasses' system menu?

**Research finding (the basis for this decision):** Meta's web-app **session lifecycle** has
three states — **RUNNING → PAUSED → STOPPED** — and apps "can listen for standard events like
`pause`, `resume`, and `stop`" (Meta developer FAQ). The middle-pinch/Back gesture surfaces what
Meta's testing docs call a **"universal Web App menu"** — a single, **system-owned menu shown for
every web app**, with three fixed items observed on-device: **Restart · Resume · Skip Level** (in
that order). **No web-app API exists to add, reorder, or replace those items** — the official
web-app toolkit and every reachable doc expose nothing for it. (Caveat: Meta's deepest doc pages
returned HTTP 403 to research, so the exact item list shown for *our* app should be reconfirmed on
the real glasses.) **Instagram's richer in-app menu is a first-party _native_ app capability
(mobile/native SDK), not available to _web_ apps** like ours — so we cannot copy it. The platform's
intended design is therefore that the **system menu *is* the pause**, and web apps merely react to
lifecycle events — almost certainly how Meta's own GOAT / 2048 / Hypertrail behave.

**Decision — Result overlay (unchanged, SPEC §4.1):** on win/lose, our own DOM overlay shows
the stars animation, score, and **Retry / Next zone / Map**. This is *not* a pause (the round
has ended), so it stays an app overlay on the screen stack.

**Decision — Pause is platform-native:** we do **not** draw our own pause overlay on the
glasses. The **fixed system menu (Restart · Resume · Skip Level) is the pause**, and it
**cannot be customized from a web app.** The app listens for the lifecycle
events: **`pause`** → freeze the fixed-timestep loop and timers; **`resume`** → continue;
**`stop`** (Restart) → reset the zone. On **desktop** we mirror this with the **Page
Visibility API** (`visibilitychange` / `document.hidden`) so the *same* code path drives
pause/resume on both desktop and device (SPEC §2.2 parity).

**Decision — "Quit to map":** the one action the system menu lacks becomes an in-app
**focusable HUD control** (activated by confirm/Enter), reachable by D-pad — never bound to Back.
Because the universal menu is **not extensible** from a web app, this HUD button is the *only*
place "Quit to map" can live.

**Note — "Skip Level" is harmless to our progression:** the system menu's third item cannot
cheat unlocks, because **D9 grants a star/unlock only on a _win_** (stars saved on win only;
unlock is derived from stars). A skip therefore yields no star and no unlock. The one remaining
unknown is purely technical — *which* lifecycle event "Skip Level" delivers — which we handle
gracefully (treat as "leave the zone → back to the map") and **verify on-device** (added to the
§5.7 checklist). No new design rule needed.

**Why:** matches the platform's documented model and Meta's shipped games; avoids a doomed
attempt to render a pause overlay on a gesture the OS intercepts; keeps desktop/device parity
through the Visibility API.

**Resolves Q-11.** **SPEC updates (applied in this PR):** §3.3
input table (middle-pinch/Escape is the system Back/menu, not our "Pause overlay"), the §3.3
flight-phase note, §4.1 (replace the Pause-overlay bullet + the `Gameplay → PauseOverlay`
state edge with platform-native pausing — noting the fixed universal **Restart · Resume · Skip
Level** menu — and relocate "Quit to map" to a HUD button), add **"confirm Skip Level behavior"**
to the §5.7 on-device checklist, and mark Q-11 resolved in §7.

**Open / tunable later:** the exact lifecycle event API names (confirm against Meta's docs
when building on-device); which items the universal menu actually shows for *our* app and what
event "Skip Level" / "Restart" deliver (on-device checklist); the desktop pause affordance for
testing (see D11).

---

### D11 — Input intents & the Back key

**Question:** What does the input layer expose, and what does Back/Escape do during gameplay?

**Options weighed:** Back for menus only (device parity) · same + a desktop-only debug-pause
key · a unified PAUSE intent everywhere.

**Decision:** **Back for menus only — no new intents.** The Phase 1 intent set
(`UP/DOWN/LEFT/RIGHT/CONFIRM/CANCEL`) is kept unchanged. **`CANCEL`** (Escape / middle-pinch)
is the **Back** action and is meaningful **only in menus and overlays** — Conquest map →
Title, and dismiss the result overlay → map. **During gameplay, Back does nothing in our
code:** pause is owned by the platform (system menu on glasses; Page Visibility on desktop —
D10). There is **no dedicated `PAUSE` intent**. **"Quit to map"** is an in-app focusable HUD
control activated by **`CONFIRM`** (Enter), reachable by D-pad — never bound to Back.

**Why:** truest to the real device (the OS owns Back/pause during play); avoids a dead,
misleading intent; gives Back one consistent meaning ("go up a level" in menus). Desktop
pause/resume is exercised by switching browser tabs, which fires the same lifecycle path.

**Note:** no code-level intent changes are needed — `CANCEL` is currently a no-op stub in the
gameplay screen (which stays correct); it simply gains real meaning in the menu/overlay screens.

**Open / tunable later:** none significant.

---

### D12 — Debug params & the test safety-net

**Question:** What do the debug URL options do, and how do we structure the automatic checks?

**Decision — debug URL options** (read once at startup; they never change saved progress —
SPEC §5.7):
- **`?level=N`** — start straight in zone N (N=1 is the first zone), skipping Title/map.
- **`?unlock=1`** — treat every zone as unlocked so the whole map is reachable, without
  editing the real save.
- **`?fps=1`** — show a small performance readout (frames per second + physics step time).
- **`?slowmo=1`** — run the simulation in slow motion to watch flights/collisions
  (`?slowmo=N` sets the factor; default 4× slower).

**Decision — tests ("auto-check the math; play-test the feel"):** the **damage math**,
**scoring/stars**, and **level-file checks** are written as **pure functions** — plain
"numbers in → answer out", with no dependency on matter.js or the browser — and checked
automatically with **`node --test`** (the test runner built into Node; nothing to install).
The physics *feel* (real collisions, toppling) is verified by **playing in the browser**, not
auto-checked. Three small check files: damage math, scoring/stars, and level-file validation.

**Why:** matches SPEC §5.7; pure functions are fast, predictable, and need zero setup; and
splitting the plain rules out from the physics keeps the code tidy and lets both the game and
the checks share the exact same rules (the trajectory preview already shares constants with
the real sim — same principle).

**Architecture knock-on:** keep the damage/scoring/schema rules in modules that **don't**
import matter.js, so both the running game and the automatic checks can use them.

**Open / tunable later:** the default `?slowmo` factor; the exact check-file names.

---

## Interview queue (decision tree)

- [x] **D1** — Impact measure → *Speed × mass*
- [x] **D2** — Material durability + unbreakable stone → *HP default + `unbreakable` flag*
- [x] **D3** — Defender / King hit model → *same HP model as blocks*
- [x] **D4** — TNT detonation → *detonates at HP 0; radial impulse + falloff damage; auto chains*
- [x] **D5** — Particle bursts → *generic non-physics burst now; per-material flair in Phase 4*
- [x] **D6** — Scoring & stars → *live accrual; +1000/unused on win; save best on win only*
- [x] **D7** — Level schema & loader → *center coords; per-material table; `createWorld(level)`; 2–3 test levels*
- [x] **D8** — Title + Conquest-map screens → *Continue/Levels; node layout, sequential focus, Esc→Title*
- [x] **D9** — Persistence → *one versioned blob; results only, derive unlock; save best on win; in-memory fallback*
- [x] **D10** — Result / Pause overlays → *Result = our overlay; pause = platform lifecycle (system menu); resolves Q-11*
- [x] **D11** — Input intents → *no new intents; Back = menus/overlays only; pause is platform-native*
- [x] **D12** — Debug params & tests → *URL options per SPEC §5.7; auto-check pure math/scoring/schema, play-test the feel*
