/**
 * @file example-instrument-template.js
 * @description Example BVST instrument template demonstrating best practices
 * This template provides a complete example of a simple synthesizer that can be used
 * as a starting point for developing new BVST-compliant instruments.
 */

import { BVSTInstrument, BVSTUtils } from './bvst-interface.js';

/**
 * Example Simple Synthesizer
 * Demonstrates a basic subtractive synthesizer with oscillator, filter, and envelope
 */
export class ExampleSynthBVST extends BVSTInstrument {
    constructor(audioContext, options = {}) {
        super(audioContext, options);
        
        // Voice management
        this.voices = [];
        this.activeVoices = new Map(); // note -> voice mapping
        this.maxPolyphony = options.polyphony || 8;
        
        // Audio nodes (will be created in initializeAudio)
        this.masterGain = null;
        this.filter = null;
        this.filterEnvelope = null;
        
        // Envelope settings
        this.envelopeSettings = {
            attack: 0.01,
            decay: 0.1,
            sustain: 0.7,
            release: 0.3
        };
        
        // Filter settings
        this.filterSettings = {
            frequency: 1000,
            Q: 1,
            type: 'lowpass'
        };
        
        console.log('[ExampleSynthBVST] Created example synthesizer');
    }

    /**
     * Get default options for the instrument
     */
    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            polyphony: 8,
            masterVolume: 0.7,
            oscillatorType: 'sawtooth',
            filterFrequency: 1000,
            filterQ: 1
        };
    }

    /**
     * Initialize audio components
     */
    async initializeAudio() {
        try {
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.options.masterVolume;
            this.masterGain.connect(this.output);

            // Create filter
            this.filter = this.audioContext.createBiquadFilter();
            this.filter.type = this.filterSettings.type;
            this.filter.frequency.value = this.filterSettings.frequency;
            this.filter.Q.value = this.filterSettings.Q;
            this.filter.connect(this.masterGain);

            // Initialize voice pool
            for (let i = 0; i < this.maxPolyphony; i++) {
                this.voices.push(this.createVoice());
            }

            console.log('[ExampleSynthBVST] Audio components initialized');

        } catch (error) {
            console.error('[ExampleSynthBVST] Failed to initialize audio:', error);
            throw error;
        }
    }

    /**
     * Initialize parameter system
     */
    initializeParameters() {
        // Master parameters
        this.registerParameter('masterVolume', {
            name: 'Master Volume',
            type: 'number',
            min: 0,
            max: 1,
            default: 0.7,
            unit: '',
            automatable: true,
            category: 'master'
        });

        // Oscillator parameters
        this.registerParameter('oscillator.type', {
            name: 'Oscillator Type',
            type: 'enum',
            options: ['sine', 'square', 'sawtooth', 'triangle'],
            default: 'sawtooth',
            automatable: true,
            category: 'oscillator'
        });

        this.registerParameter('oscillator.detune', {
            name: 'Detune',
            type: 'number',
            min: -50,
            max: 50,
            default: 0,
            unit: 'cents',
            automatable: true,
            category: 'oscillator'
        });

        // Filter parameters
        this.registerParameter('filter.frequency', {
            name: 'Filter Frequency',
            type: 'number',
            min: 20,
            max: 20000,
            default: 1000,
            unit: 'Hz',
            automatable: true,
            curve: 'exponential',
            category: 'filter'
        });

        this.registerParameter('filter.Q', {
            name: 'Filter Resonance',
            type: 'number',
            min: 0.1,
            max: 30,
            default: 1,
            unit: '',
            automatable: true,
            category: 'filter'
        });

        this.registerParameter('filter.type', {
            name: 'Filter Type',
            type: 'enum',
            options: ['lowpass', 'highpass', 'bandpass', 'notch'],
            default: 'lowpass',
            automatable: false,
            category: 'filter'
        });

        // Envelope parameters
        this.registerParameter('envelope.attack', {
            name: 'Attack',
            type: 'number',
            min: 0.001,
            max: 5,
            default: 0.01,
            unit: 's',
            automatable: true,
            curve: 'exponential',
            category: 'envelope'
        });

        this.registerParameter('envelope.decay', {
            name: 'Decay',
            type: 'number',
            min: 0.001,
            max: 5,
            default: 0.1,
            unit: 's',
            automatable: true,
            curve: 'exponential',
            category: 'envelope'
        });

        this.registerParameter('envelope.sustain', {
            name: 'Sustain',
            type: 'number',
            min: 0,
            max: 1,
            default: 0.7,
            unit: '',
            automatable: true,
            category: 'envelope'
        });

        this.registerParameter('envelope.release', {
            name: 'Release',
            type: 'number',
            min: 0.001,
            max: 5,
            default: 0.3,
            unit: 's',
            automatable: true,
            curve: 'exponential',
            category: 'envelope'
        });

        console.log('[ExampleSynthBVST] Parameters initialized');
    }

    /**
     * Create a voice object
     */
    createVoice() {
        return {
            oscillator: null,
            gainNode: null,
            note: null,
            velocity: 0,
            active: false,
            startTime: 0,
            releaseTime: 0
        };
    }

    /**
     * Find an available voice for note triggering
     */
    findAvailableVoice() {
        // First, try to find an inactive voice
        for (const voice of this.voices) {
            if (!voice.active) {
                return voice;
            }
        }

        // If no inactive voice, steal the oldest active voice
        let oldestVoice = null;
        let oldestTime = Infinity;

        for (const voice of this.voices) {
            if (voice.startTime < oldestTime) {
                oldestTime = voice.startTime;
                oldestVoice = voice;
            }
        }

        if (oldestVoice) {
            this.stopVoice(oldestVoice, this.audioContext.currentTime);
        }

        return oldestVoice;
    }

    /**
     * Find voice playing a specific note
     */
    findVoiceByNote(note) {
        return this.activeVoices.get(note) || null;
    }

    /**
     * Trigger note on
     */
    triggerNoteOn(note, velocity, time) {
        try {
            const voice = this.findAvailableVoice();
            if (!voice) {
                console.warn('[ExampleSynthBVST] No available voice for note');
                return;
            }

            this.startVoice(voice, note, velocity, time);

        } catch (error) {
            console.error('[ExampleSynthBVST] Error triggering note on:', error);
        }
    }

    /**
     * Trigger note off
     */
    triggerNoteOff(note, time) {
        try {
            const voice = this.findVoiceByNote(note);
            if (voice) {
                this.stopVoice(voice, time);
            }

        } catch (error) {
            console.error('[ExampleSynthBVST] Error triggering note off:', error);
        }
    }

    /**
     * Start a voice with the given parameters
     */
    startVoice(voice, note, velocity, time) {
        // Stop voice if it's already active
        if (voice.active) {
            this.stopVoice(voice, time);
        }

        // Convert note to frequency
        let frequency;
        if (typeof note === 'string') {
            const midiNote = BVSTUtils.noteToMidi(note);
            frequency = BVSTUtils.midiToFreq(midiNote);
        } else {
            frequency = note;
        }

        // Create oscillator
        voice.oscillator = this.audioContext.createOscillator();
        voice.oscillator.type = this.getCurrentParameterValue('oscillator.type');
        voice.oscillator.frequency.value = frequency;
        voice.oscillator.detune.value = this.getCurrentParameterValue('oscillator.detune');

        // Create gain node for envelope
        voice.gainNode = this.audioContext.createGain();
        voice.gainNode.gain.value = 0;

        // Connect audio graph
        voice.oscillator.connect(voice.gainNode);
        voice.gainNode.connect(this.filter);

        // Set voice properties
        voice.note = note;
        voice.velocity = velocity;
        voice.active = true;
        voice.startTime = time;
        voice.releaseTime = 0;

        // Track active voice
        this.activeVoices.set(note, voice);

        // Start oscillator
        voice.oscillator.start(time);

        // Apply envelope
        this.applyEnvelope(voice, time, velocity);

        console.log(`[ExampleSynthBVST] Started voice for note ${note}`);
    }

    /**
     * Stop a voice
     */
    stopVoice(voice, time) {
        if (!voice.active) {
            return;
        }

        voice.releaseTime = time;

        // Apply release envelope
        const releaseTime = this.getCurrentParameterValue('envelope.release');
        const currentGain = voice.gainNode.gain.value;

        voice.gainNode.gain.cancelScheduledValues(time);
        voice.gainNode.gain.setValueAtTime(currentGain, time);
        voice.gainNode.gain.exponentialRampToValueAtTime(0.001, time + releaseTime);

        // Schedule cleanup
        voice.oscillator.stop(time + releaseTime + 0.1);
        
        setTimeout(() => {
            this.cleanupVoice(voice);
        }, (releaseTime + 0.2) * 1000);

        console.log(`[ExampleSynthBVST] Stopped voice for note ${voice.note}`);
    }

    /**
     * Apply envelope to a voice
     */
    applyEnvelope(voice, startTime, velocity) {
        const attack = this.getCurrentParameterValue('envelope.attack');
        const decay = this.getCurrentParameterValue('envelope.decay');
        const sustain = this.getCurrentParameterValue('envelope.sustain');

        const peakLevel = velocity;
        const sustainLevel = peakLevel * sustain;

        const gain = voice.gainNode.gain;
        gain.setValueAtTime(0.001, startTime);
        gain.exponentialRampToValueAtTime(peakLevel, startTime + attack);
        gain.exponentialRampToValueAtTime(sustainLevel, startTime + attack + decay);
    }

    /**
     * Clean up a voice after it has finished playing
     */
    cleanupVoice(voice) {
        if (voice.oscillator) {
            try {
                voice.oscillator.disconnect();
            } catch (e) {
                // Oscillator may already be disconnected
            }
            voice.oscillator = null;
        }

        if (voice.gainNode) {
            try {
                voice.gainNode.disconnect();
            } catch (e) {
                // Gain node may already be disconnected
            }
            voice.gainNode = null;
        }

        // Remove from active voices
        if (voice.note) {
            this.activeVoices.delete(voice.note);
        }

        // Reset voice state
        voice.note = null;
        voice.velocity = 0;
        voice.active = false;
        voice.startTime = 0;
        voice.releaseTime = 0;
    }

    /**
     * Stop all active notes
     */
    async stopAllNotes() {
        const currentTime = this.audioContext.currentTime;
        
        for (const voice of this.voices) {
            if (voice.active) {
                this.stopVoice(voice, currentTime);
            }
        }

        this.activeVoices.clear();
        console.log('[ExampleSynthBVST] Stopped all notes');
    }

    /**
     * Apply parameter changes
     */
    applyParameterChange(path, value) {
        try {
            switch (path) {
                case 'masterVolume':
                    if (this.masterGain) {
                        this.masterGain.gain.value = value;
                    }
                    break;

                case 'oscillator.type':
                    // This will affect new voices only
                    break;

                case 'oscillator.detune':
                    // Apply to all active voices
                    for (const voice of this.voices) {
                        if (voice.active && voice.oscillator) {
                            voice.oscillator.detune.value = value;
                        }
                    }
                    break;

                case 'filter.frequency':
                    if (this.filter) {
                        this.filter.frequency.value = value;
                    }
                    this.filterSettings.frequency = value;
                    break;

                case 'filter.Q':
                    if (this.filter) {
                        this.filter.Q.value = value;
                    }
                    this.filterSettings.Q = value;
                    break;

                case 'filter.type':
                    if (this.filter) {
                        this.filter.type = value;
                    }
                    this.filterSettings.type = value;
                    break;

                case 'envelope.attack':
                    this.envelopeSettings.attack = value;
                    break;

                case 'envelope.decay':
                    this.envelopeSettings.decay = value;
                    break;

                case 'envelope.sustain':
                    this.envelopeSettings.sustain = value;
                    break;

                case 'envelope.release':
                    this.envelopeSettings.release = value;
                    break;

                default:
                    console.warn(`[ExampleSynthBVST] Unknown parameter: ${path}`);
                    return false;
            }

            return true;

        } catch (error) {
            console.error(`[ExampleSynthBVST] Error applying parameter ${path}:`, error);
            return false;
        }
    }

    /**
     * Get current parameter value
     */
    getCurrentParameterValue(path) {
        switch (path) {
            case 'masterVolume':
                return this.masterGain ? this.masterGain.gain.value : this.options.masterVolume;

            case 'oscillator.type':
                return this.options.oscillatorType;

            case 'oscillator.detune':
                return 0; // Default detune

            case 'filter.frequency':
                return this.filterSettings.frequency;

            case 'filter.Q':
                return this.filterSettings.Q;

            case 'filter.type':
                return this.filterSettings.type;

            case 'envelope.attack':
                return this.envelopeSettings.attack;

            case 'envelope.decay':
                return this.envelopeSettings.decay;

            case 'envelope.sustain':
                return this.envelopeSettings.sustain;

            case 'envelope.release':
                return this.envelopeSettings.release;

            default:
                const descriptor = this.parameters.get(path);
                return descriptor ? descriptor.default : null;
        }
    }

    /**
     * Build UI for the instrument
     */
    buildUI(container) {
        container.innerHTML = `
            <div class="example-synth-ui">
                <div class="instrument-header">
                    <h3>Example Synthesizer</h3>
                    <div class="voice-info">
                        Voices: <span id="voiceCount">0</span>/${this.maxPolyphony}
                    </div>
                </div>
                
                <div class="control-sections">
                    <div class="control-section">
                        <h4>Master</h4>
                        <div class="control-row">
                            <label>Volume</label>
                            <input type="range" id="masterVolume" min="0" max="1" step="0.01" value="0.7">
                            <span class="value-display">70%</span>
                        </div>
                    </div>
                    
                    <div class="control-section">
                        <h4>Oscillator</h4>
                        <div class="control-row">
                            <label>Type</label>
                            <select id="oscillatorType">
                                <option value="sine">Sine</option>
                                <option value="square">Square</option>
                                <option value="sawtooth" selected>Sawtooth</option>
                                <option value="triangle">Triangle</option>
                            </select>
                        </div>
                        <div class="control-row">
                            <label>Detune</label>
                            <input type="range" id="oscillatorDetune" min="-50" max="50" step="1" value="0">
                            <span class="value-display">0 cents</span>
                        </div>
                    </div>
                    
                    <div class="control-section">
                        <h4>Filter</h4>
                        <div class="control-row">
                            <label>Type</label>
                            <select id="filterType">
                                <option value="lowpass" selected>Low Pass</option>
                                <option value="highpass">High Pass</option>
                                <option value="bandpass">Band Pass</option>
                                <option value="notch">Notch</option>
                            </select>
                        </div>
                        <div class="control-row">
                            <label>Frequency</label>
                            <input type="range" id="filterFrequency" min="20" max="20000" step="1" value="1000">
                            <span class="value-display">1000 Hz</span>
                        </div>
                        <div class="control-row">
                            <label>Resonance</label>
                            <input type="range" id="filterQ" min="0.1" max="30" step="0.1" value="1">
                            <span class="value-display">1.0</span>
                        </div>
                    </div>
                    
                    <div class="control-section">
                        <h4>Envelope</h4>
                        <div class="control-row">
                            <label>Attack</label>
                            <input type="range" id="envelopeAttack" min="0.001" max="5" step="0.001" value="0.01">
                            <span class="value-display">0.010 s</span>
                        </div>
                        <div class="control-row">
                            <label>Decay</label>
                            <input type="range" id="envelopeDecay" min="0.001" max="5" step="0.001" value="0.1">
                            <span class="value-display">0.100 s</span>
                        </div>
                        <div class="control-row">
                            <label>Sustain</label>
                            <input type="range" id="envelopeSustain" min="0" max="1" step="0.01" value="0.7">
                            <span class="value-display">70%</span>
                        </div>
                        <div class="control-row">
                            <label>Release</label>
                            <input type="range" id="envelopeRelease" min="0.001" max="5" step="0.001" value="0.3">
                            <span class="value-display">0.300 s</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add basic styling
        const style = document.createElement('style');
        style.textContent = `
            .example-synth-ui {
                font-family: Arial, sans-serif;
                padding: 10px;
                background: #2a2a2a;
                color: #eee;
                border-radius: 8px;
            }
            
            .instrument-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid #444;
            }
            
            .control-sections {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }
            
            .control-section {
                background: #333;
                padding: 10px;
                border-radius: 6px;
            }
            
            .control-section h4 {
                margin: 0 0 10px 0;
                color: #0f0;
            }
            
            .control-row {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
                gap: 8px;
            }
            
            .control-row label {
                min-width: 80px;
                font-size: 12px;
            }
            
            .control-row input[type="range"] {
                flex: 1;
            }
            
            .control-row select {
                flex: 1;
                background: #444;
                color: #eee;
                border: 1px solid #666;
                padding: 2px;
            }
            
            .value-display {
                min-width: 60px;
                font-size: 11px;
                text-align: right;
            }
            
            .voice-info {
                font-size: 12px;
                color: #0f0;
            }
        `;
        
        container.appendChild(style);
    }

    /**
     * Bind UI events
     */
    bindUIEvents() {
        if (!this.uiContainer) return;

        // Master volume
        const masterVolumeSlider = this.uiContainer.querySelector('#masterVolume');
        if (masterVolumeSlider) {
            masterVolumeSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setParameter('masterVolume', value);
                const display = e.target.nextElementSibling;
                if (display) display.textContent = `${Math.round(value * 100)}%`;
            });
        }

        // Oscillator controls
        const oscTypeSelect = this.uiContainer.querySelector('#oscillatorType');
        if (oscTypeSelect) {
            oscTypeSelect.addEventListener('change', (e) => {
                this.setParameter('oscillator.type', e.target.value);
            });
        }

        const oscDetuneSlider = this.uiContainer.querySelector('#oscillatorDetune');
        if (oscDetuneSlider) {
            oscDetuneSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setParameter('oscillator.detune', value);
                const display = e.target.nextElementSibling;
                if (display) display.textContent = `${value} cents`;
            });
        }

        // Filter controls
        const filterTypeSelect = this.uiContainer.querySelector('#filterType');
        if (filterTypeSelect) {
            filterTypeSelect.addEventListener('change', (e) => {
                this.setParameter('filter.type', e.target.value);
            });
        }

        const filterFreqSlider = this.uiContainer.querySelector('#filterFrequency');
        if (filterFreqSlider) {
            filterFreqSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setParameter('filter.frequency', value);
                const display = e.target.nextElementSibling;
                if (display) display.textContent = `${Math.round(value)} Hz`;
            });
        }

        const filterQSlider = this.uiContainer.querySelector('#filterQ');
        if (filterQSlider) {
            filterQSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setParameter('filter.Q', value);
                const display = e.target.nextElementSibling;
                if (display) display.textContent = value.toFixed(1);
            });
        }

        // Envelope controls
        ['attack', 'decay', 'sustain', 'release'].forEach(param => {
            const slider = this.uiContainer.querySelector(`#envelope${param.charAt(0).toUpperCase() + param.slice(1)}`);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    this.setParameter(`envelope.${param}`, value);
                    const display = e.target.nextElementSibling;
                    if (display) {
                        if (param === 'sustain') {
                            display.textContent = `${Math.round(value * 100)}%`;
                        } else {
                            display.textContent = `${value.toFixed(3)} s`;
                        }
                    }
                });
            }
        });

        // Update voice count periodically
        this.voiceCountInterval = setInterval(() => {
            this.updateVoiceCount();
        }, 100);
    }

    /**
     * Update voice count display
     */
    updateVoiceCount() {
        const voiceCountEl = this.uiContainer?.querySelector('#voiceCount');
        if (voiceCountEl) {
            voiceCountEl.textContent = this.activeVoices.size;
        }
    }

    /**
     * Unbind UI events
     */
    unbindUIEvents() {
        if (this.voiceCountInterval) {
            clearInterval(this.voiceCountInterval);
            this.voiceCountInterval = null;
        }
    }

    /**
     * Destroy audio components
     */
    async destroyAudio() {
        // Stop all voices
        await this.stopAllNotes();

        // Disconnect and clean up audio nodes
        if (this.filter) {
            this.filter.disconnect();
            this.filter = null;
        }

        if (this.masterGain) {
            this.masterGain.disconnect();
            this.masterGain = null;
        }

        // Clear voice pool
        this.voices = [];
        this.activeVoices.clear();

        console.log('[ExampleSynthBVST] Audio components destroyed');
    }

    /**
     * Get instrument metadata
     */
    static getMetadata() {
        return {
            id: 'example-synth-bvst',
            name: 'Example Synthesizer',
            version: '1.0.0',
            author: 'BVST Framework',
            description: 'A simple example synthesizer demonstrating BVST implementation',
            category: 'synthesizer',
            tags: ['example', 'template', 'subtractive', 'synthesizer'],
            website: 'https://bvst-framework.com',
            license: 'MIT'
        };
    }
}

export default ExampleSynthBVST;

