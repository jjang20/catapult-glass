// @ts-check
//
// main.js — the program's starting point ("boot"). It wires the pieces together:
//   render pipeline  ←  game/screen draws into it
//   keyboard source  →  screen stack  →  active screen reacts, then we redraw
//
// Chunk 2 of Phase 1: aiming works. Press ↑/↓ to change angle, ←/→ to change
// power; the slider, angle readout, and dotted trajectory update live. There is no
// continuous animation loop yet — we simply redraw whenever the aim changes.
// (The fixed-timestep loop arrives in Chunk 3, when the boulder actually flies.)

// Pull in the drawing pipeline and the modules that drive it.
import { createRenderer } from './render.js';
import { createKeyboardSource } from './input.js';
import { createScreenStack } from './screens.js';
import { createGame, createGameplayScreen } from './game.js';

// Find the <canvas> in the page and build the renderer around it.
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game'));
const r = createRenderer(canvas);

// Create the game state and the gameplay screen that reads/draws it.
const game = createGame();
const screens = createScreenStack();
screens.push(createGameplayScreen(game));

// One place that repaints the active screen.
function redraw() {
  screens.draw(r);
}

// Start listening for input. Each intent goes to the active screen, then we
// repaint so the change is visible immediately.
createKeyboardSource((intent, repeat) => {
  screens.handleInput(intent, repeat);
  redraw();
});

// Paint the first frame so something is on screen before any input.
redraw();
