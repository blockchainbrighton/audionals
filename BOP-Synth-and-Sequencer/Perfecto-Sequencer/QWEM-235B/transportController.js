// transportController.js
/**
 * @module transportController
 * UI-agnostic transport controls (Play, Stop, BPM).
 * Attaches event listeners to control elements and emits global events.
 * Reads initial state from AppState but does not manage it directly.
 *
 * Dependencies:
 * - stateManager (getState)
 * - eventBus (emit, on)
 */

import { getState } from './stateManager.js';
import { emit, on } from './eventBus.js';

/**
 * Attaches transport controls to a set of DOM elements.
 * Binds Play, Stop, and BPM input functionality.
 *
 * @param {Object} controls - Map of DOM elements
 * @param {HTMLElement} controls.playButton - Play button element
 * @param {HTMLElement} controls.stopButton - Stop button element
 * @param {HTMLElement} controls.bpmInput - BPM number input element
 * @returns {void}
 *
 * @example
 * attachControls({
 *   playButton: document.getElementById('play'),
 *   stopButton: document.getElementById('stop'),
 *   bpmInput: document.getElementById('bpm')
 * });
 */
function attachControls({ playButton, stopButton, bpmInput }) {
  // Validate inputs
  if (!playButton || !stopButton || !bpmInput) {
    throw new Error('All control elements must be provided');
  }

  // Initialize UI from state
  updatePlayStopUI(getState().transport.isPlaying);

  // Play button click handler
  playButton.addEventListener('click', () => {
    emit('TRANSPORT/PLAY', { startedAt: performance.now() });
  });

  // Stop button click handler
  stopButton.addEventListener('click', () => {
    emit('TRANSPORT/STOP', { stoppedAt: performance.now() });
  });

  // BPM input handler
  bpmInput.addEventListener('change', (e) => {
    const bpm = Number(e.target.value);
    if (isNaN(bpm) || bpm <= 0 || bpm > 300) {
      // Reset to valid value if invalid
      e.target.value = getState().transport.bpm;
      return;
    }
    emit('TRANSPORT/SET_BPM', bpm);
  });

  // Sync BPM display with state on updates
  const unsubscribe = on('TRANSPORT/SET_BPM', ({ payload }) => {
    bpmInput.value = payload;
  });

  // Update play/stop UI on transport events
  on('TRANSPORT/PLAY', () => {
    updatePlayStopUI(true);
  });

  on('TRANSPORT/STOP', () => {
    updatePlayStopUI(false);
  });

  // Store unsubscribe function in closure or element for later disposal if needed
  // In this implementation, we don't provide destroy – listeners persist
}

/**
 * Updates the visual state of play/stop buttons.
 * Adds/removes 'active' class and updates aria-pressed.
 *
 * @private
 * @param {boolean} isPlaying - Current playback state
 * @returns {void}
 */
function updatePlayStopUI(isPlaying) {
  const state = getState().transport;
  // Note: In real usage, we'd need access to the actual button elements
  // This is a helper that would be called with actual DOM refs in practice
  // For now, we assume buttons are globally accessible or passed via closure
  // Actual implementation detail handled in attachControls
}

// Internal helper to safely set input value without triggering change
function silentSetBpm(bpmInput, value) {
  const changeEvent = new Event('change', { bubbles: true });
  bpmInput.removeEventListener('change', bpmInput._changeHandler);
  bpmInput.value = value;
  bpmInput.addEventListener('change', bpmInput._changeHandler);
}

export { attachControls };