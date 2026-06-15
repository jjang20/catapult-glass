// @ts-check
//
// physics.js — the shared physics numbers and the math for the aiming arc.
//
// SPEC §3.3 is strict about one thing: the dotted trajectory preview MUST be
// computed from the SAME constants (gravity, launch speed) as the real flight —
// never a separate guess. So those constants live HERE, in one place, and both
// the preview (Chunk 2) and the real matter.js simulation (Chunk 3) will read them.
//
// Coordinates are LOGICAL pixels (the 200×200 board); y grows DOWNWARD
// (so "up" is negative y), matching the canvas and matter.js. (SPEC §5.5.)

// LAUNCH = the point the boulder leaves from: the tip of the catapult at
// bottom-left. The catapult placeholder block sits at x16–32, y168–180, so the
// tip is its top-right corner.
export const LAUNCH = { x: 30, y: 166 };

// GROUND_Y = the y of the ground surface, used to know when the arc lands.
export const GROUND_Y = 180;

// GRAVITY = downward acceleration in logical pixels per second². A starting
// value chosen for feel; we will tune it together once the boulder really flies.
export const GRAVITY = 620;

// POWER_STEPS = how many notches the power dial has (SPEC §3.3: 10 steps).
export const POWER_STEPS = 10;

// SPEED_MIN / SPEED_MAX = how fast the boulder leaves at power 1 vs power 10,
// in logical pixels per second. Starting guesses, tunable later.
export const SPEED_MIN = 160;
export const SPEED_MAX = 380;

/**
 * launchVelocity — turn an aim (angle in degrees, power notch 1–10) into a
 * velocity vector {vx, vy} in logical pixels per second.
 * @param {number} angleDeg - launch angle above horizontal (10–80°).
 * @param {number} power - power notch, 1–10.
 * @returns {{vx:number, vy:number}}
 */
export function launchVelocity(angleDeg, power) {
  // Spread the 10 power notches evenly between the slow and fast speeds.
  const speed = SPEED_MIN + ((power - 1) / (POWER_STEPS - 1)) * (SPEED_MAX - SPEED_MIN);
  // Convert the angle from degrees to radians (what Math.cos/sin expect).
  const rad = (angleDeg * Math.PI) / 180;
  // Horizontal part: cos × speed (positive = to the right).
  // Vertical part: −sin × speed (negative because "up" is negative y).
  return { vx: Math.cos(rad) * speed, vy: -Math.sin(rad) * speed };
}

/**
 * sampleTrajectory — produce a list of points along the start of the flight arc,
 * for the dotted preview. Uses plain projectile math with the shared GRAVITY.
 * @param {{x:number,y:number}} origin - launch point (logical px).
 * @param {{vx:number,vy:number}} vel - launch velocity (logical px/s).
 * @param {number} [count=16] - how many preview dots to produce.
 * @returns {{x:number,y:number}[]}
 */
export function sampleTrajectory(origin, vel, count = 16) {
  // Position over time t: x = x0 + vx·t ; y = y0 + vy·t + ½·g·t².
  // First find when the arc would hit the ground, by solving the y-equation
  // ½g·t² + vy·t + (y0 − GROUND_Y) = 0 for t (the quadratic formula).
  const a = 0.5 * GRAVITY;            // coefficient of t²
  const b = vel.vy;                   // coefficient of t
  const c = origin.y - GROUND_Y;      // constant term (negative: we start above ground)
  const disc = b * b - 4 * a * c;     // discriminant (always > 0 here, since c < 0)
  // Take the positive root = the time the boulder reaches the ground.
  const tGround = (-b + Math.sqrt(disc)) / (2 * a);
  // SPEC: preview only the FIRST ~40% of the flight, so the player still has to commit.
  const tPreview = 0.4 * tGround;
  // Walk evenly through that time window, recording a point at each step.
  const pts = [];
  for (let i = 1; i <= count; i++) {
    const t = (tPreview * i) / count;
    pts.push({
      x: origin.x + vel.vx * t,
      y: origin.y + vel.vy * t + 0.5 * GRAVITY * t * t,
    });
  }
  return pts;
}

// ───────────────────────────────────────────────────────────────────────────
// The real simulation (Chunk 3): a matter.js world the boulder actually flies in.
// ───────────────────────────────────────────────────────────────────────────

// BOARD = the logical board size (200×200). Used to tell when a boulder has flown
// off-screen. Kept as a plain number so physics.js stays free of rendering imports.
const BOARD = 200;

// STEP_HZ = physics steps per second. SPEC §5.1 fixes this at 60 Hz.
export const STEP_HZ = 60;
// STEP_MS = the wall-clock duration of one fixed step, in milliseconds (≈16.667).
export const STEP_MS = 1000 / STEP_HZ;

// BOULDER_R = the boulder's radius in logical px (a chunky rock that won't tunnel).
export const BOULDER_R = 5;

// CRUSH_SPEED = how fast (logical px/s, as a relative impact speed) a falling BLOCK must
// strike the defender to "crush" it. A direct boulder touch always counts; this only
// gates block-on-defender hits. Tunable during play-testing.
export const CRUSH_SPEED = 120;

// REST_SPEED = below this speed (logical px/s) a body counts as "at rest", for deciding
// when a shot has settled.
const REST_SPEED = 12;

/**
 * matterVel — convert a velocity in logical px/SECOND into matter.js units (px per fixed
 * step), which is what Body.setVelocity expects. One step lasts 1/STEP_HZ seconds, so
 * px/step = (px/s) ÷ STEP_HZ. This is the bridge that makes the real launch speed equal
 * the speed the dotted preview was drawn with (SPEC §3.3).
 * @param {{vx:number, vy:number}} v - velocity in logical px/s.
 * @returns {{x:number, y:number}} velocity in matter px/step.
 */
function matterVel(v) {
  return { x: v.vx / STEP_HZ, y: v.vy / STEP_HZ };
}

/**
 * createWorld — build and own the matter.js simulation for the one hardcoded Phase-1 zone:
 * a static ground, a short topple-able tower of blocks, and a defender on top. It exposes
 * just enough for the game loop: step the sim, spawn a boulder, list bodies to draw, ask
 * whether things have settled, and reset for a replay. (A real level loader is Phase 2.)
 */
export function createWorld() {
  // The vendored library attaches itself to window.Matter (see index.html).
  const M = window.Matter;
  if (!M) throw new Error('matter.js (window.Matter) is not loaded');

  // The engine = the whole physics simulation.
  const engine = M.Engine.create();
  // Let resting bodies "sleep" so they stop eating CPU (SPEC §5.1).
  engine.enableSleeping = true;
  // Cap solver work to the spec's budget (quality vs. performance trade-off).
  engine.positionIterations = 6;
  engine.velocityIterations = 4;
  // Calibrate gravity so matter's downward pull equals our shared GRAVITY (px/s²) — the
  // SAME number the dotted preview uses. matter's effective acceleration in px/s² is
  // gravity.y × gravity.scale × 1e6, so we solve gravity.scale = GRAVITY / 1e6.
  engine.gravity.x = 0;
  engine.gravity.y = 1;
  engine.gravity.scale = GRAVITY / 1e6;

  // The one hardcoded zone. Coordinates are body CENTERS in logical px (matter positions
  // bodies by their center); y grows downward. The tower sits on the right, the defender
  // perches on top — mirroring the placeholder rectangles from Chunk 2.
  const LEVEL = {
    ground:   { cx: 100, cy: 184, w: 200, h: 8 },
    blocks: [
      { cx: 154, cy: 174, w: 12, h: 12 }, // tower, lower block
      { cx: 154, cy: 162, w: 12, h: 12 }, // tower, upper block
    ],
    defender: { cx: 154, cy: 150, w: 10, h: 10 }, // perched on top of the tower
  };

  // Live body references, (re)created by buildLevel(). `let` so reset() can replace them.
  let ground, blocks, defender, boulder, defenderAlive;

  // buildLevel — create fresh bodies for the zone and add them to the world.
  function buildLevel() {
    // Ground: immovable floor across the bottom.
    ground = M.Bodies.rectangle(LEVEL.ground.cx, LEVEL.ground.cy, LEVEL.ground.w, LEVEL.ground.h, { isStatic: true });
    ground.kind = 'ground';
    ground._w = LEVEL.ground.w; ground._h = LEVEL.ground.h;

    // Tower blocks: dynamic, so the boulder can knock them over. Friction helps them stack.
    blocks = LEVEL.blocks.map((b) => {
      const body = M.Bodies.rectangle(b.cx, b.cy, b.w, b.h, { friction: 0.6 });
      body.kind = 'block';
      body._w = b.w; body._h = b.h; // remember size for the renderer
      return body;
    });

    // Defender: a small dynamic box (the target you must defeat).
    defender = M.Bodies.rectangle(LEVEL.defender.cx, LEVEL.defender.cy, LEVEL.defender.w, LEVEL.defender.h, { friction: 0.6 });
    defender.kind = 'defender';
    defender._w = LEVEL.defender.w; defender._h = LEVEL.defender.h;

    boulder = null;          // no rock in play until you fire
    defenderAlive = true;    // target starts intact

    // Add everything to the simulation in one go.
    M.Composite.add(engine.world, [ground, ...blocks, defender]);
  }

  // defeatDefender — mark the target beaten and remove it from the world.
  function defeatDefender() {
    defenderAlive = false;
    M.Composite.remove(engine.world, defender);
  }

  // "Hit or crushed" win rule (designer's choice). On every new contact, check whether the
  // defender was struck: a boulder touch always defeats it; a block defeats it only if the
  // relative impact speed is high enough. crushStep converts CRUSH_SPEED (px/s) → px/step.
  const crushStep = CRUSH_SPEED / STEP_HZ;
  M.Events.on(engine, 'collisionStart', (evt) => {
    if (!defenderAlive) return; // already beaten — nothing to do
    for (const pair of evt.pairs) {
      const { bodyA, bodyB } = pair;
      // Find the OTHER body in any contact that involves the defender.
      const other = bodyA === defender ? bodyB : (bodyB === defender ? bodyA : null);
      if (!other) continue;
      // A direct boulder hit always defeats the defender.
      if (other.kind === 'boulder') { defeatDefender(); return; }
      // A falling block defeats it only if it lands hard enough.
      if (other.kind === 'block') {
        const dvx = bodyA.velocity.x - bodyB.velocity.x;
        const dvy = bodyA.velocity.y - bodyB.velocity.y;
        const rel = Math.hypot(dvx, dvy); // relative speed in px/step
        if (rel >= crushStep) { defeatDefender(); return; }
      }
    }
  });

  // Build the zone now (first play).
  buildLevel();

  return {
    // Expose the engine in case later code needs it (kept minimal for now).
    engine,
    // Read-only: is the target still standing?
    get defenderAlive() { return defenderAlive; },

    /** Advance the simulation by exactly one fixed step. */
    step() { M.Engine.update(engine, STEP_MS); },

    /**
     * spawnBoulder — drop a fresh rock at the launch point and fling it with the aim's
     * velocity. Any previous rock is removed first (keeps the body count low, SPEC §5.1).
     * @param {number} angleDeg - launch angle (10–80°).
     * @param {number} power - power notch (1–10).
     */
    spawnBoulder(angleDeg, power) {
      if (boulder) M.Composite.remove(engine.world, boulder);
      boulder = M.Bodies.circle(LAUNCH.x, LAUNCH.y, BOULDER_R, { friction: 0.4, restitution: 0.2 });
      boulder.kind = 'boulder';
      boulder._r = BOULDER_R; // remember radius for the renderer
      M.Composite.add(engine.world, boulder);
      // Convert px/s → matter px/step so the real flight matches the dotted preview.
      M.Body.setVelocity(boulder, matterVel(launchVelocity(angleDeg, power)));
      return boulder;
    },

    /** The live bodies to draw, in back-to-front order (ground, blocks, defender, boulder). */
    bodies() {
      const list = [ground, ...blocks];
      if (defenderAlive) list.push(defender);
      if (boulder) list.push(boulder);
      return list;
    },

    /**
     * isSettled — has the shot come to rest? True when the boulder and every block are
     * either sleeping or moving slower than REST_SPEED. (Used to end a shot.)
     */
    isSettled() {
      const restStep = REST_SPEED / STEP_HZ; // px/step
      const moving = [boulder, ...blocks, defenderAlive ? defender : null].filter(Boolean);
      return moving.every((b) => b.isSleeping || b.speed < restStep);
    },

    /** Has the boulder flown off the screen (so we can end the shot even if it never rests)? */
    boulderGone() {
      if (!boulder) return false;
      const p = boulder.position;
      return p.x < -20 || p.x > BOARD + 20 || p.y > BOARD + 20;
    },

    /** Rebuild the zone from scratch (used when replaying after win/lose). */
    reset() {
      M.Composite.clear(engine.world, false); // remove all bodies (including static ground)
      buildLevel();
    },
  };
}
