// js/module_factory/module_factory.js
import { canvas } from '../dom_elements.js';
import { getNextModuleId, addModule, getModule } from '../shared_state.js';
import { enableModuleDrag } from '../drag_drop_manager.js';

import { createModuleShell, createModuleHeader } from './module_dom.js';
import { createAudioNodeAndUI } from './module_audio_and_ui.js';
import { createAndAppendConnectors } from './module_connectors.js';

/**
 * Orchestrates the creation of a complete module.
 * @param {string} type - The type of the module.
 * @param {number} x - The initial x-coordinate.
 * @param {number} y - The initial y-coordinate.
 * @returns {object|null} The module data object from shared_state, or null on failure.
 */
export function createModule(type, x, y) {
  const id = getNextModuleId();

  // 1. Create the basic module shell
  const modElement = createModuleShell(id, type, x, y);

  // 2. Create and append the header
  const headerElement = createModuleHeader(type);
  modElement.appendChild(headerElement);

  // 3. Create AudioNode and its UI, append UI to module
  const audioNode = createAudioNodeAndUI(type, modElement);
  if (!audioNode) {
    console.error(`Failed to create audio node for module type: ${type}`);
    return null; // Stop creation if audio node fails
  }

  // 4. Create and append connectors
  createAndAppendConnectors(type, modElement, id);

  // 5. Finalize module
  canvas.appendChild(modElement);
  addModule(id, { type, audioNode, element: modElement });
  enableModuleDrag(modElement, id); // Make the new module draggable

  return getModule(id);
}