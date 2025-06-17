// Tempo / bar / beat conversions kept pure for reuse & testing.

/**
 * Convert beats → seconds.
 * @param {number} beats
 * @param {number} bpm – beats per minute
 */
export const beatsToSec = (beats, bpm) => 60 / bpm * beats;

/**
 * Convert bars → seconds.
 * @param {number} bars
 * @param {number} bpm
 * @param {number} beatsPerBar
 */
export const barsToSec = (bars, bpm, beatsPerBar = 4) =>
  beatsToSec(bars * beatsPerBar, bpm);

/**
 * Convert seconds → beats.
 * @param {number} sec
 * @param {number} bpm
 */
export const secToBeats = (sec, bpm) => sec * bpm / 60;
