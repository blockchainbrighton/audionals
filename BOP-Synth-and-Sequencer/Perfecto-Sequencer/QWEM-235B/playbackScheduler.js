// playbackScheduler.js
/**
 * @module playbackScheduler
 * Schedules audio playback based on the sequencer grid and transport state.
 * Uses Tone.Transport to schedule events at correct timing intervals.
 * Listens to transport events and updates schedule accordingly.
 *
 * Dependencies:
 * - Tone (global)
 * - stateManager (getState)
 * - eventBus (on, emit)
 * - audioEngine (triggerNote)
 */

import { on, emit } from './eventBus.js';
import { getState } from './stateManager.js';
import { triggerNote } from './audioEngine.js';

let isScheduled = false;
const scheduledEvents = [];

/**
 * Schedules all active grid steps using Tone.Transport.
 * Clears any previous schedule before setting up new events.
 *
 * @private
 * @returns {void}
 */
function scheduleSteps() {
  // Cancel previous events
  if (isScheduled) {
    Tone.Transport.cancel();
    scheduledEvents.length = 0;
  }

  const state = getState();
  const { tracks, stepsPerTrack, patternData } = state.grid;
  const stepDuration = '16n'; // 16th note

  // Schedule each active step
  for (let track = 0; track < tracks; track++) {
    for (let step = 0; step < stepsPerTrack; step++) {
      if (patternData[track]?.[step]) {
        const time = `${step}n`; // e.g., "0n", "1n", ... "15n"

        const event = Tone.Transport.schedule(() => {
          emit('AUDIO/TRIGGER_NOTE', {
            track,
            step,
            velocity: 0.8,
            duration: 0.25,
          });
        }, time);

        scheduledEvents.push(event);
      }
    }
  }

  isScheduled = true;
}

/**
 * Starts the playback scheduler.
 * Initializes Tone.Transport with current BPM.
 * Re-schedules all steps.
 * Emits global transport events.
 *
 * @returns {void}
 *
 * @example
 * startScheduler();
 */
function startScheduler() {
  const state = getState();
  const bpm = state.transport.bpm;

  // Set tempo
  Tone.Transport.bpm.value = bpm;

  // Schedule all steps
  scheduleSteps();

  // Start transport
  Tone.Transport.start();

  // Emit global event
  emit('TRANSPORT/PLAY', { startedAt: performance.now() });
}

/**
 * Stops the playback scheduler.
 * Halts Tone.Transport and cancels scheduled events.
 * Emits global transport events.
 *
 * @returns {void}
 *
 * @example
 * stopScheduler();
 */
function stopScheduler() {
  Tone.Transport.stop();
  Tone.Transport.cancel(); // Remove all scheduled events
  scheduledEvents.length = 0;
  isScheduled = false;

  emit('TRANSPORT/STOP', { stoppedAt: performance.now() });
}

// Listen to relevant events
on('TRANSPORT/PLAY', () => {
  startScheduler();
});

on('TRANSPORT/STOP', () => {
  stopScheduler();
});

on('GRID/STEP_TOGGLED', () => {
  if (Tone.Transport.state === 'started') {
    scheduleSteps(); // Re-schedule if playing
  }
});

on('TRANSPORT/SET_BPM', ({ payload }) => {
  Tone.Transport.bpm.value = payload;
});

export { startScheduler, stopScheduler };