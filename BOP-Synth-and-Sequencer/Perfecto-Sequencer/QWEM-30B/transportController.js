// transportController.js
/**
 * UI-agnostic transport controller for play/pause/stop/bpm.
 * Responds to DOM events and dispatches actions to update state.
 * Emits events on control changes.
 *
 * @module transportController
 */

import { getState, dispatch } from './stateManager.js';
import { emit } from './eventBus.js';

/**
 * Attaches play/pause/stop/bpm controls to DOM elements.
 * Creates a minimal control panel with buttons and input.
 * Listens to clicks and keydowns; emits events.
 *
 * @param {HTMLElement} container - Element to render controls into.
 * @param {Object} [options] - Optional: { showBpmInput, bpmMin, bpmMax }
 * @returns {Object} Object with destroy method to clean up.
 */
export function attachControls(container, options = {}) {
  const defaultOptions = {
    showBpmInput: true,
    bpmMin: 20,
    bpmMax: 240
  };
  const config = { ...defaultOptions, ...options };

  // Clear container
  container.innerHTML = '';

  // Create control group
  const controls = document.createElement('div');
  controls.className = 'transport-controls';

  // Play/Pause button
  const playPauseBtn = document.createElement('button');
  playPauseBtn.type = 'button';
  playPauseBtn.textContent = '▶️';
  playPauseBtn.title = 'Play / Pause';
  playPauseBtn.setAttribute('aria-label', 'Play/Pause');

  // Stop button
  const stopBtn = document.createElement('button');
  stopBtn.type = 'button';
  stopBtn.textContent = '⏹️';
  stopBtn.title = 'Stop';
  stopBtn.setAttribute('aria-label', 'Stop');

  // BPM input (if enabled)
  let bpmInput = null;
  if (config.showBpmInput) {
    bpmInput = document.createElement('input');
    bpmInput.type = 'number';
    bpmInput.min = config.bpmMin;
    bpmInput.max = config.bpmMax;
    bpmInput.value = getState().transport.bpm;
    bpmInput.step = 1;
    bpmInput.size = 3;
    bpmInput.title = 'Set BPM';
    bpmInput.setAttribute('aria-label', 'BPM');
  }

  // Append controls
  controls.appendChild(playPauseBtn);
  controls.appendChild(stopBtn);
  if (bpmInput) controls.appendChild(bpmInput);

  container.appendChild(controls);

  // Update button states based on current state
  function updateButtonStates() {
    const state = getState();
    const isPlaying = state.transport.isPlaying;

    playPauseBtn.textContent = isPlaying ? '⏸️' : '▶️';
    playPauseBtn.disabled = false;

    stopBtn.disabled = !isPlaying;
  }

  // Subscribe to state changes
  const unsubscribe = window.subscribe(updateButtonStates);

  // Event handlers
  playPauseBtn.addEventListener('click', () => {
    const state = getState();
    if (state.transport.isPlaying) {
      dispatch({ type: 'TRANSPORT/PAUSE' });
      emit('TRANSPORT/PAUSED');
    } else {
      dispatch({ type: 'TRANSPORT/PLAY', payload: { startedAt: performance.now() } });
      emit('TRANSPORT/PLAYED');
    }
  });

  stopBtn.addEventListener('click', () => {
    dispatch({ type: 'TRANSPORT/STOP' });
    emit('TRANSPORT/STOPPED');
  });

  if (bpmInput) {
    bpmInput.addEventListener('change', () => {
      const newBpm = parseInt(bpmInput.value, 10);
      if (isNaN(newBpm)) return;
      const clampedBpm = Math.max(config.bpmMin, Math.min(config.bpmMax, newBpm));
      bpmInput.value = clampedBpm;
      dispatch({ type: 'TRANSPORT/SET_BPM', payload: { bpm: clampedBpm } });
      emit('TRANSPORT/BPM_CHANGED', { bpm: clampedBpm });
    });

    // Keyboard support
    bpmInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const newBpm = parseInt(bpmInput.value, 10);
        if (isNaN(newBpm)) return;
        const clampedBpm = Math.max(config.bpmMin, Math.min(config.bpmMax, newBpm));
        bpmInput.value = clampedBpm;
        dispatch({ type: 'TRANSPORT/SET_BPM', payload: { bpm: clampedBpm } });
        emit('TRANSPORT/BPM_CHANGED', { bpm: clampedBpm });
      }
    });
  }

  // Initial state
  updateButtonStates();

  // Return cleanup function
  return {
    destroy: () => {
      unsubscribe();
      container.innerHTML = '';
    }
  };
}