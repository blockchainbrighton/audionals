// js/module_factory/module_connectors.js
import { handleConnectorClick, handleDisconnect } from '../connection_manager.js';

/**
 * Creates and appends input/output connectors to a module element.
 * @param {string} type - The type of the module.
 * @param {HTMLElement} moduleElement - The main DOM element of the module.
 * @param {string} moduleId - The unique ID of the module.
 */
export function createAndAppendConnectors(type, moduleElement, moduleId) {
  // Output Connector
  // All modules except 'output' should have an output connector.
  if (type !== 'output') {
    const out = document.createElement('div');
    out.className = 'connector output';
    // LFOs output control signals, but use the same connector visually
    out.addEventListener('click', (e) => {
      e.stopPropagation();
      handleConnectorClick(moduleId, 'output');
    });
    out.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      handleDisconnect(moduleId, 'output');
    });
    moduleElement.appendChild(out);
  }

  // Input Connector
  // Oscillators and LFOs are typically sources and don't have standard audio inputs.
  // The 'output' module IS a destination and needs an input.
  // Filter and Gain modules also need inputs.
  if (type !== 'oscillator' && type !== 'lfo') { // Corrected: Removed '&& type !== output'
    const inp = document.createElement('div');
    inp.className = 'connector input';
    inp.addEventListener('click', (e) => {
      e.stopPropagation();
      handleConnectorClick(moduleId, 'input');
    });
    inp.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      handleDisconnect(moduleId, 'input');
    });
    moduleElement.appendChild(inp);
  }
}