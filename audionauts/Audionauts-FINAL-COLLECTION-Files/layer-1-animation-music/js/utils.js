// js/utils/utils.js
// A collection of lightweight, dependency-free utility functions.

// ─────────────────────────────────────────────
// DOM Helpers (from dom.js)
// ─────────────────────────────────────────────

/**
 * Loads an image from a URL and returns a Promise that resolves with the HTMLImageElement.
 * @param {string} url - The URL of the image to load.
 * @param {object} [options] - Configuration options.
 * @param {string} [options.crossOrigin='anonymous'] - The cross-origin attribute for the image.
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImg(url, { crossOrigin = 'anonymous' } = {}) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (crossOrigin) img.crossOrigin = crossOrigin;
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }
  
  // ─────────────────────────────────────────────
  // Math Helpers (from math.js)
  // ─────────────────────────────────────────────
  
  /**
   * Clamps a value between a minimum and maximum.
   * @param {number} v - The value to clamp.
   * @param {number} min - The minimum allowed value.
   * @param {number} max - The maximum allowed value.
   * @returns {number}
   */
  export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  
  /**
   * Generates a random floating-point number within a specified range.
   * @param {number} [min=0] - The minimum value (inclusive).
   * @param {number} [max=1] - The maximum value (exclusive).
   * @returns {number}
   */
  export const random = (min = 0, max = 1) => Math.random() * (max - min) + min;
  
  /**
   * Generates a random integer within a specified range.
   * @param {number} [min=0] - The minimum value (inclusive).
   * @param {number} [max=1] - The maximum value (inclusive).
   * @returns {number}
   */
  export const randomInt = (min = 0, max = 1) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  
  /**
   * Standard ease-in-out quadratic easing function.
   * Maps a time value t from [0, 1] to an eased value in [0, 1].
   * @param {number} t - The input time, typically in the range [0, 1].
   * @returns {number}
   */
  export const easeInOut = t => (t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2);
  
  // ─────────────────────────────────────────────
  // Time/Tempo Helpers (from time.js)
  // ─────────────────────────────────────────────
  
  /**
   * Converts a number of beats to seconds based on a given BPM.
   * @param {number} beats - The number of beats.
   * @param {number} bpm - The tempo in beats per minute.
   * @returns {number} The equivalent duration in seconds.
   */
  export const beatsToSec = (beats, bpm) => (60 / bpm) * beats;
  
  /**
   * Converts a number of bars to seconds.
   * @param {number} bars - The number of bars.
   * @param {number} bpm - The tempo in beats per minute.
   * @param {number} [beatsPerBar=4] - The number of beats in a bar.
   * @returns {number} The equivalent duration in seconds.
   */
  export const barsToSec = (bars, bpm, beatsPerBar = 4) =>
    beatsToSec(bars * beatsPerBar, bpm);
  
  /**
   * Converts a duration in seconds to a number of beats.
   * @param {number} sec - The duration in seconds.
   * @param {number} bpm - The tempo in beats per minute.
   * @returns {number} The equivalent number of beats.
   */
  export const secToBeats = (sec, bpm) => (sec * bpm) / 60;