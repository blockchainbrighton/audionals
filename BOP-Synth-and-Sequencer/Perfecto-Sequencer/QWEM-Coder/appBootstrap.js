// appBootstrap.js

/**
 * @file Application bootstrap module that wires together all components.
 * Initializes modules in the correct order and sets up event listeners.
 */

import { getState, dispatch, subscribe } from './stateManager.js';
import { on } from './eventBus.js';
import { initAudio, dispose } from './audioEngine.js';
import { startScheduler, stopScheduler } from './playbackScheduler.js';
import { createGrid, destroyGrid } from './sequencerGrid.js';
import { initMidi, disposeMidi } from './midiInput.js';

/**
 * Bootstraps the entire application.
 * Initializes all modules and sets up event listeners.
 * @param {Object} elements - DOM elements required for UI modules.
 * @param {HTMLElement} elements.gridContainer - Container for the sequencer grid.
 * @param {HTMLElement} elements.playButton - Play/Pause button.
 * @param {HTMLElement} elements.stopButton - Stop button.
 * @param {HTMLInputElement} elements.bpmInput - BPM input element.
 */
export async function bootstrap(elements) {
  if (!elements || !elements.gridContainer || !elements.playButton || 
      !elements.stopButton || !elements.bpmInput) {
    throw new Error('Missing required DOM elements for bootstrap');
  }

  try {
    // Initialize audio engine
    const state = getState();
    await initAudio(state.grid.tracks);
    
    // Create sequencer grid
    createGrid(elements.gridContainer);
    
    // Set up transport controls
    const { attachControls } = await import('./transportController.js');
    attachControls({
      playButton: elements.playButton,
      stopButton: elements.stopButton,
      bpmInput: elements.bpmInput
    });
    
    // Initialize MIDI support
    const midiSupported = await initMidi();
    if (midiSupported) {
      dispatch({
        type: 'MIDI/INITIALIZED',
        payload: { enabled: true }
      });
    }
    
    // Set up event listeners for state changes
    subscribe(handleStateChange);
    
    // Set up global event listeners
    setupEventListeners();
    
    // Emit bootstrap completed event
    on('APP/BOOTSTRAP_COMPLETED', () => {
      console.log('Ordinal Sequencer initialized successfully');
    });
    
    on('APP/BOOTSTRAP_COMPLETED', { success: true });
    
  } catch (error) {
    console.error('Failed to bootstrap application:', error);
    on('APP/BOOTSTRAP_FAILED', { error: error.message });
    throw error;
  }
}

/**
 * Handles state changes and updates modules accordingly.
 * @param {Object} newState - The new application state.
 * @param {Object} action - The action that caused the state change.
 */
function handleStateChange(newState, action) {
  switch (action.type) {
    case 'GRID/LOAD_PATTERN':
      // When a new pattern is loaded, destroy and recreate the grid
      destroyGrid();
      createGrid(document.querySelector('.sequencer-grid-container') || 
                document.body.querySelector('[data-grid-container]') ||
                document.body); // Fallback to body if no container found
      break;
      
    case 'TRANSPORT/SET_BPM':
      // BPM changes are handled by playbackScheduler
      break;
      
    case 'TRANSPORT/STOP':
      // Additional stop handling if needed
      break;
  }
}

/**
 * Sets up global event listeners for application events.
 */
function setupEventListeners() {
  // Listen for grid step toggles to update state
  on('GRID/STEP_TOGGLED', (event) => {
    const { track, step, isActive } = event.detail;
    dispatch({
      type: 'GRID/STEP_TOGGLED',
      payload: { track, step, isActive }
    });
  });
  
  // Listen for transport events
  on('TRANSPORT/PLAY', () => {
    dispatch({
      type: 'TRANSPORT/TOGGLE_PLAY'
    });
  });
  
  on('TRANSPORT/PAUSE', () => {
    dispatch({
      type: 'TRANSPORT/TOGGLE_PLAY'
    });
  });
  
  on('TRANSPORT/STOP', () => {
    dispatch({
      type: 'TRANSPORT/STOP'
    });
  });
  
  on('TRANSPORT/BPM_CHANGED', (event) => {
    const { bpm } = event.detail;
    dispatch({
      type: 'TRANSPORT/SET_BPM',
      payload: { bpm }
    });
  });
}

/**
 * Shuts down the application and cleans up resources.
 */
export function shutdown() {
  // Stop playback
  stopScheduler();
  
  // Clean up UI
  destroyGrid();
  
  // Dispose of audio resources
  dispose();
  
  // Dispose of MIDI resources
  disposeMidi();
  
  // Emit shutdown event
  on('APP/SHUTDOWN_COMPLETED', { timestamp: Date.now() });
}