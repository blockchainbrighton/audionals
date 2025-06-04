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
  const listeners = new Set();
  let state = { 
    projectName: getDefaultProjectName(), // Initialize with default name
    bpm: 120, 
    channels: [], 
    playing: false, 
    currentStep: 0 
  };
  
  let prevState = { ...state }; 

  const emit = () => {
    listeners.forEach(l => l(state, prevState));
    prevState = { ...state }; 
  };

  return {
    get: () => state,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    update: (patch) => {
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