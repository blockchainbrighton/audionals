// modules/enhanced-effects-fixed.js
export const EnhancedEffects = {
    effects: {
        reverb: null, delay: null, filter: null,
        chorus: null, distortion: null, phaser: null,
        tremolo: null, vibrato: null, compressor: null, bitCrusher: null,
        filterLFO: null, tremoloLFO: null, vibratoLFO: null, phaserLFO: null,
        inputGain: null, outputGain: null, 
        // Individual bypass gains for proper effect switching
        filterBypass: null, chorusBypass: null, phaserBypass: null,
        tremoloBypass: null, vibratoBypass: null, compressorBypass: null,
        distortionBypass: null, bitCrusherBypass: null, delayBypass: null, reverbBypass: null
    },
    enabled: {
        reverb: true, delay: true, filter: true,
        chorus: false, distortion: false, phaser: false,
        tremolo: false, vibrato: false, compressor: true, bitCrusher: false,
        filterLFO: false, tremoloLFO: false, vibratoLFO: false, phaserLFO: false
    },
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
        const d = this.defaults, e = this.effects;
        
        // Main gain nodes
        e.inputGain = new Tone.Gain(1);
        e.outputGain = new Tone.Gain(0.7);
        
        // Create all effects
        e.reverb = new Tone.Reverb(d.reverb);
        e.delay = new Tone.FeedbackDelay(d.delay);
        e.filter = new Tone.Filter(d.filter);
        e.chorus = new Tone.Chorus(d.chorus);
        e.distortion = new Tone.Distortion(d.distortion);
        e.phaser = new Tone.Phaser(d.phaser);
        e.tremolo = new Tone.Tremolo(d.tremolo);
        e.vibrato = new Tone.Vibrato(d.vibrato);
        e.compressor = new Tone.Compressor(d.compressor);
        e.bitCrusher = new Tone.BitCrusher(d.bitCrusher);

        // Create bypass gains for proper effect switching
        e.filterBypass = new Tone.Gain(1);
        e.chorusBypass = new Tone.Gain(1);
        e.phaserBypass = new Tone.Gain(1);
        e.tremoloBypass = new Tone.Gain(1);
        e.vibratoBypass = new Tone.Gain(1);
        e.compressorBypass = new Tone.Gain(1);
        e.distortionBypass = new Tone.Gain(1);
        e.bitCrusherBypass = new Tone.Gain(1);
        e.delayBypass = new Tone.Gain(1);
        e.reverbBypass = new Tone.Gain(1);

        // Create LFOs
        e.filterLFO = new Tone.LFO(d.filterLFO.frequency, d.filterLFO.min, d.filterLFO.max);
        e.tremoloLFO = new Tone.LFO(d.tremoloLFO.frequency, 0, 1);
        e.vibratoLFO = new Tone.LFO(d.vibratoLFO.frequency, -d.vibratoLFO.depth, d.vibratoLFO.depth);
        e.phaserLFO = new Tone.LFO(d.phaserLFO.frequency, 0.1, 10);

        // Start all LFOs
        e.filterLFO.start();
        e.tremoloLFO.start();
        e.vibratoLFO.start();
        e.phaserLFO.start();
    },

    setupAudioChain() {
        const e = this.effects;
        
        // Create a proper series audio chain:
        // Input -> Filter -> Modulation Effects -> Distortion -> Dynamics -> Time-based -> Output
        
        // Filter stage (with bypass)
        e.inputGain.connect(e.filter);
        e.inputGain.connect(e.filterBypass);
        
        // Modulation effects stage
        const modulationMixer = new Tone.Gain(1);
        e.filter.connect(modulationMixer);
        e.filterBypass.connect(modulationMixer);
        
        // Chorus path
        modulationMixer.connect(e.chorus);
        modulationMixer.connect(e.chorusBypass);
        const chorusMixer = new Tone.Gain(1);
        e.chorus.connect(chorusMixer);
        e.chorusBypass.connect(chorusMixer);
        
        // Phaser path
        chorusMixer.connect(e.phaser);
        chorusMixer.connect(e.phaserBypass);
        const phaserMixer = new Tone.Gain(1);
        e.phaser.connect(phaserMixer);
        e.phaserBypass.connect(phaserMixer);
        
        // Tremolo path
        phaserMixer.connect(e.tremolo);
        phaserMixer.connect(e.tremoloBypass);
        const tremoloMixer = new Tone.Gain(1);
        e.tremolo.connect(tremoloMixer);
        e.tremoloBypass.connect(tremoloMixer);
        
        // Vibrato path
        tremoloMixer.connect(e.vibrato);
        tremoloMixer.connect(e.vibratoBypass);
        const vibratoMixer = new Tone.Gain(1);
        e.vibrato.connect(vibratoMixer);
        e.vibratoBypass.connect(vibratoMixer);
        
        // Distortion stage
        vibratoMixer.connect(e.distortion);
        vibratoMixer.connect(e.distortionBypass);
        const distortionMixer = new Tone.Gain(1);
        e.distortion.connect(distortionMixer);
        e.distortionBypass.connect(distortionMixer);
        
        // BitCrusher path (parallel to distortion)
        vibratoMixer.connect(e.bitCrusher);
        vibratoMixer.connect(e.bitCrusherBypass);
        const bitCrusherMixer = new Tone.Gain(1);
        e.bitCrusher.connect(bitCrusherMixer);
        e.bitCrusherBypass.connect(bitCrusherMixer);
        
        // Mix distortion and bitcrusher
        const distortionStageMixer = new Tone.Gain(0.5);
        distortionMixer.connect(distortionStageMixer);
        bitCrusherMixer.connect(distortionStageMixer);
        
        // Dynamics stage (compressor)
        distortionStageMixer.connect(e.compressor);
        distortionStageMixer.connect(e.compressorBypass);
        const compressorMixer = new Tone.Gain(1);
        e.compressor.connect(compressorMixer);
        e.compressorBypass.connect(compressorMixer);
        
        // Time-based effects stage
        // Delay path
        compressorMixer.connect(e.delay);
        compressorMixer.connect(e.delayBypass);
        const delayMixer = new Tone.Gain(1);
        e.delay.connect(delayMixer);
        e.delayBypass.connect(delayMixer);
        
        // Reverb path
        delayMixer.connect(e.reverb);
        delayMixer.connect(e.reverbBypass);
        const reverbMixer = new Tone.Gain(1);
        e.reverb.connect(reverbMixer);
        e.reverbBypass.connect(reverbMixer);
        
        // Final output
        reverbMixer.connect(e.outputGain);
        
        // Store mixer references for bypass control
        e.modulationMixer = modulationMixer;
        e.chorusMixer = chorusMixer;
        e.phaserMixer = phaserMixer;
        e.tremoloMixer = tremoloMixer;
        e.vibratoMixer = vibratoMixer;
        e.distortionMixer = distortionMixer;
        e.bitCrusherMixer = bitCrusherMixer;
        e.distortionStageMixer = distortionStageMixer;
        e.compressorMixer = compressorMixer;
        e.delayMixer = delayMixer;
        e.reverbMixer = reverbMixer;
    },

    applyDefaultSettings() {
        Object.keys(this.defaults).forEach(name => {
            if (this.effects[name]) {
                this.setEffectParameters(name, this.defaults[name]);
                this.toggleEffect(name, this.enabled[name]);
            }
        });
        this.setupLFOConnections();
    },

    setupLFOConnections() {
        const e = this.effects;
        
        // Connect LFOs to their targets
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
        
        console.log('[EnhancedEffects] LFO connections established');
    },

    getInputNode() { return this.effects.inputGain; },
    getOutputNode() { return this.effects.outputGain; },

    toggleEffect(effectName, enabled) {
        const effect = this.effects[effectName];
        const bypassGain = this.effects[effectName + 'Bypass'];
        
        if (!effect) return;
        
        this.enabled[effectName] = enabled;

        if (effectName.endsWith('LFO')) {
            // Handle LFO toggling
            if (enabled) {
                effect.amplitude.value = this.defaults[effectName]?.depth ?? 0.5;
            } else {
                effect.amplitude.value = 0;
            }
        } else if (effectName === 'filter') {
            // Handle filter bypass
            if (enabled) {
                this.effects.filterBypass.gain.value = 0;
            } else {
                this.effects.filterBypass.gain.value = 1;
            }
        } else if (bypassGain) {
            // Handle other effects with bypass gains
            if (enabled) {
                bypassGain.gain.value = 0;
            } else {
                bypassGain.gain.value = 1;
            }
        } else if (effect.wet !== undefined) {
            // Fallback to wet/dry control
            effect.wet.value = enabled ? (this.defaults[effectName]?.wet ?? 0.5) : 0;
        }
        
        console.log(`[EnhancedEffects] ${effectName} ${enabled ? 'enabled' : 'disabled'}`);
    },

    setEffectParameters(effectName, params) {
        const effect = this.effects[effectName];
        if (!effect) return;
        
        for (const [k, v] of Object.entries(params)) {
            try {
                if (effect[k] !== undefined) {
                    if (effect[k]?.value !== undefined) {
                        effect[k].value = v;
                    } else {
                        effect[k] = v;
                    }
                }
            } catch (err) {
                console.warn(`[EnhancedEffects] Could not set ${k} on ${effectName}:`, err);
            }
        }
    },

    // Effect param setters (API)
    setReverb(p) { this.setEffectParameters('reverb', p); },
    setDelay(p) { this.setEffectParameters('delay', p); },
    setFilter(p) { this.setEffectParameters('filter', p); },
    setChorus(p) { this.setEffectParameters('chorus', p); },
    setDistortion(p) { this.setEffectParameters('distortion', p); },
    setPhaser(p) { this.setEffectParameters('phaser', p); },
    setTremolo(p) { this.setEffectParameters('tremolo', p); },
    setVibrato(p) { this.setEffectParameters('vibrato', p); },
    setCompressor(p) { this.setEffectParameters('compressor', p); },
    setBitCrusher(p) { this.setEffectParameters('bitCrusher', p); },
    
    setFilterLFO(p) {
        this.setEffectParameters('filterLFO', p);
        const lfo = this.effects.filterLFO, d = this.defaults.filterLFO;
        if (p.min !== undefined || p.max !== undefined) {
            lfo.min = p.min ?? d.min;
            lfo.max = p.max ?? d.max;
        }
        if (p.depth !== undefined && this.enabled.filterLFO) {
            lfo.amplitude.value = p.depth;
        }
    },
    
    setTremoloLFO(p) { 
        this.setEffectParameters('tremoloLFO', p);
        if (p.depth !== undefined && this.enabled.tremoloLFO) {
            this.effects.tremoloLFO.amplitude.value = p.depth;
        }
    },
    
    setVibratoLFO(p) { 
        this.setEffectParameters('vibratoLFO', p);
        if (p.depth !== undefined && this.enabled.vibratoLFO) {
            this.effects.vibratoLFO.amplitude.value = p.depth;
        }
    },
    
    setPhaserLFO(p) { 
        this.setEffectParameters('phaserLFO', p);
        if (p.depth !== undefined && this.enabled.phaserLFO) {
            this.effects.phaserLFO.amplitude.value = p.depth;
        }
    },

    setMasterVolume(vol) {
        if (this.effects.outputGain) {
            this.effects.outputGain.gain.value = Math.max(0, Math.min(1, vol));
        }
    },

    savePreset() {
        const snap = (fx, def) => Object.fromEntries(
            Object.keys(def).map(k => [k, fx[k]?.value ?? fx[k]])
        );
        return {
            enabled: { ...this.enabled },
            parameters: Object.fromEntries(
                Object.entries(this.defaults)
                    .map(([k, def]) => [k, this.effects[k] ? snap(this.effects[k], def) : {}])
            )
        };
    },

    loadPreset(preset) {
        if (!preset) return;
        if (preset.enabled) {
            Object.entries(preset.enabled).forEach(([k, v]) => this.toggleEffect(k, v));
        }
        if (preset.parameters) {
            Object.entries(preset.parameters).forEach(([k, v]) => this.setEffectParameters(k, v));
        }
        console.log('[EnhancedEffects] Preset loaded');
    },

    getEffectsList() { return Object.keys(this.defaults); },
    getEffectState(effectName) { 
        return { 
            enabled: this.enabled[effectName], 
            parameters: this.defaults[effectName] 
        }; 
    },

    dispose() {
        Object.values(this.effects).forEach(e => e?.dispose?.());
        console.log('[EnhancedEffects] Effects disposed');
    }
};

