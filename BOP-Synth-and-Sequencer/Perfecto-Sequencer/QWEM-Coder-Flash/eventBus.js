/**
 * @typedef {Object} EventBus
 * @property {Function} emit - Emit an event
 * @property {Function} on - Subscribe to an event
 * @property {Function} off - Unsubscribe from an event
 */

/**
 * Lightweight event bus implementation using CustomEvent
 * @returns {EventBus}
 */
export function eventBus() {
    // Map of event types to their listeners
    const listeners = new Map();
  
    /**
     * Emit an event with optional payload
     * @param {string} type - Event type
     * @param {any} [payload] - Optional event payload
     * @returns {void}
     */
    function emit(type, payload) {
      const event = new CustomEvent(type, { detail: payload });
      document.dispatchEvent(event);
      
      // Also dispatch to local listeners for testing
      const localListeners = listeners.get(type) || [];
      localListeners.forEach(callback => callback(payload));
    }
  
    /**
     * Subscribe to an event
     * @param {string} type - Event type to listen for
     * @param {Function} callback - Callback function to execute when event is emitted
     * @returns {Function} Unsubscribe function
     */
    function on(type, callback) {
      // Store local listeners for testing purposes
      if (!listeners.has(type)) {
        listeners.set(type, []);
      }
      listeners.get(type).push(callback);
  
      // Add DOM listener
      const handler = (event) => callback(event.detail);
      document.addEventListener(type, handler);
  
      // Return unsubscribe function
      return () => {
        listeners.get(type).splice(listeners.get(type).indexOf(callback), 1);
        document.removeEventListener(type, handler);
      };
    }
  
    /**
     * Remove event listener
     * @param {string} type - Event type
     * @param {Function} callback - Callback to remove
     * @returns {void}
     */
    function off(type, callback) {
      const localListeners = listeners.get(type) || [];
      const index = localListeners.indexOf(callback);
      if (index > -1) {
        localListeners.splice(index, 1);
      }
      
      const handler = (event) => callback(event.detail);
      document.removeEventListener(type, handler);
    }
  
    return { emit, on, off };
  }
  
  // Export a singleton instance
  export const EventBus = eventBus();