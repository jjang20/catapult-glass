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
