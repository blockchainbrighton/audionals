// shared_state.js

let moduleIdCounter = 0;

// UPDATED Canvas Dimensions to match the CSS
export const CANVAS_WIDTH = 3000; // Must match #canvas width in CSS
export const CANVAS_HEIGHT = 2000; // Must match #canvas height in CSS

export const state = {
  dragType: null,
  modules: {},
  connections: [],
  dragState: {
    id: null,
    unscaledOffsetX: 0,
    unscaledOffsetY: 0
  },
  selectedConnector: null,
  currentZoom: 1.0
};

// ... rest of your shared_state.js
export function getNextModuleId() {
  return 'module-' + moduleIdCounter++;
}
export function addModule(id, moduleData) {
  state.modules[id] = moduleData;
}
export function getModule(id) {
  return state.modules[id];
}
export function removeModuleState(moduleId) {
    if (state.modules[moduleId]) {
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
export function getConnectionsForModule(moduleId) {
      return state.connections.filter(c => c.srcId === moduleId || c.dstId === moduleId);
}
export function getAllModules() {
      return Object.values(state.modules);
}
export function getAllModuleIds() {
      return Object.keys(state.modules);
}