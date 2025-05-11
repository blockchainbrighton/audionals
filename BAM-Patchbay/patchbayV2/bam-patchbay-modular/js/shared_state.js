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

export function addConnection(connectionData) {
  state.connections.push(connectionData);
}

export function removeConnection(index) {
  state.connections.splice(index, 1);
}