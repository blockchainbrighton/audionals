/**
 * @file enhanced-sequencer.js
 * @description Enhanced sequencer with BVST instrument integration
 * This extends the existing sequencer functionality to support instrument channels
 * alongside traditional sample-based channels.
 */

import { ChannelFactory, InstrumentChannel, SampleChannel } from './instrument-channel.js';
import BOPSynthBVST from './bop-synth-adapter.js';

/**
 * Enhanced Sequencer with BVST instrument support
 */
export class EnhancedSequencer {
    constructor(options = {}) {
        this.options = {
            stepsPerBar: 16,
            barsPerSequence: 4,
            maxSequences: 32,
            maxChannelsPerSequence: 32,
            initialChannelsPerSequence: 8,
            ...options
        };

        // Audio context and Tone.js
        this.audioContext = null;
        this.Tone = null;
        this.isToneStarted = false;

        // Sequencer state
        this.projectData = {
            sequences: [],
            currentSequenceIndex: 0,
            bpm: 120.0,
            isPlaying: false,
            playMode: null // 'sequence' or 'all'
        };

        // Playback state
        this.sequence = null;
        this.currentStepIndex = 0;
        this.currentPlaybackSequenceIndex = 0;

        // Channels
        this.channels = [];

        // UI elements
        this.uiElements = {
            sequencer: null,
            controls: null,
            sequenceList: null
        };

        // Event system
        this.eventListeners = new Map();

        // Instrument registry
        this.instrumentRegistry = new Map();
        this.registerDefaultInstruments();

        // Sample loader (for backward compatibility)
        this.sampleLoader = null;
        this.sampleNames = [];
        this.sampleBPMs = [];
        this.isLoopSample = [];
        this.allBuffers = {};

        console.log('[EnhancedSequencer] Created enhanced sequencer');
    }

    /**
     * Initialize the sequencer
     */
    async initialize() {
        try {
            // Load Tone.js
            await this.loadToneJS();

            // Initialize audio context
            this.audioContext = this.Tone.context;

            // Load sample metadata for backward compatibility
            await this.loadSampleMetadata();

            // Create initial project
            this.createInitialProject();

            // Initialize UI
            this.initializeUI();

            console.log('[EnhancedSequencer] Initialized successfully');
            this.emit('initialized');

        } catch (error) {
            console.error('[EnhancedSequencer] Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * Load Tone.js library
     */
    async loadToneJS() {
        if (window.Tone) {
            this.Tone = window.Tone;
            return;
        }

        const TONE_ORDINALS_URL = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';
        await import(TONE_ORDINALS_URL);
        this.Tone = window.Tone;
        
        console.log('[EnhancedSequencer] Tone.js loaded');
    }

    /**
     * Load sample metadata for backward compatibility
     */
    async loadSampleMetadata() {
        try {
            // Import the sample loader
            const { SimpleSampleLoader } = await import('/home/ubuntu/upload/BOP-Sequencer-V6/audional-base64-sample-loader.js');
            this.sampleLoader = SimpleSampleLoader;

            // Load sample metadata
            const urls = SimpleSampleLoader.ogSampleUrls;
            if (urls && urls.length > 0) {
                urls.forEach((item, i) => {
                    if (typeof item === 'string') {
                        this.sampleNames.push(`Sample ${i + 1}`);
                        this.sampleBPMs.push(120);
                        this.isLoopSample.push(false);
                    } else if (item && item.name) {
                        this.sampleNames.push(item.name);
                        this.sampleBPMs.push(item.bpm || 120);
                        this.isLoopSample.push(item.isLoop || false);
                    }
                });
            }

            console.log(`[EnhancedSequencer] Loaded ${this.sampleNames.length} samples`);

        } catch (error) {
            console.warn('[EnhancedSequencer] Failed to load sample metadata:', error);
            // Continue without samples
        }
    }

    /**
     * Register default instruments
     */
    registerDefaultInstruments() {
        this.registerInstrument('bop-synth-v6', BOPSynthBVST);
        console.log('[EnhancedSequencer] Registered default instruments');
    }

    /**
     * Register an instrument class
     */
    registerInstrument(id, instrumentClass) {
        if (!instrumentClass.getMetadata) {
            throw new Error('Instrument class must implement getMetadata() static method');
        }

        this.instrumentRegistry.set(id, instrumentClass);
        console.log(`[EnhancedSequencer] Registered instrument: ${id}`);
    }

    /**
     * Get instrument class by ID
     */
    getInstrumentClass(id) {
        return this.instrumentRegistry.get(id) || null;
    }

    /**
     * Get all registered instruments
     */
    getRegisteredInstruments() {
        const instruments = [];
        for (const [id, instrumentClass] of this.instrumentRegistry) {
            instruments.push({
                id,
                metadata: instrumentClass.getMetadata()
            });
        }
        return instruments;
    }

    /**
     * Create initial project
     */
    createInitialProject() {
        this.projectData.sequences = [this.createEmptySequence()];
        this.projectData.currentSequenceIndex = 0;
        this.projectData.bpm = 120.0;

        // Create initial channels
        this.channels = [];
        for (let i = 0; i < this.options.initialChannelsPerSequence; i++) {
            this.addChannel('sample');
        }

        console.log('[EnhancedSequencer] Created initial project');
    }

    /**
     * Create an empty sequence
     */
    createEmptySequence() {
        const totalSteps = this.options.stepsPerBar * this.options.barsPerSequence;
        return {
            channels: Array(this.channels.length).fill(null).map(() => ({
                type: 'sample',
                selectedSampleIndex: 0,
                steps: Array(totalSteps).fill(false)
            }))
        };
    }

    /**
     * Add a new channel
     */
    addChannel(type, options = {}) {
        if (this.channels.length >= this.options.maxChannelsPerSequence) {
            console.warn('[EnhancedSequencer] Maximum channels reached');
            return null;
        }

        try {
            const channel = ChannelFactory.createChannel(type, this, options);
            this.channels.push(channel);

            // Add channel data to all sequences
            this.projectData.sequences.forEach(sequence => {
                const totalSteps = this.options.stepsPerBar * this.options.barsPerSequence;
                sequence.channels.push({
                    type: type,
                    selectedSampleIndex: type === 'sample' ? 0 : undefined,
                    steps: Array(totalSteps).fill(false)
                });
            });

            console.log(`[EnhancedSequencer] Added ${type} channel`);
            this.emit('channelAdded', { channel, type });

            return channel;

        } catch (error) {
            console.error('[EnhancedSequencer] Failed to add channel:', error);
            return null;
        }
    }

    /**
     * Remove a channel
     */
    async removeChannel(channelIndex) {
        if (channelIndex < 0 || channelIndex >= this.channels.length) {
            return false;
        }

        try {
            const channel = this.channels[channelIndex];
            
            // Destroy the channel
            await channel.destroy();

            // Remove from channels array
            this.channels.splice(channelIndex, 1);

            // Remove from all sequences
            this.projectData.sequences.forEach(sequence => {
                sequence.channels.splice(channelIndex, 1);
            });

            console.log(`[EnhancedSequencer] Removed channel ${channelIndex}`);
            this.emit('channelRemoved', { channelIndex });

            return true;

        } catch (error) {
            console.error('[EnhancedSequencer] Failed to remove channel:', error);
            return false;
        }
    }

    /**
     * Get current sequence
     */
    getCurrentSequence() {
        return this.projectData.sequences[this.projectData.currentSequenceIndex];
    }

    /**
     * Get steps per sequence
     */
    getStepsPerSequence() {
        return this.options.stepsPerBar * this.options.barsPerSequence;
    }

    /**
     * Get sample buffer (for backward compatibility)
     */
    async getSampleBuffer(sampleIndex) {
        if (!this.sampleLoader) {
            throw new Error('Sample loader not available');
        }

        if (!this.allBuffers[sampleIndex]) {
            this.allBuffers[sampleIndex] = await this.sampleLoader.getSampleByIndex(sampleIndex);
        }

        return this.allBuffers[sampleIndex];
    }

    /**
     * Check if any channels are soloed
     */
    hasSoloedChannels() {
        return this.channels.some(channel => channel.soloed);
    }

    /**
     * Schedule a callback at a specific time
     */
    scheduleCallback(time, callback) {
        this.Tone.Transport.scheduleOnce(callback, time);
    }

    /**
     * Parse duration string to seconds
     */
    parseDuration(duration) {
        if (typeof duration === 'number') {
            return duration;
        }

        // Simple duration parsing (extend as needed)
        const durationMap = {
            '1n': 4,
            '2n': 2,
            '4n': 1,
            '8n': 0.5,
            '16n': 0.25,
            '32n': 0.125
        };

        return durationMap[duration] || 0.25;
    }

    /**
     * Start playback
     */
    async startPlayback(mode = 'sequence') {
        if (this.projectData.isPlaying) {
            console.warn('[EnhancedSequencer] Already playing');
            return;
        }

        try {
            // Start Tone.js if needed
            if (!this.isToneStarted) {
                await this.Tone.start();
                this.isToneStarted = true;
            }

            this.projectData.playMode = mode;
            this.projectData.isPlaying = true;

            // Set BPM
            this.Tone.Transport.bpm.value = this.projectData.bpm;

            // Create and start sequence
            this.createSequence();
            this.Tone.Transport.start();

            console.log(`[EnhancedSequencer] Started playback (${mode})`);
            this.emit('playbackStarted', { mode });

        } catch (error) {
            console.error('[EnhancedSequencer] Failed to start playback:', error);
            this.projectData.isPlaying = false;
            throw error;
        }
    }

    /**
     * Stop playback
     */
    stopPlayback() {
        if (!this.projectData.isPlaying) {
            return;
        }

        try {
            this.Tone.Transport.stop();
            
            if (this.sequence) {
                this.sequence.dispose();
                this.sequence = null;
            }

            // Stop all channels
            this.channels.forEach(async (channel) => {
                if (channel.stopAllNotes) {
                    await channel.stopAllNotes();
                }
            });

            this.projectData.isPlaying = false;
            this.projectData.playMode = null;
            this.currentStepIndex = 0;

            console.log('[EnhancedSequencer] Stopped playback');
            this.emit('playbackStopped');

        } catch (error) {
            console.error('[EnhancedSequencer] Error stopping playback:', error);
        }
    }

    /**
     * Create Tone.js sequence for playback
     */
    createSequence() {
        const totalSteps = this.getStepsPerSequence();
        const sequenceSteps = Array.from({ length: totalSteps }, (_, i) => i);

        if (this.sequence) {
            this.sequence.dispose();
        }

        this.sequence = new this.Tone.Sequence((time, stepIndex) => {
            this.processStep(stepIndex, time);
        }, sequenceSteps, "16n");

        this.sequence.start(0);
    }

    /**
     * Process a sequencer step
     */
    processStep(stepIndex, time) {
        this.currentStepIndex = stepIndex;

        // Update UI
        this.highlightPlayhead(stepIndex);

        // Process each channel
        this.channels.forEach((channel, channelIndex) => {
            try {
                channel.processStep(stepIndex, time);
            } catch (error) {
                console.error(`[EnhancedSequencer] Error processing step for channel ${channelIndex}:`, error);
            }
        });

        this.emit('stepProcessed', { stepIndex, time });
    }

    /**
     * Highlight playhead in UI
     */
    highlightPlayhead(stepIndex) {
        if (!this.uiElements.sequencer) {
            return;
        }

        // Remove previous highlights
        this.uiElements.sequencer.querySelectorAll('.step.playing').forEach(el => {
            el.classList.remove('playing');
        });

        // Add current highlights
        this.uiElements.sequencer.querySelectorAll(`.step[data-step="${stepIndex}"]`).forEach(el => {
            el.classList.add('playing');
        });
    }

    /**
     * Initialize UI
     */
    initializeUI() {
        // This would be implemented based on the specific UI framework
        // For now, we'll create a basic structure
        console.log('[EnhancedSequencer] UI initialization placeholder');
    }

    /**
     * Render the sequencer UI
     */
    renderSequencer(container) {
        if (!container) {
            console.error('[EnhancedSequencer] No container provided for rendering');
            return;
        }

        this.uiElements.sequencer = container;
        container.innerHTML = '';

        const currentSequence = this.getCurrentSequence();
        if (!currentSequence) {
            return;
        }

        // Render each channel
        this.channels.forEach((channel, channelIndex) => {
            const channelElement = this.createChannelElement(channel, channelIndex);
            container.appendChild(channelElement);
        });

        console.log('[EnhancedSequencer] Rendered sequencer UI');
    }

    /**
     * Create UI element for a channel
     */
    createChannelElement(channel, channelIndex) {
        const channelDiv = document.createElement('div');
        channelDiv.className = `channel channel-${channel.type}`;
        channelDiv.dataset.channelIndex = channelIndex;

        // Channel header
        const header = document.createElement('div');
        header.className = 'channel-header';
        
        const label = document.createElement('div');
        label.className = 'channel-label';
        label.textContent = this.getChannelLabel(channel, channelIndex);

        const controls = document.createElement('div');
        controls.className = 'channel-controls';

        if (channel.type === 'sample') {
            // Sample selector
            const select = this.createSampleSelector(channelIndex);
            controls.appendChild(select);
        } else if (channel.type === 'instrument') {
            // Instrument selector and controls
            const instrumentControls = this.createInstrumentControls(channel, channelIndex);
            controls.appendChild(instrumentControls);
        }

        header.appendChild(label);
        header.appendChild(controls);

        // Steps container
        const stepsContainer = this.createStepsContainer(channel, channelIndex);

        channelDiv.appendChild(header);
        channelDiv.appendChild(stepsContainer);

        return channelDiv;
    }

    /**
     * Get channel label
     */
    getChannelLabel(channel, channelIndex) {
        if (channel.type === 'sample') {
            const sampleIndex = channel.selectedSampleIndex || 0;
            return this.sampleNames[sampleIndex] || `Sample ${sampleIndex}`;
        } else if (channel.type === 'instrument' && channel.instrument) {
            const metadata = channel.instrumentClass.getMetadata();
            return metadata.name;
        }
        return `Channel ${channelIndex + 1}`;
    }

    /**
     * Create sample selector
     */
    createSampleSelector(channelIndex) {
        const select = document.createElement('select');
        select.className = 'sample-select';
        select.dataset.channel = channelIndex;

        this.sampleNames.forEach((name, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = this.isLoopSample[index] ? 
                `${name} (${this.sampleBPMs[index]} BPM)` : name;
            select.appendChild(option);
        });

        select.addEventListener('change', async (e) => {
            const channelIndex = parseInt(e.target.dataset.channel);
            const sampleIndex = parseInt(e.target.value);
            await this.channels[channelIndex].loadSample(sampleIndex);
            this.renderSequencer(this.uiElements.sequencer);
        });

        return select;
    }

    /**
     * Create instrument controls
     */
    createInstrumentControls(channel, channelIndex) {
        const container = document.createElement('div');
        container.className = 'instrument-controls';

        // Instrument selector
        const select = document.createElement('select');
        select.className = 'instrument-select';
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select Instrument...';
        select.appendChild(defaultOption);

        this.getRegisteredInstruments().forEach(({ id, metadata }) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = metadata.name;
            if (channel.instrument && channel.instrumentClass.getMetadata().id === id) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        select.addEventListener('change', async (e) => {
            const instrumentId = e.target.value;
            if (instrumentId) {
                const instrumentClass = this.getInstrumentClass(instrumentId);
                if (instrumentClass) {
                    await channel.loadInstrument(instrumentClass);
                    this.renderSequencer(this.uiElements.sequencer);
                }
            }
        });

        container.appendChild(select);

        // UI embed button
        if (channel.instrument) {
            const uiButton = document.createElement('button');
            uiButton.textContent = 'Show UI';
            uiButton.className = 'instrument-ui-button';
            uiButton.addEventListener('click', () => {
                this.showInstrumentUI(channel);
            });
            container.appendChild(uiButton);
        }

        return container;
    }

    /**
     * Create steps container
     */
    createStepsContainer(channel, channelIndex) {
        const container = document.createElement('div');
        container.className = 'steps-container';

        const totalSteps = this.getStepsPerSequence();
        const currentSequence = this.getCurrentSequence();

        for (let stepIndex = 0; stepIndex < totalSteps; stepIndex++) {
            const stepElement = document.createElement('div');
            stepElement.className = 'step';
            stepElement.dataset.channel = channelIndex;
            stepElement.dataset.step = stepIndex;

            const stepData = currentSequence.channels[channelIndex];
            if (stepData && stepData.steps[stepIndex]) {
                stepElement.classList.add('active');
            }

            stepElement.addEventListener('click', () => {
                this.toggleStep(channelIndex, stepIndex);
            });

            container.appendChild(stepElement);
        }

        return container;
    }

    /**
     * Toggle a step
     */
    toggleStep(channelIndex, stepIndex) {
        const currentSequence = this.getCurrentSequence();
        if (!currentSequence || !currentSequence.channels[channelIndex]) {
            return;
        }

        const stepData = currentSequence.channels[channelIndex];
        stepData.steps[stepIndex] = !stepData.steps[stepIndex];

        // Update UI
        const stepElement = this.uiElements.sequencer.querySelector(
            `.step[data-channel="${channelIndex}"][data-step="${stepIndex}"]`
        );
        if (stepElement) {
            stepElement.classList.toggle('active', stepData.steps[stepIndex]);
        }

        this.emit('stepToggled', { channelIndex, stepIndex, active: stepData.steps[stepIndex] });
    }

    /**
     * Show instrument UI in a modal or panel
     */
    showInstrumentUI(channel) {
        if (!channel.instrument) {
            return;
        }

        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'instrument-ui-modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${channel.instrumentClass.getMetadata().name}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body" id="instrumentUIContainer"></div>
            </div>
        `;

        // Add to document
        document.body.appendChild(modal);

        // Create instrument UI
        const uiContainer = modal.querySelector('#instrumentUIContainer');
        channel.createInstrumentUI(uiContainer);

        // Close functionality
        const closeModal = () => {
            channel.destroyInstrumentUI();
            document.body.removeChild(modal);
        };

        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    }

    /**
     * Get project state
     */
    getState() {
        return {
            version: '2.0',
            metadata: {
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            },
            sequencer: {
                bpm: this.projectData.bpm,
                sequences: this.projectData.sequences,
                currentSequenceIndex: this.projectData.currentSequenceIndex
            },
            channels: this.channels.map(channel => channel.getState())
        };
    }

    /**
     * Set project state
     */
    async setState(state) {
        try {
            // Stop playback if running
            if (this.projectData.isPlaying) {
                this.stopPlayback();
            }

            // Clear existing channels
            for (const channel of this.channels) {
                await channel.destroy();
            }
            this.channels = [];

            // Restore sequencer data
            if (state.sequencer) {
                this.projectData.bpm = state.sequencer.bpm || 120;
                this.projectData.sequences = state.sequencer.sequences || [];
                this.projectData.currentSequenceIndex = state.sequencer.currentSequenceIndex || 0;
            }

            // Restore channels
            if (state.channels) {
                for (const channelState of state.channels) {
                    const channel = this.addChannel(channelState.type);
                    if (channel) {
                        await channel.setState(channelState);
                    }
                }
            }

            console.log('[EnhancedSequencer] State restored');
            this.emit('stateRestored', { state });

        } catch (error) {
            console.error('[EnhancedSequencer] Failed to restore state:', error);
            throw error;
        }
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
                console.error(`[EnhancedSequencer] Error in event listener for ${event}:`, error);
            }
        });
    }

    /**
     * Destroy the sequencer
     */
    async destroy() {
        try {
            // Stop playback
            this.stopPlayback();

            // Destroy all channels
            for (const channel of this.channels) {
                await channel.destroy();
            }

            // Clear references
            this.channels = [];
            this.eventListeners.clear();
            this.instrumentRegistry.clear();

            console.log('[EnhancedSequencer] Destroyed');

        } catch (error) {
            console.error('[EnhancedSequencer] Error during destruction:', error);
        }
    }
}

export default EnhancedSequencer;

