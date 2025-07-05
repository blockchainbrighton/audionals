// Event Manager for inter-module communication
class EventManager {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Set();
    }

    /**
     * Subscribe to an event
     */
    on(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        
        this.events.get(eventName).push(callback);
        
        // Return unsubscribe function
        return () => this.off(eventName, callback);
    }

    /**
     * Subscribe to an event (one time only)
     */
    once(eventName, callback) {
        const onceCallback = (...args) => {
            callback(...args);
            this.off(eventName, onceCallback);
        };
        
        this.onceEvents.add(onceCallback);
        return this.on(eventName, onceCallback);
    }

    /**
     * Unsubscribe from an event
     */
    off(eventName, callback) {
        if (!this.events.has(eventName)) return;
        
        const callbacks = this.events.get(eventName);
        const index = callbacks.indexOf(callback);
        
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
        
        // Clean up empty event arrays
        if (callbacks.length === 0) {
            this.events.delete(eventName);
        }
        
        // Clean up once events
        this.onceEvents.delete(callback);
    }

    /**
     * Emit an event
     */
    emit(eventName, ...args) {
        if (!this.events.has(eventName)) return;
        
        const callbacks = [...this.events.get(eventName)];
        
        callbacks.forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`Error in event handler for '${eventName}':`, error);
            }
        });
    }

    /**
     * Remove all listeners for an event
     */
    removeAllListeners(eventName) {
        if (eventName) {
            this.events.delete(eventName);
        } else {
            this.events.clear();
            this.onceEvents.clear();
        }
    }

    /**
     * Get listener count for an event
     */
    listenerCount(eventName) {
        return this.events.has(eventName) ? this.events.get(eventName).length : 0;
    }

    /**
     * Get all event names
     */
    eventNames() {
        return Array.from(this.events.keys());
    }

    /**
     * Check if event has listeners
     */
    hasListeners(eventName) {
        return this.events.has(eventName) && this.events.get(eventName).length > 0;
    }

    /**
     * Emit event with delay
     */
    emitAsync(eventName, ...args) {
        return new Promise(resolve => {
            setTimeout(() => {
                this.emit(eventName, ...args);
                resolve();
            }, 0);
        });
    }

    /**
     * Create a namespaced event manager
     */
    namespace(prefix) {
        return {
            on: (eventName, callback) => this.on(`${prefix}:${eventName}`, callback),
            once: (eventName, callback) => this.once(`${prefix}:${eventName}`, callback),
            off: (eventName, callback) => this.off(`${prefix}:${eventName}`, callback),
            emit: (eventName, ...args) => this.emit(`${prefix}:${eventName}`, ...args),
            removeAllListeners: (eventName) => this.removeAllListeners(eventName ? `${prefix}:${eventName}` : undefined)
        };
    }

    /**
     * Debug information
     */
    debug() {
        console.group('EventManager Debug Info');
        console.log('Total events:', this.events.size);
        console.log('Events:', this.eventNames());
        
        this.events.forEach((callbacks, eventName) => {
            console.log(`${eventName}: ${callbacks.length} listeners`);
        });
        
        console.groupEnd();
    }
}

// Create global event manager instance
const eventManager = new EventManager();

// Define common event names as constants
const EVENTS = {
    // Canvas events
    PIXEL_PAINTED: 'pixel:painted',
    PIXEL_ERASED: 'pixel:erased',
    CANVAS_CLEARED: 'canvas:cleared',
    CANVAS_ZOOM_CHANGED: 'canvas:zoom:changed',
    
    // Palette events
    COLOR_SELECTED: 'palette:color:selected',
    PALETTE_CHANGED: 'palette:changed',
    CUSTOM_COLOR_ADDED: 'palette:custom:added',
    
    // Tool events
    TOOL_SELECTED: 'tool:selected',
    BRUSH_SIZE_CHANGED: 'tool:brush:size:changed',
    TOOL_SETTINGS_CHANGED: 'tool:settings:changed',
    
    // HUD events
    HUD_ELEMENT_ADDED: 'hud:element:added',
    HUD_ELEMENT_REMOVED: 'hud:element:removed',
    HUD_ELEMENT_UPDATED: 'hud:element:updated',
    HUD_STYLE_CHANGED: 'hud:style:changed',
    
    // Project events
    PROJECT_LOADED: 'project:loaded',
    PROJECT_SAVED: 'project:saved',
    PROJECT_EXPORTED: 'project:exported',
    PROJECT_CLEARED: 'project:cleared',
    
    // History events
    HISTORY_UNDO: 'history:undo',
    HISTORY_REDO: 'history:redo',
    HISTORY_STATE_CHANGED: 'history:state:changed',
    
    // UI events
    UI_STATS_UPDATED: 'ui:stats:updated',
    UI_ERROR: 'ui:error',
    UI_SUCCESS: 'ui:success',
    UI_WARNING: 'ui:warning'
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventManager, eventManager, EVENTS };
}

