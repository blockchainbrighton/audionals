// js/module_factory/module_factory.js
import { canvas } from '../dom_elements.js';
import { getNextModuleId, addModule, getModule } from '../shared_state.js';
import { enableModuleDrag } from '../drag_drop_manager.js';

import { createModuleShell, createModuleHeader } from './module_dom.js';
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
export async function createModule(type, x, y) {
  const id = getNextModuleId();

  // 1. Create the basic module shell
  const modElement = createModuleShell(id, type, x, y);

  // 2. Create and append the header
  const headerElement = createModuleHeader(type);
  modElement.appendChild(headerElement);

  // 3. Create AudioNode and its UI (and other module-specific data)
  // createAudioNodeAndUI now returns the full module instance data object
  const moduleInstanceData = await createAudioNodeAndUI(type, modElement);

  if (!moduleInstanceData) {
    console.error(`Failed to create audio/UI components for module type: ${type}`);
    if (modElement.parentNode) {
        modElement.parentNode.removeChild(modElement);
    }
    return null;
  }

  // 4. Create and append connectors
  // Pass moduleInstanceData as it might be needed for decisions or by click handlers (via shared_state later)
  createAndAppendConnectors(type, modElement, id, moduleInstanceData);

  // 5. Finalize module
  canvas.appendChild(modElement);

  // Construct the object to be stored in shared_state.modules
  // It includes the core properties and spreads in everything from moduleInstanceData
  // (which includes .audioNode, and other methods like .play(), .setTempo() etc.)
  const completeModuleData = {
    id: id, // Ensure id is part of the stored module data
    type,
    element: modElement,
    // Spread the properties from moduleInstanceData.
    // This will include 'audioNode' if defined, and other custom methods/properties.
    ...moduleInstanceData
  };
  addModule(id, completeModuleData);

  enableModuleDrag(modElement, id);

  return getModule(id); // Returns the object stored in shared_state
}