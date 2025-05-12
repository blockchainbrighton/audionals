// js/shared_state.js

let moduleIdCounter = 0;

// UPDATED Canvas Dimensions to match the CSS
export const CANVAS_WIDTH = 3000; // Must match #canvas width in CSS
export const CANVAS_HEIGHT = 3000; // Must match #canvas height in CSS

export const DEFAULT_ZOOM = 0.5; // New: Define the default zoom level

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
    currentZoom: DEFAULT_ZOOM,
    masterBpm: 120,
    isPlaying: false // NEW: Global play state
  };

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

// --- Master BPM Management ---
/**
 * Sets the master BPM.
 * @param {string|number} newBpmInput - The new BPM value from user input.
 * @returns {number} The validated and set BPM value.
 */
export function setMasterBpm(newBpmInput) {
  const bpm = parseInt(newBpmInput, 10);
  
  // Validate BPM (e.g., between 20 and 300)
  if (isNaN(bpm) || bpm < 20 || bpm > 300) {
    console.warn(`Invalid BPM value: ${newBpmInput}. BPM not changed from ${state.masterBpm}.`);
    return state.masterBpm; // Return current BPM if new value is invalid
  }

  if (state.masterBpm !== bpm) {
    state.masterBpm = bpm;
    console.log(`Master BPM updated to: ${state.masterBpm}`);
    broadcastBpmUpdate(state.masterBpm);
  }
  return state.masterBpm;
}

/**
 * @returns {number} The current master BPM.
 */
export function getMasterBpm() {
  return state.masterBpm;
}

/**
 * Broadcasts the BPM update to all relevant modules (e.g., sequencers).
 * @param {number} newBpm - The new BPM to broadcast.
 */
function broadcastBpmUpdate(newBpm) {
  console.log(`Broadcasting BPM: ${newBpm} to modules.`);
  Object.values(state.modules).forEach(moduleData => {
    if (moduleData && moduleData.type === 'sequencer' && typeof moduleData.setTempo === 'function') {
      moduleData.setTempo(newBpm);
    }
    // Add other module types here if they need BPM updates
  });
}

// --- Global Play/Stop Management ---
/**
 * @returns {boolean} The current global play state.
 */
export function getIsPlaying() {
    return state.isPlaying;
  }
  
  /**
   * Sets the global play state and broadcasts the change.
   * @param {boolean} shouldPlay - True to play, false to stop.
   */
  export function setGlobalPlayState(shouldPlay) {
    if (state.isPlaying !== shouldPlay) {
      state.isPlaying = shouldPlay;
      console.log(`Global play state set to: ${state.isPlaying}`);
      broadcastPlayStateChange(state.isPlaying);
    }
    return state.isPlaying;
  }
  
  /**
   * Broadcasts the play state change to relevant modules (e.g., sequencers).
   * @param {boolean} isPlaying - The new play state.
   */
  function broadcastPlayStateChange(isPlaying) {
    console.log(`Broadcasting global play state: ${isPlaying} to modules.`);
    Object.values(state.modules).forEach(moduleData => {
      if (moduleData && moduleData.type === 'sequencer') {
        if (isPlaying && typeof moduleData.startSequence === 'function') {
          moduleData.startSequence();
        } else if (!isPlaying && typeof moduleData.stopSequence === 'function') {
          moduleData.stopSequence();
        }
      }
      // Add other module types here if they need global play/stop notifications
      // For example, some LFOs might only run when global play is active.
      // if (moduleData && moduleData.type === 'lfo' && typeof moduleData.onGlobalPlayStateChange === 'function') {
      //   moduleData.onGlobalPlayStateChange(isPlaying);
      // }
    });
  }