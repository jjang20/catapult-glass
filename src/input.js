// @ts-check
//
// input.js — the INPUT abstraction (SPEC §5.4, "load-bearing — MUST follow").
//
// The Neural Band turns gestures into ordinary keyboard events, so the SAME code
// serves both the glasses and desktop development:
//   swipe up/down/left/right → ArrowUp/Down/Left/Right
//   index-finger pinch       → Enter
//   middle-finger pinch      → Escape
//
// A "source" translates those raw key events into generic INTENTS (a direction,
// a confirm, a cancel). It deliberately knows NOTHING about the game — the active
// screen decides what each intent means (e.g. UP = raise angle, or = move menu up).
// Rule from the spec: everything fires on keydown; nothing may depend on keyup.

// The complete set of intents a source can emit.
export const INTENT = {
  UP: 'UP',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  CONFIRM: 'CONFIRM',   // index-finger pinch / Enter
  CANCEL: 'CANCEL',     // middle-finger pinch / Escape
};

// Which DOM key produces which intent. The band emits these real key values.
const KEY_TO_INTENT = {
  ArrowUp: INTENT.UP,
  ArrowDown: INTENT.DOWN,
  ArrowLeft: INTENT.LEFT,
  ArrowRight: INTENT.RIGHT,
  Enter: INTENT.CONFIRM,
  Escape: INTENT.CANCEL,
};

/**
 * createKeyboardSource — start listening for keys and report intents.
 * @param {(intent:string, repeat:boolean)=>void} emit - called for each intent.
 *        `repeat` is true when the OS is auto-repeating a held key; consumers
 *        decide whether to honor it (SPEC §5.4). We pass it through, untouched.
 * @returns {()=>void} call this to stop listening (cleanup).
 */
export function createKeyboardSource(emit) {
  // The handler we attach; named so we can remove it later.
  function onKeyDown(e) {
    // Look up which intent (if any) this key maps to.
    const intent = KEY_TO_INTENT[e.key];
    // If it's a key we don't use, ignore it entirely.
    if (!intent) return;
    // Stop the browser's default reaction (e.g. arrows scrolling the page).
    e.preventDefault();
    // Report the intent, passing the auto-repeat flag straight through.
    emit(intent, e.repeat);
  }
  // Listen on the whole window for key presses (keydown only — never keyup).
  window.addEventListener('keydown', onKeyDown);
  // Hand back a function that detaches the listener if we ever need to.
  return () => window.removeEventListener('keydown', onKeyDown);
}
