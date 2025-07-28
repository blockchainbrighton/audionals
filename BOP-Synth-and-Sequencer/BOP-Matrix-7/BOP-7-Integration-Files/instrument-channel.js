/**
 * @file instrument-channel.js
 * @description Instrument channel implementation for the BVST sequencer integration
 * This class extends the sequencer to support BVST-compliant instruments alongside
 * traditional sample-based channels.
 */

import { BVSTInstrument } from './bvst-interface.js';

/**
 * Base channel class that defines the common interface for all channel types
 */
export class BaseChannel {
    constructor(sequencer, options = {}) {
        this.sequencer = sequencer;
        this.options = options;
        this.type = 'base';
        this.isActive = true;
        this.volume = 1.0;
        this.muted = false;
        this.soloed = false;
        
        // Step data for the channel
        this.steps = [];
        this.initializeSteps();
    }

    initializeSteps() {
        const totalSteps = this.sequencer.getStepsPerSequence();
        this.steps = Array(totalSteps).fill(null).map(() => ({
            active: false,
            data: this.createEmptyStepData()
        }));
    }

    createEmptyStepData() {
        return {};
    }

    getStepData(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.steps.length) {
            return null;
        }
        return this.steps[stepIndex];
    }

    setStepData(stepIndex, data) {
        if (stepIndex < 0 || stepIndex >= this.steps.length) {
            return false;
        }
        this.steps[stepIndex] = { ...this.steps[stepIndex], ...data };
        return true;
    }

    toggleStep(stepIndex) {
        const stepData = this.getStepData(stepIndex);
        if (stepData) {
            stepData.active = !stepData.active;
            return stepData.active;
        }
        return false;
    }

    processStep(stepIndex, time) {
        // Override in subclasses
    }

    createUI(container) {
        // Override in subclasses
    }

    destroyUI() {
        // Override in subclasses
    }

    getState() {
        return {
            type: this.type,
            volume: this.volume,
            muted: this.muted,
            soloed: this.soloed,
            steps: this.steps.map(step => ({ ...step }))
        };
    }

    setState(state) {
        if (state.volume !== undefined) this.volume = state.volume;
        if (state.muted !== undefined) this.muted = state.muted;
        if (state.soloed !== undefined) this.soloed = state.soloed;
        if (state.steps) {
            this.steps = state.steps.map(step => ({ ...step }));
        }
    }

    destroy() {
        this.destroyUI();
    }
}

/**
 * Sample channel class for backward compatibility
 */
export class SampleChannel extends BaseChannel {
    constructor(sequencer, options = {}) {
        super(sequencer, options);
        this.type = 'sample';
        this.selectedSampleIndex = options.selectedSampleIndex || 0;
        this.sampleBuffer = null;
    }

    createEmptyStepData() {
        return {
            velocity: 1.0
        };
    }

    async loadSample(sampleIndex) {
        this.selectedSampleIndex = sampleIndex;
        // Load sample buffer (implementation depends on sample loader)
        try {
            this.sampleBuffer = await this.sequencer.getSampleBuffer(sampleIndex);
        } catch (error) {
            console.error('[SampleChannel] Failed to load sample:', error);
        }
    }

    processStep(stepIndex, time) {
        const stepData = this.getStepData(stepIndex);
        if (!stepData || !stepData.active || !this.sampleBuffer) {
            return;
        }

        if (this.muted || (this.sequencer.hasSoloedChannels() && !this.soloed)) {
            return;
        }

        // Play sample
        const player = new this.sequencer.Tone.Player(this.sampleBuffer);
        player.volume.value = this.sequencer.Tone.gainToDb(this.volume * stepData.data.velocity);
        player.connect(this.sequencer.audioContext.destination);
        player.start(time);
    }

    getState() {
        const baseState = super.getState();
        return {
            ...baseState,
            selectedSampleIndex: this.selectedSampleIndex
        };
    }

    setState(state) {
        super.setState(state);
        if (state.selectedSampleIndex !== undefined) {
            this.loadSample(state.selectedSampleIndex);
        }
    }
}

/**
 * Instrument channel class for BVST instruments
 */
export class InstrumentChannel extends BaseChannel {
    constructor(sequencer, options = {}) {
        super(sequencer, options);
        this.type = 'instrument';
        this.instrument = null;
        this.instrumentClass = null;
        this.instrumentOptions = options.instrumentOptions || {};
        
        // Parameter mappings for step-based control
        this.parameterMappings = new Map();
        
        // UI container for embedded instrument UI
        this.instrumentUIContainer = null;
        
        // Active notes tracking
        this.activeNotes = new Set();
        
        // Default note for steps that don't specify a note
        this.defaultNote = 'C4';
        
        console.log('[InstrumentChannel] Created instrument channel');
    }

    createEmptyStepData() {
        return {
            note: this.defaultNote,
            velocity: 0.8,
            parameters: {},
            automation: {}
        };
    }

    /**
     * Load a BVST instrument into this channel
     */
    async loadInstrument(instrumentClass, options = {}) {
        if (this.instrument) {
            await this.unloadInstrument();
        }

        try {
            // Validate that the class implements BVST interface
            BVSTInstrument.validateImplementation(instrumentClass);
            
            this.instrumentClass = instrumentClass;
            this.instrumentOptions = { ...this.instrumentOptions, ...options };
            
            // Create and initialize the instrument
            this.instrument = new instrumentClass(this.sequencer.audioContext, this.instrumentOptions);
            await this.instrument.initialize();
            
            // Connect instrument output to sequencer
            if (this.instrument.output) {
                this.instrument.output.connect(this.sequencer.audioContext.destination);
            }
            
            // Set up parameter change listeners
            this.instrument.on('parameterChanged', (data) => {
                this.onInstrumentParameterChanged(data);
            });
            
            // Initialize default parameter mappings
            this.initializeParameterMappings();
            
            console.log(`[InstrumentChannel] Loaded instrument: ${instrumentClass.name}`);
            
            // Emit event for UI updates
            this.sequencer.emit('instrumentLoaded', {
                channel: this,
                instrument: this.instrument
            });
            
        } catch (error) {
            console.error('[InstrumentChannel] Failed to load instrument:', error);
            throw error;
        }
    }

    /**
     * Unload the current instrument
     */
    async unloadInstrument() {
        if (!this.instrument) {
            return;
        }

        try {
            // Stop all active notes
            await this.stopAllNotes();
            
            // Destroy instrument UI
            if (this.instrumentUIContainer) {
                this.instrument.destroyUI();
                this.instrumentUIContainer = null;
            }
            
            // Disconnect and destroy instrument
            if (this.instrument.output) {
                this.instrument.output.disconnect();
            }
            
            await this.instrument.destroy();
            this.instrument = null;
            this.instrumentClass = null;
            
            // Clear parameter mappings
            this.parameterMappings.clear();
            
            console.log('[InstrumentChannel] Unloaded instrument');
            
            this.sequencer.emit('instrumentUnloaded', { channel: this });
            
        } catch (error) {
            console.error('[InstrumentChannel] Error unloading instrument:', error);
        }
    }

    /**
     * Initialize default parameter mappings
     */
    initializeParameterMappings() {
        if (!this.instrument) {
            return;
        }

        // Clear existing mappings
        this.parameterMappings.clear();
        
        // Get all available parameters
        const parameters = this.instrument.getAllParameterDescriptors();
        
        // Set up common parameter mappings
        parameters.forEach(param => {
            if (param.automatable) {
                this.parameterMappings.set(param.path, {
                    enabled: false,
                    mode: 'absolute', // 'absolute' or 'relative'
                    curve: param.curve || 'linear'
                });
            }
        });
        
        console.log(`[InstrumentChannel] Initialized ${this.parameterMappings.size} parameter mappings`);
    }

    /**
     * Set parameter mapping for step-based control
     */
    setParameterMapping(parameterPath, mapping) {
        if (!this.instrument) {
            console.warn('[InstrumentChannel] Cannot set parameter mapping: no instrument loaded');
            return false;
        }

        const descriptor = this.instrument.getParameterDescriptor(parameterPath);
        if (!descriptor) {
            console.warn(`[InstrumentChannel] Unknown parameter: ${parameterPath}`);
            return false;
        }

        if (!descriptor.automatable) {
            console.warn(`[InstrumentChannel] Parameter not automatable: ${parameterPath}`);
            return false;
        }

        this.parameterMappings.set(parameterPath, {
            enabled: mapping.enabled !== false,
            mode: mapping.mode || 'absolute',
            curve: mapping.curve || descriptor.curve || 'linear'
        });

        console.log(`[InstrumentChannel] Set parameter mapping: ${parameterPath}`);
        return true;
    }

    /**
     * Get parameter mapping
     */
    getParameterMapping(parameterPath) {
        return this.parameterMappings.get(parameterPath) || null;
    }

    /**
     * Process a sequencer step
     */
    processStep(stepIndex, time) {
        const stepData = this.getStepData(stepIndex);
        if (!stepData || !stepData.active || !this.instrument) {
            return;
        }

        if (this.muted || (this.sequencer.hasSoloedChannels() && !this.soloed)) {
            return;
        }

        // Apply volume
        const effectiveVolume = this.volume * (stepData.data.velocity || 1.0);
        
        // Trigger note if specified
        if (stepData.data.note) {
            this.triggerNote(stepData.data.note, effectiveVolume, time);
        }

        // Apply parameter changes
        this.applyStepParameters(stepData.data, time);
        
        // Apply automation
        this.applyStepAutomation(stepData.data, time);
    }

    /**
     * Trigger a note on the instrument
     */
    triggerNote(note, velocity, time) {
        if (!this.instrument) {
            return;
        }

        try {
            this.instrument.noteOn(note, velocity, time);
            this.activeNotes.add(note);
            
            // Schedule note off if duration is specified
            // For now, we'll use a default duration
            const duration = 0.1; // 100ms default
            this.sequencer.scheduleCallback(time + duration, () => {
                this.instrument.noteOff(note, time + duration);
                this.activeNotes.delete(note);
            });
            
        } catch (error) {
            console.error('[InstrumentChannel] Error triggering note:', error);
        }
    }

    /**
     * Apply step-based parameter changes
     */
    applyStepParameters(stepData, time) {
        if (!stepData.parameters || !this.instrument) {
            return;
        }

        for (const [paramPath, value] of Object.entries(stepData.parameters)) {
            const mapping = this.parameterMappings.get(paramPath);
            if (mapping && mapping.enabled) {
                try {
                    this.instrument.setParameter(paramPath, value);
                } catch (error) {
                    console.error(`[InstrumentChannel] Error setting parameter ${paramPath}:`, error);
                }
            }
        }
    }

    /**
     * Apply step-based automation
     */
    applyStepAutomation(stepData, time) {
        if (!stepData.automation || !this.instrument) {
            return;
        }

        for (const [paramPath, automation] of Object.entries(stepData.automation)) {
            const mapping = this.parameterMappings.get(paramPath);
            if (mapping && mapping.enabled) {
                try {
                    this.scheduleParameterAutomation(paramPath, automation, time);
                } catch (error) {
                    console.error(`[InstrumentChannel] Error scheduling automation for ${paramPath}:`, error);
                }
            }
        }
    }

    /**
     * Schedule parameter automation
     */
    scheduleParameterAutomation(paramPath, automation, startTime) {
        // This is a simplified implementation
        // In a full implementation, this would use Web Audio API automation
        const { start, end, duration, curve } = automation;
        const durationSeconds = this.sequencer.parseDuration(duration);
        
        // For now, just set the end value after the duration
        this.sequencer.scheduleCallback(startTime + durationSeconds, () => {
            this.instrument.setParameter(paramPath, end);
        });
    }

    /**
     * Stop all active notes
     */
    async stopAllNotes() {
        if (!this.instrument) {
            return;
        }

        try {
            await this.instrument.stopAllNotes();
            this.activeNotes.clear();
        } catch (error) {
            console.error('[InstrumentChannel] Error stopping notes:', error);
        }
    }

    /**
     * Create embedded UI for the instrument
     */
    createInstrumentUI(container) {
        if (!this.instrument) {
            console.warn('[InstrumentChannel] Cannot create UI: no instrument loaded');
            return;
        }

        if (this.instrumentUIContainer) {
            console.warn('[InstrumentChannel] Instrument UI already exists');
            return;
        }

        try {
            this.instrumentUIContainer = container;
            this.instrument.createUI(container);
            
            console.log('[InstrumentChannel] Created instrument UI');
        } catch (error) {
            console.error('[InstrumentChannel] Failed to create instrument UI:', error);
            throw error;
        }
    }

    /**
     * Destroy embedded UI
     */
    destroyInstrumentUI() {
        if (!this.instrumentUIContainer || !this.instrument) {
            return;
        }

        try {
            this.instrument.destroyUI();
            this.instrumentUIContainer = null;
            
            console.log('[InstrumentChannel] Destroyed instrument UI');
        } catch (error) {
            console.error('[InstrumentChannel] Error destroying instrument UI:', error);
        }
    }

    /**
     * Handle instrument parameter changes
     */
    onInstrumentParameterChanged(data) {
        // Update UI if needed
        this.sequencer.emit('channelParameterChanged', {
            channel: this,
            parameter: data.path,
            value: data.value
        });
    }

    /**
     * Get channel state including instrument state
     */
    getState() {
        const baseState = super.getState();
        
        const state = {
            ...baseState,
            defaultNote: this.defaultNote,
            parameterMappings: Object.fromEntries(this.parameterMappings)
        };

        if (this.instrument && this.instrumentClass) {
            state.instrumentId = this.instrumentClass.getMetadata().id;
            state.instrumentState = this.instrument.getState();
            state.instrumentOptions = { ...this.instrumentOptions };
        }

        return state;
    }

    /**
     * Set channel state including instrument state
     */
    async setState(state) {
        super.setState(state);
        
        if (state.defaultNote) {
            this.defaultNote = state.defaultNote;
        }

        if (state.parameterMappings) {
            this.parameterMappings.clear();
            for (const [path, mapping] of Object.entries(state.parameterMappings)) {
                this.parameterMappings.set(path, mapping);
            }
        }

        // Restore instrument if specified
        if (state.instrumentId && state.instrumentState) {
            try {
                // This would need to be implemented with an instrument registry
                const instrumentClass = await this.sequencer.getInstrumentClass(state.instrumentId);
                if (instrumentClass) {
                    await this.loadInstrument(instrumentClass, state.instrumentOptions);
                    this.instrument.setState(state.instrumentState);
                }
            } catch (error) {
                console.error('[InstrumentChannel] Failed to restore instrument:', error);
            }
        }
    }

    /**
     * Destroy the channel
     */
    async destroy() {
        await this.stopAllNotes();
        await this.unloadInstrument();
        super.destroy();
    }
}

/**
 * Channel factory for creating different channel types
 */
export class ChannelFactory {
    static createChannel(type, sequencer, options = {}) {
        switch (type) {
            case 'sample':
                return new SampleChannel(sequencer, options);
            case 'instrument':
                return new InstrumentChannel(sequencer, options);
            default:
                throw new Error(`Unknown channel type: ${type}`);
        }
    }

    static getSupportedTypes() {
        return ['sample', 'instrument'];
    }
}

export default InstrumentChannel;

