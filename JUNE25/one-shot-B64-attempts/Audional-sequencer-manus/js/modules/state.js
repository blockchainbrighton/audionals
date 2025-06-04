/**
 * Audional Sequencer - Central State Management
 * 
 * This module provides a centralized state store with observer pattern
 * for reactive updates across the application.
 */

class StateStore {
    constructor() {
        this.state = this.getInitialState();
        this.observers = new Map();
        this.previousState = null;
        
        // Bind methods to preserve context
        this.subscribe = this.subscribe.bind(this);
        this.unsubscribe = this.unsubscribe.bind(this);
        this.setState = this.setState.bind(this);
        this.getState = this.getState.bind(this);
        this.notifyObservers = this.notifyObservers.bind(this);
    }

    /**
     * Get the initial state structure
     */
    getInitialState() {
        return {
            // Playback state
            isPlaying: false,
            currentStep: 0,
            bpm: 120,
            continuousPlayback: false,
            
            // Sequence management
            currentSequence: 0,
            sequences: Array.from({ length: 64 }, (_, i) => ({
                id: i,
                name: `Sequence ${i + 1}`,
                channels: Array.from({ length: 16 }, (_, channelIndex) => ({
                    id: channelIndex,
                    name: `Channel ${channelIndex + 1}`,
                    steps: Array.from({ length: 64 }, () => false),
                    volume: 0.8,
                    muted: false,
                    solo: false,
                    group: 'drums',
                    pitch: 1.0,
                    reverse: false,
                    sampleUrl: null,
                    sampleBuffer: null,
                    trimStart: 0,
                    trimEnd: 1
                }))
            })),
            
            // UI state
            selectedChannel: null,
            groupFilter: 'all',
            currentTheme: 'dark',
            showModal: false,
            modalType: null,
            modalData: null,
            
            // Audio engine state
            audioContext: null,
            masterGain: null,
            isAudioInitialized: false,
            
            // Project state
            projectName: 'Untitled Project',
            lastSaved: null,
            hasUnsavedChanges: false,
            
            // Performance state
            cpuUsage: 0,
            memoryUsage: 0
        };
    }

    /**
     * Subscribe to state changes
     * @param {string} key - State key to observe (optional, observes all if not provided)
     * @param {Function} callback - Callback function to execute on state change
     * @returns {string} - Subscription ID for unsubscribing
     */
    subscribe(key, callback) {
        if (typeof key === 'function') {
            // If only callback is provided, observe all state changes
            callback = key;
            key = '*';
        }

        const subscriptionId = `${key}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        if (!this.observers.has(key)) {
            this.observers.set(key, new Map());
        }
        
        this.observers.get(key).set(subscriptionId, callback);
        
        return subscriptionId;
    }

    /**
     * Unsubscribe from state changes
     * @param {string} subscriptionId - Subscription ID returned from subscribe
     */
    unsubscribe(subscriptionId) {
        for (const [key, callbacks] of this.observers) {
            if (callbacks.has(subscriptionId)) {
                callbacks.delete(subscriptionId);
                if (callbacks.size === 0) {
                    this.observers.delete(key);
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Update state and notify observers
     * @param {Object|Function} updates - Object with state updates or function that returns updates
     */
    setState(updates) {
        this.previousState = this.deepClone(this.state);
        
        if (typeof updates === 'function') {
            updates = updates(this.state);
        }

        // Deep merge updates into state
        this.state = this.deepMerge(this.state, updates);
        
        // Mark as having unsaved changes if this is a significant update
        if (this.isSignificantChange(updates)) {
            this.state.hasUnsavedChanges = true;
        }

        // Notify observers with diff
        this.notifyObservers(updates);
    }

    /**
     * Get current state (read-only)
     * @param {string} key - Optional key to get specific state value
     * @returns {*} - State value or entire state
     */
    getState(key) {
        if (key) {
            return this.getNestedValue(this.state, key);
        }
        return this.deepClone(this.state);
    }

    /**
     * Notify observers of state changes
     * @param {Object} changes - Object containing the changes made
     */
    notifyObservers(changes) {
        const changedKeys = this.getChangedKeys(changes);
        
        // Notify specific key observers
        changedKeys.forEach(key => {
            if (this.observers.has(key)) {
                this.observers.get(key).forEach(callback => {
                    try {
                        callback(this.getNestedValue(this.state, key), this.getNestedValue(this.previousState, key), key);
                    } catch (error) {
                        console.error(`Error in state observer for key "${key}":`, error);
                    }
                });
            }
        });

        // Notify global observers
        if (this.observers.has('*')) {
            this.observers.get('*').forEach(callback => {
                try {
                    callback(this.state, this.previousState, changes);
                } catch (error) {
                    console.error('Error in global state observer:', error);
                }
            });
        }
    }

    /**
     * Get all keys that changed in the update
     * @param {Object} changes - Changes object
     * @returns {Array} - Array of changed key paths
     */
    getChangedKeys(changes, prefix = '') {
        const keys = [];
        
        for (const [key, value] of Object.entries(changes)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            keys.push(fullKey);
            
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                keys.push(...this.getChangedKeys(value, fullKey));
            }
        }
        
        return keys;
    }

    /**
     * Check if a change is significant enough to mark as unsaved
     * @param {Object} changes - Changes object
     * @returns {boolean} - Whether the change is significant
     */
    isSignificantChange(changes) {
        const insignificantKeys = ['currentStep', 'cpuUsage', 'memoryUsage', 'showModal', 'modalType', 'modalData'];
        const changedKeys = this.getChangedKeys(changes);
        
        return changedKeys.some(key => !insignificantKeys.some(insignificant => key.startsWith(insignificant)));
    }

    /**
     * Deep clone an object
     * @param {*} obj - Object to clone
     * @returns {*} - Cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (obj instanceof AudioBuffer) return obj; // Don't clone audio buffers
        if (obj instanceof AudioContext) return obj; // Don't clone audio context
        if (obj instanceof GainNode) return obj; // Don't clone audio nodes
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }

    /**
     * Deep merge objects
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} - Merged object
     */
    deepMerge(target, source) {
        const result = this.deepClone(target);
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && 
                    !(source[key] instanceof AudioBuffer) && !(source[key] instanceof AudioContext) && 
                    !(source[key] instanceof GainNode)) {
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }

    /**
     * Get nested value from object using dot notation
     * @param {Object} obj - Object to search
     * @param {string} path - Dot notation path
     * @returns {*} - Value at path
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    /**
     * Reset state to initial values
     */
    reset() {
        this.previousState = this.deepClone(this.state);
        this.state = this.getInitialState();
        this.notifyObservers(this.state);
    }

    /**
     * Get state for serialization (excludes non-serializable objects)
     */
    getSerializableState() {
        const state = this.deepClone(this.state);
        
        // Remove non-serializable objects
        delete state.audioContext;
        delete state.masterGain;
        
        // Remove audio buffers but keep URLs
        state.sequences.forEach(sequence => {
            sequence.channels.forEach(channel => {
                delete channel.sampleBuffer;
            });
        });
        
        return state;
    }

    /**
     * Load state from serialized data
     * @param {Object} serializedState - Serialized state object
     */
    loadSerializedState(serializedState) {
        // Preserve audio-related objects
        const audioContext = this.state.audioContext;
        const masterGain = this.state.masterGain;
        const isAudioInitialized = this.state.isAudioInitialized;
        
        this.previousState = this.deepClone(this.state);
        this.state = this.deepMerge(this.getInitialState(), serializedState);
        
        // Restore audio objects
        this.state.audioContext = audioContext;
        this.state.masterGain = masterGain;
        this.state.isAudioInitialized = isAudioInitialized;
        
        this.notifyObservers(this.state);
    }
}

// Create and export singleton instance
const stateStore = new StateStore();

export default stateStore;

