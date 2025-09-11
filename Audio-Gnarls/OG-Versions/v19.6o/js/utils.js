/*
 * Shared utility helpers for the oscilloscope app.
 *
 * Enhanced version with additional optimizations:
 * - Performance utilities
 * - Memoization helpers
 * - Debouncing/throttling
 * - Type checking improvements
 * - DOM manipulation optimizations
 */

// === Core Math & Value Utilities ===

// Clamp a number to the inclusive range [0, 1]. Returns 0 for
// non‑finite values. Originally named `clamp01` in `osc-app.js`.
export function clamp01(n) {
  return Number.isFinite(n) ? (n < 0 ? 0 : n > 1 ? 1 : n) : 0;
}

// General clamp function for any range
export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

// Convert a normalised value in [0, 1] to a percentage (0‑100) and
// round to the nearest integer. Uses `clamp01` to guard against
// out‑of‑range numbers.
export function pct(n) {
  return Math.round(clamp01(n) * 100);
}

// Mathematical constants
export const TAU = Math.PI * 2;
export const HALF_PI = Math.PI * 0.5;

// === DOM Event Utilities ===

// Add and remove DOM event listeners. These mirror the internal
// helpers `on`/`off` defined in `osc-app.js` and accept any DOM
// target that implements `addEventListener`/`removeEventListener`.
export function on(el, type, handler, opts) {
  el?.addEventListener?.(type, handler, opts);
}

export function off(el, type, handler, opts) {
  el?.removeEventListener?.(type, handler, opts);
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

// === DOM Manipulation Utilities ===

// Update an element's `textContent` if the element is present. Used
// throughout the controls layer to synchronise labels.
export function setText(el, s) {
  if (el && el.textContent !== s) {
    el.textContent = s;
  }
}

// Update an ARIA pressed state on a button. Accepts any truthy value
// and coerces it to a string boolean. Originally named `setPressed`.
export function setPressed(button, value) {
  const pressed = String(!!value);
  if (button?.getAttribute?.('aria-pressed') !== pressed) {
    button?.setAttribute?.('aria-pressed', pressed);
  }
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

// Enable or disable a collection of form controls. The `disabled` flag
// is coerced to a boolean. This mirrors `setDisabledAll` in
// `osc-app.js`.
export function setDisabledAll(els, disabled) {
  const isDisabled = !!disabled;
  for (const el of els || []) {
    if (el && el.disabled !== isDisabled) {
      el.disabled = isDisabled;
    }
  }
}

// === Type Checking Utilities ===

// Lightweight type guards for booleans and numbers. These mirror
// `isBool` and `isNum` from `osc-app.js` and allow modules to
// communicate optional values safely.
export function isBool(v) {
  return typeof v === 'boolean';
}

export function isNum(v) {
  return typeof v === 'number' && !Number.isNaN(v);
}

export function isString(v) {
  return typeof v === 'string';
}

export function isFunction(v) {
  return typeof v === 'function';
}

export function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function isArray(v) {
  return Array.isArray(v);
}

// === Performance Utilities ===

// Memoization helper
export function memoize(fn, keyFn = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  return function(...args) {
    const key = keyFn(...args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// Debounce function calls
export function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Throttle function calls
export function throttle(fn, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Request animation frame with fallback
export const raf = window.requestAnimationFrame || 
  window.webkitRequestAnimationFrame || 
  window.mozRequestAnimationFrame || 
  ((cb) => setTimeout(cb, 16));

export const cancelRaf = window.cancelAnimationFrame || 
  window.webkitCancelAnimationFrame || 
  window.mozCancelAnimationFrame || 
  clearTimeout;

// === Utility Functions ===

// No-operation function
export const noop = () => {};

// Identity function
export const identity = (x) => x;

// Create a range of numbers
export function range(start, end, step = 1) {
  const result = [];
  if (step > 0) {
    for (let i = start; i < end; i += step) {
      result.push(i);
    }
  } else if (step < 0) {
    for (let i = start; i > end; i += step) {
      result.push(i);
    }
  }
  return result;
}

// Deep clone an object (simple implementation)
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  return obj;
}

// Merge objects deeply
export function deepMerge(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

