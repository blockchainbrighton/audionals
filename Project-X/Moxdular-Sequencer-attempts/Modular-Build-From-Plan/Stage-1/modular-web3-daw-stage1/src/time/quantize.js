/**
 * @fileoverview Quantization utilities for musical time.
 */

/**
 * Quantizes a given time in seconds to the nearest grid value.
 * @param {number} timeInSeconds
 * @param {number} gridInSeconds The quantization grid in seconds (e.g., 0.25 for quarter notes at 120 BPM).
 * @returns {number}
 */
export function quantizeTime(timeInSeconds, gridInSeconds) {
  if (gridInSeconds <= 0) {
    return timeInSeconds;
  }
  return Math.round(timeInSeconds / gridInSeconds) * gridInSeconds;
}

/**
 * Quantizes a given beat to the nearest grid value.
 * @param {number} beat
 * @param {number} gridInBeats The quantization grid in beats (e.g., 1 for quarter notes).
 * @returns {number}
 */
export function quantizeBeat(beat, gridInBeats) {
  if (gridInBeats <= 0) {
    return beat;
  }
  return Math.round(beat / gridInBeats) * gridInBeats;
}


