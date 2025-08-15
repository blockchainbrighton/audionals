module.exports = async function ({ assert, assertEqual }) {
  const Store = require('../src/state/Store');
  // Initialise store with initial state
  const store = new Store({ channels: [], patterns: [], bpm: 120 });
  let updates = 0;
  // Subscribe to state changes
  const unsubscribe = store.subscribe(() => {
    updates++;
  });
  // Dispatch addChannel action
  store.dispatch('addChannel', { id: 1 });
  assertEqual(store.getState().channels.length, 1, 'Channel should be added');
  // Dispatch setBpm action
  store.dispatch('setBpm', 150);
  assertEqual(store.getState().bpm, 150, 'BPM should update');
  // Dispatch updatePattern action
  store.dispatch('updatePattern', { channel: 0, pattern: [1, 0, 0, 1] });
  assertEqual(store.getState().patterns[0][0], 1, 'Pattern should update');
  // Ensure subscriber was called for each dispatch
  assertEqual(updates, 3, 'Subscriber should be notified on each dispatch');
  // Unsubscribe and dispatch again
  unsubscribe();
  store.dispatch('setBpm', 200);
  assertEqual(store.getState().bpm, 200, 'BPM should still update');
  assertEqual(updates, 3, 'Unsubscribed listener should not be called again');
};