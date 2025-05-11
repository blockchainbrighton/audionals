// js/module_factory/module_connectors.js
import { handleConnectorClick, handleDisconnect } from '../connection_manager.js';

/**
 * Creates and appends input/output connectors to a module element.
 * @param {string} type - The type of the module.
 * @param {HTMLElement} moduleElement - The main DOM element of the module.
 * @param {string} moduleId - The unique ID of the module.
 * @param {object} moduleInstanceData - The full data object for the module instance (contains .audioNode, etc.).
 */
export function createAndAppendConnectors(type, moduleElement, moduleId, moduleInstanceData) {
  // --- Standard Audio Output Connector ---
  // Modules that should NOT have a standard audio output:
  const noAudioOutput = ['output', 'sequencer', 'bpmClock'];
  if (!noAudioOutput.includes(type)) {
    const out = document.createElement('div');
    // Add specific class for styling and selection, e.g., 'audio-output'
    out.className = 'connector output audio-output';
    out.title = 'Audio Output';
    out.addEventListener('click', (e) => {
      e.stopPropagation();
      // Pass 'audio' as the connectorType
      handleConnectorClick(moduleId, 'output', 'audio');
    });
    out.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      handleDisconnect(moduleId, 'output', 'audio');
    });
    moduleElement.appendChild(out);
  }

  // --- Standard Audio Input Connector ---
  // Modules that should NOT have a standard audio input:
  // LFOs and Oscillators are sources. SamplePlayer is a source. Sequencer/BPM are control.
  const noAudioInput = ['oscillator', 'lfo', 'samplePlayer', 'sequencer', 'bpmClock'];
  if (!noAudioInput.includes(type)) { // 'output' module DOES need an audio input.
    const inp = document.createElement('div');
    inp.className = 'connector input audio-input';
    inp.title = 'Audio Input';
    inp.addEventListener('click', (e) => {
      e.stopPropagation();
      handleConnectorClick(moduleId, 'input', 'audio');
    });
    inp.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      handleDisconnect(moduleId, 'input', 'audio');
    });
    moduleElement.appendChild(inp);
  }

  // --- Custom Connectors ---

  // Sample Player: Trigger Input
  if (type === 'samplePlayer') {
    const triggerIn = document.createElement('div');
    triggerIn.className = 'connector input trigger-input'; // Specific class for styling/selection
    triggerIn.title = 'Trigger Input (from Sequencer)';
    // triggerIn.style.backgroundColor = 'gold'; // Example visual differentiation
    triggerIn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleConnectorClick(moduleId, 'input', 'trigger');
    });
    triggerIn.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      handleDisconnect(moduleId, 'input', 'trigger');
    });
    moduleElement.appendChild(triggerIn);
  }

  // Sequencer: Trigger Output
  if (type === 'sequencer') {
    const triggerOut = document.createElement('div');
    triggerOut.className = 'connector output trigger-output'; // Specific class
    triggerOut.title = 'Trigger Output (to Sample Player)';
    // triggerOut.style.backgroundColor = 'cyan'; // Example visual differentiation
    triggerOut.addEventListener('click', (e) => {
        e.stopPropagation();
        handleConnectorClick(moduleId, 'output', 'trigger');
    });
    triggerOut.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      handleDisconnect(moduleId, 'output', 'trigger');
    });
    moduleElement.appendChild(triggerOut);
  }

  // Future: BPM Clock: Tempo Output (if not using global broadcast)
  // if (type === 'bpmClock') { /* create tempo output connector */ }
  // Future: Sequencer: Tempo Input (if not using global broadcast for BPM)
  // if (type === 'sequencer') { /* create tempo input connector */ }
}