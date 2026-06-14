// @ts-check
//
// game.js — the gameplay state and rules.
//
// Phase 1 is built in chunks. THIS chunk (2) covers only the AIM phase: choosing
// an angle and a power, and showing the resulting trajectory. Firing, flight,
// collisions, and win/lose come in Chunk 3.

// Drawing tools/constants from the render pipeline.
import { PALETTE, DEVICE, SCALE } from './render.js';
// The input intents (UP/DOWN/LEFT/RIGHT/CONFIRM/CANCEL).
import { INTENT } from './input.js';
// Shared physics: where shots launch from, and how to build the preview arc.
import { LAUNCH, launchVelocity, sampleTrajectory, POWER_STEPS } from './physics.js';

// Aim tuning from SPEC §3.3: angle 10–80° in 5° steps; power 1–10 in 1-step.
export const ANGLE_MIN = 10;
export const ANGLE_MAX = 80;
export const ANGLE_STEP = 5;
export const POWER_MIN = 1;
export const POWER_MAX = POWER_STEPS; // 10, kept in sync with physics.js

// Small helper: keep a number within a low..high range.
function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

/**
 * createGame — make a fresh game with its aim state and the rules to change it.
 */
export function createGame() {
  // The single source of truth for the current game state.
  const state = {
    phase: 'aim',   // only "aim" exists this chunk
    angle: 45,      // start mid-range, a comfortable default
    power: 5,       // start at the middle power notch
    shotsTotal: 3,  // boulders this level grants (placeholder until level data, Chunk 3)
    shotsLeft: 3,   // boulders still unspent — drops as we fire (firing arrives Chunk 3)
  };

  return {
    state,
    // Raise the angle by one 5° step, never above 80°.
    angleInc() { state.angle = clamp(state.angle + ANGLE_STEP, ANGLE_MIN, ANGLE_MAX); },
    // Lower the angle by one 5° step, never below 10°.
    angleDec() { state.angle = clamp(state.angle - ANGLE_STEP, ANGLE_MIN, ANGLE_MAX); },
    // Turn the power dial up one notch, never above 10.
    powerInc() { state.power = clamp(state.power + 1, POWER_MIN, POWER_MAX); },
    // Turn the power dial down one notch, never below 1.
    powerDec() { state.power = clamp(state.power - 1, POWER_MIN, POWER_MAX); },
    // The dotted preview points for the current aim (shared physics constants).
    previewPoints() {
      const vel = launchVelocity(state.angle, state.power);
      return sampleTrajectory(LAUNCH, vel);
    },
  };
}

/**
 * createGameplayScreen — the on-screen gameplay screen. It OWNS the meaning of
 * each input intent (SPEC §5.4) and knows how to draw the scene + aim UI.
 * @param {ReturnType<typeof createGame>} game
 */
export function createGameplayScreen(game) {
  return {
    /**
     * onInput — translate a generic intent into a gameplay action.
     * Mapping is exactly the SPEC §3.3 aim controls.
     * @param {string} intent
     * @param {boolean} _repeat - auto-repeat flag (unused for now; discrete steps).
     */
    onInput(intent, _repeat) {
      if (intent === INTENT.UP) game.angleInc();          // swipe up = +5° angle
      else if (intent === INTENT.DOWN) game.angleDec();   // swipe down = −5° angle
      else if (intent === INTENT.RIGHT) game.powerInc();  // swipe right = +1 power
      else if (intent === INTENT.LEFT) game.powerDec();   // swipe left = −1 power
      // CONFIRM (fire) and CANCEL (pause) are wired in Chunk 3.
    },

    /**
     * draw — paint the whole gameplay screen for the current state.
     * @param {ReturnType<import('./render.js').createRenderer>} r
     */
    draw(r) {
      // 1) Black background.
      r.clear();

      // 2) Placeholder level backdrop (real level + physics arrive in Chunk 3):
      r.block(0, 180, 200, 8, PALETTE.ground);     // ground strip
      r.block(16, 168, 16, 12, PALETTE.catapult);  // catapult at bottom-left
      r.block(150, 168, 8, 12, PALETTE.wood);      // tower, lower block
      r.block(150, 156, 8, 12, PALETTE.wood);      // tower, upper block
      r.block(149, 146, 10, 10, PALETTE.defender); // defender on top (the target)

      // 3) Trajectory preview: white dots along the first ~40% of the arc.
      const pts = game.previewPoints();
      for (const p of pts) r.dot(p.x, p.y, 1.6, '#ffffff');

      // 4) Aim direction tick: a short bright line from the launch point, so the
      //    angle is felt as well as read. Computed in device pixels (×SCALE).
      const rad = (game.state.angle * Math.PI) / 180;
      const x1 = LAUNCH.x * SCALE;
      const y1 = LAUNCH.y * SCALE;
      const len = 46; // device px
      r.line(x1, y1, x1 + Math.cos(rad) * len, y1 - Math.sin(rad) * len, '#7dff7d', 3);

      // 5) HUD — all text ≥20 device px, inside the 16 px safe margin (SPEC §4.2).
      r.text('SCORE 0', 16, 16, { size: 24 });  // top-left
      // top-right: shots remaining as "left/total" (e.g. "3/3"). The left number will
      // drop as boulders are fired once flight is wired up (Chunk 3).
      r.text('SHOTS ' + game.state.shotsLeft + '/' + game.state.shotsTotal,
        DEVICE - 16, 16, { size: 24, align: 'right' });

      // 6) Aim readouts at bottom-left, beside the catapult: the angle number, then the
      //    power slider (faint rail + end ticks + a green→red handle + the power number).
      r.text(game.state.angle + '°', 120, DEVICE - 100, { size: 24 }); // e.g. "45°"
      // "POWER" caption sits to the left of the track; the slider draws the pill track,
      // the green→red gradient fill (the value indicator), the circular knob, and number.
      r.text('POWER', 16, DEVICE - 27, { size: 16, color: '#9bd4ff', align: 'left', baseline: 'middle' });
      r.powerSlider(116, 330, DEVICE - 27, game.state.power, POWER_MAX);
    },
  };
}
