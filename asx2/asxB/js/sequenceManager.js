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
  const blankData = () => ({ ...State.get(), channels: State.get().channels.map(ch => ({ ...ch })) });
  const emit = () => listeners.forEach(cb => { try { cb({
    sequences: sequences.map((s, i) => ({ id: s.id, name: s.name, index: i, created: s.created, modified: s.modified, isCurrent: i === currentSequenceIndex })),
    currentIndex: currentSequenceIndex,
    currentSequence: sequences[currentSequenceIndex] || sequences[0],
    maxSequences
  }); } catch(e) { console.error('Error in sequence manager listener:', e); } });
  const saveCurrent = () => sequences.length && (sequences[currentSequenceIndex] = { ...sequences[currentSequenceIndex], data: { ...State.get() }, modified: now() });

  // --- Core API ---
  const init = () => sequences.length || sequences.push({ id: generateId(), name: 'Sequence 1', data: { ...State.get() }, created: now(), modified: now() });
  const getCurrentSequence = () => (sequences.length || init(), sequences[currentSequenceIndex] || sequences[0]);
  const getSequencesInfo = () => sequences.map((s, i) => ({ id: s.id, name: s.name, index: i, created: s.created, modified: s.modified, isCurrent: i === currentSequenceIndex }));

  const switchToSequence = async i => validateIndex(i)
    ? (saveCurrent(), currentSequenceIndex = i, State.update(sequences[i].data), await rehydrateAllChannelBuffers(sequences[i].data.channels), emit(), true)
    : warn('Invalid sequence index:', i);

  const addSequence = async (name, copyFromCurrent = false) => sequences.length >= maxSequences
    ? warn('Maximum number of sequences reached:', maxSequences)
    : (saveCurrent(),
       sequences.push({
         id: generateId(),
         name: name || `Sequence ${sequences.length + 1}`,
         data: copyFromCurrent ? { ...State.get() } : blankData(),
         created: now(),
         modified: now()
       }),
       currentSequenceIndex = sequences.length - 1,
       State.update(sequences.at(-1).data),
       await rehydrateAllChannelBuffers(sequences.at(-1).data.channels),
       emit(), true);

  const removeSequence = async i => sequences.length <= 1
    ? warn('Cannot remove the last sequence')
    : !validateIndex(i)
      ? warn('Invalid sequence index for removal:', i)
      : (sequences.splice(i,1),
         currentSequenceIndex = Math.min(currentSequenceIndex, sequences.length - 1),
         State.update(sequences[currentSequenceIndex].data),
         await rehydrateAllChannelBuffers(sequences[currentSequenceIndex].data.channels),
         emit(), true);

  const renameSequence = (i, newName) => !validateIndex(i)
    ? warn('Invalid sequence index for rename:', i)
    : (sequences[i] = { ...sequences[i], name: newName, modified: now() }, emit(), true);

  const duplicateSequence = i => sequences.length >= maxSequences
    ? warn('Maximum number of sequences reached:', maxSequences)
    : !validateIndex(i)
      ? warn('Invalid sequence index for duplication:', i)
      : (sequences.push({
          id: generateId(),
          name: sequences[i].name + ' Copy',
          data: { ...sequences[i].data },
          created: now(),
          modified: now()
        }), emit(), true);

  const importSequences = async data => {
    try {
      if (data.type === 'multi-sequence' && Array.isArray(data.sequences)) {
        sequences = data.sequences.map(seq => ({
          id: seq.id || generateId(),
          name: seq.name || 'Imported Sequence',
          data: seq.data,
          created: seq.created || now(),
          modified: seq.modified || now()
        }));
        currentSequenceIndex = Math.min(data.currentSequenceIndex ?? 0, sequences.length - 1);
        maxSequences = data.maxSequences ?? 8;
      } else {
        sequences = [{
          id: generateId(),
          name: data.projectName || 'Imported Sequence',
          data,
          created: now(),
          modified: now()
        }];
        currentSequenceIndex = 0;
      }
      if (sequences.length) {
        State.update(sequences[currentSequenceIndex].data);
        await rehydrateAllChannelBuffers(sequences[currentSequenceIndex].data.channels);
      }
      emit();
      return true;
    } catch (e) { console.error('Error importing sequences:', e); return false; }
  };

  const exportAllSequences = () => (saveCurrent(), {
    version: '1.0',
    type: 'multi-sequence',
    sequences: sequences.map(seq => ({
      id: seq.id, name: seq.name, created: seq.created, modified: seq.modified,
      data: {
        ...seq.data,
        channels: seq.data.channels.map(ch => {
          const { buffer, reversedBuffer, activePlaybackScheduledTime, activePlaybackDuration,
            activePlaybackTrimStart, activePlaybackTrimEnd, activePlaybackReversed, ...rest } = ch;
          return { ...rest, imageData: rest.imageData ?? null };
        })
      }
    })),
    currentSequenceIndex,
    maxSequences
  });

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
    _getSequences: () => sequences
  };
})();

export default SequenceManager;
