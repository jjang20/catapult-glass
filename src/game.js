// @ts-check
//
// game.js — the gameplay state and rules.
//
// Phase 1 is built in chunks. Chunk 2 built the AIM phase (choosing angle + power and
// showing the trajectory). THIS chunk (3) completes the core loop: firing a boulder that
// really flies (matter.js), collisions that topple the tower, and win/lose.
//
// The loop, mirroring SPEC §3.2:  aim → flight → (settle) → result → aim …

// Drawing tools/constants from the render pipeline.
import { PALETTE, DEVICE, SCALE } from './render.js';
// The input intents (UP/DOWN/LEFT/RIGHT/CONFIRM/CANCEL).
import { INTENT } from './input.js';
// Shared physics: launch point, the preview math, power steps, the real world, step size.
import { LAUNCH, launchVelocity, sampleTrajectory, POWER_STEPS, createWorld, STEP_MS } from './physics.js';

// Aim tuning from SPEC §3.3: angle 10–80° in 5° steps; power 1–10 in 1-steps.
export const ANGLE_MIN = 10;
export const ANGLE_MAX = 80;
export const ANGLE_STEP = 5;
export const POWER_MIN = 1;
export const POWER_MAX = POWER_STEPS; // 10, kept in sync with physics.js

// FLASH_MS = how long the round-end bright flash lasts (milliseconds).
const FLASH_MS = 380;
// MAX_FLIGHT_MS = a safety cap: if a shot somehow never comes to rest, end it after this
// long so the game can't get stuck (e.g. a body jittering forever).
const MAX_FLIGHT_MS = 5000;

// Small helper: keep a number within a low..high range.
function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

/**
 * createGame — make a fresh game: its state, its physics world, and the rules that change
 * them (aim, fire, step the simulation, decide win/lose, restart).
 */
export function createGame() {
  // The single source of truth for the current game state.
  const state = {
    phase: 'aim',   // 'aim' | 'flight' | 'result'  (settle is detected within flight)
    angle: 45,      // start mid-range, a comfortable default
    power: 5,       // start at the middle power notch
    shotsTotal: 3,  // boulders this zone grants
    shotsLeft: 3,   // boulders still unspent — drops as we fire
    result: null,   // null | 'win' | 'lose' (set when a round ends)
    flash: 0,       // remaining flash time in ms (0 = no flash showing)
    flightMs: 0,    // how long the current shot has been in flight (for the safety cap)
  };

  // The real matter.js simulation (ground + tower + defender). Built once here.
  const world = createWorld();

  // endRound — finish the shot: record win/lose, show the result, trigger the flash.
  function endRound(result) {
    state.result = result;     // remember which message to show
    state.phase = 'result';    // stop accepting aim input; wait for a restart
    state.flash = FLASH_MS;    // kick off the bright flash
  }

  return {
    state,
    world,

    // ── Aiming (only meaningful in the 'aim' phase) ──
    // Raise the angle by one 5° step, never above 80°.
    angleInc() { state.angle = clamp(state.angle + ANGLE_STEP, ANGLE_MIN, ANGLE_MAX); },
    // Lower the angle by one 5° step, never below 10°.
    angleDec() { state.angle = clamp(state.angle - ANGLE_STEP, ANGLE_MIN, ANGLE_MAX); },
    // Turn the power up one notch, never above 10.
    powerInc() { state.power = clamp(state.power + 1, POWER_MIN, POWER_MAX); },
    // Turn the power down one notch, never below 1.
    powerDec() { state.power = clamp(state.power - 1, POWER_MIN, POWER_MAX); },

    // The dotted preview points for the current aim (shared physics constants).
    previewPoints() {
      const vel = launchVelocity(state.angle, state.power);
      return sampleTrajectory(LAUNCH, vel);
    },

    // ── Firing ──
    // Fire a boulder: only in aim, only if shots remain. Spend a shot, launch the rock,
    // and switch to the flight phase.
    fire() {
      if (state.phase !== 'aim' || state.shotsLeft <= 0) return;
      state.shotsLeft -= 1;
      world.spawnBoulder(state.angle, state.power);
      state.phase = 'flight';
      state.flightMs = 0;
    },

    // ── The physics heartbeat (called at a fixed 60 Hz by main.js) ──
    // Advance the simulation one step while a shot is in flight, then decide what happens
    // when the defender is defeated or the shot comes to rest.
    stepPhysics() {
      if (state.phase !== 'flight') return; // physics only runs during a shot
      world.step();
      state.flightMs += STEP_MS;

      // Win the instant the defender is defeated (a direct hit or a hard crush).
      if (!world.defenderAlive) { endRound('win'); return; }

      // Otherwise wait for the shot to settle (everything at rest), the boulder to leave
      // the screen, or the safety timer to expire.
      if (world.isSettled() || world.boulderGone() || state.flightMs >= MAX_FLIGHT_MS) {
        if (state.shotsLeft <= 0) endRound('lose'); // out of boulders, target still up
        else state.phase = 'aim';                   // line up the next shot (world persists)
      }
    },

    // ── Per-frame, time-based visuals (called every animation frame by main.js) ──
    // Right now this only fades the round-end flash; dt is the frame's elapsed ms.
    tick(dtMs) {
      if (state.flash > 0) state.flash = Math.max(0, state.flash - dtMs);
    },

    // ── Replay ──
    // Restart the zone: rebuild the world, refill boulders, clear the result.
    restart() {
      world.reset();
      state.shotsLeft = state.shotsTotal;
      state.result = null;
      state.flash = 0;
      state.flightMs = 0;
      state.phase = 'aim';
    },
  };
}

/**
 * createGameplayScreen — the on-screen gameplay screen. It OWNS the meaning of each input
 * intent per phase (SPEC §3.3/§5.4) and knows how to draw the scene for the current phase.
 * @param {ReturnType<typeof createGame>} game
 */
export function createGameplayScreen(game) {
  // Shorthand for the live state object.
  const state = game.state;

  return {
    /**
     * onInput — translate a generic intent into a gameplay action, gated by phase.
     * @param {string} intent
     * @param {boolean} _repeat - auto-repeat flag (unused; all steps are discrete).
     */
    onInput(intent, _repeat) {
      if (state.phase === 'aim') {
        // Aim controls (SPEC §3.3) plus fire on pinch.
        if (intent === INTENT.UP) game.angleInc();          // swipe up = +5° angle
        else if (intent === INTENT.DOWN) game.angleDec();   // swipe down = −5° angle
        else if (intent === INTENT.RIGHT) game.powerInc();  // swipe right = +1 power
        else if (intent === INTENT.LEFT) game.powerDec();   // swipe left = −1 power
        else if (intent === INTENT.CONFIRM) game.fire();    // pinch = fire
      } else if (state.phase === 'result') {
        // On the win/lose screen, a pinch starts the zone over.
        if (intent === INTENT.CONFIRM) game.restart();
      }
      // During 'flight' all input is ignored (SPEC §3.3). A real pause overlay (Escape) is
      // Phase 2, so CANCEL is a no-op stub here.
    },

    /**
     * draw — paint the whole gameplay screen for the current state.
     * @param {ReturnType<import('./render.js').createRenderer>} r
     */
    draw(r) {
      // 1) Black background.
      r.clear();

      // 2) The catapult (a static decoration, not a physics body) at bottom-left.
      r.block(16, 168, 16, 12, PALETTE.catapult);

      // 3) Every live physics body, drawn from its current position/angle.
      for (const b of game.world.bodies()) {
        if (b.kind === 'boulder') {
          r.bodyCircle(b.position.x, b.position.y, b._r, PALETTE.boulder);
        } else if (b.kind === 'ground') {
          r.bodyRect(b.position.x, b.position.y, b._w, b._h, b.angle, PALETTE.ground);
        } else if (b.kind === 'defender') {
          r.bodyRect(b.position.x, b.position.y, b._w, b._h, b.angle, PALETTE.defender);
        } else {
          // wood tower blocks
          r.bodyRect(b.position.x, b.position.y, b._w, b._h, b.angle, PALETTE.wood);
        }
      }

      // 4) Aim-only overlays: the dotted trajectory preview and the angle direction tick.
      if (state.phase === 'aim') {
        const pts = game.previewPoints();
        for (const p of pts) r.dot(p.x, p.y, 1.6, '#ffffff');
        // A short bright line from the launch point, so the angle is felt as well as read.
        const rad = (state.angle * Math.PI) / 180;
        const x1 = LAUNCH.x * SCALE;
        const y1 = LAUNCH.y * SCALE;
        const len = 46; // device px
        r.line(x1, y1, x1 + Math.cos(rad) * len, y1 - Math.sin(rad) * len, '#7dff7d', 3);
      }

      // 5) HUD — always show score (placeholder) and shots remaining (SPEC §4.2).
      r.text('SCORE 0', 16, 16, { size: 24 });                               // top-left
      r.text('SHOTS ' + state.shotsLeft + '/' + state.shotsTotal,
        DEVICE - 16, 16, { size: 24, align: 'right' });                      // top-right

      // 6) Aim feedback (angle readout + power slider) — only useful while aiming.
      if (state.phase === 'aim') {
        r.text(state.angle + '°', 120, DEVICE - 100, { size: 24 }); // e.g. "45°"
        r.text('POWER', 16, DEVICE - 27, { size: 16, color: '#9bd4ff', align: 'left', baseline: 'middle' });
        r.powerSlider(116, 330, DEVICE - 27, state.power, POWER_MAX);
      }

      // 7) Result message (win/lose), centered, big and bright.
      if (state.phase === 'result') {
        const win = state.result === 'win';
        r.text(win ? 'VICTORY' : 'OUT OF BOULDERS', DEVICE / 2, DEVICE / 2 - 18,
          { size: 44, align: 'center', baseline: 'middle', color: win ? '#7dff7d' : '#ff7d7d' });
        r.text('pinch to play again', DEVICE / 2, DEVICE / 2 + 34,
          { size: 20, align: 'center', baseline: 'middle', color: '#ffffff' });
      }

      // 8) The round-end flash, fading out (drawn last so it sits on top of everything).
      if (state.flash > 0) r.flash((state.flash / FLASH_MS) * 0.8);
    },
  };
}
