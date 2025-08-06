// Common utility functions shared by all modes.  Extracting these
// helpers avoids duplicating identical code in each mode bundle.

/**
 * Generate a random floating point number in the range [a, b).
 * @param {number} a Lower bound (inclusive)
 * @param {number} b Upper bound (exclusive)
 */
export const rand = (a = 0, b = 1) => Math.random() * (b - a) + a;

/**
 * Generate a random integer in the inclusive range [a, b].
 * @param {number} a Lower bound (inclusive)
 * @param {number} b Upper bound (inclusive)
 */
export const randi = (a = 0, b = 1) => Math.floor(rand(a, b + 1));

/**
 * Pick a random element from an array.
 * @param {Array<T>} arr
 * @returns {T}
 */
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];

/**
 * Create a deterministic PRNG based on a seed string.  Uses a
 * variant of the Mulberry32 algorithm.  Calling the returned
 * function yields a floating point number in [0, 1).
 * @param {string} seedString
 */
export function mulberry32(seedString = 'seed') {
  let a = 0x6d2b79f5 ^ seedString.length;
  for (let i = 0; i < seedString.length; ++i) {
    a = Math.imul(a ^ seedString.charCodeAt(i), 2654435761);
  }
  return () => {
    a = Math.imul(a ^ (a >>> 15), 1 | a);
    return ((a >>> 16) & 0xffff) / 0x10000;
  };
}

/**
 * Convert a musical note (e.g. "C4") to its frequency in Hz.  Only
 * notes around the typical range used by these apps are needed.  If
 * the note is unrecognised the reference A4 (440Hz) is returned.
 * @param {string} note
 */
export function noteToFrequency(note) {
  const A4 = 440;
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const match = note.match(/([A-G]#?)(\d+)/);
  if (!match) return A4;
  const idx = names.indexOf(match[1]);
  const oct = parseInt(match[2], 10);
  return A4 * Math.pow(2, (idx + (oct - 4) * 12 - 9) / 12);
}

// Also expose utilities on the global object to avoid duplicating
// definitions inside each mode bundle.  This allows legacy code
// (which expected global functions like rand() or mulberry32())
// to work without modification.  Only attach if running in a
// browser context where `window` exists.
if (typeof window !== 'undefined') {
  Object.assign(window, { rand, randi, pick, mulberry32, noteToFrequency });
}