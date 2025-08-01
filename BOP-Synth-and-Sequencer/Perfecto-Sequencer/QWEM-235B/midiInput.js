// midiInput.js
/**
 * @module midiInput
 * WebMIDI interface for the sequencer.
 * Detects MIDI devices, maps note events to grid interactions.
 * Emits `GRID/STEP_TOGGLED` events when MIDI notes are received.
 *
 * Dependencies:
 * - stateManager (getState)
 * - eventBus (emit)
 * - Tone (for MIDI note parsing)
 */

import { emit } from './eventBus.js';
import { getState } from './stateManager.js';

let midiAccess = null;
const NOTE_ON = 9; // MIDI command for note on (without channel)
const NOTE_OFF = 8; // MIDI command for note off (without channel)

/**
 * Initializes WebMIDI input by requesting access and setting up listeners.
 * Maps incoming MIDI notes to grid steps (C3 = step 0, C#3 = step 1, etc.).
 * Only listens to note on/off messages.
 *
 * @returns {Promise<void>} Resolves when MIDI access is granted or denied
 *
 * @example
 * await initMidi();
 */
async function initMidi() {
  if (!navigator.requestMIDIAccess) {
    console.warn('[midiInput] WebMIDI not supported in this browser');
    return;
  }

  try {
    midiAccess = await navigator.requestMIDIAccess({ type: 'input' });
    const inputs = midiAccess.inputs.values();

    for (const input of inputs) {
      setupMidiInput(input);
    }

    // Listen for new inputs (e.g., plug in device after startup)
    midiAccess.onstatechange = (event) => {
      if (event.port.type === 'input' && event.port.state === 'connected') {
        setupMidiInput(event.port);
      }
    };

    emit('MIDI/READY', { deviceCount: midiAccess.inputs.size });
  } catch (err) {
    console.error('[midiInput] Failed to access MIDI devices:', err);
    emit('MIDI/ERROR', { message: err.message });
  }
}

/**
 * Sets up event listeners for a single MIDI input port.
 *
 * @private
 * @param {MIDIInput} input - The MIDI input port
 * @returns {void}
 */
function setupMidiInput(input) {
  input.onmidimessage = (event) => {
    const [status, note, velocity] = event.data;
    const command = status >> 4; // Extract command (top 4 bits)
    const channel = status & 0xf; // Extract channel (bottom 4 bits)

    // Only handle note on/off
    if (command !== NOTE_ON && command !== NOTE_OFF) return;

    // Ignore note-off or note-on with velocity 0
    const isNoteOn = command === NOTE_ON && velocity > 0;
    const isNoteOff = command === NOTE_OFF || (command === NOTE_ON && velocity === 0);

    // Map MIDI note to step index: C3 (60) = step 0
    const stepIndex = note - 60;
    const { tracks, stepsPerTrack } = getState().grid;

    // Only handle notes that map to valid steps
    if (stepIndex < 0 || stepIndex >= stepsPerTrack) return;

    // Use first active track for MIDI input (could be configurable)
    const track = findActiveTrack() || 0;

    // Emit grid event
    if (isNoteOn) {
      emit('GRID/STEP_TOGGLED', { track, step: stepIndex, isActive: true });
    } else if (isNoteOff) {
      emit('GRID/STEP_TOGGLED', { track, step: stepIndex, isActive: false });
    }
  };
}

/**
 * Finds the first track that has at least one active step.
 * Used to determine which track to edit via MIDI.
 *
 * @private
 * @returns {number|null} Track index, or null if no track has steps
 */
function findActiveTrack() {
  const { tracks, patternData } = getState().grid;
  for (let track = 0; track < tracks; track++) {
    if (patternData[track] && Object.keys(patternData[track]).length > 0) {
      return track;
    }
  }
  return null;
}

/**
 * Cleans up MIDI event listeners and releases references.
 * Should be called when application shuts down or MIDI is disabled.
 *
 * @returns {void}
 */
function disposeMidi() {
  if (midiAccess) {
    const inputs = midiAccess.inputs.values();
    for (const input of inputs) {
      input.onmidimessage = null;
    }
    midiAccess = null;
  }
}

export { initMidi, disposeMidi };