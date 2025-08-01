// playbackScheduler.js
/**
 * Schedules timed note triggers based on the current transport state and grid pattern.
 * Uses ToneJS to schedule `triggerNote` calls at precise intervals.
 *
 * @module playbackScheduler
 */

import { getState, dispatch } from './stateManager.js';
import { emit } from './eventBus.js';
import { triggerNote } from './audioEngine.js';

let isScheduled = false;
let intervalId = null;

/**
 * Starts the playback scheduler. Runs every quarter note based on BPM.
 * Triggers all active steps in the grid at the correct time.
 */
export function startScheduler() {
  if (isScheduled) return;

  const state = getState();
  const { bpm, position } = state.transport;
  const quarterNoteTime = 60 / bpm; // seconds

  // Schedule first tick immediately
  const now = Tone.now();
  const nextTick = now + (position * quarterNoteTime);

  // Set up interval for each quarter note
  intervalId = setInterval(() => {
    const newState = getState();
    if (!newState.transport.isPlaying) {
      stopScheduler();
      return;
    }

    const stepPosition = Math.floor((Tone.now() - now) / quarterNoteTime);
    const stepIndex = stepPosition % newState.grid.stepsPerTrack;

    // Trigger all active notes for this step across tracks
    for (let track = 0; track < newState.grid.tracks; track++) {
      const key = `${track}-${stepIndex}`;
      if (newState.grid.patternData[key]) {
        triggerNote(track, stepIndex);
      }
    }

    // Update transport position
    dispatch({
      type: 'TRANSPORT/UPDATE_POSITION',
      payload: { position: stepPosition }
    });

    emit('PLAYBACK/TICK', { step: stepIndex, position: stepPosition });
  }, quarterNoteTime * 1000); // convert to ms

  isScheduled = true;
  emit('PLAYBACK/STARTED');
}

/**
 * Stops the playback scheduler and clears interval.
 */
export function stopScheduler() {
  if (!isScheduled) return;

  clearInterval(intervalId);
  intervalId = null;
  isScheduled = false;

  emit('PLAYBACK/STOPPED');
}