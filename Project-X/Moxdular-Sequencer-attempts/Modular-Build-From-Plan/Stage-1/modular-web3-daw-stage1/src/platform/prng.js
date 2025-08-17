/**
 * @fileoverview Pseudorandom Number Generator (PRNG) using a simple LCG.
 */

let seed = 1;

/**
 * Sets the seed for the PRNG.
 * @param {number} newSeed
 */
export function setSeed(newSeed) {
  seed = newSeed;
}

/**
 * Generates a pseudorandom number between 0 (inclusive) and 1 (exclusive).
 * @returns {number}
 */
export function random() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}



