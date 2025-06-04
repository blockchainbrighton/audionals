/**
 * State Manager
 * Manages application state and provides state change notifications
 */

export class StateManager {
  constructor() {
    this.state = {
      imageLoaded: false,
      imageError: false,
      isPlaying: false,
      timelinePlaying: false,
      currentTimeline: null,
      enabledEffects: [],
      lastUpdateTime: 0
    };
    
    this.listeners = new Map();
    this.history = [];
    this.maxHistorySize = 50;
  }

  /**
   * Initialize state manager
   */
  initialize() {
    this.saveStateToHistory();
  }

  /**
   * Set image loaded state
   * @param {boolean} loaded - Whether image is loaded
   */
  setImageLoaded(loaded) {
    this.updateState({ imageLoaded: loaded });
  }

  /**
   * Set image error state
   * @param {boolean} error - Whether there's an image error
   */
  setImageError(error) {
    this.updateState({ imageError: error });
  }

  /**
   * Set playing state
   * @param {boolean} playing - Whether effects are playing
   */
  setPlaying(playing) {
    this.updateState({ isPlaying: playing });
  }

  /**
   * Set timeline playing state
   * @param {boolean} playing - Whether timeline is playing
   */
  setTimelinePlaying(playing) {
    this.updateState({ timelinePlaying: playing });
  }

  /**
   * Set current timeline
   * @param {string|number} timeline - Timeline identifier
   */
  setCurrentTimeline(timeline) {
    this.updateState({ currentTimeline: timeline });
  }

  /**
   * Set enabled effects
   * @param {Array<string>} effects - Array of enabled effect names
   */
  setEnabledEffects(effects) {
    this.updateState({ enabledEffects: [...effects] });
  }

  /**
   * Update state with new values
   * @param {Object} updates - State updates
   * @private
   */
  updateState(updates) {
    const oldState = { ...this.state };
    Object.assign(this.state, updates, { lastUpdateTime: Date.now() });
    
    this.saveStateToHistory();
    this.notifyListeners(oldState, this.state);
  }

  /**
   * Get current state
   * @returns {Object} Current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Check if image is loaded
   * @returns {boolean} True if image is loaded
   */
  isImageLoaded() {
    return this.state.imageLoaded;
  }

  /**
   * Check if there's an image error
   * @returns {boolean} True if there's an image error
   */
  hasImageError() {
    return this.state.imageError;
  }

  /**
   * Check if effects are playing
   * @returns {boolean} True if playing
   */
  isPlaying() {
    return this.state.isPlaying;
  }

  /**
   * Check if timeline is playing
   * @returns {boolean} True if timeline is playing
   */
  isTimelinePlaying() {
    return this.state.timelinePlaying;
  }

  /**
   * Get current timeline
   * @returns {string|number|null} Current timeline identifier
   */
  getCurrentTimeline() {
    return this.state.currentTimeline;
  }

  /**
   * Get enabled effects
   * @returns {Array<string>} Array of enabled effect names
   */
  getEnabledEffects() {
    return [...this.state.enabledEffects];
  }

  /**
   * Add state change listener
   * @param {string} key - Listener key
   * @param {Function} callback - Callback function
   */
  addListener(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
  }

  /**
   * Remove state change listener
   * @param {string} key - Listener key
   * @param {Function} callback - Callback function to remove
   */
  removeListener(key, callback) {
    if (this.listeners.has(key)) {
      const callbacks = this.listeners.get(key);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Remove all listeners for a key
   * @param {string} key - Listener key
   */
  removeAllListeners(key) {
    this.listeners.delete(key);
  }

  /**
   * Notify all listeners of state changes
   * @param {Object} oldState - Previous state
   * @param {Object} newState - New state
   * @private
   */
  notifyListeners(oldState, newState) {
    this.listeners.forEach((callbacks, key) => {
      callbacks.forEach(callback => {
        try {
          callback(newState, oldState, key);
        } catch (error) {
          console.error(`[StateManager] Listener error for key '${key}':`, error);
        }
      });
    });
  }

  /**
   * Save current state to history
   * @private
   */
  saveStateToHistory() {
    this.history.push({
      state: { ...this.state },
      timestamp: Date.now()
    });

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Get state history
   * @returns {Array} State history
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Restore state from history index
   * @param {number} index - History index
   */
  restoreFromHistory(index) {
    if (index >= 0 && index < this.history.length) {
      const historicalState = this.history[index].state;
      const oldState = { ...this.state };
      this.state = { ...historicalState, lastUpdateTime: Date.now() };
      this.notifyListeners(oldState, this.state);
    }
  }

  /**
   * Clear state history
   */
  clearHistory() {
    this.history.length = 0;
    this.saveStateToHistory();
  }

  /**
   * Reset state to initial values
   */
  reset() {
    const oldState = { ...this.state };
    this.state = {
      imageLoaded: false,
      imageError: false,
      isPlaying: false,
      timelinePlaying: false,
      currentTimeline: null,
      enabledEffects: [],
      lastUpdateTime: Date.now()
    };
    
    this.clearHistory();
    this.saveStateToHistory();
    this.notifyListeners(oldState, this.state);
  }

  /**
   * Serialize state for storage
   * @returns {string} Serialized state
   */
  serialize() {
    return JSON.stringify({
      state: this.state,
      timestamp: Date.now()
    });
  }

  /**
   * Deserialize state from storage
   * @param {string} serializedState - Serialized state string
   */
  deserialize(serializedState) {
    try {
      const data = JSON.parse(serializedState);
      const oldState = { ...this.state };
      this.state = { ...data.state, lastUpdateTime: Date.now() };
      this.saveStateToHistory();
      this.notifyListeners(oldState, this.state);
    } catch (error) {
      console.error('[StateManager] Failed to deserialize state:', error);
    }
  }

  /**
   * Get state summary for debugging
   * @returns {Object} State summary
   */
  getSummary() {
    return {
      imageLoaded: this.state.imageLoaded,
      imageError: this.state.imageError,
      isPlaying: this.state.isPlaying,
      timelinePlaying: this.state.timelinePlaying,
      currentTimeline: this.state.currentTimeline,
      enabledEffectsCount: this.state.enabledEffects.length,
      lastUpdateTime: this.state.lastUpdateTime,
      historySize: this.history.length,
      listenerCount: Array.from(this.listeners.values()).reduce((sum, arr) => sum + arr.length, 0)
    };
  }
}

export default StateManager;

