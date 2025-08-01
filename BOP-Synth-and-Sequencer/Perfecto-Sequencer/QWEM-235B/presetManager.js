// presetManager.js
/**
 * @module presetManager
 * Manages local presets using browser localStorage.
 * Saves, loads, lists, and removes named snapshots of the sequencer state.
 * Only stores grid and transport settings (not blockchain or config).
 *
 * Dependencies:
 * - stateManager (getState)
 * - eventBus (emit)
 */

import { getState } from './stateManager.js';
import { emit } from './eventBus.js';

const STORAGE_KEY = 'ordinal-sequencer-presets';
const MAX_PRESETS = 100;

/**
 * Saves current sequencer state as a named preset.
 *
 * @param {Object} options
 * @param {string} options.name - Name of the preset (must be unique)
 * @param {string} [options.description] - Optional description
 * @returns {Promise<void>} Resolves when saved
 *
 * @example
 * await savePreset({ name: 'My Beat', description: 'Basic 808 pattern' });
 */
async function savePreset({ name, description = '' }) {
  if (!name || typeof name !== 'string') {
    throw new Error('Preset name is required and must be a string');
  }

  if (name.trim() === '') {
    throw new Error('Preset name cannot be empty');
  }

  const state = getState();
  const preset = {
    name: name.trim(),
    description,
    timestamp: Date.now(),
    data: {
      grid: state.grid,
      transport: state.transport,
    },
  };

  const presets = await listPresets();
  const existingIndex = presets.findIndex(p => p.name === preset.name);

  if (existingIndex > -1) {
    presets[existingIndex] = preset;
  } else {
    if (presets.length >= MAX_PRESETS) {
      throw new Error(`Maximum number of presets (${MAX_PRESETS}) reached`);
    }
    presets.push(preset);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    emit('PRESET/SAVED', { name: preset.name });
  } catch (error) {
    emit('PRESET/SAVE_ERROR', { name, message: error.message });
    throw error;
  }
}

/**
 * Loads a preset by name into the AppState.
 *
 * @param {Object} options
 * @param {string} options.name - Name of the preset to load
 * @returns {Promise<void>} Resolves when loaded
 *
 * @example
 * await loadPreset({ name: 'My Beat' });
 */
async function loadPreset({ name }) {
  if (!name || typeof name !== 'string') {
    throw new Error('Preset name is required');
  }

  const presets = await listPresets();
  const preset = presets.find(p => p.name === name);

  if (!preset) {
    throw new Error(`Preset "${name}" not found`);
  }

  emit('PRESET/LOADED', { preset: preset.data, name: preset.name });
}

/**
 * Lists all saved presets (metadata only, not full data).
 *
 * @returns {Promise<Array>} Array of preset metadata objects
 *
 * @example
 * const presets = await listPresets();
 * presets.forEach(p => console.log(p.name, p.timestamp));
 */
async function listPresets() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('[presetManager] Failed to parse presets:', error);
    return [];
  }
}

/**
 * Removes a preset by name.
 *
 * @param {Object} options
 * @param {string} options.name - Name of the preset to remove
 * @returns {Promise<void>} Resolves when removed
 *
 * @example
 * await removePreset({ name: 'My Beat' });
 */
async function removePreset({ name }) {
  const presets = await listPresets();
  const filtered = presets.filter(p => p.name !== name);

  if (presets.length === filtered.length) {
    throw new Error(`Preset "${name}" not found`);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    emit('PRESET/REMOVED', { name });
  } catch (error) {
    emit('PRESET/REMOVE_ERROR', { name, message: error.message });
    throw error;
  }
}

/**
 * Clears all presets.
 *
 * @returns {Promise<void>} Resolves when cleared
 */
async function clearPresets() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    emit('PRESET/CLEARED');
  } catch (error) {
    emit('PRESET/CLEAR_ERROR', { message: error.message });
    throw error;
  }
}

export { savePreset, loadPreset, listPresets, removePreset, clearPresets };