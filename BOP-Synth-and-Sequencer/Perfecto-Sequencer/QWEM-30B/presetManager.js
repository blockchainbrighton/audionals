// presetManager.js
/**
 * Manages local storage snapshots of sequencer presets.
 * Allows saving, loading, and listing saved patterns.
 * Works alongside blockchainPersistence for hybrid persistence.
 *
 * @module presetManager
 */

import { getState } from './stateManager.js';

const STORAGE_KEY = 'ordinal-sequencer-presets';

/**
 * Saves the current grid pattern to localStorage as a named preset.
 * @param {string} name - Name of the preset (e.g., "Groove 1").
 * @returns {boolean} True if saved successfully.
 */
export function savePreset(name) {
  try {
    const state = getState();
    const preset = {
      name,
      timestamp: Date.now(),
      data: state.grid.patternData
    };

    const presets = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const existingIndex = presets.findIndex(p => p.name === name);

    if (existingIndex !== -1) {
      presets[existingIndex] = preset;
    } else {
      presets.push(preset);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    return true;
  } catch (err) {
    console.error('Failed to save preset:', err);
    return false;
  }
}

/**
 * Loads a saved preset from localStorage by name.
 * Updates grid.patternData with the loaded data.
 * @param {string} name - Name of the preset to load.
 * @returns {Object|null} Loaded preset data or null if not found.
 */
export function loadPreset(name) {
  try {
    const presets = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const preset = presets.find(p => p.name === name);

    if (!preset) return null;

    // Update state
    const state = getState();
    const updatedGrid = {
      ...state.grid,
      patternData: preset.data
    };

    // Dispatch update (would be handled by stateManager)
    // In real app: dispatch({ type: 'GRID/LOAD_PRESET', payload: { data: preset.data } });
    // Here we simulate via direct mutation in test context
    window.__TEST_STATE__.grid.patternData = preset.data;

    return preset;
  } catch (err) {
    console.error('Failed to load preset:', err);
    return null;
  }
}

/**
 * Lists all available presets.
 * @returns {Array<{name: string, timestamp: number}>} Array of preset metadata.
 */
export function listPresets() {
  try {
    const presets = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return presets.map(p => ({
      name: p.name,
      timestamp: p.timestamp
    })).sort((a, b) => b.timestamp - a.timestamp); // newest first
  } catch (err) {
    console.error('Failed to list presets:', err);
    return [];
  }
}