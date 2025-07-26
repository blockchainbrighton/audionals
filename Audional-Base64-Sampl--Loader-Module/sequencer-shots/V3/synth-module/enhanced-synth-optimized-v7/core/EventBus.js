/**
 * EventBus - Centralized event management system
 * Provides decoupled communication between modules
 */
export class EventBus {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
        this.debugMode = false;
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     * @param {Object} context - Optional context for the callback
     * @returns {Function} Unsubscribe function
     */
    on(event, callback, context = null) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        
        const listener = { callback, context };
        this.listeners.get(event).push(listener);
        
        if (this.debugMode) {
            console.log(`[EventBus] Subscribed to '${event}'`);
        }
        
        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event that fires only once
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     * @param {Object} context - Optional context for the callback
     * @returns {Function} Unsubscribe function
     */
    once(event, callback, context = null) {
        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, []);
        }
        
        const listener = { callback, context };
        this.onceListeners.get(event).push(listener);
        
        if (this.debugMode) {
            console.log(`[EventBus] Subscribed once to '${event}'`);
        }
        
        // Return unsubscribe function
        return () => {
            const listeners = this.onceListeners.get(event);
            if (listeners) {
                const index = listeners.indexOf(listener);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        };
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler to remove
     */
    off(event, callback) {
        const listeners = this.listeners.get(event);
        if (listeners) {
            const index = listeners.findIndex(l => l.callback === callback);
            if (index > -1) {
                listeners.splice(index, 1);
                if (this.debugMode) {
                    console.log(`[EventBus] Unsubscribed from '${event}'`);
                }
            }
        }
    }

    /**
     * Emit an event to all subscribers
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data = null) {
        if (this.debugMode) {
            console.log(`[EventBus] Emitting '${event}'`, data);
        }

        // Handle regular listeners
        const listeners = this.listeners.get(event);
        if (listeners) {
            // Create a copy to avoid issues if listeners are modified during iteration
            const listenersCopy = [...listeners];
            listenersCopy.forEach(({ callback, context }) => {
                try {
                    if (context) {
                        callback.call(context, data);
                    } else {
                        callback(data);
                    }
                } catch (error) {
                    console.error(`[EventBus] Error in listener for '${event}':`, error);
                }
            });
        }

        // Handle once listeners
        const onceListeners = this.onceListeners.get(event);
        if (onceListeners) {
            const onceListenersCopy = [...onceListeners];
            // Clear once listeners before calling them
            this.onceListeners.set(event, []);
            
            onceListenersCopy.forEach(({ callback, context }) => {
                try {
                    if (context) {
                        callback.call(context, data);
                    } else {
                        callback(data);
                    }
                } catch (error) {
                    console.error(`[EventBus] Error in once listener for '${event}':`, error);
                }
            });
        }
    }

    /**
     * Remove all listeners for an event
     * @param {string} event - Event name
     */
    removeAllListeners(event) {
        if (event) {
            this.listeners.delete(event);
            this.onceListeners.delete(event);
            if (this.debugMode) {
                console.log(`[EventBus] Removed all listeners for '${event}'`);
            }
        } else {
            this.listeners.clear();
            this.onceListeners.clear();
            if (this.debugMode) {
                console.log(`[EventBus] Removed all listeners`);
            }
        }
    }

    /**
     * Get the number of listeners for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    listenerCount(event) {
        const regular = this.listeners.get(event)?.length || 0;
        const once = this.onceListeners.get(event)?.length || 0;
        return regular + once;
    }

    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Debug mode state
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`[EventBus] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get all event names that have listeners
     * @returns {string[]} Array of event names
     */
    getEventNames() {
        const regularEvents = Array.from(this.listeners.keys());
        const onceEvents = Array.from(this.onceListeners.keys());
        return [...new Set([...regularEvents, ...onceEvents])];
    }
}

// Create and export singleton instance
export const eventBus = new EventBus();

// Common event names used throughout the application
export const EVENTS = {
    // Audio events
    AUDIO_CONTEXT_READY: 'audio:context:ready',
    AUDIO_NOTE_ON: 'audio:note:on',
    AUDIO_NOTE_OFF: 'audio:note:off',
    AUDIO_EFFECT_CHANGED: 'audio:effect:changed',
    AUDIO_PARAMETER_CHANGED: 'audio:parameter:changed',
    
    // UI events
    UI_CONTROL_CHANGED: 'ui:control:changed',
    UI_KEYBOARD_PRESSED: 'ui:keyboard:pressed',
    UI_KEYBOARD_RELEASED: 'ui:keyboard:released',
    UI_TAB_CHANGED: 'ui:tab:changed',
    
    // Transport events
    TRANSPORT_PLAY: 'transport:play',
    TRANSPORT_STOP: 'transport:stop',
    TRANSPORT_RECORD: 'transport:record',
    TRANSPORT_PAUSE: 'transport:pause',
    
    // State events
    STATE_CHANGED: 'state:changed',
    STATE_LOADED: 'state:loaded',
    STATE_SAVED: 'state:saved',
    
    // MIDI events
    MIDI_CONNECTED: 'midi:connected',
    MIDI_DISCONNECTED: 'midi:disconnected',
    MIDI_MESSAGE: 'midi:message',
    
    // Error events
    ERROR_OCCURRED: 'error:occurred',
    WARNING_OCCURRED: 'warning:occurred',
    
    // System events
    SYSTEM_READY: 'system:ready',
    SYSTEM_SHUTDOWN: 'system:shutdown'
};

