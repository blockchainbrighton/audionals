// js/state.js

// Helper function to generate a default project name
function getDefaultProjectName() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2); // YY
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); // MM
  const day = now.getDate().toString().padStart(2, '0'); // DD
  const hours = now.getHours().toString().padStart(2, '0'); // HH
  const minutes = now.getMinutes().toString().padStart(2, '0'); // MM
  // const seconds = now.getSeconds().toString().padStart(2, '0'); // SS (optional)
  return `Audional Composition ${year}${month}${day}-${hours}${minutes}`;
}

const State = (() => {
  // Store listener entries as { fn: Function, options: Object }
  const listeners = new Set(); 
  let state = { 
    projectName: getDefaultProjectName(), // Initialize with default name
    bpm: 120, 
    channels: [], 
    playing: false, 
    currentStep: 0 
  };
  
  // prevState holds the state *before* the current update cycle that triggers an emit.
  let prevState = { ...state }; 

  // --- UI Update Deferral Logic ---
  const uiUpdateQueue = new Set(); // Stores listener functions (fn) to be deferred
  let uiUpdateScheduled = false;   // True if a requestAnimationFrame is pending for the queue
  
  // This stores the `prevState` relevant for the entire batch of UI updates.
  // It's captured when the first deferred task in a potential rAF batch is queued.
  let _prevStateForCurrentUIBatch = null; 

  const processUIUpdateQueue = () => {
    // IMPORTANT: Grab the latest state at the moment of processing.
    const latestStateSnapshot = state; // Or State.get(), but `state` is in module scope.
    
    // Call each queued UI listener with the latest state and the prevState
    // that was captured *before* this batch of state changes began.
    uiUpdateQueue.forEach(listenerFn => {
      try {
        listenerFn(latestStateSnapshot, _prevStateForCurrentUIBatch); 
      } catch (e) {
        console.error("Error in deferred UI listener:", e, listenerFn);
      }
    });

    uiUpdateQueue.clear();
    uiUpdateScheduled = false;
    _prevStateForCurrentUIBatch = null; // Reset after processing for the next batch
  };
  // --- End UI Update Deferral Logic ---

  const emit = () => {
    // `state` (module scope) is the current, new state.
    // `prevState` (module scope) is the state as it was *before* the .update() call that triggered this emit.
    const currentStateForEmit = state;       // Snapshot of current state for this emit cycle
    const prevStateForEmit = prevState; // Snapshot of previous state for this emit cycle

    let hasAddedToUIQueueThisEmit = false;

    listeners.forEach(listenerEntry => {
      if (listenerEntry.options.defer) {
        uiUpdateQueue.add(listenerEntry.fn);
        hasAddedToUIQueueThisEmit = true;
      } else {
        // Synchronous listener
        try {
          listenerEntry.fn(currentStateForEmit, prevStateForEmit);
        } catch (e) {
          console.error("Error in synchronous listener:", e, listenerEntry.fn);
        }
      }
    });

    // Update the global `prevState` for the *next* cycle of state changes.
    // This must happen after all synchronous listeners for the current cycle have used the "old" prevState.
    prevState = { ...currentStateForEmit }; 

    // If UI tasks were added in *this* emit:
    if (hasAddedToUIQueueThisEmit) {
      // And if no rAF is scheduled yet for the *current batch* of UI updates:
      if (!uiUpdateScheduled) {
        uiUpdateScheduled = true;
        // Capture the `prevStateForEmit`. This becomes the consistent "previous state"
        // for all UI updates processed in the upcoming rAF.
        // This is done only once per rAF batch.
        _prevStateForCurrentUIBatch = prevStateForEmit; 
        requestAnimationFrame(processUIUpdateQueue);
      }
      // If uiUpdateScheduled was already true, new deferred listeners are simply added
      // to the existing queue. They will use the _prevStateForCurrentUIBatch already captured.
    }
  };

  return {
    get: () => state,
    /**
     * Subscribe to state changes.
     * @param {function} fn - The listener function, called with (newState, prevState).
     * @param {object} [options={}] - Options for the subscription.
     * @param {boolean} [options.defer=false] - If true, the listener call will be deferred using requestAnimationFrame.
     */
    subscribe: (fn, options = {}) => {
      const listenerEntry = { fn, options };
      listeners.add(listenerEntry);
      // Return an unsubscribe function
      return () => listeners.delete(listenerEntry);
    },
    update: (patch) => {
      // `prevState` (module scope) is correct here for the upcoming `emit`.
      // It reflects the state *before* this 'patch' is applied.
      state = { ...state, ...patch };
      emit();
    },
    updateChannel: (i, patch) => {
      const newChannels = [...state.channels]; 
      newChannels[i] = { ...state.channels[i], ...patch };
      state = { ...state, channels: newChannels }; 
      emit();
    },
    addChannel: (ch) => {
      state = { ...state, channels: [...state.channels, ch] }; 
      emit();
    }
  };
})();
export default State;