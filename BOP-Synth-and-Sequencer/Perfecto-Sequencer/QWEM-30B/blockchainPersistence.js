// blockchainPersistence.js
/**
 * Saves and loads sequencer patterns to/from Bitcoin via Ordinals.
 * Uses the `ord://` protocol to inscribe pattern data as text on-chain.
 * Communicates with the Bitcoin network via a mock or real inscription API.
 *
 * @module blockchainPersistence
 */

import { getState, dispatch } from './stateManager.js';
import { emit } from './eventBus.js';

// Mock: In practice, this would use an actual Ordinal inscription API (e.g., via ordinals.com)
// For now, we simulate it with a stub that returns fake TX IDs.

const INSCRIPTION_API_BASE = 'https://api.ordinals.com';

/**
 * Saves the current grid pattern to the Bitcoin blockchain via Ordinal inscription.
 * Encodes patternData as JSON, inscribes it, and stores the TX ID in state.
 * Emits 'BLOCKCHAIN/PATTERN_SAVED' on success.
 *
 * @returns {Promise<string>} TX ID of the inscription.
 */
export async function savePattern() {
  const state = getState();
  const { grid } = state;

  // Serialize pattern data
  const payload = {
    tracks: grid.tracks,
    stepsPerTrack: grid.stepsPerTrack,
    patternData: grid.patternData
  };

  const jsonData = JSON.stringify(payload);
  const txId = `tx_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 8)}`;

  // Simulate inscription process
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

  // Update state with TX ID
  dispatch({
    type: 'BLOCKCHAIN/PATTERN_SAVED',
    payload: { txId }
  });

  emit('BLOCKCHAIN/PATTERN_SAVED', { txId });

  return txId;
}

/**
 * Loads a pattern from the Bitcoin blockchain using a given TX ID.
 * Fetches the inscription data, parses JSON, and updates grid state.
 * Emits 'BLOCKCHAIN/PATTERN_LOADED' on success.
 *
 * @param {string} txId - The transaction ID of the inscription.
 * @returns {Promise<Object>} Loaded pattern data.
 */
export async function loadPattern(txId) {
  // Simulate fetching from blockchain
  await new Promise(resolve => setTimeout(resolve, 500));

  // Mock response from inscription API
  const mockInscriptionData = {
    "tracks": 8,
    "stepsPerTrack": 16,
    "patternData": {
      "0-0": true,
      "1-4": true,
      "2-8": true,
      "3-12": true
    }
  };

  // Update state
  dispatch({
    type: 'BLOCKCHAIN/PATTERN_LOADED',
    payload: { patternData: mockInscriptionData.patternData }
  });

  emit('BLOCKCHAIN/PATTERN_LOADED', { txId, patternData: mockInscriptionData.patternData });

  return mockInscriptionData;
}