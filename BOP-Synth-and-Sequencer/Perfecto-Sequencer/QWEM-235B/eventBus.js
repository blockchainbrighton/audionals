// eventBus.js
/**
 * @module eventBus
 * A minimal, zero-dependency pub/sub event system.
 * Decouples modules by allowing them to communicate via string-typed events.
 * Uses the global `dispatchEvent` and `addEventListener` under the hood.
 * Fully stateless – all listeners are attached to the global event system.
 */

/**
 * Emits an event with a given type and optional payload.
 * Internally wraps data in a CustomEvent for consistency.
 *
 * @param {string} type - The event type (e.g., 'TRANSPORT/PLAY')
 * @param {any} [payload] - Data to send with the event
 * @returns {void}
 *
 * @example
 * emit('GRID/STEP_TOGGLED', { track: 0, step: 4, isActive: true });
 */
function emit(type, payload = null) {
    const event = new CustomEvent('EVENT_BUS', {
      detail: {
        type,
        payload,
        timestamp: performance.now(),
      },
    });
    dispatchEvent(event);
  }
  
  /**
   * Registers a callback for a specific event type.
   * The callback receives the event detail object: { type, payload, timestamp }.
   *
   * @param {string} type - Event type to listen for
   * @param {Function} callback - Function to call when event is emitted
   * @returns {Function} A function that, when called, removes the listener
   *
   * @example
   * const unsubscribe = on('TRANSPORT/PLAY', ({ payload }) => {
   *   console.log('Playback started at:', payload.startedAt);
   * });
   * // Later:
   * unsubscribe();
   */
  function on(type, callback) {
    if (typeof callback !== 'function') {
      throw new Error('[eventBus] Listener must be a function');
    }
  
    const handler = (event) => {
      if (event.detail?.type === type) {
        callback(event.detail);
      }
    };
  
    addEventListener('EVENT_BUS', handler);
    return () => removeEventListener('EVENT_BUS', handler);
  }
  
  /**
   * Removes a specific event listener.
   * Directly calls removeEventListener; typically used via the unsubscribe
   * function returned by `on()`, so this is provided for symmetry and testing.
   *
   * @param {string} type - Event type
   * @param {Function} callback - Listener function to remove
   * @returns {void}
   */
  function off(type, callback) {
    removeEventListener('EVENT_BUS', callback);
  }
  
  export { emit, on, off };