// js/module_factory/module_factory.js
import { canvas } from '../dom_elements.js';
import { getNextModuleId, addModule, getModule } from '../shared_state.js';
import { enableModuleDrag } from '../drag_drop_manager.js';

import { removeModule, clearChannelToOutput } from '../module_manager.js'; // Use ./ for same directory
import { audioCtx } from '../audio_context.js'; // <<<--- ADD THIS if not already there

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
  const modElement = createModuleShell(id, type, x, y);
  const headerElement = createModuleHeader(type);
  modElement.appendChild(headerElement);

  const moduleInstanceData = await createAudioNodeAndUI(type, modElement);
  console.log(`LFO Module: createModule, moduleInstanceData for type ${type}:`, moduleInstanceData); // ADD THIS LOG


  if (!moduleInstanceData) {
    console.error(`Failed to create audio/UI components for module type: ${type}`);
    if (modElement.parentNode) {
        modElement.parentNode.removeChild(modElement);
    }
    return null;
  }

  // Add a specific check for LFO audioNode here for debugging
    if (type === 'lfo' && (!moduleInstanceData || !moduleInstanceData.audioNode)) {
      console.error('LFO CREATION ERROR: moduleInstanceData or its audioNode is null/undefined for LFO!', moduleInstanceData);
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
  console.log(`LFO Module: createModule, completeModuleData for type ${type}:`, completeModuleData); // ADD THIS LOG


  enableModuleDrag(modElement, id);

  // Add right-click listener to the module's header for removal
  headerElement.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent canvas or other context menus

    // Special handling for 'output' module: offer to clear channel
    if (completeModuleData.type === 'output' || completeModuleData.audioNode === audioCtx.destination) {
        // A more sophisticated approach would be a custom context menu.
        // For simplicity, a confirm dialog:
        if (confirm(`Remove this '${type}' module?\n\nAlternatively, (Cancel this and) press OK to clear the entire audio chain leading to this Output.`)) {
            removeModule(id);
        } else if (confirm(`Clear entire audio chain leading to this '${type}' module? (This will remove multiple modules)`)) {
            clearChannelToOutput(id);
        }
    } else {
        if (confirm(`Remove module '${type}' (ID: ${id})?`)) {
            removeModule(id);
        }
    }
  });

  return getModule(id);
  }