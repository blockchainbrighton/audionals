// blockchainPersistence.js

/**
 * @file Blockchain persistence layer for saving/loading patterns via Ordinal inscriptions.
 * Handles serialization of pattern data and interaction with Bitcoin Ordinals.
 */

import { getState, dispatch } from './stateManager.js';
import { emit } from './eventBus.js';

// Using a simple Base64 encoding for pattern data serialization
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

/**
 * Saves the current pattern to the Bitcoin blockchain via Ordinal inscription.
 * @returns {Promise<string|null>} Transaction ID of the inscription, or null on failure.
 */
export async function savePattern() {
  try {
    const state = getState();
    const { grid } = state;
    
    // Serialize pattern data
    const patternData = serializePattern(grid.patternData);
    
    // Create inscription content
    const content = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      tracks: grid.tracks,
      stepsPerTrack: grid.stepsPerTrack,
      patternData
    };
    
    // Convert to JSON string
    const jsonData = JSON.stringify(content);
    
    // In a real implementation, this would interact with an Ordinals API
    // For now, we'll simulate the process
    const txId = await simulateInscription(jsonData);
    
    if (txId) {
      // Update state with transaction ID
      dispatch({
        type: 'BLOCKCHAIN/SAVE_SUCCESS',
        payload: { txId }
      });
      
      // Emit event
      emit('BLOCKCHAIN/SAVE_COMPLETED', { txId });
      
      return txId;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to save pattern to blockchain:', error);
    emit('BLOCKCHAIN/SAVE_FAILED', { error: error.message });
    return null;
  }
}

/**
 * Loads a pattern from the Bitcoin blockchain using an Ordinal inscription.
 * @param {string} txId - Transaction ID of the inscription to load.
 * @returns {Promise<boolean>} True if pattern was loaded successfully.
 */
export async function loadPattern(txId) {
  try {
    // In a real implementation, this would fetch from an Ordinals API
    // For now, we'll simulate the process
    const jsonData = await simulateFetchInscription(txId);
    
    if (!jsonData) {
      throw new Error('Inscription not found');
    }
    
    const content = JSON.parse(jsonData);
    
    // Validate content
    if (!content.version || !content.patternData) {
      throw new Error('Invalid pattern data');
    }
    
    // Deserialize pattern data
    const patternData = deserializePattern(content.patternData);
    
    // Dispatch action to update state
    dispatch({
      type: 'GRID/LOAD_PATTERN',
      payload: {
        tracks: content.tracks || 8,
        stepsPerTrack: content.stepsPerTrack || 16,
        patternData
      }
    });
    
    // Emit event
    emit('BLOCKCHAIN/LOAD_COMPLETED', { txId });
    
    return true;
  } catch (error) {
    console.error('Failed to load pattern from blockchain:', error);
    emit('BLOCKCHAIN/LOAD_FAILED', { txId, error: error.message });
    return false;
  }
}

/**
 * Serializes pattern data into a compact string representation.
 * @param {Object} patternData - The pattern data to serialize.
 * @returns {string} Base64-encoded serialized data.
 */
function serializePattern(patternData) {
  // Convert pattern data to a more compact format
  const compactData = {};
  
  for (const [trackKey, steps] of Object.entries(patternData)) {
    const activeSteps = [];
    for (const [step, isActive] of Object.entries(steps)) {
      if (isActive) {
        activeSteps.push(parseInt(step, 10));
      }
    }
    if (activeSteps.length > 0) {
      compactData[trackKey] = activeSteps;
    }
  }
  
  const jsonString = JSON.stringify(compactData);
  return btoa(jsonString); // Base64 encode
}

/**
 * Deserializes pattern data from a compact string representation.
 * @param {string} serializedData - Base64-encoded serialized data.
 * @returns {Object} Deserialized pattern data.
 */
function deserializePattern(serializedData) {
  try {
    const jsonString = atob(serializedData); // Base64 decode
    const compactData = JSON.parse(jsonString);
    
    // Convert back to full pattern data format
    const patternData = {};
    
    for (const [trackKey, activeSteps] of Object.entries(compactData)) {
      patternData[trackKey] = {};
      for (const step of activeSteps) {
        patternData[trackKey][step] = true;
      }
    }
    
    return patternData;
  } catch (error) {
    console.error('Failed to deserialize pattern data:', error);
    return {};
  }
}

/**
 * Simulates inscribing data to the blockchain.
 * In a real implementation, this would interact with an Ordinals API.
 * @param {string} data - Data to inscribe.
 * @returns {Promise<string>} Simulated transaction ID.
 */
async function simulateInscription(data) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Generate a fake transaction ID
  return 'tx_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Simulates fetching inscribed data from the blockchain.
 * In a real implementation, this would fetch from an Ordinals API.
 * @param {string} txId - Transaction ID to fetch.
 * @returns {Promise<string|null>} Fetched data or null if not found.
 */
async function simulateFetchInscription(txId) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // For simulation purposes, we'll just return some test data
  // In a real implementation, this would fetch actual data
  if (txId.startsWith('tx_')) {
    const state = getState();
    const patternData = serializePattern(state.grid.patternData);
    
    return JSON.stringify({
      version: '1.0',
      createdAt: new Date().toISOString(),
      tracks: state.grid.tracks,
      stepsPerTrack: state.grid.stepsPerTrack,
      patternData
    });
  }
  
  return null;
}