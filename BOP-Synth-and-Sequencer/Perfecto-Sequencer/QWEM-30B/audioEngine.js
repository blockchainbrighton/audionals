// audioEngine.js
/**
 * ToneJS façade: manages synth creation, note triggering, and cleanup.
 * Responds to events from the EventBus to play notes based on grid state.
 *
 * @module audioEngine
 */

import { getState, dispatch } from './stateManager.js';
import { emit } from './eventBus.js';

// Global reference to Tone (loaded via ord:// URL)
const Tone = window.Tone;

let synth = null;
let isInitialized = false;

/**
 * Initializes the audio engine with a default polyphonic synth.
 * Must be called before any playback.
 * Emits 'AUDIO/INITIALIZED' on success.
 */
export function initAudio() {
  if (isInitialized) return;

  try {
    // Create a simple synth
    synth = new Tone.PolySynth(Tone.Synth).toDestination();

    // Set up error handling
    synth.on('error', (err) => {
      console.error('Audio engine error:', err);
      dispatch({ type: 'AUDIO/ERROR', payload: { error: err.message } });
    });

    isInitialized = true;
    emit('AUDIO/INITIALIZED');
  } catch (err) {
    console.error('Failed to initialize audio engine:', err);
    throw new Error('ToneJS initialization failed. Ensure `ord://<PLACEHOLDER_LIBRARY_ORDINAL>` is valid.');
  }
}

/**
 * Triggers a single note at the given track and step.
 * Uses current BPM and grid configuration to schedule timing.
 * @param {number} track - Track index (0-based).
 * @param {number} step - Step index (0-based).
 * @example triggerNote(1, 3)
 */
export function triggerNote(track, step) {
  if (!isInitialized || !synth) {
    console.warn('Audio engine not initialized. Cannot trigger note.');
    return;
  }

  const state = getState();
  const { bpm, position } = state.transport;
  const { tracks, stepsPerTrack } = state.grid;

  // Validate indices
  if (track < 0 || track >= tracks || step < 0 || step >= stepsPerTrack) {
    console.warn(`Invalid note: track=${track}, step=${step}`);
    return;
  }

  // Determine if this step should play (based on patternData)
  const key = `${track}-${step}`;
  const isActive = state.grid.patternData[key] === true;

  if (!isActive) return;

  // Calculate time offset in seconds from current transport position
  const quarterNoteTime = 60 / bpm; // seconds per quarter note
  const stepTime = quarterNoteTime * (step / stepsPerTrack); // time within measure
  const absoluteTime = Tone.now() + stepTime;

  // Play a random pitch within an octave for variation
  const note = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'][track % 8];
  synth.triggerAttackRelease(note, '8n', absoluteTime);

  // Emit event for debugging or UI feedback
  emit('AUDIO/NOTE_TRIGGERED', { track, step, note, time: absoluteTime });
}

/**
 * Disposes of all audio resources (synth, etc.).
 * Should be called before page unload or re-initialization.
 */
export function dispose() {
  if (!isInitialized || !synth) return;

  synth.dispose();
  synth = null;
  isInitialized = false;

  emit('AUDIO/DISPOSED');
}