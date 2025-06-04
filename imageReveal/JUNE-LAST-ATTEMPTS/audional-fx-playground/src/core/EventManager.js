/**
 * Event Manager
 * Handles event coordination and communication between components
 */

export class EventManager {
  constructor() {
    this.events = new Map();
    this.application = null;
    this.initialized = false;
  }

  /**
   * Initialize event manager
   * @param {Application} application - Main application instance
   */
  initialize(application) {
    this.application = application;
    this.initialized = true;
  }

  /**
   * Register event listener
   * @param {string} eventName - Event name
   * @param {Function} callback - Event callback
   * @param {Object} options - Event options
   */
  on(eventName, callback, options = {}) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }

    const listener = {
      callback,
      once: options.once || false,
      priority: options.priority || 0,
      id: options.id || this.generateListenerId()
    };

    this.events.get(eventName).push(listener);
    
    // Sort by priority (higher priority first)
    this.events.get(eventName).sort((a, b) => b.priority - a.priority);

    return listener.id;
  }

  /**
   * Register one-time event listener
   * @param {string} eventName - Event name
   * @param {Function} callback - Event callback
   * @param {Object} options - Event options
   */
  once(eventName, callback, options = {}) {
    return this.on(eventName, callback, { ...options, once: true });
  }

  /**
   * Remove event listener
   * @param {string} eventName - Event name
   * @param {string|Function} listenerIdOrCallback - Listener ID or callback function
   */
  off(eventName, listenerIdOrCallback) {
    if (!this.events.has(eventName)) return;

    const listeners = this.events.get(eventName);
    
    if (typeof listenerIdOrCallback === 'string') {
      // Remove by ID
      const index = listeners.findIndex(listener => listener.id === listenerIdOrCallback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    } else {
      // Remove by callback function
      const index = listeners.findIndex(listener => listener.callback === listenerIdOrCallback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }

    // Clean up empty event arrays
    if (listeners.length === 0) {
      this.events.delete(eventName);
    }
  }

  /**
   * Emit event to all listeners
   * @param {string} eventName - Event name
   * @param {...*} args - Event arguments
   * @returns {boolean} True if event was handled
   */
  emit(eventName, ...args) {
    if (!this.events.has(eventName)) return false;

    const listeners = [...this.events.get(eventName)]; // Copy to avoid modification during iteration
    let handled = false;

    for (const listener of listeners) {
      try {
        const result = listener.callback(...args);
        handled = true;

        // Remove one-time listeners
        if (listener.once) {
          this.off(eventName, listener.id);
        }

        // Stop propagation if callback returns false
        if (result === false) {
          break;
        }
      } catch (error) {
        console.error(`[EventManager] Error in event listener for '${eventName}':`, error);
      }
    }

    return handled;
  }

  /**
   * Emit event asynchronously
   * @param {string} eventName - Event name
   * @param {...*} args - Event arguments
   * @returns {Promise<boolean>} Promise that resolves to true if event was handled
   */
  async emitAsync(eventName, ...args) {
    if (!this.events.has(eventName)) return false;

    const listeners = [...this.events.get(eventName)];
    let handled = false;

    for (const listener of listeners) {
      try {
        const result = await listener.callback(...args);
        handled = true;

        if (listener.once) {
          this.off(eventName, listener.id);
        }

        if (result === false) {
          break;
        }
      } catch (error) {
        console.error(`[EventManager] Error in async event listener for '${eventName}':`, error);
      }
    }

    return handled;
  }

  /**
   * Remove all listeners for an event
   * @param {string} eventName - Event name
   */
  removeAllListeners(eventName) {
    if (eventName) {
      this.events.delete(eventName);
    } else {
      this.events.clear();
    }
  }

  /**
   * Get all event names
   * @returns {Array<string>} Array of event names
   */
  getEventNames() {
    return Array.from(this.events.keys());
  }

  /**
   * Get listener count for an event
   * @param {string} eventName - Event name
   * @returns {number} Number of listeners
   */
  getListenerCount(eventName) {
    return this.events.has(eventName) ? this.events.get(eventName).length : 0;
  }

  /**
   * Check if event has listeners
   * @param {string} eventName - Event name
   * @returns {boolean} True if event has listeners
   */
  hasListeners(eventName) {
    return this.getListenerCount(eventName) > 0;
  }

  /**
   * Generate unique listener ID
   * @private
   */
  generateListenerId() {
    return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create event namespace
   * @param {string} namespace - Namespace name
   * @returns {Object} Namespaced event methods
   */
  namespace(namespace) {
    return {
      on: (eventName, callback, options) => 
        this.on(`${namespace}:${eventName}`, callback, options),
      
      once: (eventName, callback, options) => 
        this.once(`${namespace}:${eventName}`, callback, options),
      
      off: (eventName, listenerIdOrCallback) => 
        this.off(`${namespace}:${eventName}`, listenerIdOrCallback),
      
      emit: (eventName, ...args) => 
        this.emit(`${namespace}:${eventName}`, ...args),
      
      emitAsync: (eventName, ...args) => 
        this.emitAsync(`${namespace}:${eventName}`, ...args)
    };
  }

  /**
   * Set up common application events
   * @private
   */
  setupApplicationEvents() {
    if (!this.application) return;

    // Image loading events
    this.on('image:loaded', () => {
      console.log('[EventManager] Image loaded');
    });

    this.on('image:error', (error) => {
      console.error('[EventManager] Image loading error:', error);
    });

    // Timeline events
    this.on('timeline:start', () => {
      console.log('[EventManager] Timeline started');
    });

    this.on('timeline:stop', () => {
      console.log('[EventManager] Timeline stopped');
    });

    this.on('timeline:complete', () => {
      console.log('[EventManager] Timeline completed');
    });

    // Effect events
    this.on('effect:enabled', (effectName) => {
      console.log(`[EventManager] Effect enabled: ${effectName}`);
    });

    this.on('effect:disabled', (effectName) => {
      console.log(`[EventManager] Effect disabled: ${effectName}`);
    });

    // Audio events
    this.on('audio:play', () => {
      console.log('[EventManager] Audio playback started');
    });

    this.on('audio:stop', () => {
      console.log('[EventManager] Audio playback stopped');
    });

    // Performance events
    this.on('performance:warning', (metrics) => {
      console.warn('[EventManager] Performance warning:', metrics);
    });
  }

  /**
   * Get event manager statistics
   * @returns {Object} Event manager statistics
   */
  getStatistics() {
    const stats = {
      totalEvents: this.events.size,
      totalListeners: 0,
      eventBreakdown: {}
    };

    this.events.forEach((listeners, eventName) => {
      stats.totalListeners += listeners.length;
      stats.eventBreakdown[eventName] = listeners.length;
    });

    return stats;
  }

  /**
   * Debug event manager state
   * @returns {Object} Debug information
   */
  debug() {
    return {
      initialized: this.initialized,
      hasApplication: !!this.application,
      statistics: this.getStatistics(),
      events: Object.fromEntries(
        Array.from(this.events.entries()).map(([name, listeners]) => [
          name,
          listeners.map(l => ({
            id: l.id,
            once: l.once,
            priority: l.priority
          }))
        ])
      )
    };
  }
}

export default EventManager;

