/**
 * StateManager - Centralized state management with immutable updates
 * Provides predictable state updates and change tracking
 */
import { eventBus, EVENTS } from './EventBus.js';

export class StateManager {
    constructor() {
        this.state = this.getInitialState();
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        this.validators = new Map();
        this.subscribers = new Map();
        this.debugMode = false;
        
        this.saveStateToHistory();
    }

    /**
     * Get the initial state structure
     * @returns {Object} Initial state
     */
    getInitialState() {
        return {
            // Audio state
            audio: {
                context: null,
                masterVolume: 0.7,
                limiterThreshold: -3,
                voiceCount: 0,
                maxVoices: 16,
                isReady: false
            },
            
            // Synthesizer state
            synth: {
                waveform: 'sine',
                detune: 0,
                octave: 4,
                envelope: {
                    attack: 0.01,
                    decay: 0.1,
                    sustain: 0.7,
                    release: 0.3,
                    preset: ''
                }
            },
            
            // Effects state
            effects: {
                filter: {
                    enabled: true,
                    type: 'lowpass',
                    frequency: 5000,
                    Q: 1,
                    lfoEnabled: false,
                    lfoRate: 0.5,
                    lfoDepth: 0.5
                },
                reverb: {
                    enabled: true,
                    decay: 2,
                    wet: 0.3,
                    roomSize: 0.7
                },
                delay: {
                    enabled: true,
                    delayTime: 0.25,
                    feedback: 0.3,
                    wet: 0.2
                },
                chorus: {
                    enabled: false,
                    frequency: 1.5,
                    delayTime: 3.5,
                    depth: 0.7,
                    wet: 0.5
                },
                distortion: {
                    enabled: false,
                    distortion: 0.4,
                    wet: 0.3
                },
                compressor: {
                    enabled: true,
                    threshold: -24,
                    ratio: 12,
                    attack: 0.003,
                    release: 0.25
                }
            },
            
            // Transport state
            transport: {
                isPlaying: false,
                isRecording: false,
                isArmed: false,
                bpm: 120,
                position: 0
            },
            
            // UI state
            ui: {
                activeTab: 'synth',
                expandedPanels: new Set(['audio', 'env', 'osc']),
                keyboardOctave: 4,
                pianoRollZoom: 1,
                pianoRollScroll: 0
            },
            
            // MIDI state
            midi: {
                isSupported: false,
                isConnected: false,
                devices: [],
                activeDevice: null
            },
            
            // Sequence data
            sequence: {
                events: [],
                loops: [],
                activeLoop: null
            }
        };
    }

    /**
     * Get the current state (read-only)
     * @returns {Object} Current state
     */
    getState() {
        return this.deepFreeze(this.deepClone(this.state));
    }

    /**
     * Get a specific part of the state
     * @param {string} path - Dot-separated path (e.g., 'audio.masterVolume')
     * @returns {*} State value
     */
    getStateValue(path) {
        return this.getNestedValue(this.state, path);
    }

    /**
     * Update state with validation and history tracking
     * @param {string} path - Dot-separated path
     * @param {*} value - New value
     * @param {Object} options - Update options
     */
    setState(path, value, options = {}) {
        const { skipValidation = false, skipHistory = false, silent = false } = options;
        
        // Validate the update
        if (!skipValidation && !this.validateUpdate(path, value)) {
            console.error(`[StateManager] Validation failed for ${path}:`, value);
            return false;
        }
        
        // Create new state with the update
        const newState = this.deepClone(this.state);
        this.setNestedValue(newState, path, value);
        
        // Save to history before updating
        if (!skipHistory) {
            this.saveStateToHistory();
        }
        
        const oldValue = this.getNestedValue(this.state, path);
        this.state = newState;
        
        if (this.debugMode) {
            console.log(`[StateManager] State updated: ${path}`, { oldValue, newValue: value });
        }
        
        // Notify subscribers
        if (!silent) {
            this.notifySubscribers(path, value, oldValue);
            eventBus.emit(EVENTS.STATE_CHANGED, { path, value, oldValue });
        }
        
        return true;
    }

    /**
     * Update multiple state values atomically
     * @param {Object} updates - Object with path-value pairs
     * @param {Object} options - Update options
     */
    setMultipleStates(updates, options = {}) {
        const { skipValidation = false, skipHistory = false, silent = false } = options;
        
        // Validate all updates first
        if (!skipValidation) {
            for (const [path, value] of Object.entries(updates)) {
                if (!this.validateUpdate(path, value)) {
                    console.error(`[StateManager] Validation failed for ${path}:`, value);
                    return false;
                }
            }
        }
        
        // Save to history before updating
        if (!skipHistory) {
            this.saveStateToHistory();
        }
        
        // Apply all updates
        const newState = this.deepClone(this.state);
        const changes = [];
        
        for (const [path, value] of Object.entries(updates)) {
            const oldValue = this.getNestedValue(this.state, path);
            this.setNestedValue(newState, path, value);
            changes.push({ path, value, oldValue });
        }
        
        this.state = newState;
        
        if (this.debugMode) {
            console.log(`[StateManager] Multiple states updated:`, changes);
        }
        
        // Notify subscribers
        if (!silent) {
            changes.forEach(({ path, value, oldValue }) => {
                this.notifySubscribers(path, value, oldValue);
            });
            eventBus.emit(EVENTS.STATE_CHANGED, { changes });
        }
        
        return true;
    }

    /**
     * Subscribe to state changes
     * @param {string} path - State path to watch
     * @param {Function} callback - Change handler
     * @returns {Function} Unsubscribe function
     */
    subscribe(path, callback) {
        if (!this.subscribers.has(path)) {
            this.subscribers.set(path, []);
        }
        
        this.subscribers.get(path).push(callback);
        
        // Return unsubscribe function
        return () => {
            const callbacks = this.subscribers.get(path);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }

    /**
     * Add a validator for a state path
     * @param {string} path - State path
     * @param {Function} validator - Validation function
     */
    addValidator(path, validator) {
        if (!this.validators.has(path)) {
            this.validators.set(path, []);
        }
        this.validators.get(path).push(validator);
    }

    /**
     * Undo the last state change
     * @returns {boolean} Success
     */
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.state = this.deepClone(this.history[this.historyIndex]);
            eventBus.emit(EVENTS.STATE_CHANGED, { type: 'undo' });
            return true;
        }
        return false;
    }

    /**
     * Redo the next state change
     * @returns {boolean} Success
     */
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.state = this.deepClone(this.history[this.historyIndex]);
            eventBus.emit(EVENTS.STATE_CHANGED, { type: 'redo' });
            return true;
        }
        return false;
    }

    /**
     * Reset state to initial values
     */
    reset() {
        this.saveStateToHistory();
        this.state = this.getInitialState();
        eventBus.emit(EVENTS.STATE_CHANGED, { type: 'reset' });
    }

    /**
     * Load state from object
     * @param {Object} newState - State to load
     */
    loadState(newState) {
        this.saveStateToHistory();
        this.state = this.deepClone(newState);
        eventBus.emit(EVENTS.STATE_LOADED, newState);
        eventBus.emit(EVENTS.STATE_CHANGED, { type: 'load' });
    }

    // Private methods

    validateUpdate(path, value) {
        const validators = this.validators.get(path);
        if (validators) {
            return validators.every(validator => validator(value));
        }
        return true;
    }

    notifySubscribers(path, newValue, oldValue) {
        const callbacks = this.subscribers.get(path);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error(`[StateManager] Error in subscriber for ${path}:`, error);
                }
            });
        }
    }

    saveStateToHistory() {
        // Remove any future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // Add current state to history
        this.history.push(this.deepClone(this.state));
        this.historyIndex = this.history.length - 1;
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!(key in current)) {
                current[key] = {};
            }
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Set) return new Set(obj);
        if (obj instanceof Map) return new Map(obj);
        if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }

    deepFreeze(obj) {
        Object.getOwnPropertyNames(obj).forEach(prop => {
            if (obj[prop] !== null && typeof obj[prop] === 'object') {
                this.deepFreeze(obj[prop]);
            }
        });
        return Object.freeze(obj);
    }

    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
}

// Create and export singleton instance
export const stateManager = new StateManager();

