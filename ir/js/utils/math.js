// Math helpers shared between engine & UI

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const random = (min = 0, max = 1) => Math.random() * (max - min) + min;

export const randomInt = (min = 0, max = 1) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Standard ease-in-out quad (symmetrical).
 * t ∈ [0,1]  →  easeInOut(t) ∈ [0,1]
 */
export const easeInOut = t => (t < 0.5
  ? 2 * t * t
  : 1 - Math.pow(-2 * t + 2, 2) / 2);
