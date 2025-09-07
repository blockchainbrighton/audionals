/*
 * Shared utility helpers for the oscilloscope app.
 *
 * These functions were previously defined ad‑hoc within modules like
 * `osc-app.js` and `shapes.js`. Centralising them here reduces
 * duplication and makes their intent explicit. The exported
 * functions mirror their original behaviour exactly, so importing
 * modules can replace their inline definitions without altering
 * behaviour. See individual functions for notes on semantics.
 */

// Clamp a number to the inclusive range [0, 1]. Returns 0 for
// non‑finite values. Originally named `clamp01` in `osc-app.js`.
export function clamp01(n) {
  return Number.isFinite(n) ? (n < 0 ? 0 : n > 1 ? 1 : n) : 0;
}

// Convert a normalised value in [0, 1] to a percentage (0‑100) and
// round to the nearest integer. Uses `clamp01` to guard against
// out‑of‑range numbers.
export function pct(n) {
  return Math.round(clamp01(n) * 100);
}

// Add and remove DOM event listeners. These mirror the internal
// helpers `on`/`off` defined in `osc-app.js` and accept any DOM
// target that implements `addEventListener`/`removeEventListener`.
export function on(el, type, handler, opts) {
  el?.addEventListener?.(type, handler, opts);
}

export function off(el, type, handler, opts) {
  el?.removeEventListener?.(type, handler, opts);
}

// Update an element's `textContent` if the element is present. Used
// throughout the controls layer to synchronise labels.
export function setText(el, s) {
  if (el) el.textContent = s;
}

// Update an ARIA pressed state on a button. Accepts any truthy value
// and coerces it to a string boolean. Originally named `setPressed`.
export function setPressed(button, value) {
  button?.setAttribute?.('aria-pressed', String(!!value));
}

// Toggle a CSS class on an element based on a boolean. Mirrors
// `toggleClass` from `osc-app.js`.
export function toggleClass(el, cls, on) {
  el?.classList?.toggle?.(cls, !!on);
}

// Shorthand for `getElementById` with a configurable root. This
// helper was previously called `byId` in `osc-app.js`. It does not
// throw if the root is null.
export function byId(root, id) {
  return root?.getElementById?.(id) ?? null;
}

// Lightweight type guards for booleans and numbers. These mirror
// `isBool` and `isNum` from `osc-app.js` and allow modules to
// communicate optional values safely.
export function isBool(v) {
  return typeof v === 'boolean';
}

export function isNum(v) {
  return typeof v === 'number' && !Number.isNaN(v);
}

// Enable or disable a collection of form controls. The `disabled` flag
// is coerced to a boolean. This mirrors `setDisabledAll` in
// `osc-app.js`.
export function setDisabledAll(els, disabled) {
  for (const el of els || []) {
    if (el) el.disabled = !!disabled;
  }
}

// Batch add or remove multiple event listeners on a single target.
// Accepts an array of `[type, handler, opts]` triples, matching the
// signature used in the original helpers `addEvents`/`removeEvents`.
export function addEvents(el, pairs) {
  for (let i = 0; i < (pairs?.length || 0); i++) {
    on(el, pairs[i][0], pairs[i][1], pairs[i][2]);
  }
}

export function removeEvents(el, pairs) {
  for (let i = 0; i < (pairs?.length || 0); i++) {
    off(el, pairs[i][0], pairs[i][1], pairs[i][2]);
  }
}

// Domain‑specific utility used by several modules: TAU (two Pi) and
// clamp. These were previously exported from `shapes.js`. Exporting
// them here allows sharing without re‑importing from unrelated
// modules.
export const TAU = Math.PI * 2;

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
