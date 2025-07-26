// modules/enhanced-effects.js
export const EnhancedEffects = {
    // Effect instances
    effects: {
        // Basic effects
        reverb: null,
        delay: null,
        filter: null,
        
        // New effects
        chorus: null,
        distortion: null,
        phaser: null,
        tremolo: null,
        vibrato: null,
        compressor: null,
        bitCrusher: null,
        
        // LFOs
        filterLFO: null,
        tremoloLFO: null,
        vibratoLFO: null,
        phaserLFO: null,
        
        // Effect chain nodes
        inputGain: null,
        outputGain: null,
        dryWetMixer: null
    },
    
    // Effect enable states
    enabled: {
        reverb: true,
        delay: true,
        filter: true,
        chorus: false,
        distortion: false,
        phaser: false,
        tremolo: false,
        vibrato: false,
        compressor: true,
        bitCrusher: false,
        filterLFO: false,
        tremoloLFO: false,
        vibratoLFO: false,
        phaserLFO: false
    },
    
    // Default settings for audible effects when enabled
    defaults: {
        reverb: { decay: 2, wet: 0.3, roomSize: 0.7 },
        delay: { delayTime: 0.25, feedback: 0.3, wet: 0.2 },
        filter: { frequency: 5000, Q: 1, type: 'lowpass' },
        chorus: { frequency: 1.5, delayTime: 3.5, depth: 0.7, wet: 0.5 },
        distortion: { distortion: 0.4, wet: 0.3 },
        phaser: { frequency: 0.5, octaves: 3, baseFrequency: 350, wet: 0.5 },
        tremolo: { frequency: 10, depth: 0.5, wet: 0.7 },
        vibrato: { frequency: 5, depth: 0.1, wet: 0.8 },
        compressor: { threshold: -24, ratio: 12, attack: 0.003, release: 0.25 },
        bitCrusher: { bits: 4, wet: 0.3 },
        filterLFO: { frequency: 0.5, min: 200, max: 2000, depth: 0.5 },
        tremoloLFO: { frequency: 4, depth: 0.3 },
        vibratoLFO: { frequency: 6, depth: 0.02 },
        phaserLFO: { frequency: 0.3, depth: 0.5 }
    },
    
    init() {
        console.log('[EnhancedEffects] Initializing enhanced effects system...');
        this.createEffects();
        this.setupAudioChain();
        this.applyDefaultSettings();
        console.log('[EnhancedEffects] Enhanced effects system initialized');
    },
    
    createEffects() {
        const e = this.effects;
        
        // Input/Output gain controls
        e.inputGain = new Tone.Gain(1);
        e.outputGain = new Tone.Gain(0.7); // Slightly reduced for safety
        
        // Basic effects (enhanced)
        e.reverb = new Tone.Reverb(this.defaults.reverb);
        e.delay = new Tone.FeedbackDelay(this.defaults.delay);
        e.filter = new Tone.Filter(this.defaults.filter);
        
        // New effects
        e.chorus = new Tone.Chorus(this.defaults.chorus);
        e.distortion = new Tone.Distortion(this.defaults.distortion);
        e.phaser = new Tone.Phaser(this.defaults.phaser);
        e.tremolo = new Tone.Tremolo(this.defaults.tremolo);
        e.vibrato = new Tone.Vibrato(this.defaults.vibrato);
        e.compressor = new Tone.Compressor(this.defaults.compressor);
        e.bitCrusher = new Tone.BitCrusher(this.defaults.bitCrusher);
        
        // LFOs for modulation
        e.filterLFO = new Tone.LFO(this.defaults.filterLFO.frequency, this.defaults.filterLFO.min, this.defaults.filterLFO.max);
        e.tremoloLFO = new Tone.LFO(this.defaults.tremoloLFO.frequency, 0, 1);
        e.vibratoLFO = new Tone.LFO(this.defaults.vibratoLFO.frequency, -this.defaults.vibratoLFO.depth, this.defaults.vibratoLFO.depth);
        e.phaserLFO = new Tone.LFO(this.defaults.phaserLFO.frequency, 0.1, 10);
        
        // Start LFOs (they'll be connected when enabled)
        Object.values(e).forEach(effect => {
            if (effect && effect.start && typeof effect.start === 'function') {
                try {
                    effect.start();
                } catch (err) {
                    console.warn('[EnhancedEffects] Could not start effect:', err);
                }
            }
        });
    },
    
    setupAudioChain() {
        const e = this.effects;
        
        // Create parallel effect chains for better performance
        // Chain 1: Filter -> Distortion -> Compressor
        const chain1 = e.inputGain.chain(e.filter, e.distortion, e.compressor);
        
        // Chain 2: Chorus -> Phaser -> Tremolo -> Vibrato
        const chain2 = e.inputGain.chain(e.chorus, e.phaser, e.tremolo, e.vibrato);
        
        // Chain 3: BitCrusher (parallel)
        const chain3 = e.inputGain.connect(e.bitCrusher);
        
        // Mix chains and add time-based effects
        const mixer = new Tone.Gain(0.33); // Mix three chains
        chain1.connect(mixer);
        chain2.connect(mixer);
        chain3.connect(mixer);
        
        // Time-based effects at the end
        mixer.chain(e.delay, e.reverb, e.outputGain);
        
        // Store references for easy access
        this.effects.mixer = mixer;
        this.effects.chain1 = chain1;
        this.effects.chain2 = chain2;
        this.effects.chain3 = chain3;
    },
    
    applyDefaultSettings() {
        // Apply default settings and enable states
        Object.keys(this.defaults).forEach(effectName => {
            if (this.effects[effectName]) {
                this.setEffectParameters(effectName, this.defaults[effectName]);
                this.toggleEffect(effectName, this.enabled[effectName]);
            }
        });
        
        // Setup LFO connections
        this.setupLFOConnections();
    },
    
    setupLFOConnections() {
        const e = this.effects;
        
        // Connect LFOs to their targets (will be enabled/disabled via wet/dry)
        if (e.filterLFO && e.filter) {
            e.filterLFO.connect(e.filter.frequency);
        }
        
        if (e.tremoloLFO && e.tremolo) {
            e.tremoloLFO.connect(e.tremolo.depth);
        }
        
        if (e.vibratoLFO && e.vibrato) {
            e.vibratoLFO.connect(e.vibrato.depth);
        }
        
        if (e.phaserLFO && e.phaser) {
            e.phaserLFO.connect(e.phaser.frequency);
        }
    },
    
    getInputNode() {
        return this.effects.inputGain;
    },
    
    getOutputNode() {
        return this.effects.outputGain;
    },
    
    toggleEffect(effectName, enabled) {
        const effect = this.effects[effectName];
        if (!effect) return;
        
        this.enabled[effectName] = enabled;
        
        // Handle different types of effects
        if (effect.wet !== undefined) {
            // Effects with wet/dry control
            if (enabled) {
                const defaultWet = this.defaults[effectName]?.wet || 0.5;
                effect.wet.value = defaultWet;
            } else {
                effect.wet.value = 0;
            }
        } else if (effectName.includes('LFO')) {
            // LFO effects
            if (enabled) {
                const depth = this.defaults[effectName]?.depth || 0.5;
                effect.amplitude.value = depth;
            } else {
                effect.amplitude.value = 0;
            }
        } else {
            // Other effects (like compressor)
            // For effects without wet control, we'll use bypass or gain
            if (effect.bypass !== undefined) {
                effect.bypass = !enabled;
            }
        }
        
        console.log(`[EnhancedEffects] ${effectName} ${enabled ? 'enabled' : 'disabled'}`);
    },
    
    setEffectParameters(effectName, params) {
        const effect = this.effects[effectName];
        if (!effect) return;
        
        Object.keys(params).forEach(param => {
            try {
                if (effect[param] !== undefined) {
                    if (effect[param].value !== undefined) {
                        effect[param].value = params[param];
                    } else {
                        effect[param] = params[param];
                    }
                }
            } catch (err) {
                console.warn(`[EnhancedEffects] Could not set ${param} on ${effectName}:`, err);
            }
        });
    },
    
    // Individual effect control methods
    setReverb(params) {
        this.setEffectParameters('reverb', params);
    },
    
    setDelay(params) {
        this.setEffectParameters('delay', params);
    },
    
    setFilter(params) {
        this.setEffectParameters('filter', params);
    },
    
    setChorus(params) {
        this.setEffectParameters('chorus', params);
    },
    
    setDistortion(params) {
        this.setEffectParameters('distortion', params);
    },
    
    setPhaser(params) {
        this.setEffectParameters('phaser', params);
    },
    
    setTremolo(params) {
        this.setEffectParameters('tremolo', params);
    },
    
    setVibrato(params) {
        this.setEffectParameters('vibrato', params);
    },
    
    setCompressor(params) {
        this.setEffectParameters('compressor', params);
    },
    
    setBitCrusher(params) {
        this.setEffectParameters('bitCrusher', params);
    },
    
    setFilterLFO(params) {
        this.setEffectParameters('filterLFO', params);
        // Update LFO range if min/max provided
        if (params.min !== undefined || params.max !== undefined) {
            const lfo = this.effects.filterLFO;
            lfo.min = params.min || this.defaults.filterLFO.min;
            lfo.max = params.max || this.defaults.filterLFO.max;
        }
    },
    
    setTremoloLFO(params) {
        this.setEffectParameters('tremoloLFO', params);
    },
    
    setVibratoLFO(params) {
        this.setEffectParameters('vibratoLFO', params);
    },
    
    setPhaserLFO(params) {
        this.setEffectParameters('phaserLFO', params);
    },
    
    // Master controls
    setMasterVolume(volume) {
        if (this.effects.outputGain) {
            this.effects.outputGain.gain.value = Math.max(0, Math.min(1, volume));
        }
    },
    
    // Preset management
    savePreset() {
        const preset = {
            enabled: { ...this.enabled },
            parameters: {}
        };
        
        // Save current parameters for each effect
        Object.keys(this.defaults).forEach(effectName => {
            const effect = this.effects[effectName];
            if (effect) {
                preset.parameters[effectName] = {};
                Object.keys(this.defaults[effectName]).forEach(param => {
                    try {
                        if (effect[param] !== undefined) {
                            preset.parameters[effectName][param] = effect[param].value || effect[param];
                        }
                    } catch (err) {
                        console.warn(`[EnhancedEffects] Could not save ${param} from ${effectName}`);
                    }
                });
            }
        });
        
        return preset;
    },
    
    loadPreset(preset) {
        if (!preset) return;
        
        // Load enabled states
        if (preset.enabled) {
            Object.keys(preset.enabled).forEach(effectName => {
                this.toggleEffect(effectName, preset.enabled[effectName]);
            });
        }
        
        // Load parameters
        if (preset.parameters) {
            Object.keys(preset.parameters).forEach(effectName => {
                this.setEffectParameters(effectName, preset.parameters[effectName]);
            });
        }
        
        console.log('[EnhancedEffects] Preset loaded');
    },
    
    // Utility methods
    getEffectsList() {
        return Object.keys(this.defaults);
    },
    
    getEffectState(effectName) {
        return {
            enabled: this.enabled[effectName],
            parameters: this.defaults[effectName]
        };
    },
    
    // Cleanup
    dispose() {
        Object.values(this.effects).forEach(effect => {
            if (effect && effect.dispose) {
                effect.dispose();
            }
        });
        console.log('[EnhancedEffects] Effects disposed');
    }
};

