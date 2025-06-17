
// js/sequenceManager.js (2025 Refactor: Minimal, DRY, Drop-in)
import State from './state.js';
import { rehydrateAllChannelBuffers } from './utils.js';

const SequenceManager = (() => {
  let sequences = [], currentSequenceIndex = 0, maxSequences = 8;
  const listeners = new Set();

  // --- Shared helpers ---
  const now = () => Date.now();
  const warn = (msg, ...a) => (console.warn(msg, ...a), false);
  const validateIndex = i => i >= 0 && i < sequences.length;
  const generateId = () => `seq_${now()}_${Math.random().toString(36).slice(2,9)}`;
  
  // Modified blankData to not carry over playing/currentStep from current global state
  // It should represent a truly blank sequence state for those fields.
  const blankData = () => {
    const currentGlobalState = State.get();
    return { 
      ...currentGlobalState, // gets bpm, playbackMode, projectName (if desired)
      channels: currentGlobalState.channels.map(ch => ({ ...ch })), 
      playing: false, // Default for a "blank" sequence data representation
      currentStep: 0  // Default for a "blank" sequence data representation
    };
  };

  const emit = () => listeners.forEach(cb => { try { cb({
    sequences: sequences.map((s, i) => ({ id: s.id, name: s.name, index: i, created: s.created, modified: s.modified, isCurrent: i === currentSequenceIndex })),
    currentIndex: currentSequenceIndex,
    currentSequence: sequences[currentSequenceIndex] || sequences[0],
    maxSequences
  }); } catch(e) { console.error('Error in sequence manager listener:', e); } });
  
  // Save current global state into the sequence data structure
  const saveCurrent = () => {
    if (sequences.length > 0 && validateIndex(currentSequenceIndex)) {
        const globalStateSnapshot = State.get();
        sequences[currentSequenceIndex] = { 
            ...sequences[currentSequenceIndex], 
            data: { ...globalStateSnapshot }, // Save the entire current global state
            modified: now() 
        };
    }
  };


  // --- Core API ---
  const init = () => {
    if (sequences.length === 0) {
        const initialState = State.get(); // Get the initial global state
        sequences.push({ 
            id: generateId(), 
            name: 'Sequence 1', 
            data: { ...initialState }, // Store a copy of the initial global state
            created: now(), 
            modified: now() 
        });
    }
  };

  const getCurrentSequence = () => (sequences.length || init(), sequences[currentSequenceIndex] || sequences[0]);
  const getSequencesInfo = () => sequences.map((s, i) => ({ id: s.id, name: s.name, index: i, created: s.created, modified: s.modified, isCurrent: i === currentSequenceIndex }));

  const switchToSequence = async i => {
    if (!validateIndex(i)) return warn('Invalid sequence index:', i);
    
    saveCurrent(); // Save the current global state (including playing, currentStep) into the outgoing sequence's data
    
    currentSequenceIndex = i;
    const newSequenceData = sequences[i].data;
    const currentGlobalPlayingState = State.get().playing; // Preserve current global playing state
    // const currentGlobalPlaybackMode = State.get().playbackMode; // Preserve current global playback mode
    // currentStep will be reset by the playbackEngine for the new sequence anyway.

    // Update state with new sequence's channels, bpm, name, etc.,
    // but preserve the global `playing` state and let `playbackEngine` handle `currentStep`.
    // Explicitly do NOT load playing/currentStep from sequence data during a continuous switch.
    State.update({
      projectName: newSequenceData.projectName,
      bpm: newSequenceData.bpm,
      channels: newSequenceData.channels, // This is the main part to load
      // playbackMode: newSequenceData.playbackMode || currentGlobalPlaybackMode, // Or always keep global one
      // --- IMPORTANT: Do NOT update 'playing' or 'currentStep' from newSequenceData here ---
      // 'playing' should remain as it is globally.
      // 'currentStep' will be managed by playbackEngine.
    });

    await rehydrateAllChannelBuffers(newSequenceData.channels); // Pass the specific channels to rehydrate
    emit(); // Notify SequenceUI and other listeners about the sequence change
    return true;
  };

  const addSequence = async (name, copyFromCurrent = false) => {
    if (sequences.length >= maxSequences) return warn('Maximum number of sequences reached:', maxSequences);
    
    saveCurrent(); // Save current global state to current sequence data
    
    let newSequenceData;
    if (copyFromCurrent) {
        newSequenceData = { ...State.get() }; // Copy current global state
    } else {
        // Create truly blank data, but keep some global things like project name, playbackMode.
        // `blankData()` needs to be context-aware or State.get() needs to be carefully merged.
        const currentGlobalState = State.get();
        newSequenceData = {
            projectName: currentGlobalState.projectName,
            bpm: currentGlobalState.bpm, // Or a default like 120
            channels: Array.from({ length: currentGlobalState.channels.length || 16 }, (_, k) => { // Use makeChannel
                const { buffer, reversedBuffer, activePlaybackScheduledTime, activePlaybackDuration,
                        activePlaybackTrimStart, activePlaybackTrimEnd, activePlaybackReversed, src, imageData, ...restOfMakeChannel } = makeChannel(k);
                return { ...restOfMakeChannel, steps: Array(64).fill(false), src: null, imageData: null }; // Ensure steps are blank
            }),
            playing: false, // Default for a new sequence's data
            currentStep: 0, // Default for a new sequence's data
            playbackMode: currentGlobalState.playbackMode // Inherit global playback mode
        };
    }

    sequences.push({
      id: generateId(),
      name: name || `Sequence ${sequences.length + 1}`,
      data: newSequenceData,
      created: now(),
      modified: now()
    });
    
    currentSequenceIndex = sequences.length - 1;
    // When adding a new sequence, we update the global state to reflect this new one.
    // Here, it's appropriate to load its 'playing' and 'currentStep' (which should be false/0).
    State.update({ ...sequences.at(-1).data }); 
    
    await rehydrateAllChannelBuffers(sequences.at(-1).data.channels);
    emit();
    return true;
  };

  const removeSequence = async i => {
    if (sequences.length <= 1) return warn('Cannot remove the last sequence');
    if (!validateIndex(i)) return warn('Invalid sequence index for removal:', i);
    
    sequences.splice(i,1);
    currentSequenceIndex = Math.min(currentSequenceIndex, sequences.length - 1);
    
    // Load the state of the new current sequence
    State.update({ ...sequences[currentSequenceIndex].data }); 
    await rehydrateAllChannelBuffers(sequences[currentSequenceIndex].data.channels);
    emit();
    return true;
  };

  const renameSequence = (i, newName) => {
    if (!validateIndex(i)) return warn('Invalid sequence index for rename:', i);
    sequences[i] = { ...sequences[i], name: newName, modified: now() };
    // If renaming the current sequence, update the project name in State if it's tied to sequence name
    if (i === currentSequenceIndex) {
        // This depends on how projectName is handled. If it can be different from seq name, only emit.
        // If State.projectName should reflect current sequence name (if State.projectName was using old name):
        // State.update({ projectName: newName }); // This might be too aggressive.
    }
    emit();
    return true;
  };

  const duplicateSequence = i => {
    if (sequences.length >= maxSequences) return warn('Maximum number of sequences reached:', maxSequences);
    if (!validateIndex(i)) return warn('Invalid sequence index for duplication:', i);
    
    // The sequence being duplicated might be the current one, or another.
    // If it's another one, its `data` is what we want.
    // If it's the current one, its `data` might not yet reflect the latest global State (if saveCurrent wasn't just called).
    // To be safe, if duplicating current, use a fresh snapshot of global state.
    // Otherwise, use the stored data of the sequence at index `i`.
    let dataToDuplicate;
    if (i === currentSequenceIndex) {
        saveCurrent(); // Ensure current sequence data is up-to-date with global state
        dataToDuplicate = { ...sequences[i].data }; // Now it's safe to use
    } else {
        dataToDuplicate = { ...sequences[i].data };
    }

    sequences.push({
      id: generateId(),
      name: sequences[i].name + ' Copy',
      data: dataToDuplicate, // Use the prepared data
      created: now(),
      modified: now()
    });
    emit();
    return true;
  };

  const importSequences = async data => {
    try {
      // Preserve current global playing and currentStep before overwriting sequences
      const wasPlaying = State.get().playing;
      const currentGlobalStepBeforeImport = State.get().currentStep;
      const currentGlobalPlaybackMode = State.get().playbackMode;


      if (data.type === 'multi-sequence' && Array.isArray(data.sequences)) {
        sequences = data.sequences.map(seq => ({
          id: seq.id || generateId(),
          name: seq.name || 'Imported Sequence',
          data: seq.data, // seq.data contains its own 'playing' and 'currentStep'
          created: seq.created || now(),
          modified: seq.modified || now()
        }));
        currentSequenceIndex = Math.min(data.currentSequenceIndex ?? 0, sequences.length - 1);
        maxSequences = data.maxSequences ?? 8;
      } else { // Single sequence project
        sequences = [{
          id: generateId(),
          name: data.projectName || 'Imported Sequence',
          data, // data is the single sequence's state, including its 'playing' and 'currentStep'
          created: now(),
          modified: now()
        }];
        currentSequenceIndex = 0;
      }

      if (sequences.length) {
        const newCurrentSeqData = sequences[currentSequenceIndex].data;
        // When importing, we typically want to load the project as it was saved,
        // including its saved BPM, channels, project name, etc.
        // However, we might want to override the saved 'playing' state if the app was already playing.
        // For simplicity now, load everything from the new sequence data.
        State.update({ 
            ...newCurrentSeqData,
            // Optionally, decide if 'playing' should be preserved or taken from file:
            // playing: wasPlaying, // or newCurrentSeqData.playing
            // currentStep: newCurrentSeqData.playing ? newCurrentSeqData.currentStep : 0, // or currentGlobalStepBeforeImport if wasPlaying
            playbackMode: newCurrentSeqData.playbackMode || currentGlobalPlaybackMode // Prefer file's, fallback to global
        });
        await rehydrateAllChannelBuffers(newCurrentSeqData.channels);
      } else {
        // If import results in no sequences (e.g. invalid file format not caught earlier)
        // reset to a default blank state.
        const blank = blankData(); // This now considers global state for some fields.
        sequences.push({ id: generateId(), name: 'Sequence 1', data: blank, created: now(), modified: now()});
        currentSequenceIndex = 0;
        State.update({...blank});
      }
      emit();
      return true;
    } catch (e) { console.error('Error importing sequences:', e); return false; }
  };


  const exportAllSequences = () => {
    saveCurrent(); // Ensure the currently active global state is saved to its sequence slot
    return {
        version: '1.0',
        type: 'multi-sequence',
        sequences: sequences.map(seq => ({
        id: seq.id,
        name: seq.name,
        created: seq.created,
        modified: seq.modified,
        data: { ...seq.data } 
        })),
        currentSequenceIndex,
        maxSequences
    };
  };
  

  // --- Navigation & Event API ---
  const goToNextSequence = () => switchToSequence((currentSequenceIndex + 1) % sequences.length);
  const goToPreviousSequence = () => switchToSequence(currentSequenceIndex === 0 ? sequences.length - 1 : currentSequenceIndex - 1);
  const subscribe = cb => (listeners.add(cb), () => listeners.delete(cb));

  // --- Public API ---
  return {
    init, getCurrentSequence, getSequencesInfo, switchToSequence,
    addSequence, removeSequence, renameSequence, duplicateSequence,
    exportAllSequences, importSequences, goToNextSequence, goToPreviousSequence, subscribe,
    get currentIndex() { return currentSequenceIndex; },
    get sequenceCount() { return sequences.length; },
    get maxSequences() { return maxSequences; },
    _getSequences: () => sequences // For internal access if absolutely needed (like MultiSequenceSaveLoad)
  };
})();

export default SequenceManager;
