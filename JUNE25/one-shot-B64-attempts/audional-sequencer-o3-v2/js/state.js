const State = (() => {
  const listeners = new Set();
  let state = {
    bpm: 120,
    channels: [],
    playing: false,
    currentStep: 0
  };

  function emit() { listeners.forEach(l => l(state)); }

  return {
    get() { return state; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    update(patch) { state = { ...state, ...patch }; emit(); },
    updateChannel(idx, patch) {
      state.channels[idx] = { ...state.channels[idx], ...patch };
      emit();
    },
    addChannel(channel) {
      state.channels.push(channel);
      emit();
    }
  };
})();

export default State;
