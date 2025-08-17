/**
 * @fileoverview Unit conversion utilities.
 */

/**
 * Converts seconds to milliseconds.
 * @param {number} seconds
 * @returns {number}
 */
export function secondsToMs(seconds) {
  return seconds * 1000;
}

/**
 * Converts milliseconds to seconds.
 * @param {number} ms
 * @returns {number}
 */
export function msToSeconds(ms) {
  return ms / 1000;
}

/**
 * Converts beats to seconds given a tempo in BPM.
 * @param {number} beats
 * @param {number} bpm
 * @returns {number}
 */
export function beatsToSeconds(beats, bpm) {
  if (bpm === 0) return 0;
  return beats / (bpm / 60);
}

/**
 * Converts seconds to beats given a tempo in BPM.
 * @param {number} seconds
 * @param {number} bpm
 * @returns {number}
 */
export function secondsToBeats(seconds, bpm) {
  return seconds * (bpm / 60);
}

/**
 * Converts a MIDI note number to its corresponding frequency in Hz.
 * @param {number} midiNote
 * @returns {number}
 */
export function midiToFreq(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * Converts frequency in Hz to its corresponding MIDI note number.
 * @param {number} freq
 * @returns {number}
 */
export function freqToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}


