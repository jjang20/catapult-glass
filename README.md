# catapult-glass

**Castle Siege** (working title) — an Angry-Birds-style catapult game for **Meta
Ray-Ban Display** glasses, played entirely with **Meta Neural Band** gestures.

Besiege the enemy castle from the outer rim inward: aim with swipes, set power on a
slider, fire with a pinch, and topple wooden ramparts, stone shields, and TNT-laced
towers — zone by zone — until you reach the throne room and defeat the King.

Pixel art · 600×600 monocular display · 8–10 handcrafted levels · 1–5 minute sessions.

## Documents

| Doc | What it is |
|---|---|
| [SPEC.md](SPEC.md) | The full game + technical specification (the source of truth) |
| [docs/getting-started.md](docs/getting-started.md) | Plain-language guide for non-developers: how to preview, test, and contribute |
| [docs/spike-0-input-discovery.md](docs/spike-0-input-discovery.md) | Phase-0 on-device test protocol & findings |

## Status

**Phase 1 (core loop prototype) complete and playable** — deployed to GitHub Pages (see
Quickstart below): aim, fire, physics-driven flight, collisions, and win/lose all work
end to end. Phase 0's on-device discovery spike is still pending its findings; **Phase 2
(game systems)** — materials/damage, scoring/stars, level loader, and menus — is next.

## Quickstart (from Phase 1 onward)

The game is a static web app. **Play it here: https://jjang20.github.io/catapult-glass/**

Open that URL in a desktop browser and play with the Arrow keys (↑/↓ angle, ←/→ power)
and Enter (fire) — the same code path the glasses use. On the glasses, add that URL in
the Meta AI app. (The `/spike/` path on the same site hosts the Phase-0 input/perf test
page — not the game.)
