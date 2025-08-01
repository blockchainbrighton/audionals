// appBootstrap.js
/**
 * @module appBootstrap
 * Initializes and wires together all modules of the Ordinal-Sequencer.
 * Sets up state, event listeners, and starts core systems.
 * Entry point for the entire application.
 *
 * Dependencies:
 * - All other modules
 */

import { getState, dispatch } from './stateManager.js';
import { emit, on } from './eventBus.js';
import { initAudio } from './audioEngine.js';
import { startScheduler, stopScheduler } from './playbackScheduler.js';
import { createGrid } from './sequencerGrid.js';
import { attachControls } from './transportController.js';
import { initMidi } from './midiInput.js';
import { savePattern, loadPattern } from './blockchainPersistence.js';
import { savePreset, loadPreset, listPresets } from './presetManager.js';

/**
 * Bootstraps the entire application.
 * - Initializes audio context
 * - Renders UI components
 * - Attaches event listeners
 * - Starts necessary background services
 *
 * @param {Object} config - Configuration and DOM references
 * @param {HTMLElement} config.gridContainer - Container for sequencer grid
 * @param {Object} config.transportControls - DOM elements for transport
 * @param {HTMLElement} config.transportControls.playButton
 * @param {HTMLElement} config.transportControls.stopButton
 * @param {HTMLElement} config.transportControls.bpmInput
 * @returns {Object} API for external control (optional)
 *
 * @example
 * bootstrap({
 *   gridContainer: document.getElementById('grid'),
 *   transportControls: {
 *     playButton: document.getElementById('play'),
 *     stopButton: document.getElementById('stop'),
 *     bpmInput: document.getElementById('bpm')
 *   }
 * });
 */
function bootstrap(config) {
  // Validate required config
  if (!config.gridContainer) {
    throw new Error('gridContainer is required');
  }
  if (!config.transportControls) {
    throw new Error('transportControls are required');
  }

  const { gridContainer, transportControls } = config;

  // Initialize core systems
  initAudio();

  // Render UI components
  createGrid(gridContainer);
  attachControls(transportControls);

  // Start MIDI input (optional – graceful if unsupported)
  initMidi().catch(err => {
    console.warn('[appBootstrap] MIDI initialization failed:', err.message);
  });

  // Set up global event responders

  // Transport: PLAY starts scheduler
  on('TRANSPORT/PLAY', () => {
    startScheduler();
  });

  // Transport: STOP stops scheduler
  on('TRANSPORT/STOP', () => {
    stopScheduler();
  });

  // Blockchain: Save current pattern
  on('APP/SAVE_PATTERN', async () => {
    try {
      await savePattern();
    } catch (err) {
      emit('APP/ERROR', { context: 'SAVE_PATTERN', message: err.message });
    }
  });

  // Blockchain: Load pattern by txId
  on('APP/LOAD_PATTERN', async ({ payload }) => {
    try {
      await loadPattern(payload);
    } catch (err) {
      emit('APP/ERROR', { context: 'LOAD_PATTERN', message: err.message });
    }
  });

  // Presets: Save current state as preset
  on('APP/SAVE_PRESET', async ({ payload }) => {
    try {
      await savePreset(payload);
    } catch (err) {
      emit('APP/ERROR', { context: 'SAVE_PRESET', message: err.message });
    }
  });

  // Presets: Load preset by name
  on('APP/LOAD_PRESET', async ({ payload }) => {
    try {
      await loadPreset(payload);
    } catch (err) {
      emit('APP/ERROR', { context: 'LOAD_PRESET', message: err.message });
    }
  });

  // Emit ready event
  emit('APP/READY', {
    timestamp: performance.now(),
    state: getState()
  });

  // Optional: return API for external use
  return {
    getState,
    emit,
    on,
  };
}

export { bootstrap };