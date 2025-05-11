// js/module_manager.js
import { audioCtx } from '../audio_context.js'; // Use ../ to go up
import { state, removeModuleState, getModule, getAllModuleIds, getConnectionsForModule } from '../shared_state.js'; // Use ../ to go up
import { disconnectAllForModule, refreshLinesForModule } from '../connection_manager.js'; // Use ../ to go up

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

  console.log(`Attempting to remove module: ${moduleId} (${moduleData.type})`);

  // 1. Disconnect all audio/trigger connections and remove lines
  disconnectAllForModule(moduleId);

  // 2. Remove the module's DOM element
  if (moduleData.element && moduleData.element.parentNode) {
    moduleData.element.remove();
  }

  // 3. Remove the module's data from shared state
  removeModuleState(moduleId);

  // 4. If a selected connector belonged to this module, clear it
  if (state.selectedConnector && state.selectedConnector.id === moduleId) {
    // disconnectAllForModule already handles deselecting, but this is a safeguard
    if (state.selectedConnector.elem) state.selectedConnector.elem.classList.remove('selected');
    state.selectedConnector = null;
  }

  console.log(`Module ${moduleId} removed successfully.`);
}

/**
 * Removes all modules from the canvas.
 */
export function clearAllModules() {
  console.log("Clearing all modules from canvas.");
  const moduleIds = getAllModuleIds(); // Get IDs before modifying state.modules
  moduleIds.forEach(id => {
    removeModule(id); // This will handle all cleanup for each module
  });
  // After all modules and their connections are removed, state.connections should be empty.
  // state.modules will also be empty.
  if (state.connections.length > 0) {
      console.warn("Connections remain after clearAllModules:", state.connections);
      state.connections.length = 0; // Force clear if any stragglers
  }
   if (Object.keys(state.modules).length > 0) {
      console.warn("Modules remain after clearAllModules:", state.modules);
      for (const key in state.modules) delete state.modules[key]; // Force clear
  }
  console.log("Canvas cleared.");
}

/**
 * Finds all modules connected upstream to a given output module and removes them.
 * @param {string} outputModuleId The ID of the 'output' module to trace back from.
 */
export function clearChannelToOutput(outputModuleId) {
  const outputModule = getModule(outputModuleId);
  if (!outputModule || (outputModule.type !== 'output' && outputModule.audioNode !== audioCtx.destination)) {
    console.warn(`Cannot clear channel: ${outputModuleId} is not a valid output module.`);
    return;
  }

  console.log(`Clearing channel leading to output module: ${outputModuleId}`);
  const modulesInChannel = new Set();
  const queue = [outputModuleId];
  modulesInChannel.add(outputModuleId);

  let head = 0;
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

  console.log("Modules in channel to be removed:", Array.from(modulesInChannel));
  modulesInChannel.forEach(id => {
    removeModule(id);
  });
  console.log(`Channel to ${outputModuleId} cleared.`);
}