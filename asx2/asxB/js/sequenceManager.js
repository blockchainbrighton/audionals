// js/sequenceManager.js

/**
 * Multi-Sequence Manager
 * 
 * This module manages multiple sequences/patterns while maintaining compatibility
 * with the existing single-sequence state system. It acts as a layer above the
 * current State module, allowing users to switch between different sequences.
 */

import State from './state.js';

const SequenceManager = (() => {
  // Internal state for managing multiple sequences
  let sequences = [];
  let currentSequenceIndex = 0;
  let maxSequences = 8; // Default maximum number of sequences
  
  // Listeners for sequence changes
  const listeners = new Set();
  
  // Initialize with a default sequence
  const init = () => {
    if (sequences.length === 0) {
      // Create first sequence from current state or default
      const currentState = State.get();
      sequences.push({
        id: generateSequenceId(),
        name: 'Sequence 1',
        data: { ...currentState },
        created: Date.now(),
        modified: Date.now()
      });
    }
  };
  
  // Generate unique sequence ID
  const generateSequenceId = () => {
    return 'seq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };
  
  // Get current sequence info
  const getCurrentSequence = () => {
    if (sequences.length === 0) init();
    return sequences[currentSequenceIndex] || sequences[0];
  };
  
  // Get all sequences metadata (without full data)
  const getSequencesInfo = () => {
    return sequences.map((seq, index) => ({
      id: seq.id,
      name: seq.name,
      index,
      created: seq.created,
      modified: seq.modified,
      isCurrent: index === currentSequenceIndex
    }));
  };
  
  // Switch to a different sequence
  const switchToSequence = (index) => {
    if (index < 0 || index >= sequences.length) {
      console.warn('Invalid sequence index:', index);
      return false;
    }
    
    // Save current state to current sequence before switching
    saveCurrentStateToSequence();
    
    // Switch to new sequence
    currentSequenceIndex = index;
    const targetSequence = sequences[currentSequenceIndex];
    
    // Load the target sequence data into State
    State.update(targetSequence.data);
    
    // Notify listeners
    emit();
    
    return true;
  };
  
  // Save current State to the current sequence
  const saveCurrentStateToSequence = () => {
    if (sequences.length === 0) init();
    
    const currentState = State.get();
    sequences[currentSequenceIndex] = {
      ...sequences[currentSequenceIndex],
      data: { ...currentState },
      modified: Date.now()
    };
  };
  
  // Add a new sequence
  const addSequence = (name = null, copyFromCurrent = false) => {
    if (sequences.length >= maxSequences) {
      console.warn('Maximum number of sequences reached:', maxSequences);
      return false;
    }
    
    // Save current state before adding new sequence
    saveCurrentStateToSequence();
    
    let newSequenceData;
    if (copyFromCurrent) {
      newSequenceData = { ...State.get() };
    } else {
      // Create blank sequence with same structure
      newSequenceData = createBlankSequenceData();
    }
    
    const newSequence = {
      id: generateSequenceId(),
      name: name || `Sequence ${sequences.length + 1}`,
      data: newSequenceData,
      created: Date.now(),
      modified: Date.now()
    };
    
    sequences.push(newSequence);
    
    // Switch to the new sequence
    currentSequenceIndex = sequences.length - 1;
    State.update(newSequenceData);
    
    emit();
    return true;
  };
  
  // Remove a sequence
  const removeSequence = (index) => {
    if (sequences.length <= 1) {
      console.warn('Cannot remove the last sequence');
      return false;
    }
    
    if (index < 0 || index >= sequences.length) {
      console.warn('Invalid sequence index for removal:', index);
      return false;
    }
    
    sequences.splice(index, 1);
    
    // Adjust current index if necessary
    if (currentSequenceIndex >= sequences.length) {
      currentSequenceIndex = sequences.length - 1;
    } else if (currentSequenceIndex > index) {
      currentSequenceIndex--;
    }
    
    // Load current sequence
    State.update(sequences[currentSequenceIndex].data);
    
    emit();
    return true;
  };
  
  // Rename a sequence
  const renameSequence = (index, newName) => {
    if (index < 0 || index >= sequences.length) {
      console.warn('Invalid sequence index for rename:', index);
      return false;
    }
    
    sequences[index] = {
      ...sequences[index],
      name: newName,
      modified: Date.now()
    };
    
    emit();
    return true;
  };
  
  // Duplicate a sequence
  const duplicateSequence = (index) => {
    if (sequences.length >= maxSequences) {
      console.warn('Maximum number of sequences reached:', maxSequences);
      return false;
    }
    
    if (index < 0 || index >= sequences.length) {
      console.warn('Invalid sequence index for duplication:', index);
      return false;
    }
    
    const sourceSequence = sequences[index];
    const newSequence = {
      id: generateSequenceId(),
      name: sourceSequence.name + ' Copy',
      data: { ...sourceSequence.data },
      created: Date.now(),
      modified: Date.now()
    };
    
    sequences.push(newSequence);
    emit();
    return true;
  };
  
  // Create blank sequence data with same structure as current
  const createBlankSequenceData = () => {
    const currentState = State.get();
    return {
      projectName: 'New Sequence',
      bpm: currentState.bpm || 120,
      channels: currentState.channels.map((ch, i) => ({
        name: `Channel ${i + 1}`,
        steps: Array(64).fill(false),
        src: null,
        volume: 0.8,
        mute: false,
        solo: false,
        pitch: 0,
        reverse: false,
        trimStart: 0,
        trimEnd: 1,
        hpfCutoff: 20,
        hpfQ: 0.707,
        lpfCutoff: 20000,
        lpfQ: 0.707,
        eqLowGain: 0,
        eqMidGain: 0,
        eqHighGain: 0,
        fadeInTime: 0,
        fadeOutTime: 0,
        imageData: null
      })),
      playing: false,
      currentStep: 0
    };
  };
  
  // Export all sequences for saving
  const exportAllSequences = () => {
    // Save current state first
    saveCurrentStateToSequence();
    
    return {
      version: '1.0',
      type: 'multi-sequence',
      sequences: sequences.map(seq => ({
        id: seq.id,
        name: seq.name,
        created: seq.created,
        modified: seq.modified,
        data: {
          ...seq.data,
          // Remove non-serializable properties
          channels: seq.data.channels.map(ch => {
            const { buffer, reversedBuffer, activePlaybackScheduledTime, 
                    activePlaybackDuration, activePlaybackTrimStart, 
                    activePlaybackTrimEnd, activePlaybackReversed, ...rest } = ch;
            return { ...rest, imageData: rest.imageData || null };
          })
        }
      })),
      currentSequenceIndex,
      maxSequences
    };
  };
  
  // Import sequences from saved data
  const importSequences = (data) => {
    try {
      if (data.type === 'multi-sequence' && Array.isArray(data.sequences)) {
        // Multi-sequence format
        sequences = data.sequences.map(seq => ({
          id: seq.id || generateSequenceId(),
          name: seq.name || 'Imported Sequence',
          data: seq.data,
          created: seq.created || Date.now(),
          modified: seq.modified || Date.now()
        }));
        
        currentSequenceIndex = Math.min(data.currentSequenceIndex || 0, sequences.length - 1);
        maxSequences = data.maxSequences || 8;
      } else {
        // Single sequence format - convert to multi-sequence
        sequences = [{
          id: generateSequenceId(),
          name: data.projectName || 'Imported Sequence',
          data: data,
          created: Date.now(),
          modified: Date.now()
        }];
        currentSequenceIndex = 0;
      }
      
      // Load current sequence
      if (sequences.length > 0) {
        State.update(sequences[currentSequenceIndex].data);
      }
      
      emit();
      return true;
    } catch (error) {
      console.error('Error importing sequences:', error);
      return false;
    }
  };
  
  // Navigation helpers
  const goToNextSequence = () => {
    const nextIndex = (currentSequenceIndex + 1) % sequences.length;
    return switchToSequence(nextIndex);
  };
  
  const goToPreviousSequence = () => {
    const prevIndex = currentSequenceIndex === 0 ? sequences.length - 1 : currentSequenceIndex - 1;
    return switchToSequence(prevIndex);
  };
  
  // Event system
  const subscribe = (callback) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
  };
  
  const emit = () => {
    const sequenceInfo = {
      sequences: getSequencesInfo(),
      currentIndex: currentSequenceIndex,
      currentSequence: getCurrentSequence(),
      maxSequences
    };
    
    listeners.forEach(callback => {
      try {
        callback(sequenceInfo);
      } catch (error) {
        console.error('Error in sequence manager listener:', error);
      }
    });
  };
  
  // Public API
  return {
    init,
    getCurrentSequence,
    getSequencesInfo,
    switchToSequence,
    addSequence,
    removeSequence,
    renameSequence,
    duplicateSequence,
    exportAllSequences,
    importSequences,
    goToNextSequence,
    goToPreviousSequence,
    subscribe,
    
    // Getters
    get currentIndex() { return currentSequenceIndex; },
    get sequenceCount() { return sequences.length; },
    get maxSequences() { return maxSequences; },
    
    // For debugging
    _getSequences: () => sequences
  };
})();

export default SequenceManager;

