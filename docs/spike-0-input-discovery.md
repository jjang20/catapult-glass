# Phase 0 — Input & Performance Discovery Spike

**Goal:** answer the open questions in [SPEC.md §7](../SPEC.md#7-risks-and-open-questions)
(Q-1…Q-5) by running a single test page on the real Meta Ray-Ban Display hardware.
**This phase gates Phase 2** — physics budget and input model must be confirmed before
game systems are built.

The spike is one self-contained page, `spike/index.html`, deployed to GitHub Pages and
added to the glasses via the Meta AI app. Everything it measures is **shown on screen
in large text** — there is no developer console on the glasses.

---

## 1. Hypotheses to test

| # | Hypothesis (what the spec currently assumes) | Spec ref |
|---|---|---|
| H1 | The glasses webview can run matter.js with 50 stacked boxes at a stable frame rate (≥60 fps render, ≤4 ms avg physics step) | Q-1, §5.1 |
| H2 | Swipe gestures arrive as single `keydown` events with **no auto-repeat** | Q-2, §3.3 |
| H3 | Pinch arrives as Enter `keydown`; `keyup` timing is unreliable or immediate (nothing may depend on it) | Q-3, §5.4 |
| H4 | The pinch+twist dial gesture produces **no** events visible to the app (no `wheel`, no repeated arrows, nothing) | Q-4, §3.3 |
| H5 | `requestAnimationFrame` keeps running at full rate during periods with no input (no throttling/dimming) | Q-5, §3.3 |
| H6 | Pixel art at ×3 integer scale (8-logical-px blocks, 1-px outlines) is legible at 42 ppd, including near screen edges | §5.2, §3.6 |

## 2. Test page behavior (spec for `spike/index.html`)

One page, three screens, switched with **Enter** (pinch). Pure black background,
bright text ≥24 px. Current screen name always shown top-center.

### Screen A — Event logger (H2, H3, H4)

- Listens to: `keydown`, `keyup`, `wheel`, `pointerdown/up/move`, `touchstart/end`.
- Displays:
  - The **last 8 events**, newest on top, one line each:
    `[type] key/code · repeat:true|false · Δprev: 132 ms`
  - For Enter: measured **keydown→keyup gap** in ms.
  - **Per-type counters** (total keydowns, wheels, pointer events) — catches event
    types even if they scroll past.
- Test script (performed while on this screen):
  1. Swipe each direction 5× slowly, then 5× rapidly → check H2 (any `repeat:true`?
    multiple events per swipe?).
  2. Pinch 5× short, then attempt 3 long pinch-holds → record keydown→keyup gaps (H3).
  3. Perform the **pinch+twist dial gesture** 10×, both directions, slow and fast →
    watch the counters: ANY event during twist disproves H4 (record exactly what).
  4. Middle-pinch → confirm Escape arrives (and note: does it also exit the app?).

### Screen B — Physics benchmark (H1, H5)

- matter.js world: 50 stacked boxes (5 towers × 10), one heavy ball fired on load;
  re-fire with any swipe.
- Displays, updating each second:
  - `rAF: 88.6 fps (min 71)` — frames per second from rAF deltas
  - `step: 2.3 ms avg / 5.1 ms max` — physics step time
  - `bodies awake: 23`
- After the ball settles, **hands off for 60 s** while watching the fps line → H5
  (does fps drop / display dim with no input?). Then swipe once and watch recovery.

### Screen C — Legibility card (H6)

- Renders placeholder pixel-art swatches at **×2, ×3, ×4** integer scales:
  8-px blocks with 1-px bright outlines in the planned palette (wood amber, stone
  blue-grey, glass cyan, TNT red, defender magenta), sample HUD text at 16/20/24 device
  px, and the power-dial mock — repeated at screen center and inside the 16 px edge
  margins (all four corners).
- Judged by eye on device: which scale/sizes are comfortably readable? Any palette
  glare? Corners legible?

## 3. Procedure

1. Build `spike/index.html` (desktop-verified with keyboard + mouse wheel first).
2. Deploy to GitHub Pages; add to glasses via Meta AI app (see
   [getting-started.md](getting-started.md) §"Putting a page on the glasses").
3. Run the three screens' test scripts. Record everything in §4 — photos through the
   lens are welcome but text notes suffice.
4. Fold findings back into SPEC.md (§2.2 input facts, §5.1 perf budget, §7 table) and
   close the Phase-0 GitHub issue with a summary.

## 4. Findings (fill in on device)

> Status: **NOT YET RUN** · Device: __________ · Firmware/app versions: __________ · Date: __________

| # | Result (confirmed / disproved + details) |
|---|---|
| H1 | _pending_ — fps: ____ · avg step: ____ ms · max step: ____ ms |
| H2 | _pending_ — repeat seen? ____ · events per swipe: ____ |
| H3 | _pending_ — keydown→keyup gaps: ____ |
| H4 | _pending_ — events during twist: ____ |
| H5 | _pending_ — fps after 60 s idle: ____ · dimming? ____ |
| H6 | _pending_ — readable scales: ____ · palette notes: ____ · corner notes: ____ |

### Decisions taken from findings

_(to be written after the run — e.g. "physics stays at 60 Hz", "TwistSource added/dropped",
"art locked at ×3")_
