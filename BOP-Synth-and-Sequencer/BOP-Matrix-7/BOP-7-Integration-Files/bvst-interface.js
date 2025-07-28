/**
 * @file bvst-interface.js
 * @description Core BVST (Blockchain Virtual Studio Technology) interface specification
 * This file defines the standard interface that all BVST-compliant instruments must implement
 * to ensure seamless integration with the sequencer framework.
 */

/**
 * Base class for all BVST instruments
 * Provides the standard interface and common functionality
 */
export class BVSTInstrument {
    constructor(audioContext, options = {}) {
        if (!audioContext) {
            throw new Error('BVSTInstrument requires a valid AudioContext');
        }
        
        this.audioContext = audioContext;
        this.options = { ...this.getDefaultOptions(), ...options };
        this.isInitialized = false;
        this.parameters = new Map();
        this.output = null;
        this.uiContainer = null;
        this.uiElements = new Map();
        
        // Event system for parameter changes and state updates
        this.eventListeners = new Map();
        
        console.log(`[BVST] Creating instrument: ${this.constructor.name}`);
    }

    /**
     * Get default options for the instrument
     * Override in subclasses to provide instrument-specific defaults
     */
    getDefaultOptions() {
        return {
            polyphony: 16,
            masterVolume: 0.7,
            enableUI: true
        };
    }

    /**
     * Initialize the instrument
     * Must be called before using the instrument
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('[BVST] Instrument already initialized');
            return;
        }

        try {
            // Create the main output node
            this.output = this.audioContext.createGain();
            this.output.gain.value = this.options.masterVolume;

            // Initialize instrument-specific audio components
            await this.initializeAudio();

            // Set up parameter system
            this.initializeParameters();

            this.isInitialized = true;
            console.log(`[BVST] Instrument ${this.constructor.name} initialized successfully`);
            
            this.emit('initialized');
        } catch (error) {
            console.error('[BVST] Failed to initialize instrument:', error);
            throw error;
        }
    }

    /**
     * Initialize audio components (override in subclasses)
     */
    async initializeAudio() {
        // Override in subclasses
        throw new Error('initializeAudio must be implemented by subclass');
    }

    /**
     * Initialize parameter system (override in subclasses)
     */
    initializeParameters() {
        // Override in subclasses
        // Example:
        // this.registerParameter('masterVolume', {
        //     name: 'Master Volume',
        //     type: 'number',
        //     min: 0,
        //     max: 1,
        //     default: 0.7,
        //     unit: '',
        //     automatable: true
        // });
    }

    /**
     * Clean up and destroy the instrument
     */
    async destroy() {
        if (!this.isInitialized) {
            return;
        }

        try {
            // Stop all audio processing
            await this.stopAllNotes();

            // Destroy UI if it exists
            if (this.uiContainer) {
                this.destroyUI();
            }

            // Clean up audio nodes
            if (this.output) {
                this.output.disconnect();
                this.output = null;
            }

            // Clean up instrument-specific resources
            await this.destroyAudio();

            this.isInitialized = false;
            this.emit('destroyed');
            
            console.log(`[BVST] Instrument ${this.constructor.name} destroyed`);
        } catch (error) {
            console.error('[BVST] Error destroying instrument:', error);
            throw error;
        }
    }

    /**
     * Destroy audio components (override in subclasses)
     */
    async destroyAudio() {
        // Override in subclasses
    }

    /**
     * Trigger a note on
     */
    noteOn(note, velocity = 1.0, time = null) {
        if (!this.isInitialized) {
            console.warn('[BVST] Cannot trigger note: instrument not initialized');
            return;
        }

        const triggerTime = time || this.audioContext.currentTime;
        this.triggerNoteOn(note, velocity, triggerTime);
        
        this.emit('noteOn', { note, velocity, time: triggerTime });
    }

    /**
     * Trigger a note off
     */
    noteOff(note, time = null) {
        if (!this.isInitialized) {
            console.warn('[BVST] Cannot release note: instrument not initialized');
            return;
        }

        const releaseTime = time || this.audioContext.currentTime;
        this.triggerNoteOff(note, releaseTime);
        
        this.emit('noteOff', { note, time: releaseTime });
    }

    /**
     * Stop all currently playing notes
     */
    async stopAllNotes() {
        // Override in subclasses
        this.emit('allNotesOff');
    }

    /**
     * Implement note on logic (override in subclasses)
     */
    triggerNoteOn(note, velocity, time) {
        throw new Error('triggerNoteOn must be implemented by subclass');
    }

    /**
     * Implement note off logic (override in subclasses)
     */
    triggerNoteOff(note, time) {
        throw new Error('triggerNoteOff must be implemented by subclass');
    }

    /**
     * Register a parameter with the instrument
     */
    registerParameter(path, descriptor) {
        if (!descriptor.name || typeof descriptor.type === 'undefined') {
            throw new Error('Parameter descriptor must include name and type');
        }

        const fullDescriptor = {
            path,
            name: descriptor.name,
            type: descriptor.type,
            min: descriptor.min || 0,
            max: descriptor.max || 1,
            default: descriptor.default || 0,
            unit: descriptor.unit || '',
            automatable: descriptor.automatable !== false,
            steps: descriptor.steps || null,
            curve: descriptor.curve || 'linear',
            category: descriptor.category || 'general'
        };

        this.parameters.set(path, fullDescriptor);
        
        // Set initial value
        this.setParameter(path, fullDescriptor.default, false);
        
        console.log(`[BVST] Registered parameter: ${path}`);
    }

    /**
     * Set a parameter value
     */
    setParameter(path, value, emitEvent = true) {
        const descriptor = this.parameters.get(path);
        if (!descriptor) {
            console.warn(`[BVST] Unknown parameter: ${path}`);
            return false;
        }

        // Validate and clamp value
        const validatedValue = this.validateParameterValue(descriptor, value);
        
        // Apply the parameter change
        const success = this.applyParameterChange(path, validatedValue);
        
        if (success && emitEvent) {
            this.emit('parameterChanged', { path, value: validatedValue, descriptor });
        }

        return success;
    }

    /**
     * Get a parameter value
     */
    getParameter(path) {
        const descriptor = this.parameters.get(path);
        if (!descriptor) {
            console.warn(`[BVST] Unknown parameter: ${path}`);
            return null;
        }

        return this.getCurrentParameterValue(path);
    }

    /**
     * Get parameter descriptor
     */
    getParameterDescriptor(path) {
        return this.parameters.get(path) || null;
    }

    /**
     * Get all parameter descriptors
     */
    getAllParameterDescriptors() {
        return Array.from(this.parameters.values());
    }

    /**
     * Validate parameter value against descriptor
     */
    validateParameterValue(descriptor, value) {
        switch (descriptor.type) {
            case 'number':
                const numValue = parseFloat(value);
                if (isNaN(numValue)) return descriptor.default;
                return Math.max(descriptor.min, Math.min(descriptor.max, numValue));
                
            case 'boolean':
                return Boolean(value);
                
            case 'string':
                return String(value);
                
            case 'enum':
                if (descriptor.options && descriptor.options.includes(value)) {
                    return value;
                }
                return descriptor.default;
                
            default:
                return value;
        }
    }

    /**
     * Apply parameter change (override in subclasses)
     */
    applyParameterChange(path, value) {
        // Override in subclasses to implement actual parameter changes
        console.log(`[BVST] Parameter change: ${path} = ${value}`);
        return true;
    }

    /**
     * Get current parameter value (override in subclasses)
     */
    getCurrentParameterValue(path) {
        // Override in subclasses to return actual current values
        const descriptor = this.parameters.get(path);
        return descriptor ? descriptor.default : null;
    }

    /**
     * Create UI for the instrument
     */
    createUI(container) {
        if (!container) {
            throw new Error('UI container is required');
        }

        if (this.uiContainer) {
            console.warn('[BVST] UI already exists, destroying previous UI');
            this.destroyUI();
        }

        this.uiContainer = container;
        
        try {
            this.buildUI(container);
            this.bindUIEvents();
            this.updateUIFromParameters();
            
            console.log(`[BVST] UI created for ${this.constructor.name}`);
            this.emit('uiCreated', { container });
        } catch (error) {
            console.error('[BVST] Failed to create UI:', error);
            throw error;
        }
    }

    /**
     * Build UI elements (override in subclasses)
     */
    buildUI(container) {
        // Override in subclasses
        container.innerHTML = `
            <div class="bvst-instrument-ui">
                <h3>${this.constructor.name}</h3>
                <p>No UI implementation available</p>
            </div>
        `;
    }

    /**
     * Bind UI event handlers (override in subclasses)
     */
    bindUIEvents() {
        // Override in subclasses
    }

    /**
     * Update UI to reflect current parameter values
     */
    updateUIFromParameters() {
        // Override in subclasses
    }

    /**
     * Destroy UI
     */
    destroyUI() {
        if (!this.uiContainer) {
            return;
        }

        try {
            this.unbindUIEvents();
            this.uiContainer.innerHTML = '';
            this.uiContainer = null;
            this.uiElements.clear();
            
            console.log(`[BVST] UI destroyed for ${this.constructor.name}`);
            this.emit('uiDestroyed');
        } catch (error) {
            console.error('[BVST] Error destroying UI:', error);
        }
    }

    /**
     * Unbind UI event handlers (override in subclasses)
     */
    unbindUIEvents() {
        // Override in subclasses
    }

    /**
     * Get complete instrument state
     */
    getState() {
        const state = {
            instrumentId: this.constructor.getMetadata().id,
            version: this.constructor.getMetadata().version,
            parameters: {},
            options: { ...this.options }
        };

        // Collect all parameter values
        for (const [path] of this.parameters) {
            state.parameters[path] = this.getParameter(path);
        }

        // Add instrument-specific state
        const customState = this.getCustomState();
        if (customState) {
            state.custom = customState;
        }

        return state;
    }

    /**
     * Set instrument state
     */
    setState(state) {
        if (!state || typeof state !== 'object') {
            throw new Error('Invalid state object');
        }

        try {
            // Restore options
            if (state.options) {
                this.options = { ...this.options, ...state.options };
            }

            // Restore parameters
            if (state.parameters) {
                for (const [path, value] of Object.entries(state.parameters)) {
                    this.setParameter(path, value, false);
                }
            }

            // Restore custom state
            if (state.custom) {
                this.setCustomState(state.custom);
            }

            // Update UI if it exists
            if (this.uiContainer) {
                this.updateUIFromParameters();
            }

            console.log(`[BVST] State restored for ${this.constructor.name}`);
            this.emit('stateRestored', { state });
        } catch (error) {
            console.error('[BVST] Failed to restore state:', error);
            throw error;
        }
    }

    /**
     * Get custom state data (override in subclasses)
     */
    getCustomState() {
        return null;
    }

    /**
     * Set custom state data (override in subclasses)
     */
    setCustomState(customState) {
        // Override in subclasses
    }

    /**
     * Event system
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (!this.eventListeners.has(event)) {
            return;
        }
        const listeners = this.eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    emit(event, data = null) {
        if (!this.eventListeners.has(event)) {
            return;
        }
        const listeners = this.eventListeners.get(event);
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[BVST] Error in event listener for ${event}:`, error);
            }
        });
    }

    /**
     * Get instrument metadata (must be implemented as static method in subclasses)
     */
    static getMetadata() {
        return {
            id: 'base-bvst-instrument',
            name: 'Base BVST Instrument',
            version: '1.0.0',
            author: 'BVST Framework',
            description: 'Base class for BVST instruments',
            category: 'utility',
            tags: ['base', 'framework'],
            website: '',
            license: 'MIT'
        };
    }

    /**
     * Validate that a class properly implements the BVST interface
     */
    static validateImplementation(instrumentClass) {
        const required = [
            'initializeAudio',
            'triggerNoteOn',
            'triggerNoteOff',
            'getMetadata'
        ];

        const missing = required.filter(method => 
            typeof instrumentClass.prototype[method] !== 'function' &&
            typeof instrumentClass[method] !== 'function'
        );

        if (missing.length > 0) {
            throw new Error(`BVST implementation missing required methods: ${missing.join(', ')}`);
        }

        return true;
    }
}

/**
 * Utility functions for BVST instruments
 */
export const BVSTUtils = {
    /**
     * Convert MIDI note number to frequency
     */
    midiToFreq(midiNote) {
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    },

    /**
     * Convert note name to MIDI note number
     */
    noteToMidi(noteName) {
        const noteMap = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
            'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
        };

        const match = noteName.match(/^([A-G][#b]?)(\d+)$/);
        if (!match) {
            throw new Error(`Invalid note name: ${noteName}`);
        }

        const [, note, octave] = match;
        return (parseInt(octave) + 1) * 12 + noteMap[note];
    },

    /**
     * Convert MIDI note number to note name
     */
    midiToNote(midiNote) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        const note = noteNames[midiNote % 12];
        return `${note}${octave}`;
    },

    /**
     * Linear interpolation
     */
    lerp(start, end, t) {
        return start + (end - start) * t;
    },

    /**
     * Exponential interpolation
     */
    expLerp(start, end, t) {
        if (start <= 0 || end <= 0) {
            return this.lerp(start, end, t);
        }
        return start * Math.pow(end / start, t);
    },

    /**
     * Clamp value between min and max
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    /**
     * Map value from one range to another
     */
    map(value, inMin, inMax, outMin, outMax) {
        return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
    }
};

export default BVSTInstrument;

