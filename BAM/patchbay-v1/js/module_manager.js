// js/module_factory/module_manager.js
import { audioCtx } from './audio_context.js';
import { state, removeModuleState, getModule, getAllModuleIds, getAllModules } from './shared_state.js'; // Added getAllModules
import { disconnectAllForModule } from './connection_manager.js';
import { svg as svgConnections } from './dom_elements.js'; // IMPORTANT: Ensure this is the SVG DOM element

/**
 * Removes a single module from the canvas and system.
 * @param {string} moduleId The ID of the module to remove.
 */
export function removeModule(moduleId) {
  const moduleData = getModule(moduleId);
  if (!moduleData) {
    console.warn(`Module ${moduleId} not found for removal.`);
    return;
  }

  // console.log(`Attempting to remove module: ${moduleId} (${moduleData.type})`);

  // 1. Disconnect all audio/trigger connections and remove lines, also clears relevant state.connections entries
  disconnectAllForModule(moduleId);

  // 2. Additional audio resource cleanup (if any audioNode not part of connections logic, or broader dispose)
  if (moduleData.audioNode && typeof moduleData.audioNode.disconnect === 'function') {
      if (moduleData.audioNode !== audioCtx.destination) { // Don't disconnect the main audio context destination
          try { moduleData.audioNode.disconnect(); } catch(e) { /* Might be already disconnected, ignore */ }
      }
  }
  if (typeof moduleData.dispose === 'function') {
      moduleData.dispose(); // Module-specific custom cleanup
  }

  // 3. Remove the module's DOM element
  if (moduleData.element && moduleData.element.parentNode) {
    moduleData.element.remove();
  }

  // 4. Remove the module's data from shared state
  removeModuleState(moduleId); // Removes from state.modules

  // 5. If a selected connector belonged to this module, clear it (disconnectAllForModule should also do this)
  if (state.selectedConnector && state.selectedConnector.id === moduleId) {
    if (state.selectedConnector.elem) state.selectedConnector.elem.classList.remove('selected');
    state.selectedConnector = null;
  }

  // console.log(`Module ${moduleId} removed successfully.`);
}

/**
 * Removes all modules from the canvas.
 */
export function clearAllModules() {
  console.log("Clearing all modules and connections...");

  // 1. Dispose of audio resources and remove DOM elements for all modules
  const allModules = getAllModules(); // Get all module data objects
  allModules.forEach(moduleData => {
    if (moduleData.audioNode && typeof moduleData.audioNode.disconnect === 'function') {
        if (moduleData.audioNode !== audioCtx.destination) {
            try { moduleData.audioNode.disconnect(); } catch(e) { /* ignore */ }
        }
    }
    if (typeof moduleData.dispose === 'function') {
        moduleData.dispose();
    }
    if (moduleData.element && moduleData.element.parentNode) {
        moduleData.element.remove();
    }
  });

  // 2. Remove ALL visual connection lines from the SVG container directly
  if (svgConnections) { // Ensure the SVG element from dom_elements.js is valid
    while (svgConnections.firstChild) {
      svgConnections.removeChild(svgConnections.firstChild);
    }
  } else {
    console.warn("SVG connections element not found for clearing lines.");
  }

  // 3. Clear the application state for modules and connections
  state.modules = {};
  state.connections = [];
  
  if (state.selectedConnector && state.selectedConnector.elem) {
    state.selectedConnector.elem.classList.remove('selected');
  }
  state.selectedConnector = null;

  console.log("Canvas cleared of all modules and connections.");
}

// ... clearChannelToOutput (looks okay as is, it uses removeModule) ...
export function clearChannelToOutput(outputModuleId) {
  const outputModule = getModule(outputModuleId);
  if (!outputModule || (outputModule.type !== 'output' && outputModule.audioNode !== audioCtx.destination)) {
    console.warn(`Cannot clear channel: ${outputModuleId} is not a valid output module.`);
    return;
  }

  console.log(`Clearing channel leading to output module: ${outputModuleId}`);
  const modulesInChannel = new Set();
  const queue = [outputModuleId];
  // Do not add the output module itself to the removal set initially if it shouldn't be removed.
  // If output module should also be removed, add it here.
  // modulesInChannel.add(outputModuleId); 

  let head = 0;
  // Start queue with inputs to the output module if output isn't to be removed
  // Or start with outputModuleId if it is to be removed.
  // For "clear channel *to* output", implies output stays. So find things connected TO it.
   state.connections.forEach(conn => {
      if (conn.dstId === outputModuleId && !modulesInChannel.has(conn.srcId)) {
        modulesInChannel.add(conn.srcId);
        queue.push(conn.srcId);
      }
    });


  while(head < queue.length) {
    const currentModuleId = queue[head++];
    // Find modules that connect TO currentModuleId
    state.connections.forEach(conn => {
      if (conn.dstId === currentModuleId && !modulesInChannel.has(conn.srcId)) {
        modulesInChannel.add(conn.srcId);
        queue.push(conn.srcId);
      }
    });
  }

  // If the output module itself should be removed at the end:
  // modulesInChannel.add(outputModuleId); 

  console.log("Modules in channel to be removed:", Array.from(modulesInChannel));
  modulesInChannel.forEach(id => {
    if (id !== outputModuleId) { // Example: Don't remove the output module itself
       removeModule(id);
    } else if (SHOULD_REMOVE_OUTPUT_MODULE_ITSELF) { // If you decide to remove it
       removeModule(id);
    }
  });
  console.log(`Channel to ${outputModuleId} cleared.`);
}

// Placeholder for a decision variable
const SHOULD_REMOVE_OUTPUT_MODULE_ITSELF = false;