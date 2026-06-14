// @ts-check
//
// screens.js — a tiny "screen stack" (SPEC §5.3 / §4.1).
//
// A screen is anything with two methods: onInput(intent, repeat) and draw(r).
// The stack keeps a pile of screens; only the TOP one receives input and draws.
// Later phases push the Title, Conquest Map, and overlay screens onto this stack;
// for Phase 1 there is only the Gameplay screen.

/**
 * createScreenStack — make an empty stack of screens.
 */
export function createScreenStack() {
  // The pile of screens; the last item is the active (top) one.
  const stack = [];

  return {
    // Add a screen on top (it becomes the active one).
    push(screen) { stack.push(screen); },
    // Remove the top screen (revealing the one beneath).
    pop() { stack.pop(); },
    // Send an input intent to the active screen only.
    handleInput(intent, repeat) {
      const top = stack[stack.length - 1];
      if (top) top.onInput(intent, repeat);
    },
    // Ask the active screen to draw itself.
    draw(r) {
      const top = stack[stack.length - 1];
      if (top) top.draw(r);
    },
  };
}
