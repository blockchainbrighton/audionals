// stateManager.js

/**
 * @file A singleton state manager implementing a Redux-like pattern.
 * Provides getState, dispatch, and subscribe.
 */

let appState = {
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
    midi: { enabled: false, devices: [] },
    blockchain: { lastTxId: null },
    config: {
      toneJsOrdinal: 'ord://<PLACEHOLDER_LIBRARY_ORDINAL>'
    }
  };
  
  /** @type {Array<Function>} */
  let listeners = [];
  
  /**
   * Returns the current application state.
   * @returns {Object} The current state.
   */
  export function getState() {
    return appState;
  }
  
  /**
   * Dispatches an action to update the state.
   * @param {Object} action - The action with type and payload.
   */
  export function dispatch(action) {
    const prevState = appState;
    appState = reducer(appState, action);
    if (appState !== prevState) {
      listeners.forEach(listener => listener(appState, action));
    }
  }
  
  /**
   * Subscribes a listener to state changes.
   * @param {Function} listener - Function to call on state change.
   * @returns {Function} Unsubscribe function.
   */
  export function subscribe(listener) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Pure reducer function to compute new state from old state and action.
   * @param {Object} state - Current state.
   * @param {Object} action - Action with type and payload.
   * @returns {Object} New state.
   */
  function reducer(state, action) {
    switch (action.type) {
      case 'TRANSPORT/TOGGLE_PLAY':
        return {
          ...state,
          transport: {
            ...state.transport,
            isPlaying: !state.transport.isPlaying
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
        const trackKey = `track-${track}`;
        const updatedTrack = {
          ...(state.grid.patternData[trackKey] || {}),
          [step]: isActive
        };
        return {
          ...state,
          grid: {
            ...state.grid,
            patternData: {
              ...state.grid.patternData,
              [trackKey]: updatedTrack
            }
          }
        };
      case 'BLOCKCHAIN/SAVE_SUCCESS':
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