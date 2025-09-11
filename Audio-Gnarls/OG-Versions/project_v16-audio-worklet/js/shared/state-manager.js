/**
 * StateManager - Centralized reactive state management
 * 
 * Provides:
 * - Reactive state updates
 * - State validation
 * - Change notifications
 * - State persistence
 * - Batched updates
 */

export class StateManager extends EventTarget {
  constructor(initialState = {}) {
    super();
    
    this._state = { ...initialState };
    this._validators = new Map();
    this._subscribers = new Map();
    this._updateQueue = new Set();
    this._isUpdating = false;
    this._batchTimeout = null;
  }

  /**
   * Get current state (read-only)
   */
  get state() {
    return { ...this._state };
  }

  /**
   * Get specific state value
   */
  get(key) {
    return key.split('.').reduce((obj, prop) => obj?.[prop], this._state);
  }

  /**
   * Set state value(s) with validation and notifications
   */
  set(keyOrObject, value) {
    const updates = typeof keyOrObject === 'string' 
      ? { [keyOrObject]: value }
      : keyOrObject;

    const validatedUpdates = this._validateUpdates(updates);
    if (Object.keys(validatedUpdates).length === 0) {
      return false;
    }

    this._queueUpdates(validatedUpdates);
    return true;
  }

  /**
   * Update state with a function
   */
  update(updater) {
    if (typeof updater !== 'function') {
      throw new Error('Updater must be a function');
    }

    const newState = updater({ ...this._state });
    return this.set(newState);
  }

  /**
   * Subscribe to state changes
   */
  subscribe(keyOrCallback, callback) {
    if (typeof keyOrCallback === 'function') {
      // Subscribe to all changes
      callback = keyOrCallback;
      keyOrCallback = '*';
    }

    const subscribers = this._subscribers.get(keyOrCallback) || new Set();
    subscribers.add(callback);
    this._subscribers.set(keyOrCallback, subscribers);

    // Return unsubscribe function
    return () => {
      const subs = this._subscribers.get(keyOrCallback);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this._subscribers.delete(keyOrCallback);
        }
      }
    };
  }

  /**
   * Add state validator
   */
  addValidator(key, validator) {
    if (typeof validator !== 'function') {
      throw new Error('Validator must be a function');
    }

    const validators = this._validators.get(key) || [];
    validators.push(validator);
    this._validators.set(key, validators);
  }

  /**
   * Remove state validator
   */
  removeValidator(key, validator) {
    const validators = this._validators.get(key);
    if (validators) {
      const index = validators.indexOf(validator);
      if (index >= 0) {
        validators.splice(index, 1);
        if (validators.length === 0) {
          this._validators.delete(key);
        }
      }
    }
  }

  /**
   * Reset state to initial values
   */
  reset(newInitialState) {
    const oldState = { ...this._state };
    this._state = newInitialState ? { ...newInitialState } : {};
    this._notifySubscribers('*', this._state, oldState);
  }

  /**
   * Validate state updates
   */
  _validateUpdates(updates) {
    const validatedUpdates = {};

    for (const [key, value] of Object.entries(updates)) {
      const validators = this._validators.get(key) || [];
      let isValid = true;

      for (const validator of validators) {
        try {
          const result = validator(value, this._state);
          if (result === false) {
            isValid = false;
            break;
          }
        } catch (error) {
          console.warn(`Validator error for key "${key}":`, error);
          isValid = false;
          break;
        }
      }

      if (isValid) {
        validatedUpdates[key] = value;
      }
    }

    return validatedUpdates;
  }

  /**
   * Queue state updates for batching
   */
  _queueUpdates(updates) {
    Object.entries(updates).forEach(([key, value]) => {
      this._updateQueue.add({ key, value });
    });

    if (!this._isUpdating) {
      this._scheduleUpdate();
    }
  }

  /**
   * Schedule batched update
   */
  _scheduleUpdate() {
    if (this._batchTimeout) {
      clearTimeout(this._batchTimeout);
    }

    this._batchTimeout = setTimeout(() => {
      this._processBatchedUpdates();
    }, 0);
  }

  /**
   * Process all queued updates
   */
  _processBatchedUpdates() {
    if (this._isUpdating || this._updateQueue.size === 0) {
      return;
    }

    this._isUpdating = true;
    const oldState = { ...this._state };
    const changedKeys = new Set();

    // Apply all updates
    this._updateQueue.forEach(({ key, value }) => {
      if (this._state[key] !== value) {
        this._state[key] = value;
        changedKeys.add(key);
      }
    });

    this._updateQueue.clear();

    // Notify subscribers
    if (changedKeys.size > 0) {
      changedKeys.forEach(key => {
        this._notifySubscribers(key, this._state[key], oldState[key]);
      });
      this._notifySubscribers('*', this._state, oldState);
    }

    this._isUpdating = false;
    this._batchTimeout = null;

    // Process any updates that were queued during this batch
    if (this._updateQueue.size > 0) {
      this._scheduleUpdate();
    }
  }

  /**
   * Notify subscribers of state changes
   */
  _notifySubscribers(key, newValue, oldValue) {
    const subscribers = this._subscribers.get(key);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(newValue, oldValue, key);
        } catch (error) {
          console.error(`Subscriber error for key "${key}":`, error);
        }
      });
    }

    // Emit custom event
    this.dispatchEvent(new CustomEvent('statechange', {
      detail: { key, newValue, oldValue }
    }));
  }
}

/**
 * Create a global state manager instance
 */
export const globalState = new StateManager();

/**
 * Utility function to create reactive state properties
 */
export function createReactiveProperty(target, key, initialValue, stateManager = globalState) {
  let value = initialValue;

  Object.defineProperty(target, key, {
    get() {
      return value;
    },
    set(newValue) {
      if (value !== newValue) {
        const oldValue = value;
        value = newValue;
        stateManager.set(key, newValue);
      }
    },
    enumerable: true,
    configurable: true
  });

  // Initialize state
  stateManager.set(key, initialValue);

  return stateManager.subscribe(key, (newValue) => {
    value = newValue;
  });
}

