// modules/enhanced-effects.js
export const EnhancedEffects = {
    effects: {
        reverb: null, delay: null, filter: null,
        chorus: null, distortion: null, phaser: null,
        tremolo: null, vibrato: null, compressor: null, bitCrusher: null,
        filterLFO: null, tremoloLFO: null, vibratoLFO: null, phaserLFO: null,
        inputGain: null, outputGain: null, dryWetMixer: null, mixer: null,
        chain1: null, chain2: null, chain3: null
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
        tremolo: { frequency: 10, depth: 0.5, wet: 0.7 }, // Wet handled by LFO
        vibrato: { frequency: 5, depth: 0.1, wet: 0.8 },  // Wet handled by LFO
        compressor: { threshold: -24, ratio: 12, attack: 0.003, release: 0.25 },
        bitCrusher: { bits: 4, wet: 0.3 },
        filterLFO: { frequency: 0.5, min: 200, max: 2000, depth: 0.5 }, // Depth controls LFO amplitude
        tremoloLFO: { frequency: 4, depth: 0.3 }, // Depth controls LFO amplitude
        vibratoLFO: { frequency: 6, depth: 0.02 }, // Depth controls LFO amplitude
        phaserLFO: { frequency: 0.3, depth: 0.5 } // Depth controls LFO amplitude
    },

    init() {
        console.log('[EnhancedEffects] Initializing enhanced effects system...');
        this.createEffects();
        this.setupAudioChain();
        this.applyDefaultSettings(); // This will also handle initial LFO connections and toggles
        console.log('[EnhancedEffects] Enhanced effects system initialized');
    },

    createEffects() {
        const d = this.defaults, e = this.effects;
        e.inputGain = new Tone.Gain(1);
        e.outputGain = new Tone.Gain(0.7);
        e.reverb     = new Tone.Reverb(d.reverb);
        e.delay      = new Tone.FeedbackDelay(d.delay);
        e.filter     = new Tone.Filter(d.filter);
        e.chorus     = new Tone.Chorus(d.chorus);
        e.distortion = new Tone.Distortion(d.distortion);
        e.phaser     = new Tone.Phaser(d.phaser);
        e.tremolo    = new Tone.Tremolo({ frequency: d.tremolo.frequency, depth: 0 }); // Start depth at 0
        e.vibrato    = new Tone.Vibrato({ frequency: d.vibrato.frequency, depth: 0 }); // Start depth at 0
        e.compressor = new Tone.Compressor(d.compressor);
        e.bitCrusher = new Tone.BitCrusher(d.bitCrusher);

        // --- LFO Creation ---
        // LFOs are created but NOT started here yet.
        // Their initial amplitude is set based on the default depth.
        e.filterLFO   = new Tone.LFO({ frequency: d.filterLFO.frequency, min: d.filterLFO.min, max: d.filterLFO.max, amplitude: 0 }); // Start amplitude at 0
        e.tremoloLFO  = new Tone.LFO({ frequency: d.tremoloLFO.frequency, min: 0, max: 1, amplitude: 0 }); // Amplitude controls tremolo depth
        e.vibratoLFO  = new Tone.LFO({ frequency: d.vibratoLFO.frequency, min: -d.vibratoLFO.depth, max: d.vibratoLFO.depth, amplitude: 0 }); // Amplitude controls vibrato depth range
        e.phaserLFO   = new Tone.LFO({ frequency: d.phaserLFO.frequency, min: 0.1, max: 10, amplitude: 0 }); // Amplitude controls phaser frequency range
        // --- End LFO Creation ---
    },

    setupAudioChain() {
        const e = this.effects;
        // Chain 1: Distortion -> Compressor
        e.chain1 = new Tone.Gain(); // Create explicit gain nodes for clarity if needed, or chain directly
        e.inputGain.connect(e.distortion);
        e.distortion.connect(e.compressor);
        e.compressor.connect(e.chain1); // Assuming chain1 acts as an output point

        // Chain 2: Chorus -> Phaser -> Tremolo -> Vibrato
        e.chain2 = new Tone.Gain();
        e.inputGain.connect(e.chorus);
        e.chorus.connect(e.phaser);
        e.phaser.connect(e.tremolo);
        e.tremolo.connect(e.vibrato);
        e.vibrato.connect(e.chain2); // Assuming chain2 acts as an output point

        // Chain 3: BitCrusher
        e.chain3 = new Tone.Gain();
        e.inputGain.connect(e.bitCrusher);
        e.bitCrusher.connect(e.chain3); // Assuming chain3 acts as an output point

        // Mixer: Combine the three chains
        const mixer = new Tone.Gain(0.33); // Adjust gain as needed for balance
        e.chain1.connect(mixer);
        e.chain2.connect(mixer);
        e.chain3.connect(mixer);
        e.mixer = mixer;

        // Final chain: Mixer -> Filter -> Delay -> Reverb -> Output
        mixer.connect(e.filter);
        e.filter.connect(e.delay);
        e.delay.connect(e.reverb);
        e.reverb.connect(e.outputGain);
    },

    applyDefaultSettings() {
         console.log('[EnhancedEffects] Applying default settings...');
        // Setup LFO connections first
        this.setupLFOConnections();

        // Apply parameters and initial toggle states for all effects (including LFOs)
        Object.keys(this.defaults).forEach(name => {
            if (this.effects[name]) {
                this.setEffectParameters(name, this.defaults[name]);
                // console.log(`[EnhancedEffects] Setting parameters for ${name}`);
                // Toggle effect based on initial enabled state
                this.toggleEffect(name, this.enabled[name]);
                 // console.log(`[EnhancedEffects] Initial toggle for ${name} to ${this.enabled[name]}`);
            } else {
                 console.warn(`[EnhancedEffects] Effect ${name} not found during default settings application.`);
            }
        });
        console.log('[EnhancedEffects] Default settings applied.');
    },

    setupLFOConnections() {
        const e = this.effects;
        console.log('[EnhancedEffects] Setting up LFO connections...');
        // Connect LFO outputs to the parameters they modulate
        e.filterLFO?.connect(e.filter?.frequency);
        e.tremoloLFO?.connect(e.tremolo?.depth); // Tremolo LFO modulates tremolo depth
        e.vibratoLFO?.connect(e.vibrato?.depth); // Vibrato LFO modulates vibrato depth
        e.phaserLFO?.connect(e.phaser?.frequency); // Phaser LFO modulates phaser frequency
        console.log('[EnhancedEffects] LFO connections established.');
    },

    getInputNode() { return this.effects.inputGain; },
    getOutputNode() { return this.effects.outputGain; },

    toggleEffect(effectName, enabled) {
        const effect = this.effects[effectName];
        if (!effect) {
            console.warn(`[EnhancedEffects] Cannot toggle ${effectName}, effect not found.`);
            return;
        }
        this.enabled[effectName] = enabled;
        console.log(`[EnhancedEffects] Toggling ${effectName} to ${enabled}`);

        // --- Handle Standard Wet/Dry Effects ---
        if (effect.wet !== undefined) {
             console.log(`[EnhancedEffects] Setting wet for ${effectName} to ${enabled ? (this.defaults[effectName]?.wet ?? 0.5) : 0}`);
            effect.wet.value = enabled ? (this.defaults[effectName]?.wet ?? 0.5) : 0;

        // --- Handle LFOs Specifically ---
        } else if (effectName.endsWith('LFO')) {
            // For LFOs, we control the amplitude of the LFO oscillator.
            // An amplitude of 0 means no modulation.
            // The actual depth/range is controlled by the LFO's min/max or the parameter it's connected to.
            const targetAmplitude = enabled ? (this.defaults[effectName]?.depth ?? 0.5) : 0;
             console.log(`[EnhancedEffects] Setting amplitude for ${effectName} to ${targetAmplitude}`);
            effect.amplitude.rampTo(targetAmplitude, 0.01); // Smooth transition

            // Ensure the LFO is started if it's an LFO type effect.
            // It's generally safe to call start multiple times if already started.
            if (enabled && effect.start) {
                 console.log(`[EnhancedEffects] Starting LFO ${effectName}`);
                effect.start(); // Start the LFO oscillator if enabling
            }
            // Note: We usually don't stop LFOs, just set amplitude to 0.

        // --- Handle Effects with Bypass (like Tremolo, Vibrato if they have it) ---
        } else if ('bypass' in effect) {
             console.log(`[EnhancedEffects] Setting bypass for ${effectName} to ${!enabled}`);
            effect.bypass = !enabled; // Bypass is true when disabled

        } else {
             console.log(`[EnhancedEffects] No specific toggle action defined for ${effectName}, assumed always active in chain.`);
            // Effects like Filter, Compressor are always in the chain, their parameters (like frequency, gain) control their effect.
            // If they need enable/disable, they might need a Gain node or wet/dry mix.
        }
        console.log(`[EnhancedEffects] ${effectName} ${enabled ? 'enabled' : 'disabled'}`);
    },

    setEffectParameters(effectName, params) {
        const effect = this.effects[effectName];
        if (!effect) {
             console.warn(`[EnhancedEffects] Cannot set parameters for ${effectName}, effect not found.`);
            return;
        }
        // console.log(`[EnhancedEffects] Setting parameters for ${effectName}:`, params);
        for (const [k, v] of Object.entries(params)) {
            try {
                // --- Special Handling for LFO Parameters ---
                if (effectName.endsWith('LFO')) {
                    if (k === 'depth') {
                        // Depth for LFOs typically controls the amplitude of the LFO
                        // We don't set 'depth' directly on the LFO object, we use amplitude
                        // The toggleEffect function handles setting amplitude based on 'depth' and enabled state
                         console.log(`[EnhancedEffects] Parameter 'depth' for ${effectName} handled via amplitude in toggleEffect.`);
                         // Optionally, update the default if needed for future toggles:
                         if (this.defaults[effectName]) {
                             this.defaults[effectName][k] = v;
                         }
                    } else if (k === 'min' || k === 'max') {
                         console.log(`[EnhancedEffects] Setting ${k} for ${effectName} to ${v}`);
                        // Directly set min/max for LFO range
                        effect[k] = v;
                        // Update default for consistency if needed elsewhere
                         if (this.defaults[effectName]) {
                             this.defaults[effectName][k] = v;
                         }
                    } else {
                        // For frequency and other standard LFO parameters
                         console.log(`[EnhancedEffects] Setting ${k} for ${effectName} to ${v}`);
                        if (effect[k]?.value !== undefined) {
                            effect[k].value = v;
                        } else {
                            effect[k] = v;
                        }
                         // Update default
                         if (this.defaults[effectName]) {
                             this.defaults[effectName][k] = v;
                         }
                    }
                }
                // --- Special Handling for Tremolo/Vibrato Depth ---
                else if ((effectName === 'tremolo' || effectName === 'vibrato') && k === 'depth') {
                     console.log(`[EnhancedEffects] Setting ${k} for ${effectName} to ${v} (via parameter)`);
                    // These effects have a 'depth' parameter that the LFO connects to
                    if (effect[k]?.value !== undefined) {
                        effect[k].value = v;
                    } else {
                        effect[k] = v;
                    }
                     if (this.defaults[effectName]) {
                         this.defaults[effectName][k] = v;
                     }
                }
                // --- Standard Parameter Setting ---
                else {
                    if (effect[k] !== undefined) {
                         console.log(`[EnhancedEffects] Setting ${k} for ${effectName} to ${v} (standard)`);
                        if (effect[k]?.value !== undefined) {
                            effect[k].value = v;
                        } else {
                            effect[k] = v;
                        }
                         // Update default
                         if (this.defaults[effectName]) {
                             this.defaults[effectName][k] = v;
                         }
                    } else {
                         console.warn(`[EnhancedEffects] Parameter ${k} not found on effect ${effectName}`);
                    }
                }
            } catch (err) {
                console.warn(`[EnhancedEffects] Could not set ${k} on ${effectName}:`, err);
            }
        }
    },

    // Effect param setters (API) - These now primarily delegate to setEffectParameters
    setReverb(p)     { this.setEffectParameters('reverb',     p); },
    setDelay(p)      { this.setEffectParameters('delay',      p); },
    setFilter(p)     { this.setEffectParameters('filter',     p); },
    setChorus(p)     { this.setEffectParameters('chorus',     p); },
    setDistortion(p) { this.setEffectParameters('distortion', p); },
    setPhaser(p)     { this.setEffectParameters('phaser',     p); },
    setTremolo(p)    { this.setEffectParameters('tremolo',    p); },
    setVibrato(p)    { this.setEffectParameters('vibrato',    p); },
    setCompressor(p) { this.setEffectParameters('compressor', p); },
    setBitCrusher(p) { this.setEffectParameters('bitCrusher', p); },
    setFilterLFO(p)   { this.setEffectParameters('filterLFO',   p); },
    setTremoloLFO(p)  { this.setEffectParameters('tremoloLFO',  p); },
    setVibratoLFO(p)  { this.setEffectParameters('vibratoLFO',  p); },
    setPhaserLFO(p)   { this.setEffectParameters('phaserLFO',   p); },

    setMasterVolume(vol) {
        if (this.effects.outputGain) {
            const clampedVol = Math.max(0, Math.min(1, vol));
             console.log(`[EnhancedEffects] Setting master volume to ${clampedVol}`);
            this.effects.outputGain.gain.value = clampedVol;
        }
    },

    savePreset() {
        const snap = (fx, def) => {
            const state = {};
            for (const key of Object.keys(def)) {
                // Handle special cases if needed in the future
                state[key] = fx[key]?.value ?? fx[key];
            }
            return state;
        };

        return {
            enabled: { ...this.enabled },
            parameters: Object.fromEntries(
                Object.entries(this.defaults)
                    .map(([k, def]) => [k, this.effects[k] ? snap(this.effects[k], def) : {}])
            )
        };
    },

    loadPreset(preset) {
        if (!preset) {
            console.warn('[EnhancedEffects] No preset provided to load.');
            return;
        }
        console.log('[EnhancedEffects] Loading preset...');
        if (preset.enabled) {
            // console.log('[EnhancedEffects] Loading enabled states:', preset.enabled);
            Object.entries(preset.enabled).forEach(([k, v]) => {
                // console.log(`[EnhancedEffects] Loading enable state for ${k}: ${v}`);
                this.toggleEffect(k, v);
            });
        }
        if (preset.parameters) {
            // console.log('[EnhancedEffects] Loading parameters:', preset.parameters);
            Object.entries(preset.parameters).forEach(([k, v]) => {
                // console.log(`[EnhancedEffects] Loading parameters for ${k}:`, v);
                this.setEffectParameters(k, v);
            });
        }
        console.log('[EnhancedEffects] Preset loaded');
    },

    getEffectsList() { return Object.keys(this.defaults); },
    getEffectState(effectName) { return { enabled: this.enabled[effectName], parameters: this.defaults[effectName] || {} }; },

    dispose() {
        Object.values(this.effects).forEach(e => {
            if (e && typeof e.dispose === 'function') {
                // console.log(`[EnhancedEffects] Disposing effect:`, e.constructor.name);
                e.dispose();
            }
        });
        console.log('[EnhancedEffects] Effects disposed');
    }
};