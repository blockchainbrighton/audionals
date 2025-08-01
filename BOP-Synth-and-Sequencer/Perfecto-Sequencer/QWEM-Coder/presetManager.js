// presetManager.js

/**
 * @file Local storage preset manager for saving and loading sequencer patterns.
 * Handles preset snapshots and factory presets.
 */

import { getState, dispatch } from './stateManager.js';
import { emit } from './eventBus.js';

const PRESET_STORAGE_KEY = 'ordinal_sequencer_presets';
const FACTORY_PRESETS = {
  'Basic Beat': {
    tracks: 4,
    stepsPerTrack: 16,
    patternData: {
      'track-0': { 0: true, 4: true, 8: true, 12: true }, // Kick
      'track-1': { 2: true, 6: true, 10: true, 14: true }, // Snare
      'track-2': { 0: true, 2: true, 4: true, 6: true, 8: true, 10: true, 12: true, 14: true }, // Hi-hat
      'track-3': { 7: true, 15: true } // Accent
    }
  },
  'Empty Pattern': {
    tracks: 8,
    stepsPerTrack: 16,
    patternData: {}
  }
};

/**
 * Saves the current pattern as a named preset in local storage.
 * @param {string} name - Name for the preset.
 * @returns {boolean} True if preset was saved successfully.
 */
export function savePreset(name) {
  if (!name || typeof name !== 'string') {
    console.warn('Preset name is required');
    return false;
  }

  try {
    const state = getState();
    const { grid } = state;
    
    // Get existing presets
    const presets = loadPresetsFromStorage();
    
    // Add or update preset
    presets[name] = {
      tracks: grid.tracks,
      stepsPerTrack: grid.stepsPerTrack,
      patternData: JSON.parse(JSON.stringify(grid.patternData)) // Deep clone
    };
    
    // Save to localStorage
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
    
    // Emit event
    emit('PRESET/SAVED', { name });
    
    return true;
  } catch (error) {
    console.error('Failed to save preset:', error);
    emit('PRESET/SAVE_FAILED', { name, error: error.message });
    return false;
  }
}

/**
 * Loads a preset by name and updates the application state.
 * @param {string} name - Name of the preset to load.
 * @returns {boolean} True if preset was loaded successfully.
 */
export function loadPreset(name) {
  try {
    const presets = getAllPresets();
    
    if (!presets[name]) {
      console.warn(`Preset "${name}" not found`);
      return false;
    }
    
    const preset = presets[name];
    
    // Dispatch action to update state
    dispatch({
      type: 'GRID/LOAD_PATTERN',
      payload: {
        tracks: preset.tracks,
        stepsPerTrack: preset.stepsPerTrack,
        patternData: preset.patternData
      }
    });
    
    // Emit event
    emit('PRESET/LOADED', { name });
    
    return true;
  } catch (error) {
    console.error('Failed to load preset:', error);
    emit('PRESET/LOAD_FAILED', { name, error: error.message });
    return false;
  }
}

/**
 * Lists all available presets (user + factory).
 * @returns {Object} Object with preset names as keys and preset data as values.
 */
export function listPresets() {
  return getAllPresets();
}

/**
 * Gets all presets (user + factory).
 * @returns {Object} Combined presets object.
 */
function getAllPresets() {
  const userPresets = loadPresetsFromStorage();
  return { ...FACTORY_PRESETS, ...userPresets };
}

/**
 * Loads user presets from localStorage.
 * @returns {Object} User presets object.
 */
function loadPresetsFromStorage() {
  try {
    const data = localStorage.getItem(PRESET_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Failed to load presets from storage:', error);
    return {};
  }
}

/**
 * Deletes a user preset by name.
 * @param {string} name - Name of the preset to delete.
 * @returns {boolean} True if preset was deleted successfully.
 */
export function deletePreset(name) {
  if (!name || typeof name !== 'string') {
    console.warn('Preset name is required');
    return false;
  }

  try {
    // Factory presets cannot be deleted
    if (FACTORY_PRESETS[name]) {
      console.warn(`Cannot delete factory preset "${name}"`);
      return false;
    }
    
    const presets = loadPresetsFromStorage();
    
    if (!presets[name]) {
      console.warn(`Preset "${name}" not found`);
      return false;
    }
    
    delete presets[name];
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
    
    // Emit event
    emit('PRESET/DELETED', { name });
    
    return true;
  } catch (error) {
    console.error('Failed to delete preset:', error);
    emit('PRESET/DELETE_FAILED', { name, error: error.message });
    return false;
  }
}