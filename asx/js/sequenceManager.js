// js/sequenceManager.js (Refactored for Global Channel Names)
import State from './state.js';
import { rehydrateAllChannelBuffers } from './utils.js';
import { makeChannel } from './app_multisequence.js'; // Assuming makeChannel(index) creates a base channel object

const SequenceManager = (() => {
  let sequences = [], currentSequenceIndex = 0, maxSequences = 128;
  let globalChannelNames = []; // NEW: Store global channel names
  const listeners = new Set();

  const DEFAULT_CHANNEL_COUNT = 16; // Default number of channels if not otherwise specified

  // --- Shared helpers ---
  const now = () => Date.now();
  const warn = (msg, ...a) => (console.warn(msg, ...a), false);
  const validateIndex = i => i >= 0 && i < sequences.length;
  const generateId = () => `seq_${now()}_${Math.random().toString(36).slice(2,9)}`;
  // Placeholder for getDefaultProjectName if not available globally via import
  const getDefaultProjectName = () => 'My Project';


  // --- Global Channel Name Management ---
  const initializeGlobalChannelNames = (count, namesToUse = null) => {
    const numChannels = count > 0 ? count : DEFAULT_CHANNEL_COUNT;
    const newGlobalNames = [];
    for (let i = 0; i < numChannels; i++) {
      let name = `Channel ${i + 1}`;
      if (namesToUse && i < namesToUse.length && typeof namesToUse[i] === 'string' && namesToUse[i].trim()) {
        name = namesToUse[i].trim();
      }
      newGlobalNames.push(name);
    }
    globalChannelNames = newGlobalNames;
  };

  const applyGlobalChannelNamesToSequenceData = (sequenceData) => {
    if (sequenceData && sequenceData.channels && Array.isArray(sequenceData.channels)) {
      sequenceData.channels.forEach((channel, index) => {
        if (channel && index < globalChannelNames.length) { // Check against globalChannelNames length
          channel.name = globalChannelNames[index];
        } else if (channel) {
          // Fallback if globalChannelNames is somehow shorter (should not happen with consistent channel counts)
          channel.name = channel.name || `Channel ${index + 1}`;
        }
      });
      // Ensure sequenceData.channels length matches globalChannelNames.length if desynced
      // This is a more complex operation (add/remove channels) and is out of scope for just naming.
      // Assumes channel counts are kept consistent by other logic.
    }
  };

  const synchronizeAllSequenceChannelNames = () => {
    sequences.forEach(seq => {
      applyGlobalChannelNamesToSequenceData(seq.data);
    });
    
    const currentSeq = sequences[currentSequenceIndex];
    if (currentSeq && currentSeq.data && currentSeq.data.channels) {
        // Update State with the channels (which now have global names)
        // Pass a new array of new channel objects for reactivity
        State.update({ channels: currentSeq.data.channels.map(ch => ({...ch})) });
    }
  };

  const blankData = () => {
    const currentGlobalState = State.get();
    const channelCount = globalChannelNames.length > 0 ? globalChannelNames.length : (currentGlobalState.channels?.length || DEFAULT_CHANNEL_COUNT);

    return {
      projectName: currentGlobalState.projectName,
      bpm: currentGlobalState.bpm,
      channels: Array.from({ length: channelCount }, (_, k) => {
        const {
          steps: _steps, src: _src, imageData: _imageData, name: _name,
          buffer, reversedBuffer, activePlaybackScheduledTime, activePlaybackDuration,
          activePlaybackTrimStart, activePlaybackTrimEnd, activePlaybackReversed,
          ...restOfMakeChannel 
        } = makeChannel(k);

        return {
          ...restOfMakeChannel,
          name: globalChannelNames[k] || `Channel ${k + 1}`,
          steps: Array(64).fill(false),
          src: null,
          imageData: null,
        };
      }),
      playing: false,
      currentStep: 0,
      playbackMode: currentGlobalState.playbackMode
    };
  };

  const emit = () => listeners.forEach(cb => { try { cb({
    sequences: sequences.map((s, i) => ({ id: s.id, name: s.name, index: i, created: s.created, modified: s.modified, isCurrent: i === currentSequenceIndex })),
    currentIndex: currentSequenceIndex,
    currentSequence: sequences[currentSequenceIndex] || (sequences.length > 0 ? sequences[0] : undefined),
    maxSequences
  }); } catch(e) { console.error('Error in sequence manager listener:', e); } });
  
  const saveCurrent = () => {
    if (sequences.length > 0 && validateIndex(currentSequenceIndex)) {
        const globalStateSnapshot = State.get();
        sequences[currentSequenceIndex].data = { 
            ...globalStateSnapshot,
            // Ensure channels are a deep enough copy, and names are correct (though they should be)
            channels: globalStateSnapshot.channels.map(ch => ({...ch}))
        };
        sequences[currentSequenceIndex].modified = now();
    }
  };

  // --- Core API ---
  const init = () => {
    const initialGlobalState = State.get();
    const initialChannelCount = initialGlobalState.channels?.length || DEFAULT_CHANNEL_COUNT;

    // Initialize globalChannelNames ONLY if they haven't been populated yet (e.g., by an import call before init)
    if (globalChannelNames.length === 0) {
        const namesFromInitialState = initialGlobalState.channels?.map(ch => ch.name).filter(name => typeof name === 'string' && name.trim());
        initializeGlobalChannelNames(initialChannelCount, (namesFromInitialState?.length === initialChannelCount) ? namesFromInitialState : null);
    }

    if (sequences.length === 0) {
        const newSeqData = { ...initialGlobalState };
        applyGlobalChannelNamesToSequenceData(newSeqData); // Ensure its channels use global names

        sequences.push({ 
            id: generateId(), 
            name: 'Sequence 1', 
            data: newSeqData,
            created: now(), 
            modified: now() 
        });
        currentSequenceIndex = 0;
    }
    
    // Ensure all sequences (freshly created or from a prior import) and State are synced with globalChannelNames
    synchronizeAllSequenceChannelNames();
    emit();
  };

  const getCurrentSequence = () => {
    // If accessed early, ensure init has run. This guard helps if other modules access SM before app fully bootstraps.
    if (sequences.length === 0 && globalChannelNames.length === 0) {
        init();
    }
    return sequences[currentSequenceIndex] || (sequences.length > 0 ? sequences[0] : null);
  };
  const getSequencesInfo = () => sequences.map((s, i) => ({ id: s.id, name: s.name, index: i, created: s.created, modified: s.modified, isCurrent: i === currentSequenceIndex }));

  const switchToSequence = async i => {
    if (!validateIndex(i)) return warn('Invalid sequence index:', i);
    saveCurrent(); 
    
    currentSequenceIndex = i;
    const newSequenceData = sequences[i].data;
    // newSequenceData.channels should already have global names due to synchronization.

    State.update({
      projectName: newSequenceData.projectName,
      bpm: newSequenceData.bpm,
      channels: newSequenceData.channels.map(ch => ({...ch})), // Pass copy to State
      // playbackMode: newSequenceData.playbackMode (handled by original logic)
    });

    await rehydrateAllChannelBuffers(newSequenceData.channels);
    emit();
    return true;
  };

  const addSequence = async (name, copyFromCurrent = false) => {
    if (sequences.length >= maxSequences) return warn('Maximum number of sequences reached:', maxSequences);
    saveCurrent(); 
    
    let newSequenceData;
    if (copyFromCurrent) {
        const currentGlobalState = State.get();
        newSequenceData = { 
            ...currentGlobalState, 
            channels: currentGlobalState.channels.map(ch => ({
                ...ch, 
                steps: ch.steps ? [...ch.steps] : Array(64).fill(false) // Deep copy steps
            }))
        }; // Names are already global from State.get()
    } else {
        newSequenceData = blankData(); // blankData now uses globalChannelNames
    }

    sequences.push({
      id: generateId(),
      name: name || `Sequence ${sequences.length + 1}`,
      data: newSequenceData,
      created: now(),
      modified: now()
    });
    
    currentSequenceIndex = sequences.length - 1;
    const currentSeqData = sequences.at(-1).data;
    State.update({ 
        ...currentSeqData,
        channels: currentSeqData.channels.map(ch => ({...ch})) // Pass copy
    }); 
    
    await rehydrateAllChannelBuffers(currentSeqData.channels);
    emit();
    return true;
  };

  const removeSequence = async i => {
    if (sequences.length <= 1) return warn('Cannot remove the last sequence');
    if (!validateIndex(i)) return warn('Invalid sequence index for removal:', i);
    
    sequences.splice(i,1);
    currentSequenceIndex = Math.max(0, Math.min(currentSequenceIndex, sequences.length - 1));
    
    const currentSeqData = sequences[currentSequenceIndex].data;
    State.update({ 
        ...currentSeqData,
        channels: currentSeqData.channels.map(ch => ({...ch})) // Pass copy
    }); 
    await rehydrateAllChannelBuffers(currentSeqData.channels);
    emit();
    return true;
  };

  const renameSequence = (i, newName) => { // Renames the SEQUENCE, not channels
    if (!validateIndex(i)) return warn('Invalid sequence index for rename:', i);
    sequences[i].name = newName;
    sequences[i].modified = now();
    emit();
    return true;
  };

  const duplicateSequence = async i => {
    if (sequences.length >= maxSequences) return warn('Maximum number of sequences reached:', maxSequences);
    if (!validateIndex(i)) return warn('Invalid sequence index for duplication:', i);
    
    saveCurrent(); // Ensure current sequence data is up-to-date if duplicating current
    const sourceSequenceData = sequences[i].data;

    const newSequenceData = {
        ...sourceSequenceData,
        channels: sourceSequenceData.channels.map(ch => ({
            ...ch,
            steps: ch.steps ? [...ch.steps] : Array(64).fill(false) // Deep copy steps
        }))
    }; // Channel names are already global.

    sequences.push({
      id: generateId(),
      name: sequences[i].name + ' Copy',
      data: newSequenceData,
      created: now(),
      modified: now()
    });
    emit();
    return true;
  };

  const importSequences = async data => {
    try {
      const currentGlobalPlaybackMode = State.get().playbackMode;
      const existingGlobalProjectName = State.get().projectName;
      let importedProjectName;
      let tempRawSequences = []; // To hold {name, data (raw), id, created, modified}

      // 1. Establish globalChannelNames from import data or defaults
      if (data.globalChannelNames && Array.isArray(data.globalChannelNames) && data.globalChannelNames.length > 0) {
        initializeGlobalChannelNames(data.globalChannelNames.length, data.globalChannelNames);
      } else {
        let firstSeqChannels = null;
        if (data.type === 'multi-sequence' && data.sequences?.[0]?.data?.channels) {
            firstSeqChannels = data.sequences[0].data.channels;
        } else if (!data.type && data.channels) { // Single sequence old format (data IS the project state)
            firstSeqChannels = data.channels;
        }
        const derivedChannelCount = firstSeqChannels?.length || globalChannelNames.length || DEFAULT_CHANNEL_COUNT;
        const namesFromFirstSeq = firstSeqChannels?.map(ch => ch.name);
        initializeGlobalChannelNames(derivedChannelCount, namesFromFirstSeq);
      }

      // 2. Prepare sequence structures from import data (without final name sync yet)
      if (data.type === 'multi-sequence' && Array.isArray(data.sequences)) {
        tempRawSequences = data.sequences.map(seq => ({
          id: seq.id || generateId(),
          name: seq.name || 'Imported Sequence',
          data: { // Deep copy essential parts like channels and steps
            ...seq.data,
            channels: (seq.data.channels || []).map(ch => ({
                ...ch,
                steps: ch.steps ? [...ch.steps] : Array(64).fill(false)
            }))
          },
          created: seq.created || now(),
          modified: seq.modified || now()
        }));
        currentSequenceIndex = Math.max(0, Math.min(data.currentSequenceIndex ?? 0, tempRawSequences.length - 1));
        maxSequences = data.maxSequences ?? 128;
        importedProjectName = tempRawSequences[currentSequenceIndex]?.data?.projectName || existingGlobalProjectName;
      } else { // Single sequence project (old format)
        importedProjectName = data.projectName || getDefaultProjectName();
        tempRawSequences = [{
          id: generateId(),
          name: data.name || 'Sequence 1', // Use original name if it was a named single sequence
          data: {
            ...data, // bpm, etc.
            channels: (data.channels || []).map(ch => ({ // Deep copy channels/steps
                ...ch,
                steps: ch.steps ? [...ch.steps] : Array(64).fill(false)
            })),
            projectName: importedProjectName 
          },
          created: now(),
          modified: now()
        }];
        currentSequenceIndex = 0;
      }
      sequences = tempRawSequences;

      // 3. Synchronize all imported sequences' channel names with globalChannelNames
      // This also updates State for the current sequence.
      synchronizeAllSequenceChannelNames(); 

      // 4. Finalize state update for the new current sequence
      if (sequences.length > 0) {
        const newCurrentSeqData = sequences[currentSequenceIndex].data; // Data now has globally named channels
        State.update({ 
            ...newCurrentSeqData, // This loads BPM, globally-named channels etc.
            projectName: importedProjectName,
            playbackMode: newCurrentSeqData.playbackMode || currentGlobalPlaybackMode,
            // playing/currentStep are intentionally not loaded from sequence data to maintain continuity if playing.
        });
        await rehydrateAllChannelBuffers(newCurrentSeqData.channels);
      } else {
        const defaultPName = getDefaultProjectName();
        initializeGlobalChannelNames(DEFAULT_CHANNEL_COUNT); // Reset global names to default
        const blankSeqData = blankData(); // Uses new global names
        sequences.push({ id: generateId(), name: 'Sequence 1', data: { ...blankSeqData, projectName: defaultPName }, created: now(), modified: now()});
        currentSequenceIndex = 0;
        State.update({...sequences[0].data, projectName: defaultPName, channels: sequences[0].data.channels.map(ch => ({...ch})) });
        await rehydrateAllChannelBuffers(sequences[0].data.channels);
      }
      emit();
      return true;
    } catch (e) { console.error('Error importing sequences:', e); return false; }
  };

  const exportAllSequences = () => {
    saveCurrent(); 
    return {
        version: '1.1', // Incremented due to globalChannelNames
        type: 'multi-sequence',
        globalChannelNames: [...globalChannelNames], 
        sequences: sequences.map(seq => ({
          id: seq.id,
          name: seq.name,
          created: seq.created,
          modified: seq.modified,
          data: { // Deep copy data for export
            ...seq.data,
            channels: seq.data.channels.map(ch => ({
                ...ch,
                steps: ch.steps ? [...ch.steps] : Array(64).fill(false)
            }))
          }
        })),
        currentSequenceIndex,
        maxSequences
    };
  };
  
  const updateGlobalChannelName = (channelIndex, newName) => {
    if (channelIndex < 0 || channelIndex >= globalChannelNames.length) {
      return warn('Invalid channel index for renaming:', channelIndex, 'Max index:', globalChannelNames.length - 1);
    }
    const trimmedName = typeof newName === 'string' ? newName.trim() : '';
    if (trimmedName === '') {
        return warn('New channel name cannot be empty.');
    }

    globalChannelNames[channelIndex] = trimmedName;
    synchronizeAllSequenceChannelNames(); // Propagates to all sequences and updates State's current channels
    emit(); // Notify listeners (e.g., UI for sequence list) as State change might not cover all SM listeners
    return true;
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
    updateGlobalChannelName, // Exposed new function
    getGlobalChannelNames: () => [...globalChannelNames], // Getter for global names (returns a copy)
    get currentIndex() { return currentSequenceIndex; },
    get sequenceCount() { return sequences.length; },
    get maxSequences() { return maxSequences; },
    // _getSequences: () => sequences // Expose for specific internal/debug needs if necessary
  };
})();

export default SequenceManager;