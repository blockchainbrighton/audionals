// shared_state.js
let moduleIdCounter = 0;

export const state = {
  dragType: null, // Type of module being dragged from palette
  modules: {},    // Stores module data: { id: { type, audioNode, element } }
  connections: [],// Stores connection data: { srcId, dstId, line }
  dragState: {    // For dragging existing modules
    id: null,
    offsetX: 0,
    offsetY: 0
  },
  selectedConnector: null // For making connections
};

export function getNextModuleId() {
  return 'module-' + moduleIdCounter++;
}

// Functions to modify state if needed, e.g.:
export function addModule(id, moduleData) {
  state.modules[id] = moduleData;
}

export function getModule(id) {
  return state.modules[id];
}




export function removeModuleState(moduleId) {
    if (state.modules[moduleId]) {
      // If module has a 'dispose' or 'cleanup' method, call it
      // This is good practice for modules with complex internal resources (e.g., event listeners, timers)
      if (typeof state.modules[moduleId].dispose === 'function') {
          state.modules[moduleId].dispose();
      }
      delete state.modules[moduleId];
      console.log(`Module ${moduleId} removed from state.`);
      return true;
    }
    return false;
  }
  
  export function addConnection(connectionData) {
    state.connections.push(connectionData);
  }
  
  export function removeConnection(indexOrConnectionObject) {
    if (typeof indexOrConnectionObject === 'number') {
      if (indexOrConnectionObject >= 0 && indexOrConnectionObject < state.connections.length) {
        state.connections.splice(indexOrConnectionObject, 1);
      }
    } else {
      const index = state.connections.indexOf(indexOrConnectionObject);
      if (index > -1) {
        state.connections.splice(index, 1);
      }
    }
  }
  
  // New: Get all connections for a specific module
  export function getConnectionsForModule(moduleId) {
      return state.connections.filter(c => c.srcId === moduleId || c.dstId === moduleId);
  }
  
  // New: Function to get all modules (useful for "clear all")
  export function getAllModules() {
      return Object.values(state.modules);
  }
  
  export function getAllModuleIds() {
      return Object.keys(state.modules);
  }