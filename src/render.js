// @ts-check
//
// render.js — the "render pipeline": the one place that draws to the screen.
//
// Plain-English overview:
//   The glasses give us a 600×600 square to draw in. But we design the game on a
//   smaller, imaginary 200×200 board ("logical pixels") and blow it up ×3 to fill
//   the 600×600 screen. Designing small and zooming up gives us big, chunky pixels
//   that stay crisp and readable on the glasses' low-density display.
//
//   This file knows nothing about the game rules. It only offers drawing tools
//   (clear the screen, draw a block, draw text). Game code calls these tools.

// LOGICAL = the width/height of our imaginary drawing board, in logical pixels.
export const LOGICAL = 200;
// SCALE = how many real screen pixels each logical pixel becomes (the ×3 zoom).
export const SCALE = 3;
// DEVICE = the real on-screen size in actual pixels: 200 × 3 = 600 (the viewport).
export const DEVICE = LOGICAL * SCALE;

// PALETTE = the planned colors for each kind of object (from SPEC §5.2).
// Each entry has a darker "fill" and a brighter "outline". On the glasses'
// additive display, pure black is invisible, so every shape needs a bright edge
// to read against the black background. (Same colors the Phase-0 spike tested.)
export const PALETTE = {
  // wood: warm amber — the default building material.
  wood:     { fill: '#b06820', outline: '#ffaa33' },
  // stone: cool blue-grey — heavy shields.
  stone:    { fill: '#6e7f8e', outline: '#b8c8d8' },
  // glass: cyan — shatters easily, bonus points.
  glass:    { fill: '#18b2c8', outline: '#66ffff' },
  // tnt: red — explodes.
  tnt:      { fill: '#c81818', outline: '#ff5e4b' },
  // defender: magenta — the enemy unit you must destroy to win.
  defender: { fill: '#c818a0', outline: '#ff55dd' },
  // catapult: green — the player's launcher at bottom-left.
  catapult: { fill: '#2f8f2f', outline: '#7dff7d' },
  // ground: dim grey — the floor things rest on (kept subtle on purpose).
  ground:   { fill: '#3a3a3a', outline: '#8a8a8a' },
};

/**
 * createRenderer wires up one <canvas> and hands back simple drawing tools.
 * @param {HTMLCanvasElement} canvas - the on-page canvas element to draw into.
 */
export function createRenderer(canvas) {
  // Grab the canvas's 2D drawing context — the actual paintbrush we issue commands to.
  const ctx = canvas.getContext('2d');
  // If the browser gave us nothing (very old/odd browser), fail loudly and clearly.
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Set the canvas's real pixel size to the full 600×600 device resolution.
  canvas.width = DEVICE;
  canvas.height = DEVICE;

  // Turn OFF smoothing: when we scale art up we want hard, crisp pixel edges,
  // not the soft blur browsers add by default. (SPEC §5.2.)
  ctx.imageSmoothingEnabled = false;

  /**
   * clear — paint the whole screen pure black (the "invisible" background on glasses).
   */
  function clear() {
    // Choose black as the fill color.
    ctx.fillStyle = '#000';
    // Paint a black rectangle covering every pixel of the 600×600 canvas.
    ctx.fillRect(0, 0, DEVICE, DEVICE);
  }

  /**
   * block — draw one rectangle in LOGICAL coordinates, with a bright 1-logical-px
   * outline around a solid fill. This is the building block for every game object.
   * @param {number} x - left edge, in logical pixels (0–200).
   * @param {number} y - top edge, in logical pixels (0–200), y grows downward.
   * @param {number} w - width in logical pixels.
   * @param {number} h - height in logical pixels.
   * @param {{fill:string, outline:string}} colors - a PALETTE entry.
   */
  function block(x, y, w, h, colors) {
    // First paint the OUTLINE color across the whole rectangle (the bright border).
    ctx.fillStyle = colors.outline;
    // Multiply logical coords by SCALE to turn them into real screen pixels.
    ctx.fillRect(x * SCALE, y * SCALE, w * SCALE, h * SCALE);
    // Then paint the FILL color on top, inset by 1 logical pixel on every side,
    // leaving the outline showing as a 1-logical-px (3 device px) bright frame.
    ctx.fillStyle = colors.fill;
    ctx.fillRect((x + 1) * SCALE, (y + 1) * SCALE, (w - 2) * SCALE, (h - 2) * SCALE);
  }

  /**
   * dot — draw a small filled square in LOGICAL coordinates (used later for the
   * dotted trajectory preview). Centered on (x, y).
   * @param {number} x - center x, logical pixels.
   * @param {number} y - center y, logical pixels.
   * @param {number} size - side length in logical pixels.
   * @param {string} color - any CSS color.
   */
  function dot(x, y, size, color) {
    // Choose the requested color.
    ctx.fillStyle = color;
    // Half the size, so we can center the square on (x, y).
    const half = size / 2;
    // Paint the little square, converting logical → device pixels.
    ctx.fillRect((x - half) * SCALE, (y - half) * SCALE, size * SCALE, size * SCALE);
  }

  /**
   * text — draw HUD text at full DEVICE resolution (NOT scaled ×3), so letters stay
   * smooth and readable. Sizes/positions are given in real device pixels.
   * @param {string} str - the text to show.
   * @param {number} x - device-pixel x position.
   * @param {number} y - device-pixel y position.
   * @param {object} [opts] - optional styling.
   * @param {number} [opts.size=22] - font size in device pixels (HUD must be ≥20).
   * @param {string} [opts.color='#ffd700'] - text color (default warm gold).
   * @param {CanvasTextAlign} [opts.align='left'] - horizontal alignment.
   * @param {CanvasTextBaseline} [opts.baseline='top'] - vertical alignment.
   */
  function text(str, x, y, opts = {}) {
    // Pull out the styling options, falling back to sensible defaults.
    const size = opts.size ?? 22;
    const color = opts.color ?? '#ffd700';
    // Set the font: bold monospace reads cleanly on the low-density display.
    ctx.font = 'bold ' + size + 'px ui-monospace, Menlo, Consolas, monospace';
    // Set the text color.
    ctx.fillStyle = color;
    // Set how the x/y position is interpreted (left/center/right, top/middle/bottom).
    ctx.textAlign = opts.align ?? 'left';
    ctx.textBaseline = opts.baseline ?? 'top';
    // Actually paint the text at the given device-pixel position.
    ctx.fillText(str, x, y);
  }

  // Hand back the raw context (for advanced use later) plus our friendly tools.
  return { ctx, clear, block, dot, text };
}
