// midiInput.js
/**
 * WebMIDI interface: detects and maps incoming MIDI messages to grid events.
 * Responds to `noteOn`/`noteOff` and maps them to track/step toggles.
 *
 * @module midiInput
 */

import { getState, dispatch } from './stateManager.js';
import { emit } from './eventBus.js';

let midiAccess = null;
let isInitialized = false;

/**
 * Initializes WebMIDI access and listens for incoming MIDI messages.
 * Maps noteOn/noteOff to grid step toggles based on channel and note number.
 * Automatically binds to first available input device.
 */
export function initMidi() {
  if (isInitialized) return;

  if (!navigator.requestMIDIAccess) {
    console.warn('WebMIDI not supported in this browser.');
    return;
  }

  navigator.requestMIDIAccess()
    .then(access => {
      midiAccess = access;
      const inputs = access.inputs.values();

      // Use first available input
      const firstInput = inputs.next().value;
      if (!firstInput) {
        console.warn('No MIDI input devices found.');
        return;
      }

      // Listen to all note events
      firstInput.onmidimessage = (event) => {
        const [status, note, velocity] = event.data;

        // Filter for noteOn and noteOff
        if ((status & 0xf0) === 0x90 && velocity > 0) {
          // Note On
          handleNoteOn(note);
        } else if ((status & 0xf0) === 0x80 || (status & 0xf0) === 0x90 && velocity === 0) {
          // Note Off or Note On with zero velocity
          handleNoteOff(note);
        }
      };

      dispatch({ type: 'MIDI/DEVICE_CONNECTED', payload: { device: firstInput } });
      emit('MIDI/CONNECTED', { deviceId: firstInput.id });

      isInitialized = true;
    })
    .catch(err => {
      console.error('Failed to access MIDI devices:', err);
      emit('MIDI/ERROR', { error: err.message });
    });
}

/**
 * Handles a MIDI noteOn message by mapping it to a grid step.
 * Uses the note number to determine track and step.
 * @param {number} note - MIDI note number (e.g., 60 = C4)
 */
function handleNoteOn(note) {
  const state = getState();
  const { tracks, stepsPerTrack } = state.grid;

  // Map note to track and step
  // Simple mapping: C4=60 → track 0, step 0; C5=72 → track 1, step 0; etc.
  const noteOffset = note - 60; // C4 = 60
  const track = Math.floor(noteOffset / stepsPerTrack) % tracks;
  const step = noteOffset % stepsPerTrack;

  // Validate bounds
  if (track < 0 || track >= tracks || step < 0 || step >= stepsPerTrack) {
    return;
  }

  const key = `${track}-${step}`;
  const isActive = !!state.grid.patternData[key];

  // Only trigger if not already active
  if (!isActive) {
    dispatch({
      type: 'GRID/STEP_TOGGLED',
      payload: { track, step, isActive: true }
    });
    emit('MIDI/NOTE_ON', { note, track, step, velocity: 100 });
  }
}

/**
 * Handles a MIDI noteOff message by clearing the corresponding grid step.
 * @param {number} note - MIDI note number
 */
function handleNoteOff(note) {
  const state = getState();
  const { tracks, stepsPerTrack } = state.grid;

  const noteOffset = note - 60;
  const track = Math.floor(noteOffset / stepsPerTrack) % tracks;
  const step = noteOffset % stepsPerTrack;

  if (track < 0 || track >= tracks || step < 0 || step >= stepsPerTrack) {
    return;
  }

  const key = `${track}-${step}`;
  const isActive = !!state.grid.patternData[key];

  if (isActive) {
    dispatch({
      type: 'GRID/STEP_TOGGLED',
      payload: { track, step, isActive: false }
    });
    emit('MIDI/NOTE_OFF', { note, track, step });
  }
}

/**
 * Disposes of MIDI resources and removes listeners.
 * Should be called before page unload or re-initialization.
 */
export function disposeMidi() {
  if (!isInitialized || !midiAccess) return;

  // Clear all listeners
  const inputs = midiAccess.inputs.values();
  for (const input of inputs) {
    input.onmidimessage = null;
  }

  dispatch({ type: 'MIDI/DEVICE_DISCONNECTED', payload: { deviceId: '' } });
  emit('MIDI/DISCONNECTED');

  isInitialized = false;
}