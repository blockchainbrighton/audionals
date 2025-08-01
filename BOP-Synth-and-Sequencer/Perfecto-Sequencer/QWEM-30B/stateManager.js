// stateManager.js
/**
 * Singleton state manager for the Ordinal-Sequencer app.
 * Provides a single source of truth via getState and dispatch actions.
 *
 * @module stateManager
 */

import { emit } from './eventBus.js';

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
  midi: { enabled: false, devices: [] },
  blockchain: { lastTxId: null },
  config: {
    toneJsOrdinal: 'ord://<PLACEHOLDER_LIBRARY_ORDINAL>'
  }
};

let state = { ...initialState };
const subscribers = new Set();

/**
 * Returns current app state.
 * @returns {Object} Deep copy of current state.
 */
export function getState() {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Dispatches an action to update state.
 * Triggers eventBus and notifies all subscribers.
 * @param {Object} action - Must have `type` string and optional `payload`.
 * @example dispatch({ type: 'TRANSPORT/PLAY', payload: { startedAt: 12345 } })
 */
export function dispatch(action) {
  if (!action.type) throw new Error('Action must have a type');

  const newState = handleAction(state, action);
  if (newState === state) return; // no change

  state = newState;
  emit('STATE_UPDATED', { action, newState });
  subscribers.forEach(cb => cb(newState));
}

/**
 * Subscribes a callback to state changes.
 * @param {Function} callback - Called with new state on update.
 * @returns {Function} Unsubscribe function.
 */
export function subscribe(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

/**
 * Reducer-like function to handle actions.
 * Pure function: always returns new state based on old state + action.
 * @private
 * @param {Object} oldState - Current state.
 * @param {Object} action - Action to apply.
 * @returns {Object} New state.
 */
function handleAction(oldState, action) {
  switch (action.type) {
    case 'TRANSPORT/PLAY':
      return {
        ...oldState,
        transport: {
          ...oldState.transport,
          isPlaying: true,
          position: 0
        }
      };

    case 'TRANSPORT/PAUSE':
      return {
        ...oldState,
        transport: {
          ...oldState.transport,
          isPlaying: false
        }
      };

    case 'TRANSPORT/STOP':
      return {
        ...oldState,
        transport: {
          ...oldState.transport,
          isPlaying: false,
          position: 0
        }
      };

    case 'TRANSPORT/SET_BPM':
      return {
        ...oldState,
        transport: {
          ...oldState.transport,
          bpm: Math.max(20, Math.min(240, action.payload.bpm))
        }
      };

    case 'GRID/STEP_TOGGLED':
      const { track, step, isActive } = action.payload;
      const key = `${track}-${step}`;
      const updatedPatternData = {
        ...oldState.grid.patternData,
        [key]: isActive
      };

      return {
        ...oldState,
        grid: {
          ...oldState.grid,
          patternData: updatedPatternData
        }
      };

    case 'MIDI/DEVICE_CONNECTED':
      return {
        ...oldState,
        midi: {
          ...oldState.midi,
          enabled: true,
          devices: [...oldState.midi.devices, action.payload.device]
        }
      };

    case 'MIDI/DEVICE_DISCONNECTED':
      return {
        ...oldState,
        midi: {
          ...oldState.midi,
          devices: oldState.midi.devices.filter(d => d.id !== action.payload.deviceId)
        }
      };

    case 'BLOCKCHAIN/PATTERN_SAVED':
      return {
        ...oldState,
        blockchain: {
          ...oldState.blockchain,
          lastTxId: action.payload.txId
        }
      };

    case 'BLOCKCHAIN/PATTERN_LOADED':
      return {
        ...oldState,
        grid: {
          ...oldState.grid,
          patternData: action.payload.patternData
        }
      };

    default:
      console.warn(`Unknown action type: ${action.type}`);
      return oldState;
  }
}