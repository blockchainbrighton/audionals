// stateManager.js
/**
 * @typedef {Object} State
 * @property {Object} transport
 * @property {boolean} transport.isPlaying
 * @property {number} transport.bpm
 * @property {number} transport.position
 * @property {Object} grid
 * @property {number} grid.tracks
 * @property {number} grid.stepsPerTrack
 * @property {Object.<number, Object.<number, boolean>>} grid.patternData
 * @property {Object} midi
 * @property {boolean} midi.enabled
 * @property {Array} midi.devices
 * @property {Object} blockchain
 * @property {string|null} blockchain.lastTxId
 * @property {Object} config
 * @property {string} config.toneJsOrdinal
 */

/**
 * @typedef {Object} Action
 * @property {string} type
 * @property {any} payload
 */

/**
 * @typedef {Function} Listener
 * @param {State} state
 * @returns void
 */

/** @type {State} */
const initialState = {
    transport: {
      isPlaying: false,
      bpm: 120,
      position: 0
    },
    grid: {
      tracks: 8,
      stepsPerTrack: 16,
      patternData: {}
    },
    midi: {
      enabled: false,
      devices: []
    },
    blockchain: {
      lastTxId: null
    },
    config: {
      toneJsOrdinal: 'ord://<PLACEHOLDER_LIBRARY_ORDINAL>'
    }
  };
  
  let currentState = JSON.parse(JSON.stringify(initialState));
  let listeners = [];
  
  /**
   * Get current application state
   * @returns {State}
   */
  export function getState() {
    return JSON.parse(JSON.stringify(currentState));
  }
  
  /**
   * Dispatch an action to update state
   * @param {Action} action
   * @returns void
   */
  export function dispatch(action) {
    const newState = reduce(currentState, action);
    
    if (newState !== currentState) {
      currentState = newState;
      notifyListeners();
    }
  }
  
  /**
   * Subscribe to state changes
   * @param {Listener} listener
   * @returns {Function} Unsubscribe function
   */
  export function subscribe(listener) {
    listeners.push(listener);
    // Notify immediately with current state
    listener(getState());
    
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Reducer function to compute new state from action
   * @param {State} state
   * @param {Action} action
   * @returns {State}
   */
  function reduce(state, action) {
    switch (action.type) {
      case 'TRANSPORT/PLAY':
        return {
          ...state,
          transport: {
            ...state.transport,
            isPlaying: true,
            position: action.payload?.startedAt || state.transport.position
          }
        };
  
      case 'TRANSPORT/PAUSE':
        return {
          ...state,
          transport: {
            ...state.transport,
            isPlaying: false
          }
        };
  
      case 'TRANSPORT/STOP':
        return {
          ...state,
          transport: {
            ...state.transport,
            isPlaying: false,
            position: 0
          }
        };
  
      case 'TRANSPORT/SET_BPM':
        return {
          ...state,
          transport: {
            ...state.transport,
            bpm: action.payload.bpm
          }
        };
  
      case 'GRID/STEP_TOGGLED':
        const { track, step, isActive } = action.payload;
        const newPatternData = { ...state.grid.patternData };
        
        if (!newPatternData[track]) {
          newPatternData[track] = {};
        }
        
        newPatternData[track][step] = isActive;
        
        return {
          ...state,
          grid: {
            ...state.grid,
            patternData: newPatternData
          }
        };
  
      case 'GRID/RESET':
        return {
          ...state,
          grid: {
            ...state.grid,
            patternData: {}
          }
        };
  
      case 'MIDI/ENABLED':
        return {
          ...state,
          midi: {
            ...state.midi,
            enabled: action.payload.enabled
          }
        };
  
      case 'MIDI/DEVICES_UPDATED':
        return {
          ...state,
          midi: {
            ...state.midi,
            devices: action.payload.devices
          }
        };
  
      case 'BLOCKCHAIN/TRANSACTION_SAVED':
        return {
          ...state,
          blockchain: {
            ...state.blockchain,
            lastTxId: action.payload.txId
          }
        };
  
      default:
        return state;
    }
  }
  
  /**
   * Notify all subscribers of state change
   * @private
   */
  function notifyListeners() {
    listeners.forEach(listener => listener(getState()));
  }