// @ts-check
//
// main.js — the program's starting point ("boot").
//
// Chunk 1 of Phase 1: this file does the bare minimum — it switches on the render
// pipeline and paints ONE still test picture so we can check that the look is right
// (crisp chunky pixels, pure-black background, bright-on-black colors, readable text).
//
// There is deliberately NO game loop, input, or physics yet — those arrive in later
// chunks. Right now we only want to confirm the drawing layer works on the glasses.

// Bring in the drawing tools and constants from the render pipeline.
import { createRenderer, PALETTE, DEVICE } from './render.js';

// Find the <canvas> element in the page by its id.
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game'));

// Build the renderer around that canvas (sets size, disables smoothing, etc.).
const r = createRenderer(canvas);

/**
 * drawTestScene — paint a representative still frame using placeholder blocks.
 * Everything here is temporary, just to evaluate the visual look of the pipeline.
 * Coordinates are in LOGICAL pixels (the 200×200 board); y grows downward.
 */
function drawTestScene() {
  // 1) Wipe the screen to pure black (invisible on the glasses' additive display).
  r.clear();

  // 2) Ground strip near the bottom. SPEC §3.6 puts the ground at logical y≈180,
  //    so the floor occupies y 180–188 across the full width.
  r.block(0, 180, 200, 8, PALETTE.ground);

  // 3) The player's catapult: a placeholder green block at bottom-left (x≈20),
  //    sitting on the ground. (Real catapult art comes in Phase 3.)
  r.block(16, 168, 16, 12, PALETTE.catapult);

  // 4) A small wooden tower on the right two-thirds of the screen: two stacked
  //    blocks, each 8 wide × 12 tall, so the bottom block tops out where the next
  //    one begins. These are our destructible targets-to-be.
  r.block(150, 168, 8, 12, PALETTE.wood);  // bottom block (rests on the ground)
  r.block(150, 156, 8, 12, PALETTE.wood);  // top block (stacked above it)

  // 5) A defender perched atop the tower — the enemy unit you must destroy to win.
  //    Drawn in magenta so it stands out as the key target (SPEC §3.4).
  r.block(149, 146, 10, 10, PALETTE.defender);

  // 6) HUD text samples, drawn at full resolution so letters stay smooth.
  //    SPEC §3.6/§4.2: HUD text ≥20 device px, kept 16 device px from every edge.
  //    Top-left: the score readout.
  r.text('SCORE 0', 16, 16, { size: 24 });
  //    Top-right: remaining shots (right-aligned against the 16px right margin).
  r.text('SHOTS 3', DEVICE - 16, 16, { size: 24, align: 'right' });
  //    Bottom-left, beside the catapult: the angle readout (power dial comes later).
  r.text('45°', 16, DEVICE - 16, { size: 24, baseline: 'bottom' });
}

// Paint the test scene once. (Later chunks will redraw every frame in a loop.)
drawTestScene();
