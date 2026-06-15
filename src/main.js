// @ts-check
//
// main.js — the program's starting point ("boot"). It wires the pieces together:
//   render pipeline  ←  game/screen draws into it
//   keyboard source  →  screen stack  →  active screen reacts
//   animation loop   →  steps physics at a fixed rate, then redraws every frame
//
// Chunk 3 of Phase 1: the core loop is playable. Aim with ↑/↓/←/→, pinch (Enter) to fire;
// the boulder flies via matter.js, collides, and you win (defeat the defender) or lose
// (run out of boulders). A fixed-timestep loop drives the physics (SPEC §5.1).

// Pull in the drawing pipeline and the modules that drive it.
import { createRenderer } from './render.js';
import { createKeyboardSource } from './input.js';
import { createScreenStack } from './screens.js';
import { createGame, createGameplayScreen } from './game.js';
// The fixed physics step size (≈16.667 ms = 1/60 s), shared with the world.
import { STEP_MS } from './physics.js';

// Find the <canvas> in the page and build the renderer around it.
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game'));
const r = createRenderer(canvas);

// Create the game (state + physics world) and the gameplay screen that reads/draws it.
const game = createGame();
const screens = createScreenStack();
screens.push(createGameplayScreen(game));

// Debug handle for automated testing (SPEC §5.7 debug affordances). Only when the URL has
// "?debug" do we expose the game on window, so the Playwright harness can read state and
// body positions. Off by default, so it never ships in normal play.
if (location.search.includes('debug')) {
  // @ts-ignore — intentional debug-only global.
  window.__game = game;
}

// Start listening for input. Each intent goes to the active screen; the loop below repaints
// every frame, so we don't need to redraw here.
createKeyboardSource((intent, repeat) => {
  screens.handleInput(intent, repeat);
});

// ── The animation loop ──
// We step the physics at a FIXED 60 Hz using an "accumulator": real frames arrive at an
// uneven rate (rAF, ~90 Hz on the glasses), so we bank the elapsed time and spend it in
// fixed-size chunks. This keeps the simulation deterministic and smooth (SPEC §5.1).

// When the previous frame happened (ms). performance.now() is a high-resolution clock.
let last = performance.now();
// The bank of un-simulated time (ms).
let acc = 0;

function frame(now) {
  // How long since the last frame, in ms.
  const dt = now - last;
  last = now;

  // Add it to the bank, but cap the bank so a long pause (e.g. a background tab) can't make
  // us try to simulate hundreds of steps at once ("spiral of death").
  acc += dt;
  if (acc > 250) acc = 250;

  // Spend the banked time in fixed 60 Hz steps. stepPhysics() only does work during a
  // shot's flight; in aim/result it returns immediately, so the bank simply drains.
  while (acc >= STEP_MS) {
    game.stepPhysics();
    acc -= STEP_MS;
  }

  // Advance time-based visuals (the round-end flash) by this frame's real elapsed time.
  game.tick(dt);

  // Repaint the active screen, then ask the browser for the next frame.
  screens.draw(r);
  requestAnimationFrame(frame);
}

// Kick off the loop.
requestAnimationFrame(frame);
