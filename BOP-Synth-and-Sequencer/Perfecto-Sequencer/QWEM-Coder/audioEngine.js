// audioEngine.js

/**
 * @file Audio engine facade for ToneJS.
 * Handles synth creation, note triggering, and audio lifecycle.
 */

let isInitialized = false;
let synths = {};

/**
 * Initializes the audio context and creates synths for each track.
 * @param {number} trackCount - Number of tracks to create synths for.
 * @returns {Promise<void>} Resolves when audio is ready.
 */
export async function initAudio(trackCount) {
  if (isInitialized) return;

  if (!window.Tone) {
    throw new Error('ToneJS not loaded. Please load ToneJS before initializing audio.');
  }

  // Create a polyphonic synth for each track
  for (let i = 0; i < trackCount; i++) {
    synths[i] = new window.Tone.PolySynth(window.Tone.Synth).toDestination();
  }

  // Start audio context on first user interaction
  await window.Tone.start();
  isInitialized = true;
}

/**
 * Triggers a note for a specific track.
 * @param {number} track - Track index (0-based).
 * @param {string} note - Note to play (e.g., 'C4').
 * @param {number} duration - Duration in seconds.
 */
export function triggerNote(track, note, duration) {
  if (!isInitialized) {
    console.warn('Audio not initialized. Call initAudio first.');
    return;
  }

  const synth = synths[track];
  if (synth) {
    synth.triggerAttackRelease(note, duration);
  } else {
    console.warn(`No synth found for track ${track}`);
  }
}

/**
 * Disposes of all synths and cleans up audio resources.
 */
export function dispose() {
  Object.values(synths).forEach(synth => {
    synth.dispose();
  });
  synths = {};
  isInitialized = false;
}

/**
 * Gets the current state of the audio engine.
 * @returns {Object} Status object with initialized flag.
 */
export function getAudioStatus() {
  return { isInitialized };
}