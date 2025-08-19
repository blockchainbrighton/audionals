// Main App Module - Application Initialization and Coordination
'use strict';

import { $ } from './utils.js';
import { initTransport } from './sequencer.js';
import { addChannel, buildBarMarks, rebuildSynthHead } from './channels.js';
import { initSequences } from './sequences.js';
import { initGridEvents } from './ui.js';
import { initMIDI, createKeyboard } from './midi-keyboard.js';
import { initSession } from './session.js';

// Initialize the application
async function init() {
  // Build static UI elements
  buildBarMarks();
  createKeyboard();
  
  // Initialize modules
  initTransport();
  initSequences();
  initGridEvents();
  initSession();
  
  // Initialize MIDI
  await initMIDI();
  
  // Set up channel creation buttons
  $('#addSampler').addEventListener('click', () => addChannel('sampler'));
  $('#addSynth').addEventListener('click', () => {
    const channel = addChannel('synth');
    // Update synth parameter UI after adding
    setTimeout(() => rebuildSynthHead(channel), 0);
  });
  
  console.log('Polyphonic Sequencer initialized');
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

