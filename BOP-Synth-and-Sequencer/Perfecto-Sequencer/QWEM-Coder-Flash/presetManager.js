/**
 * @typedef {Object} PresetManager
 * @property {Function} savePreset - Save current pattern as a preset
 * @property {Function} loadPreset - Load a preset into the sequencer
 * @property {Function} listPresets - Get list of available presets
 */

/**
 * Preset manager module for saving/loading local presets
 * @param {Function} getState - Function to get current app state
 * @param {Function} dispatch - Function to dispatch actions
 * @param {Function} emit - Function to emit events
 * @returns {PresetManager}
 */
export function presetManager(getState, dispatch, emit) {
    const PRESETS_KEY = 'ordinal_sequencer_presets';
    
    /**
     * Save current pattern as a preset
     * @param {string} presetName - Name for the preset
     * @returns {Promise<void>}
     */
    async function savePreset(presetName) {
      try {
        if (!presetName || typeof presetName !== 'string') {
          throw new Error('Preset name must be a non-empty string');
        }
        
        const state = getState();
        const { grid, transport } = state;
        
        // Prepare preset data
        const presetData = {
          name: presetName,
          version: '1.0',
          timestamp: Date.now(),
          bpm: transport.bpm,
          tracks: grid.tracks,
          stepsPerTrack: grid.stepsPerTrack,
          patternData: grid.patternData,
          // Include other relevant metadata
          meta: {
            appVersion: '1.0.0',
            createdAt: new Date().toISOString()
          }
        };
        
        // Get existing presets
        const existingPresets = getPresetList();
        
        // Check if preset with this name already exists
        const existingIndex = existingPresets.findIndex(p => p.name === presetName);
        if (existingIndex >= 0) {
          // Replace existing preset
          existingPresets[existingIndex] = presetData;
        } else {
          // Add new preset
          existingPresets.push(presetData);
        }
        
        // Save to localStorage
        localStorage.setItem(PRESETS_KEY, JSON.stringify(existingPresets));
        
        // Emit event for UI feedback
        emit('PRESET/SAVED', { presetName, presetData });
        
        return presetData;
      } catch (error) {
        console.error('Failed to save preset:', error);
        emit('PRESET/SAVE_ERROR', { error: error.message, presetName });
        throw error;
      }
    }
  
    /**
     * Load a preset into the sequencer
     * @param {string} presetName - Name of the preset to load
     * @returns {Promise<Object>} Loaded preset data
     */
    async function loadPreset(presetName) {
      try {
        if (!presetName || typeof presetName !== 'string') {
          throw new Error('Preset name must be a non-empty string');
        }
        
        const presets = getPresetList();
        const preset = presets.find(p => p.name === presetName);
        
        if (!preset) {
          throw new Error(`Preset "${presetName}" not found`);
        }
        
        // Reset grid
        dispatch({ type: 'GRID/RESET' });
        
        // Apply pattern data to grid
        for (const [track, steps] of Object.entries(preset.patternData)) {
          for (const [step, isActive] of Object.entries(steps)) {
            if (isActive) {
              dispatch({
                type: 'GRID/STEP_TOGGLED',
                payload: { track: parseInt(track), step: parseInt(step), isActive: true }
              });
            }
          }
        }
        
        // Update BPM
        dispatch({
          type: 'TRANSPORT/SET_BPM',
          payload: { bpm: preset.bpm }
        });
        
        // Emit event for UI feedback
        emit('PRESET/LOADED', { presetName, preset });
        
        return preset;
      } catch (error) {
        console.error('Failed to load preset:', error);
        emit('PRESET/LOAD_ERROR', { error: error.message, presetName });
        throw error;
      }
    }
  
    /**
     * Get list of available presets
     * @returns {Array<Object>} List of preset objects
     */
    function listPresets() {
      return getPresetList();
    }
  
    /**
     * Helper function to get preset list from localStorage
     * @private
     * @returns {Array<Object>} List of presets
     */
    function getPresetList() {
      try {
        const presetsJson = localStorage.getItem(PRESETS_KEY);
        return presetsJson ? JSON.parse(presetsJson) : [];
      } catch (error) {
        console.error('Failed to load presets from localStorage:', error);
        return [];
      }
    }
  
    return {
      savePreset,
      loadPreset,
      listPresets
    };
  }