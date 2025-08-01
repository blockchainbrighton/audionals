// audioEngine.js
/**
 * @module audioEngine
 * ToneJS façade module for the sequencer.
 * Initializes audio context, manages synths, and triggers notes.
 * Responds to global events via EventBus.
 *
 * Dependencies:
 * - Tone (assumed to be available globally via Ordinal import)
 * - stateManager (for current transport/grid state)
 * - eventBus (for listening to play/stop/trigger events)
 */

import { on } from './eventBus.js';
import { getState } from './stateManager.js';

let initialized = false;
let synth = null;

/**
 * Initializes the audio engine.
 * Creates a polyphonic synth using Tone.Synth.
 * Automatically connects to master output.
 * Safe to call multiple times (idempotent).
 *
 * @returns {Promise<void>} Resolves when audio is ready
 *
 * @example
 * await initAudio();
 */
async function initAudio() {
  if (initialized) return;

  // Ensure Tone is loaded
  if (!window.Tone) {
    throw new Error('ToneJS not found. Did you load ord://<PLACEHOLDER_LIBRARY_ORDINAL>?');
  }

  // Unlock audio on first user interaction if needed
  const unlock = () => {
    Tone.start();
    document.body.removeEventListener('click', unlock);
    document.body.removeEventListener('keydown', unlock);
  };
  document.body.addEventListener('click', unlock);
  document.body.addEventListener('keydown', unlock);

  // Create synth
  synth = new Tone.PolySynth(Tone.Synth).toDestination();
  synth.set({ oscillator: { type: 'sine' } });

  initialized = true;
}

/**
 * Triggers a note (or chord) at the given time.
 * Uses the Tone.Transport timeline.
 *
 * @param {string|Array<string>} notes - Note(s) to play (e.g., "C4", ["C4", "E4", "G4"])
 * @param {number} [duration=0.25] - Duration in quarter notes
 * @param {number} [velocity=0.8] - Velocity (0.0 to 1.0)
 * @param {number|null} [when=null] - Scheduled time (pass to Tone.schedule)
 * @returns {void}
 *
 * @example
 * triggerNote("C4");
 * triggerNote(["C4", "E4", "G4"], 0.5, 0.9);
 */
function triggerNote(notes, duration = 0.25, velocity = 0.8, when = null) {
  if (!initialized) {
    console.warn('[audioEngine] Audio not initialized. Call initAudio() first.');
    return;
  }

  const now = when ?? Tone.now();

  // Schedule note attack
  synth.triggerAttack(notes, now, velocity);

  // Schedule release
  const releaseTime = now + Tone.Time(duration).toSeconds();
  synth.triggerRelease(notes, releaseTime);
}

/**
 * Disposes of the audio engine.
 * Destroys synth and cleans up resources.
 * Can be re-initialized later.
 *
 * @returns {void}
 */
function dispose() {
  if (synth) {
    synth.dispose();
    synth = null;
  }
  initialized = false;
}

// Internal: Map grid steps to MIDI notes (C3 + step index)
function stepToNote(stepIndex) {
  const baseNote = 60; // C3
  return Tone.Frequency(baseNote + stepIndex, "midi").toNote();
}

// Set up event listeners
function setupEventHandlers() {
  // Example: Play a note when a step is triggered (from scheduler)
  on('AUDIO/TRIGGER_NOTE', ({ payload }) => {
    const { track, step, velocity = 0.8, duration = 0.25 } = payload;
    const note = stepToNote(step);
    triggerNote(note, duration, velocity);
  });
}

// Initialize event handlers
setupEventHandlers();

export { initAudio, triggerNote, dispose };