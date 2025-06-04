// js/state.js
const State = (() => {
  const listeners = new Set();
  let state = { bpm: 120, channels: [], playing: false, currentStep: 0 };
  
  // Store the previous state to pass to listeners
  let prevState = { ...state }; // Initialize prevState

  const emit = () => {
    listeners.forEach(l => l(state, prevState)); // Pass current and previous state
    prevState = { ...state }; // Update prevState for the next emit
  };

  return {
    get: () => state,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    update: (patch) => {
      // prevState is already set from the last emit or initialization
      state = { ...state, ...patch };
      emit();
    },
    updateChannel: (i, patch) => {
      // prevState is already set
      const newChannels = [...state.channels]; // Create a new array for channels
      newChannels[i] = { ...state.channels[i], ...patch };
      state = { ...state, channels: newChannels }; // Update state with the new channels array
      emit();
    },
    addChannel: (ch) => {
      // prevState is already set
      state = { ...state, channels: [...state.channels, ch] }; // Create new channels array
      emit();
    }
  };
})();
export default State;