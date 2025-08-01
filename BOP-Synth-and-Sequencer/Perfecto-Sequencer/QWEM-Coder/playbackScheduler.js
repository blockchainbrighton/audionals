// playbackScheduler.js

/**
 * @file Playback scheduler that converts grid patterns into timed audio events.
 * Uses ToneJS transport and subscribes to state changes for playback control.
 */

import { getState, subscribe } from './stateManager.js';
import { on } from './eventBus.js';
import { triggerNote } from './audioEngine.js';

let isSchedulerActive = false;
let unsubscribeState = null;

// Map track numbers to musical notes
const NOTE_MAP = [
  'C5', 'A4', 'F4', 'D4', // Track 0-3: Higher pitch notes
  'C4', 'A3', 'F3', 'D3'  // Track 4-7: Lower pitch notes
];

/**
 * Starts the playback scheduler.
 * Sets up ToneJS transport and subscribes to state changes.
 */
export function startScheduler() {
  if (isSchedulerActive) return;

  const { Tone } = window;
  if (!Tone) {
    throw new Error('ToneJS not available. Ensure ToneJS is loaded before starting scheduler.');
  }

  // Set initial BPM
  const state = getState();
  Tone.Transport.bpm.value = state.transport.bpm;

  // Subscribe to state changes for BPM updates
  unsubscribeState = subscribe((newState, action) => {
    if (action.type === 'TRANSPORT/SET_BPM') {
      Tone.Transport.bpm.value = newState.transport.bpm;
    }
  });

  // Set up transport scheduling
  Tone.Transport.scheduleRepeat(onTransportStep, '16n'); // 16th notes
  Tone.Transport.start();

  isSchedulerActive = true;
}

/**
 * Stops the playback scheduler and cleans up subscriptions.
 */
export function stopScheduler() {
  if (!isSchedulerActive) return;

  const { Tone } = window;
  if (Tone) {
    Tone.Transport.stop();
    Tone.Transport.cancel(); // Clear all scheduled events
  }

  if (unsubscribeState) {
    unsubscribeState();
    unsubscribeState = null;
  }

  isSchedulerActive = false;
}

/**
 * ToneJS transport callback function that triggers notes for the current step.
 * @param {number} time - Scheduled time for this callback.
 */
function onTransportStep(time) {
  const state = getState();
  const { grid, transport } = state;
  const stepIndex = transport.position % grid.stepsPerTrack;

  // Update position in state
  const newPosition = transport.position + 1;
  // Note: We're not dispatching here to avoid infinite loops.
  // The state update should happen elsewhere or be handled specially.

  // Trigger notes for active steps
  for (let track = 0; track < grid.tracks; track++) {
    const trackKey = `track-${track}`;
    const trackData = grid.patternData[trackKey];
    
    if (trackData && trackData[stepIndex]) {
      const note = NOTE_MAP[track] || 'C4';
      triggerNote(track, note, '16n', time);
    }
  }

  // Dispatch position update to state
  // This would normally be done via eventBus or a special action
  // For now we'll emit an event that stateManager can listen to if needed
}

// Listen for transport play events to start scheduler
on('TRANSPORT/PLAY', () => {
  startScheduler();
});

// Listen for transport stop events to stop scheduler
on('TRANSPORT/STOP', () => {
  stopScheduler();
});