// js/multiSequenceSaveLoad.js

/**
 * Multi-Sequence Save/Load Extension
 * 
 * Extends the existing save/load functionality to handle multi-sequence projects
 * while maintaining backward compatibility with single-sequence files.
 */

import SequenceManager from './sequenceManager.js';

const MultiSequenceSaveLoad = (() => {
  
  // Enhanced save functionality for multi-sequence projects
  const saveMultiSequenceProject = () => {
    try {
      const multiSequenceData = SequenceManager.exportAllSequences();
      const currentSequence = SequenceManager.getCurrentSequence();
      
      // Use current sequence name as base filename, or fallback
      const baseFilename = currentSequence.name || 'Multi-Sequence-Project';
      const filename = sanitizeFilename(baseFilename) + '_multi.json';
      
      const blob = new Blob([JSON.stringify(multiSequenceData, null, 2)], { 
        type: 'application/json' 
      });
      
      downloadFile(blob, filename);
      return true;
    } catch (error) {
      console.error('Error saving multi-sequence project:', error);
      return false;
    }
  };
  
  // Save individual sequence (backward compatible)
  const saveSingleSequence = (sequenceIndex = null) => {
    try {
      const targetIndex = sequenceIndex !== null ? sequenceIndex : SequenceManager.currentIndex;
      const sequences = SequenceManager.getSequencesInfo();
      
      if (targetIndex < 0 || targetIndex >= sequences.length) {
        throw new Error('Invalid sequence index');
      }
      
      // Get the sequence data in single-sequence format
      const sequenceData = SequenceManager._getSequences()[targetIndex];
      const singleSequenceData = {
        ...sequenceData.data,
        // Remove non-serializable properties from channels
        channels: sequenceData.data.channels.map(ch => {
          const { buffer, reversedBuffer, activePlaybackScheduledTime, 
                  activePlaybackDuration, activePlaybackTrimStart, 
                  activePlaybackTrimEnd, activePlaybackReversed, ...rest } = ch;
          return { ...rest, imageData: rest.imageData || null };
        })
      };
      
      const filename = sanitizeFilename(sequenceData.name || 'Sequence') + '.json';
      const blob = new Blob([JSON.stringify(singleSequenceData, null, 2)], { 
        type: 'application/json' 
      });
      
      downloadFile(blob, filename);
      return true;
    } catch (error) {
      console.error('Error saving single sequence:', error);
      return false;
    }
  };
  
  // Enhanced load functionality that detects file type
  const loadProject = async (file) => {
    try {
      const jsonString = await file.text();
      const projectData = JSON.parse(jsonString);
      
      // Detect if this is a multi-sequence or single-sequence file
      if (isMultiSequenceFile(projectData)) {
        return await loadMultiSequenceProject(projectData, file.name);
      } else {
        return await loadSingleSequenceProject(projectData, file.name);
      }
    } catch (error) {
      console.error('Error loading project:', error);
      throw new Error(`Failed to load project: ${error.message}`);
    }
  };
  
  // Load multi-sequence project
  const loadMultiSequenceProject = async (projectData, filename) => {
    try {
      const success = SequenceManager.importSequences(projectData);
      if (success) {
        console.log(`Multi-sequence project loaded from ${filename}`);
        return { type: 'multi-sequence', sequenceCount: projectData.sequences.length };
      } else {
        throw new Error('Failed to import sequences');
      }
    } catch (error) {
      console.error('Error loading multi-sequence project:', error);
      throw error;
    }
  };
  
  // Load single-sequence project (convert to multi-sequence)
  const loadSingleSequenceProject = async (projectData, filename) => {
    try {
      // Import as single sequence (will be converted to multi-sequence format)
      const success = SequenceManager.importSequences(projectData);
      if (success) {
        console.log(`Single-sequence project loaded from ${filename} and converted to multi-sequence`);
        return { type: 'single-sequence-converted', sequenceCount: 1 };
      } else {
        throw new Error('Failed to import single sequence');
      }
    } catch (error) {
      console.error('Error loading single-sequence project:', error);
      throw error;
    }
  };
  
  // Check if a project file is multi-sequence format
  const isMultiSequenceFile = (data) => {
    return data.type === 'multi-sequence' && 
           Array.isArray(data.sequences) && 
           data.version;
  };
  
  // Load preset with multi-sequence awareness
  const loadPreset = async (presetPath, presetName) => {
    try {
      const response = await fetch(presetPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch preset: ${response.statusText}`);
      }
      
      const projectData = await response.json();
      
      // Presets are typically single-sequence, so import as single sequence
      const success = SequenceManager.importSequences(projectData);
      if (success) {
        console.log(`Preset "${presetName}" loaded successfully`);
        return { type: 'preset', name: presetName };
      } else {
        throw new Error('Failed to import preset');
      }
    } catch (error) {
      console.error('Error loading preset:', error);
      throw error;
    }
  };
  
  // Export individual sequence for sharing
  const exportSequence = (sequenceIndex, format = 'json') => {
    try {
      const sequences = SequenceManager._getSequences();
      if (sequenceIndex < 0 || sequenceIndex >= sequences.length) {
        throw new Error('Invalid sequence index');
      }
      
      const sequence = sequences[sequenceIndex];
      
      if (format === 'json') {
        return saveSingleSequence(sequenceIndex);
      }
      
      // Future: Could add other export formats (MIDI, etc.)
      throw new Error(`Unsupported export format: ${format}`);
    } catch (error) {
      console.error('Error exporting sequence:', error);
      return false;
    }
  };
  
  // Import sequence and add to current project
  const importSequence = async (file) => {
    try {
      const jsonString = await file.text();
      const sequenceData = JSON.parse(jsonString);
      
      // Ensure it's a valid single sequence
      if (isMultiSequenceFile(sequenceData)) {
        throw new Error('Cannot import multi-sequence file as single sequence');
      }
      
      // Add as new sequence
      const sequenceName = sequenceData.projectName || file.name.replace('.json', '');
      const success = SequenceManager.addSequence(sequenceName, false);
      
      if (success) {
        // Replace the newly created sequence data with imported data
        const currentIndex = SequenceManager.currentIndex;
        const sequences = SequenceManager._getSequences();
        sequences[currentIndex].data = sequenceData;
        
        // Reload current sequence to reflect changes
        SequenceManager.switchToSequence(currentIndex);
        
        return { success: true, name: sequenceName };
      } else {
        throw new Error('Failed to add new sequence');
      }
    } catch (error) {
      console.error('Error importing sequence:', error);
      throw error;
    }
  };
  
  // Utility function to sanitize filenames
  const sanitizeFilename = (name) => {
    return name.replace(/[^a-z0-9\-_\.]/gi, '_').replace(/_{2,}/g, '_');
  };
  
  // Utility function to download files
  const downloadFile = (blob, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };
  
  // Get save options for UI
  const getSaveOptions = () => {
    const sequenceInfo = SequenceManager.getSequencesInfo();
    return {
      canSaveMultiSequence: sequenceInfo.length > 1,
      canSaveSingleSequence: sequenceInfo.length > 0,
      currentSequenceName: sequenceInfo.find(s => s.isCurrent)?.name || 'Current Sequence',
      totalSequences: sequenceInfo.length
    };
  };
  
  // Create enhanced save dialog
  const showSaveDialog = () => {
    const options = getSaveOptions();
    
    const modal = createSaveModal(options);
    document.body.appendChild(modal);
    
    return new Promise((resolve) => {
      modal.addEventListener('save-complete', (e) => {
        resolve(e.detail);
        modal.remove();
      });
      
      modal.addEventListener('save-cancelled', () => {
        resolve(null);
        modal.remove();
      });
    });
  };
  
  // Create save modal dialog
  const createSaveModal = (options) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: var(--color-bg-dark, #2a2a2a);
      border: 1px solid var(--color-border, #555);
      border-radius: 6px;
      padding: 20px;
      min-width: 400px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      color: var(--color-text, #fff);
    `;
    
    modal.innerHTML = `
      <h3 style="margin: 0 0 20px 0; font-size: 18px;">Save Project</h3>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 12px;">
          <input type="radio" name="save-type" value="multi" ${options.canSaveMultiSequence ? 'checked' : 'disabled'}>
          <strong>Save Multi-Sequence Project</strong>
          <div style="font-size: 12px; color: #999; margin-left: 20px;">
            Save all ${options.totalSequences} sequences in one file
          </div>
        </label>
        
        <label style="display: block; margin-bottom: 12px;">
          <input type="radio" name="save-type" value="single" ${!options.canSaveMultiSequence ? 'checked' : ''}>
          <strong>Save Current Sequence Only</strong>
          <div style="font-size: 12px; color: #999; margin-left: 20px;">
            Save "${options.currentSequenceName}" as individual file
          </div>
        </label>
      </div>
      
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="save-cancel-btn" style="padding: 8px 16px; border: 1px solid #555; background: #444; color: #fff; border-radius: 3px; cursor: pointer;">
          Cancel
        </button>
        <button id="save-confirm-btn" style="padding: 8px 16px; border: 1px solid #007acc; background: #007acc; color: #fff; border-radius: 3px; cursor: pointer;">
          Save
        </button>
      </div>
    `;
    
    const cancelBtn = modal.querySelector('#save-cancel-btn');
    const confirmBtn = modal.querySelector('#save-confirm-btn');
    const radioButtons = modal.querySelectorAll('input[name="save-type"]');
    
    cancelBtn.addEventListener('click', () => {
      overlay.dispatchEvent(new CustomEvent('save-cancelled'));
    });
    
    confirmBtn.addEventListener('click', () => {
      const selectedType = modal.querySelector('input[name="save-type"]:checked').value;
      
      let result;
      if (selectedType === 'multi') {
        result = saveMultiSequenceProject();
      } else {
        result = saveSingleSequence();
      }
      
      overlay.dispatchEvent(new CustomEvent('save-complete', { 
        detail: { type: selectedType, success: result } 
      }));
    });
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.dispatchEvent(new CustomEvent('save-cancelled'));
      }
    });
    
    overlay.appendChild(modal);
    return overlay;
  };
  
  // Public API
  return {
    // Main save/load functions
    saveMultiSequenceProject,
    saveSingleSequence,
    loadProject,
    loadPreset,
    
    // Individual sequence import/export
    exportSequence,
    importSequence,
    
    // UI helpers
    showSaveDialog,
    getSaveOptions,
    
    // Utilities
    isMultiSequenceFile,
    sanitizeFilename
  };
})();

export default MultiSequenceSaveLoad;

