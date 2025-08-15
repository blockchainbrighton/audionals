/**
 * Store is a lightweight event driven state container. It holds
 * arbitrary application state and exposes a simple dispatch API
 * that mutates state based on action types. Subscribers are
 * notified after each dispatch.
 */
class Store {
  constructor(initialState = {}) {
    this.state = initialState;
    this.listeners = [];
  }

  /**
   * Retrieve the current state snapshot. Consumers should not
   * directly mutate the returned object.
   */
  getState() {
    return this.state;
  }

  /**
   * Dispatch an action. Supported actions include adding a channel,
   * updating a pattern and setting the BPM. Unrecognised actions
   * assign the payload under the actionType key.
   */
  dispatch(actionType, payload) {
    switch (actionType) {
      case 'addChannel':
        if (!Array.isArray(this.state.channels)) {
          this.state.channels = [];
        }
        this.state.channels.push(payload);
        break;
      case 'updatePattern':
        // payload: { channel, pattern }
        if (!Array.isArray(this.state.patterns)) {
          this.state.patterns = [];
        }
        this.state.patterns[payload.channel] = payload.pattern;
        break;
      case 'setBpm':
        this.state.bpm = payload;
        break;
      default:
        // For any other action just set the payload under the key
        this.state[actionType] = payload;
        break;
    }
    // Notify subscribers
    this.listeners.forEach((listener) => listener(this.state));
  }

  /**
   * Subscribe to state changes. Returns a function which can be
   * called to unsubscribe.
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => this.unsubscribe(listener);
  }

  /**
   * Unsubscribe a previously registered listener.
   */
  unsubscribe(listener) {
    const index = this.listeners.indexOf(listener);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }
}

module.exports = Store;