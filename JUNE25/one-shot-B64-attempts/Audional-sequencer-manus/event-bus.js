/**
 * Audional Sequencer - Event Bus
 * 
 * Centralized event system for decoupled communication between modules
 */

class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
        this.maxListeners = 50; // Prevent memory leaks
        
        // Bind methods
        this.on = this.on.bind(this);
        this.once = this.once.bind(this);
        this.off = this.off.bind(this);
        this.emit = this.emit.bind(this);
        this.removeAllListeners = this.removeAllListeners.bind(this);
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     * @param {Object} options - Options (priority, context)
     * @returns {Function} - Unsubscribe function
     */
    on(event, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        const listeners = this.events.get(event);
        
        // Check max listeners
        if (listeners.length >= this.maxListeners) {
            console.warn(`Maximum listeners (${this.maxListeners}) exceeded for event "${event}"`);
        }

        const listener = {
            callback,
            context: options.context || null,
            priority: options.priority || 0,
            id: this.generateListenerId()
        };

        // Insert listener based on priority (higher priority first)
        const insertIndex = listeners.findIndex(l => l.priority < listener.priority);
        if (insertIndex === -1) {
            listeners.push(listener);
        } else {
            listeners.splice(insertIndex, 0, listener);
        }

        // Return unsubscribe function
        return () => this.off(event, listener.id);
    }

    /**
     * Add one-time event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     * @param {Object} options - Options (priority, context)
     * @returns {Function} - Unsubscribe function
     */
    once(event, callback, options = {}) {
        const unsubscribe = this.on(event, (...args) => {
            unsubscribe();
            callback.apply(options.context || null, args);
        }, options);

        return unsubscribe;
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {string|Function} listenerIdOrCallback - Listener ID or callback function
     */
    off(event, listenerIdOrCallback) {
        if (!this.events.has(event)) {
            return false;
        }

        const listeners = this.events.get(event);
        let index = -1;

        if (typeof listenerIdOrCallback === 'string') {
            // Remove by listener ID
            index = listeners.findIndex(l => l.id === listenerIdOrCallback);
        } else if (typeof listenerIdOrCallback === 'function') {
            // Remove by callback function
            index = listeners.findIndex(l => l.callback === listenerIdOrCallback);
        }

        if (index !== -1) {
            listeners.splice(index, 1);
            
            // Clean up empty event arrays
            if (listeners.length === 0) {
                this.events.delete(event);
            }
            
            return true;
        }

        return false;
    }

    /**
     * Emit event to all listeners
     * @param {string} event - Event name
     * @param {...*} args - Arguments to pass to listeners
     * @returns {boolean} - Whether event had listeners
     */
    emit(event, ...args) {
        const hasListeners = this.events.has(event);
        
        if (hasListeners) {
            const listeners = [...this.events.get(event)]; // Copy to avoid issues if listeners are modified during emit
            
            listeners.forEach(listener => {
                try {
                    listener.callback.apply(listener.context, args);
                } catch (error) {
                    console.error(`Error in event listener for "${event}":`, error);
                }
            });
        }

        // Emit to wildcard listeners
        if (this.events.has('*')) {
            const wildcardListeners = [...this.events.get('*')];
            wildcardListeners.forEach(listener => {
                try {
                    listener.callback.apply(listener.context, [event, ...args]);
                } catch (error) {
                    console.error(`Error in wildcard event listener:`, error);
                }
            });
        }

        return hasListeners;
    }

    /**
     * Emit event asynchronously
     * @param {string} event - Event name
     * @param {...*} args - Arguments to pass to listeners
     * @returns {Promise} - Promise that resolves when all listeners complete
     */
    async emitAsync(event, ...args) {
        const hasListeners = this.events.has(event);
        const promises = [];
        
        if (hasListeners) {
            const listeners = [...this.events.get(event)];
            
            listeners.forEach(listener => {
                try {
                    const result = listener.callback.apply(listener.context, args);
                    if (result instanceof Promise) {
                        promises.push(result);
                    }
                } catch (error) {
                    console.error(`Error in async event listener for "${event}":`, error);
                }
            });
        }

        // Emit to wildcard listeners
        if (this.events.has('*')) {
            const wildcardListeners = [...this.events.get('*')];
            wildcardListeners.forEach(listener => {
                try {
                    const result = listener.callback.apply(listener.context, [event, ...args]);
                    if (result instanceof Promise) {
                        promises.push(result);
                    }
                } catch (error) {
                    console.error(`Error in async wildcard event listener:`, error);
                }
            });
        }

        await Promise.all(promises);
        return hasListeners;
    }

    /**
     * Remove all listeners for an event or all events
     * @param {string} event - Event name (optional)
     */
    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }

    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number} - Number of listeners
     */
    listenerCount(event) {
        return this.events.has(event) ? this.events.get(event).length : 0;
    }

    /**
     * Get all event names
     * @returns {Array} - Array of event names
     */
    eventNames() {
        return Array.from(this.events.keys());
    }

    /**
     * Generate unique listener ID
     * @returns {string} - Unique ID
     */
    generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Set maximum number of listeners per event
     * @param {number} max - Maximum listeners
     */
    setMaxListeners(max) {
        this.maxListeners = max;
    }

    /**
     * Create a namespaced event bus
     * @param {string} namespace - Namespace prefix
     * @returns {Object} - Namespaced event bus methods
     */
    namespace(namespace) {
        return {
            on: (event, callback, options) => this.on(`${namespace}:${event}`, callback, options),
            once: (event, callback, options) => this.once(`${namespace}:${event}`, callback, options),
            off: (event, listenerIdOrCallback) => this.off(`${namespace}:${event}`, listenerIdOrCallback),
            emit: (event, ...args) => this.emit(`${namespace}:${event}`, ...args),
            emitAsync: (event, ...args) => this.emitAsync(`${namespace}:${event}`, ...args)
        };
    }

    /**
     * Debug information
     * @returns {Object} - Debug info
     */
    debug() {
        const info = {
            totalEvents: this.events.size,
            totalListeners: 0,
            events: {}
        };

        for (const [event, listeners] of this.events) {
            info.totalListeners += listeners.length;
            info.events[event] = {
                listenerCount: listeners.length,
                listeners: listeners.map(l => ({
                    id: l.id,
                    priority: l.priority,
                    hasContext: !!l.context
                }))
            };
        }

        return info;
    }
}

// Create singleton instance
const eventBus = new EventBus();

// Common event constants
export const EVENTS = {
    // Audio events
    AUDIO_CONTEXT_CREATED: 'audio:context:created',
    AUDIO_CONTEXT_SUSPENDED: 'audio:context:suspended',
    AUDIO_CONTEXT_RESUMED: 'audio:context:resumed',
    SAMPLE_LOADED: 'audio:sample:loaded',
    SAMPLE_LOAD_ERROR: 'audio:sample:error',
    
    // Playback events
    PLAYBACK_STARTED: 'playback:started',
    PLAYBACK_STOPPED: 'playback:stopped',
    PLAYBACK_PAUSED: 'playback:paused',
    STEP_CHANGED: 'playback:step:changed',
    BPM_CHANGED: 'playback:bpm:changed',
    
    // Sequencer events
    SEQUENCE_CHANGED: 'sequencer:sequence:changed',
    STEP_TOGGLED: 'sequencer:step:toggled',
    PATTERN_COPIED: 'sequencer:pattern:copied',
    PATTERN_PASTED: 'sequencer:pattern:pasted',
    PATTERN_CLEARED: 'sequencer:pattern:cleared',
    
    // Channel events
    CHANNEL_SELECTED: 'channel:selected',
    CHANNEL_MUTED: 'channel:muted',
    CHANNEL_SOLOED: 'channel:soloed',
    CHANNEL_VOLUME_CHANGED: 'channel:volume:changed',
    CHANNEL_SAMPLE_CHANGED: 'channel:sample:changed',
    
    // UI events
    MODAL_OPENED: 'ui:modal:opened',
    MODAL_CLOSED: 'ui:modal:closed',
    THEME_CHANGED: 'ui:theme:changed',
    TOOLTIP_SHOW: 'ui:tooltip:show',
    TOOLTIP_HIDE: 'ui:tooltip:hide',
    
    // Project events
    PROJECT_LOADED: 'project:loaded',
    PROJECT_SAVED: 'project:saved',
    PROJECT_RESET: 'project:reset',
    PROJECT_CHANGED: 'project:changed',
    
    // Error events
    ERROR_OCCURRED: 'error:occurred',
    WARNING_OCCURRED: 'warning:occurred',
    
    // Performance events
    PERFORMANCE_WARNING: 'performance:warning',
    MEMORY_WARNING: 'memory:warning'
};

export default eventBus;

