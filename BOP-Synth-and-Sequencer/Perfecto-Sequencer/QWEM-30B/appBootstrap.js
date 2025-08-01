// appBootstrap.js
/**
 * Bootstraps the entire Ordinal-Sequencer application.
 * Initializes all modules in correct order and wires up event listeners.
 *
 * @module appBootstrap
 */

import { initAudio } from './audioEngine.js';
import { startScheduler, stopScheduler } from './playbackScheduler.js';
import { createGrid, destroyGrid } from './sequencerGrid.js';
import { attachControls } from './transportController.js';
import { initMidi, disposeMidi } from './midiInput.js';
import { savePattern, loadPattern } from './blockchainPersistence.js';
import { savePreset, loadPreset, listPresets } from './presetManager.js';
import { getState, dispatch } from './stateManager.js';
import { emit } from './eventBus.js';

/**
 * Bootstraps the entire application.
 * Initializes audio, UI, controls, and event wiring.
 * Should be called once after DOM is ready.
 */
export function bootstrap() {
  // Initialize core systems
  initAudio();

  // Set up transport control panel
  const transportContainer = document.getElementById('transport-controls');
  if (transportContainer) {
    attachControls(transportContainer);
  }

  // Set up sequencer grid
  const gridContainer = document.getElementById('sequencer-grid');
  if (gridContainer) {
    createGrid(gridContainer);
  }

  // Set up MIDI input
  initMidi();

  // Wire up playback scheduler to transport events
  const handleTransportEvent = (event) => {
    const state = getState();
    switch (event.type) {
      case 'TRANSPORT/PLAY':
        startScheduler();
        break;
      case 'TRANSPORT/PAUSE':
        stopScheduler();
        break;
      case 'TRANSPORT/STOP':
        stopScheduler();
        break;
      default:
        break;
    }
  };

  // Subscribe to transport events
  const unsubscribe = window.subscribe(handleTransportEvent);

  // Listen for GRID/STEP_TOGGLED to update UI or persist
  const handleStepToggle = (event) => {
    // Optionally: trigger blockchain save on every change
    // savePattern(); // Uncomment for auto-save
  };

  const stepUnsubscribe = window.subscribe(handleStepToggle);

  // Clean up on unload
  window.addEventListener('beforeunload', () => {
    disposeMidi();
    stopScheduler();
    unsubscribe();
    stepUnsubscribe();
  });

  // Emit boot success
  emit('APP/BOOTED');
}