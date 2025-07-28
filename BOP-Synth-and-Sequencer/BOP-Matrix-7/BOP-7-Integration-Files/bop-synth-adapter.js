/**
 * @file bop-synth-adapter.js
 * @description BVST adapter for the BOP Synthesizer
 * This adapter wraps the existing BOP synthesizer to make it compatible
 * with the BVST interface and sequencer integration.
 */

import { BVSTInstrument, BVSTUtils } from './bvst-interface.js';

/**
 * BOP Synthesizer BVST Adapter
 * Wraps the existing SynthEngine to provide BVST compatibility
 */
export class BOPSynthBVST extends BVSTInstrument {
    constructor(audioContext, options = {}) {
        super(audioContext, options);
        
        this.synthEngine = null;
        this.Tone = null;
        
        // Track active voices for polyphony management
        this.activeVoices = new Map();
        this.maxPolyphony = options.polyphony || 16;
        
        // UI state
        this.controlGroups = new Map();
        this.uiUpdateCallbacks = new Map();
        
        console.log('[BOPSynthBVST] Created BOP Synth BVST adapter');
    }

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            polyphony: 16,
            masterVolume: 0.7,
            oscillator: {
                type: 'fatsawtooth',
                count: 3,
                spread: 30
            },
            envelope: {
                attack: 0.01,
                decay: 0.1,
                sustain: 0.5,
                release: 0.4
            }
        };
    }

    /**
     * Initialize the BOP synthesizer audio components
     */
    async initializeAudio() {
        try {
            // Load Tone.js if not already available
            if (!window.Tone) {
                const TONE_ORDINALS_URL = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';
                await import(TONE_ORDINALS_URL);
            }
            this.Tone = window.Tone;

            // Import and create the SynthEngine
            const { SynthEngine } = await import('/home/ubuntu/upload/BOP-SYNTH-V6/synth-engine.js');
            this.synthEngine = new SynthEngine(this.Tone);
            
            // Connect to our output
            if (this.synthEngine.limiter) {
                this.synthEngine.limiter.disconnect();
                this.synthEngine.limiter.connect(this.output);
            }
            
            console.log('[BOPSynthBVST] Audio components initialized');
            
        } catch (error) {
            console.error('[BOPSynthBVST] Failed to initialize audio:', error);
            throw error;
        }
    }

    /**
     * Initialize parameter system with BOP synth parameters
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
            options: ['sine', 'square', 'sawtooth', 'triangle', 'fatsawtooth'],
            default: 'fatsawtooth',
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
            default: 0.5,
            unit: '',
            automatable: true,
            category: 'envelope'
        });

        this.registerParameter('envelope.release', {
            name: 'Release',
            type: 'number',
            min: 0.001,
            max: 5,
            default: 0.4,
            unit: 's',
            automatable: true,
            curve: 'exponential',
            category: 'envelope'
        });

        // Filter parameters
        this.registerParameter('filter.enable', {
            name: 'Filter Enable',
            type: 'boolean',
            default: true,
            automatable: true,
            category: 'filter'
        });

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

        // Effects parameters
        this.registerParameter('reverb.wet', {
            name: 'Reverb Amount',
            type: 'number',
            min: 0,
            max: 1,
            default: 0,
            unit: '',
            automatable: true,
            category: 'effects'
        });

        this.registerParameter('delay.wet', {
            name: 'Delay Amount',
            type: 'number',
            min: 0,
            max: 1,
            default: 0,
            unit: '',
            automatable: true,
            category: 'effects'
        });

        this.registerParameter('delay.delayTime', {
            name: 'Delay Time',
            type: 'number',
            min: 0.001,
            max: 1,
            default: 0.125,
            unit: 's',
            automatable: true,
            category: 'effects'
        });

        this.registerParameter('chorus.wet', {
            name: 'Chorus Amount',
            type: 'number',
            min: 0,
            max: 1,
            default: 0,
            unit: '',
            automatable: true,
            category: 'effects'
        });

        this.registerParameter('distortion.wet', {
            name: 'Distortion Amount',
            type: 'number',
            min: 0,
            max: 1,
            default: 0,
            unit: '',
            automatable: true,
            category: 'effects'
        });

        console.log('[BOPSynthBVST] Parameters initialized');
    }

    /**
     * Implement note on logic
     */
    triggerNoteOn(note, velocity, time) {
        if (!this.synthEngine) {
            console.warn('[BOPSynthBVST] Cannot trigger note: synth engine not initialized');
            return;
        }

        try {
            // Convert note to frequency if needed
            let frequency = note;
            if (typeof note === 'string') {
                const midiNote = BVSTUtils.noteToMidi(note);
                frequency = BVSTUtils.midiToFreq(midiNote);
            }

            // Check polyphony limit
            if (this.activeVoices.size >= this.maxPolyphony) {
                // Stop oldest voice
                const oldestNote = this.activeVoices.keys().next().value;
                this.triggerNoteOff(oldestNote, time);
            }

            // Trigger note on synth engine
            this.synthEngine.noteOn(note, velocity);
            
            // Track active voice
            this.activeVoices.set(note, {
                startTime: time,
                velocity: velocity
            });

            console.log(`[BOPSynthBVST] Note on: ${note} (velocity: ${velocity})`);
            
        } catch (error) {
            console.error('[BOPSynthBVST] Error triggering note on:', error);
        }
    }

    /**
     * Implement note off logic
     */
    triggerNoteOff(note, time) {
        if (!this.synthEngine) {
            return;
        }

        try {
            this.synthEngine.noteOff(note);
            this.activeVoices.delete(note);
            
            console.log(`[BOPSynthBVST] Note off: ${note}`);
            
        } catch (error) {
            console.error('[BOPSynthBVST] Error triggering note off:', error);
        }
    }

    /**
     * Stop all notes
     */
    async stopAllNotes() {
        if (!this.synthEngine) {
            return;
        }

        try {
            // Stop all active voices
            for (const note of this.activeVoices.keys()) {
                this.synthEngine.noteOff(note);
            }
            this.activeVoices.clear();
            
            console.log('[BOPSynthBVST] All notes stopped');
            
        } catch (error) {
            console.error('[BOPSynthBVST] Error stopping all notes:', error);
        }
    }

    /**
     * Apply parameter changes to the synth engine
     */
    applyParameterChange(path, value) {
        if (!this.synthEngine) {
            console.warn('[BOPSynthBVST] Cannot apply parameter: synth engine not initialized');
            return false;
        }

        try {
            // Map BVST parameter paths to SynthEngine paths
            const synthPath = this.mapParameterPath(path);
            if (synthPath) {
                this.synthEngine.setParameter(synthPath, value);
                
                // Update master volume on our output node
                if (path === 'masterVolume') {
                    this.output.gain.value = value;
                }
                
                return true;
            } else {
                console.warn(`[BOPSynthBVST] Unknown parameter path: ${path}`);
                return false;
            }
            
        } catch (error) {
            console.error(`[BOPSynthBVST] Error applying parameter ${path}:`, error);
            return false;
        }
    }

    /**
     * Map BVST parameter paths to SynthEngine parameter paths
     */
    mapParameterPath(bvstPath) {
        const pathMap = {
            'masterVolume': null, // Handled specially
            'oscillator.type': 'polySynth.oscillator.type',
            'oscillator.detune': 'polySynth.detune',
            'envelope.attack': 'polySynth.envelope.attack',
            'envelope.decay': 'polySynth.envelope.decay',
            'envelope.sustain': 'polySynth.envelope.sustain',
            'envelope.release': 'polySynth.envelope.release',
            'filter.enable': 'filter.wet',
            'filter.frequency': 'filter.frequency',
            'filter.Q': 'filter.Q',
            'reverb.wet': 'reverb.wet',
            'delay.wet': 'delay.wet',
            'delay.delayTime': 'delay.delayTime',
            'chorus.wet': 'chorus.wet',
            'distortion.wet': 'distortion.wet'
        };

        return pathMap[bvstPath] || null;
    }

    /**
     * Get current parameter value
     */
    getCurrentParameterValue(path) {
        if (!this.synthEngine) {
            const descriptor = this.parameters.get(path);
            return descriptor ? descriptor.default : null;
        }

        // For now, return the default value
        // In a full implementation, this would query the actual synth state
        const descriptor = this.parameters.get(path);
        return descriptor ? descriptor.default : null;
    }

    /**
     * Build UI for the BOP synthesizer
     */
    buildUI(container) {
        if (!container) {
            throw new Error('UI container is required');
        }

        // Create main container
        const mainContainer = document.createElement('div');
        mainContainer.className = 'bop-synth-ui';
        mainContainer.innerHTML = `
            <div class="bvst-instrument-header">
                <h3>BOP Synthesizer</h3>
                <div class="instrument-info">
                    <span class="version">v${this.constructor.getMetadata().version}</span>
                    <span class="polyphony">Voices: <span id="voiceCount">0</span>/${this.maxPolyphony}</span>
                </div>
            </div>
            <div class="control-panels" id="controlPanels"></div>
        `;

        container.appendChild(mainContainer);

        // Create control panels
        this.createControlPanels(mainContainer.querySelector('#controlPanels'));

        // Update voice count display
        this.updateVoiceCount();
    }

    /**
     * Create control panels for different parameter categories
     */
    createControlPanels(container) {
        const categories = ['master', 'oscillator', 'envelope', 'filter', 'effects'];
        
        categories.forEach(category => {
            const panel = this.createControlPanel(category);
            if (panel) {
                container.appendChild(panel);
            }
        });
    }

    /**
     * Create a control panel for a parameter category
     */
    createControlPanel(category) {
        const categoryParams = Array.from(this.parameters.values())
            .filter(param => param.category === category);
        
        if (categoryParams.length === 0) {
            return null;
        }

        const panel = document.createElement('div');
        panel.className = 'control-group';
        
        const header = document.createElement('div');
        header.className = 'group-title-row';
        header.innerHTML = `
            <input type="checkbox" id="${category}_toggle" class="group-toggle" checked />
            <h4 style="margin:0;flex:1 1 auto;">${this.capitalizeFirst(category)}</h4>
        `;
        
        const content = document.createElement('div');
        content.className = 'group-content';
        content.id = `${category}_content`;
        
        // Create controls for each parameter
        categoryParams.forEach(param => {
            const control = this.createParameterControl(param);
            if (control) {
                content.appendChild(control);
            }
        });

        panel.appendChild(header);
        panel.appendChild(content);

        // Set up toggle functionality
        const toggle = header.querySelector('.group-toggle');
        toggle.addEventListener('change', () => {
            content.style.display = toggle.checked ? 'block' : 'none';
        });

        this.controlGroups.set(category, panel);
        
        return panel;
    }

    /**
     * Create a control for a parameter
     */
    createParameterControl(param) {
        const controlRow = document.createElement('div');
        controlRow.className = 'control-row';
        
        const label = document.createElement('span');
        label.className = 'control-label';
        label.textContent = param.name;
        
        let control;
        let valueDisplay;

        switch (param.type) {
            case 'number':
                control = document.createElement('input');
                control.type = 'range';
                control.min = param.min;
                control.max = param.max;
                control.step = (param.max - param.min) / 1000;
                control.value = param.default;
                control.id = `param_${param.path.replace(/\./g, '_')}`;
                
                valueDisplay = document.createElement('span');
                valueDisplay.className = 'control-value';
                valueDisplay.textContent = `${param.default}${param.unit}`;
                
                // Add event listener
                control.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    this.setParameter(param.path, value);
                    valueDisplay.textContent = `${value.toFixed(3)}${param.unit}`;
                });
                
                break;
                
            case 'boolean':
                control = document.createElement('input');
                control.type = 'checkbox';
                control.checked = param.default;
                control.id = `param_${param.path.replace(/\./g, '_')}`;
                
                control.addEventListener('change', (e) => {
                    this.setParameter(param.path, e.target.checked);
                });
                
                break;
                
            case 'enum':
                control = document.createElement('select');
                control.id = `param_${param.path.replace(/\./g, '_')}`;
                
                param.options.forEach(option => {
                    const optionEl = document.createElement('option');
                    optionEl.value = option;
                    optionEl.textContent = option;
                    if (option === param.default) {
                        optionEl.selected = true;
                    }
                    control.appendChild(optionEl);
                });
                
                control.addEventListener('change', (e) => {
                    this.setParameter(param.path, e.target.value);
                });
                
                break;
                
            default:
                return null;
        }

        controlRow.appendChild(label);
        controlRow.appendChild(control);
        if (valueDisplay) {
            controlRow.appendChild(valueDisplay);
        }

        // Store reference for updates
        this.uiElements.set(param.path, { control, valueDisplay });
        
        return controlRow;
    }

    /**
     * Update UI from current parameter values
     */
    updateUIFromParameters() {
        for (const [path, elements] of this.uiElements) {
            const value = this.getParameter(path);
            const descriptor = this.getParameterDescriptor(path);
            
            if (elements.control && descriptor) {
                switch (descriptor.type) {
                    case 'number':
                        elements.control.value = value;
                        if (elements.valueDisplay) {
                            elements.valueDisplay.textContent = `${value.toFixed(3)}${descriptor.unit}`;
                        }
                        break;
                    case 'boolean':
                        elements.control.checked = value;
                        break;
                    case 'enum':
                        elements.control.value = value;
                        break;
                }
            }
        }
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
     * Bind UI events
     */
    bindUIEvents() {
        // Voice count updates
        this.on('noteOn', () => this.updateVoiceCount());
        this.on('noteOff', () => this.updateVoiceCount());
    }

    /**
     * Unbind UI events
     */
    unbindUIEvents() {
        // Clear event listeners
        this.uiElements.clear();
        this.controlGroups.clear();
    }

    /**
     * Destroy audio components
     */
    async destroyAudio() {
        if (this.synthEngine) {
            // The SynthEngine doesn't have a destroy method in the original code
            // So we'll just disconnect and clear references
            if (this.synthEngine.limiter) {
                this.synthEngine.limiter.disconnect();
            }
            this.synthEngine = null;
        }
        this.Tone = null;
    }

    /**
     * Get custom state (BOP-specific settings)
     */
    getCustomState() {
        return {
            activeVoices: this.activeVoices.size,
            maxPolyphony: this.maxPolyphony
        };
    }

    /**
     * Set custom state
     */
    setCustomState(customState) {
        if (customState.maxPolyphony) {
            this.maxPolyphony = customState.maxPolyphony;
        }
    }

    /**
     * Utility function to capitalize first letter
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Get instrument metadata
     */
    static getMetadata() {
        return {
            id: 'bop-synth-v6',
            name: 'BOP Synthesizer',
            version: '6.0.0',
            author: 'BOP Team',
            description: 'Blockchain-Orchestrated Polyphonic Synthesizer',
            category: 'synthesizer',
            tags: ['polyphonic', 'subtractive', 'blockchain'],
            website: 'https://bop-synth.com',
            license: 'MIT'
        };
    }
}

export default BOPSynthBVST;

