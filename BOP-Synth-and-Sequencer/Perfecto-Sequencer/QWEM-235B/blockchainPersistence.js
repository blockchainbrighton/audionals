// blockchainPersistence.js
/**
 * @module blockchainPersistence
 * Saves and loads sequencer patterns via Bitcoin Ordinals.
 * Serializes grid state to JSON and interacts with Ordinal inscription APIs.
 * Emits events on success/failure.
 *
 * Dependencies:
 * - stateManager (getState)
 * - eventBus (emit)
 *
 * Note: Actual Ordinal read/write requires external wallet/provider integration.
 * This module assumes a global `OrdinalAPI` or similar interface exists.
 */

import { getState } from './stateManager.js';
import { emit } from './eventBus.js';

// Mockable fetch wrapper for testing
const defaultFetcher = async (url, options) => {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  return response.json();
};

/**
 * Saves the current sequencer pattern to the Bitcoin blockchain via Ordinal inscription.
 * Serializes grid data and sends to configured inscription service.
 *
 * @param {Object} options - Configuration options
 * @param {string} [options.inscriptionEndpoint] - URL of the inscription service
 * @param {Function} [options.fetchFn] - Custom fetch-like function (for testing)
 * @returns {Promise<void>}
 *
 * @example
 * try {
 *   await savePattern({ inscriptionEndpoint: 'https://api.ordinalsservice.com/inscribe' });
 * } catch (err) {
 *   console.error('Save failed:', err.message);
 * }
 */
async function savePattern({ 
  inscriptionEndpoint = 'https://api.ordinals.com/inscribe', 
  fetchFn = defaultFetcher 
} = {}) {
  const state = getState();
  const { grid, transport } = state;

  // Prepare payload
  const patternData = {
    type: 'ordinal-sequencer-pattern',
    version: '1.0',
    timestamp: Date.now(),
    grid: {
      tracks: grid.tracks,
      stepsPerTrack: grid.stepsPerTrack,
      patternData: grid.patternData,
    },
    transport: {
      bpm: transport.bpm,
    },
  };

  try {
    const response = await fetchFn(inscriptionEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patternData),
    });

    // Assume response contains txid
    const txId = response.txid || response.id;
    if (!txId) {
      throw new Error('No transaction ID returned from inscription service');
    }

    // Update blockchain state
    emit('BLOCKCHAIN/SAVE_SUCCESS', { txId });
  } catch (error) {
    emit('BLOCKCHAIN/SAVE_ERROR', { message: error.message });
    throw error;
  }
}

/**
 * Loads a sequencer pattern from a Bitcoin Ordinal inscription.
 * Fetches inscription by txId and deserializes into AppState.
 *
 * @param {Object} options - Configuration options
 * @param {string} options.txId - Transaction ID of the inscription
 * @param {string} [options.inscriptionApiUrl] - Base URL for fetching inscriptions
 * @param {Function} [options.fetchFn] - Custom fetch-like function (for testing)
 * @returns {Promise<void>}
 *
 * @example
 * try {
 *   await loadPattern({ txId: 'abc123...', inscriptionApiUrl: 'https://api.ordinals.com' });
 * } catch (err) {
 *   console.error('Load failed:', err.message);
 * }
 */
async function loadPattern({ 
  txId, 
  inscriptionApiUrl = 'https://api.ordinals.com', 
  fetchFn = defaultFetcher 
}) {
  if (!txId) {
    throw new Error('txId is required to load a pattern');
  }

  const url = `${inscriptionApiUrl}/content/${txId}`;

  try {
    const data = await fetchFn(url);

    // Validate data shape
    if (data.type !== 'ordinal-sequencer-pattern') {
      throw new Error('Inscribed data is not a valid sequencer pattern');
    }

    // Emit success with parsed pattern
    emit('BLOCKCHAIN/PATTERN_LOADED', {
      txId,
      pattern: data,
    });

  } catch (error) {
    emit('BLOCKCHAIN/LOAD_ERROR', { txId, message: error.message });
    throw error;
  }
}

export { savePattern, loadPattern };