// stateManager.js
/**
 * @module stateManager
 * Singleton state store for the Ordinal-Sequencer.
 * Provides a single source of truth with immutability guarantees.
 * Uses a simple publish-subscribe model for state updates.
 */

let state = {
    transport: {
      isPlaying: false,
      bpm: 120,
      position: 0,
    },
    grid: {
      tracks: 8,
      stepsPerTrack: 16,
      patternData: {},
    },
    midi: {
      enabled: false,
      devices: [],
    },
    blockchain: {
      lastTxId: null,
    },
    config: {
      toneJsOrdinal: 'ord://<PLACEHOLDER_LIBRARY_ORDINAL>',
    },
  };
  
  const listeners = new Set();
  
  /**
   * Returns a deep clone of the current state to prevent accidental mutations.
   * @returns {Object} Cloned state object
   */
  function getState() {
    return JSON.parse(JSON.stringify(state));
  }
  
  /**
   * Dispatches an action to update the state.
   * Enforces immutability by replacing state with a new object.
   * Notifies all subscribers after state change.
   *
   * @param {Object} action - The action to apply
   * @param {string} action.type - Type of action (e.g., 'TRANSPORT/SET_BPM')
   * @param {any} [action.payload] - Data associated with the action
   * @returns {void}
   */
  function dispatch(action) {
    if (!action.type) {
      console.warn('[stateManager] Action without type was ignored:', action);
      return;
    }
  
    const prevState = state;
    state = reducer(state, action);
    if (prevState !== state) {
      // Notify listeners asynchronously
      Promise.resolve().then(() => {
        listeners.forEach((listener) => listener());
      });
    }
  }
  
  /**
   * Subscribes a listener function to state changes.
   * Listener will be called (without args) whenever state updates.
   *
   * @param {Function} listener - Callback to invoke on state change
   * @returns {Function} Unsubscribe function
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('[stateManager] Subscriber must be a function');
    }
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  
  /**
   * Pure reducer function to compute new state from action.
   * Modular enough to be tested independently.
   *
   * @private
   * @param {Object} currentState - Current state tree
   * @param {Object} action - Action to apply
   * @returns {Object} New state tree
   */
  function reducer(currentState, action) {
    // Example: TRANSPORT/PLAY
    if (action.type === 'TRANSPORT/PLAY') {
      return {
        ...currentState,
        transport: {
          ...currentState.transport,
          isPlaying: true,
        },
      };
    }
  
    if (action.type === 'TRANSPORT/STOP') {
      return {
        ...currentState,
        transport: {
          ...currentState.transport,
          isPlaying: false,
        },
      };
    }
  
    if (action.type === 'TRANSPORT/SET_BPM') {
      const bpm = Number(action.payload);
      if (isNaN(bpm) || bpm <= 0) {
        console.warn('[stateManager] Invalid BPM ignored:', action.payload);
        return currentState;
      }
      return {
        ...currentState,
        transport: {
          ...currentState.transport,
          bpm,
        },
      };
    }
  
    if (action.type === 'GRID/STEP_TOGGLED') {
      const { track, step, isActive } = action.payload;
      const patternData = { ...currentState.grid.patternData };
      if (!patternData[track]) patternData[track] = {};
      patternData[track][step] = !!isActive;
  
      return {
        ...currentState,
        grid: {
          ...currentState.grid,
          patternData,
        },
      };
    }
  
    if (action.type === 'BLOCKCHAIN/SAVE_SUCCESS') {
      return {
        ...currentState,
        blockchain: {
          ...currentState.blockchain,
          lastTxId: action.payload.txId,
        },
      };
    }
  
    // Return unchanged state for unknown actions
    return currentState;
  }
  
  export { getState, dispatch, subscribe };