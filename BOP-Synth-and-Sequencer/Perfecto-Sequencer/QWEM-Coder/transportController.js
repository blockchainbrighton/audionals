// transportController.js

/**
 * @file UI-agnostic transport controller for play/pause/stop and BPM controls.
 * Attaches to DOM elements and handles user interactions.
 */

import { getState, dispatch, subscribe } from './stateManager.js';
import { emit } from './eventBus.js';

// Module-level variables to maintain controller state
let playButton = null;
let stopButton = null;
let bpmInput = null;
let unsubscribeState = null;

/**
 * Attaches transport controls to DOM elements.
 * @param {Object} elements - Object containing control elements.
 * @param {HTMLElement} elements.playButton - Play/Pause button element.
 * @param {HTMLElement} elements.stopButton - Stop button element.
 * @param {HTMLInputElement} elements.bpmInput - BPM input element.
 */
export function attachControls(elements) {
  if (!elements.playButton || !elements.stopButton || !elements.bpmInput) {
    throw new Error('All control elements are required');
  }

  playButton = elements.playButton;
  stopButton = elements.stopButton;
  bpmInput = elements.bpmInput;

  // Set initial state
  const state = getState();
  updateUI(state);

  // Attach event listeners
  playButton.addEventListener('click', handlePlayClick);
  stopButton.addEventListener('click', handleStopClick);
  bpmInput.addEventListener('change', handleBpmChange);

  // Subscribe to state changes
  unsubscribeState = subscribe(updateUI);
}

/**
 * Updates UI elements based on current state.
 * @param {Object} state - Current application state.
 */
function updateUI(state) {
  if (playButton) {
    playButton.textContent = state.transport.isPlaying ? 'Pause' : 'Play';
    playButton.setAttribute('aria-pressed', state.transport.isPlaying);
  }

  if (bpmInput) {
    bpmInput.value = state.transport.bpm;
  }
}

/**
 * Handles play button click.
 */
function handlePlayClick() {
  const state = getState();
  
  if (state.transport.isPlaying) {
    // Emit pause event
    emit('TRANSPORT/PAUSE');
    
    // Dispatch action to update state
    dispatch({
      type: 'TRANSPORT/TOGGLE_PLAY'
    });
  } else {
    // Emit play event with timestamp
    emit('TRANSPORT/PLAY', {
      startedAt: performance.now()
    });
    
    // Dispatch action to update state
    dispatch({
      type: 'TRANSPORT/TOGGLE_PLAY'
    });
  }
}

/**
 * Handles stop button click.
 */
function handleStopClick() {
  // Emit stop event
  emit('TRANSPORT/STOP');
  
  // Dispatch action to update state
  dispatch({
    type: 'TRANSPORT/STOP'
  });
}

/**
 * Handles BPM input change.
 * @param {Event} event - The change event.
 */
function handleBpmChange(event) {
  const bpm = parseInt(event.target.value, 10);
  
  if (isNaN(bpm) || bpm < 20 || bpm > 300) {
    // Reset to current state value if invalid
    const state = getState();
    event.target.value = state.transport.bpm;
    return;
  }
  
  // Emit BPM change event
  emit('TRANSPORT/BPM_CHANGED', { bpm });
  
  // Dispatch action to update state
  dispatch({
    type: 'TRANSPORT/SET_BPM',
    payload: { bpm }
  });
}