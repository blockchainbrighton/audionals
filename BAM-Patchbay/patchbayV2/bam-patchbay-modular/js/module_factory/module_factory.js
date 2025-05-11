// js/module_factory/module_factory.js
import { canvas } from '../dom_elements.js';
import { getNextModuleId, addModule, getModule } from '../shared_state.js';
import { enableModuleDrag } from '../drag_drop_manager.js';

import { createModuleShell, createModuleHeader } from './module_dom.js';
// UPDATED IMPORT: Point to the new file name for createAudioNodeAndUI
import { createAudioNodeAndUI } from './audio_component_factory.js';
import { createAndAppendConnectors } from './module_connectors.js';

/**
 * Orchestrates the creation of a complete module.
 * This function is now async because createAudioNodeAndUI is async.
 * @param {string} type - The type of the module.
 * @param {number} x - The initial x-coordinate.
 * @param {number} y - The initial y-coordinate.
 * @returns {Promise<object|null>} A promise that resolves to the module data object from shared_state, or null on failure.
 */
export async function createModule(type, x, y) { // Mark function as async
  const id = getNextModuleId();

  // 1. Create the basic module shell
  const modElement = createModuleShell(id, type, x, y);

  // 2. Create and append the header
  const headerElement = createModuleHeader(type);
  modElement.appendChild(headerElement);

  // 3. Create AudioNode and its UI, append UI to module
  // AWAIT the result of the async createAudioNodeAndUI function
  const audioNode = await createAudioNodeAndUI(type, modElement);
  if (!audioNode) {
    console.error(`Failed to create audio node for module type: ${type}`);
    // Clean up the created shell if audio node creation fails
    if (modElement.parentNode) {
        modElement.parentNode.removeChild(modElement);
    } else {
        // If not yet appended, just ensure it's not used further
    }
    return null; // Stop creation if audio node fails
  }

  // 4. Create and append connectors
  createAndAppendConnectors(type, modElement, id);

  // 5. Finalize module
  canvas.appendChild(modElement);
  addModule(id, { type, audioNode, element: modElement });
  enableModuleDrag(modElement, id); // Make the new module draggable

  return getModule(id); // This will now be wrapped in a Promise due to async
}