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
  // boulder: pale grey rock — the projectile you fire.
  boulder:  { fill: '#9a9a9a', outline: '#e8e8e8' },
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

  /**
   * line — draw a straight line in DEVICE pixels (used for the aim direction tick).
   * @param {number} x1 - start x (device px).
   * @param {number} y1 - start y (device px).
   * @param {number} x2 - end x (device px).
   * @param {number} y2 - end y (device px).
   * @param {string} color - any CSS color.
   * @param {number} width - line thickness in device px.
   */
  function line(x1, y1, x2, y2, color, width) {
    // Set the stroke color and thickness.
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    // Round the ends so the short tick looks clean.
    ctx.lineCap = 'round';
    // Trace the line and paint it.
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  /**
   * powerSlider — draw the horizontal power control beside the catapult, in DEVICE
   * pixels. Shape echoes a familiar phone-style slider (SPEC §3.3, updated):
   *   • a PILL-SHAPED track (a capsule with rounded ends),
   *   • a FILLED portion from the left end up to the knob — this is the value "indicator",
   *     painted with a green→red gradient anchored across the WHOLE track (green at the
   *     low end, red at the high end), so the fill's leading-edge color tells you how
   *     hard the shot will fly,
   *   • the unfilled remainder shown as a dim track,
   *   • a CIRCULAR knob — a single neutral color, since the gradient lives on the fill,
   *     not the knob — sitting at the fill's leading edge.
   * (No drop shadow: dark pixels are invisible on the glasses' additive display, §2.1.)
   * @param {number} x0 - the knob's LEFT-most center x (device px) = lowest power.
   * @param {number} x1 - the knob's RIGHT-most center x (device px) = highest power.
   * @param {number} y  - the track's vertical center (device px).
   * @param {number} power - the current power notch (1..total).
   * @param {number} total - how many power notches there are (10).
   */
  function powerSlider(x0, x1, y, power, total) {
    // Fraction 0..1 of how far along the track the knob sits.
    // (power − 1) / (total − 1): power 1 → 0 (far left), power 10 → 1 (far right).
    const t = total > 1 ? (power - 1) / (total - 1) : 0;
    // The knob's center x: from x0 (lowest), walk t of the way toward x1 (highest).
    const handleX = x0 + t * (x1 - x0);

    // Track half-thickness, and the knob's radius (bigger than the track, so the knob
    // overlaps and hides the rounded cap at the fill's leading edge).
    const trackR = 6;   // pill is 12 device px thick
    const knobR = 11;   // knob is 22 device px across

    // Small helper: trace a pill (capsule) path between two cap centers xa..xb. roundRect
    // with a corner radius equal to half the height turns the ends into clean semicircles.
    const pill = (xa, xb) => {
      ctx.beginPath();
      ctx.roundRect(xa - trackR, y - trackR, (xb - xa) + trackR * 2, trackR * 2, trackR);
    };

    // 1) The whole track, dim. Drawn first so the unfilled remainder shows on the right.
    pill(x0, x1);
    ctx.fillStyle = '#6a6a6a';
    ctx.fill();

    // 2) The green→red gradient, anchored to the FULL track (x0 = green … x1 = red), so a
    //    given power always maps to the same color no matter how full the bar is.
    const grad = ctx.createLinearGradient(x0, 0, x1, 0);
    grad.addColorStop(0, '#3aff3a');   // low power  → green
    grad.addColorStop(0.5, '#ffe23a'); // mid power  → yellow
    grad.addColorStop(1, '#ff3a3a');   // high power → red

    // 3) The filled indicator: the pill from the left end up to the knob, painted with
    //    that gradient. Its rounded right cap is tucked under the knob drawn next.
    pill(x0, handleX);
    ctx.fillStyle = grad;
    ctx.fill();

    // 4) The knob: a solid, neutral-white circle at the fill's leading edge, with a thin
    //    bright ring so it reads clearly against both the fill and the black background.
    ctx.beginPath();
    ctx.arc(handleX, y, knobR, 0, Math.PI * 2);
    ctx.fillStyle = '#f2f4ff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // 5) The power number, just past the track's right end (clear of the dim ground band).
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 22px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(power), x1 + trackR + 12, y);
  }

  /**
   * bodyRect — draw a matter.js box body: a rectangle anchored at its CENTER and rotated
   * to the body's angle (matter gives us center + angle, unlike block()'s top-left). Drawn
   * outline-first then an inset fill, so it keeps the same bright 1-logical-px edge as block().
   * @param {number} cx - body center x, logical px.
   * @param {number} cy - body center y, logical px.
   * @param {number} w - body width, logical px.
   * @param {number} h - body height, logical px.
   * @param {number} angle - rotation in radians (matter's body.angle).
   * @param {{fill:string, outline:string}} colors - a PALETTE entry.
   */
  function bodyRect(cx, cy, w, h, angle, colors) {
    // Save the canvas state so our move/rotate doesn't leak into later draws.
    ctx.save();
    // Move the canvas origin to the body's center (in device px), then rotate to its angle.
    ctx.translate(cx * SCALE, cy * SCALE);
    ctx.rotate(angle);
    // Width/height in device px.
    const W = w * SCALE, H = h * SCALE;
    // Bright outline across the whole rectangle (centered on the new origin).
    ctx.fillStyle = colors.outline;
    ctx.fillRect(-W / 2, -H / 2, W, H);
    // Fill inset by 1 logical px (SCALE) on every side, leaving the outline showing.
    ctx.fillStyle = colors.fill;
    ctx.fillRect(-W / 2 + SCALE, -H / 2 + SCALE, W - 2 * SCALE, H - 2 * SCALE);
    // Restore the un-rotated, un-translated canvas.
    ctx.restore();
  }

  /**
   * bodyCircle — draw a round body (the boulder): a bright outline ring with an inset fill,
   * centered on (cx, cy). In DEVICE px.
   * @param {number} cx - center x, logical px.
   * @param {number} cy - center y, logical px.
   * @param {number} r - radius, logical px.
   * @param {{fill:string, outline:string}} colors - a PALETTE entry.
   */
  function bodyCircle(cx, cy, r, colors) {
    // Convert center + radius to device px.
    const X = cx * SCALE, Y = cy * SCALE, R = r * SCALE;
    // Outer disc in the outline color (the bright ring).
    ctx.beginPath();
    ctx.arc(X, Y, R, 0, Math.PI * 2);
    ctx.fillStyle = colors.outline;
    ctx.fill();
    // Inner disc in the fill color, 1 logical px smaller, leaving a bright rim.
    ctx.beginPath();
    ctx.arc(X, Y, Math.max(0, R - SCALE), 0, Math.PI * 2);
    ctx.fillStyle = colors.fill;
    ctx.fill();
  }

  /**
   * flash — paint a translucent sheet over the whole screen (the round-end "flash").
   * Used as a single, gentle, eased pulse (not a strobe). The color is usually a soft
   * tint; kept low-opacity so it reads as a glow, not a harsh spike, on the additive display.
   * @param {number} alpha - opacity 0..1 (0 = invisible).
   * @param {string} [color='#ffffff'] - any CSS color (the tint).
   */
  function flash(alpha, color) {
    // Save/restore so the temporary transparency doesn't affect other draws.
    ctx.save();
    // Clamp alpha into the valid 0..1 range for safety.
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = color || '#ffffff';
    ctx.fillRect(0, 0, DEVICE, DEVICE);
    ctx.restore();
  }

  // Hand back the raw context (for advanced use later) plus our friendly tools.
  return { ctx, clear, block, dot, text, line, powerSlider, bodyRect, bodyCircle, flash };
}
