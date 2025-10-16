 // --- from enhanced-effects.js ---
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
        e.inputGain = new Tone.Gain(1);
        e.outputGain = new Tone.Gain(0.7);
        e.reverb     = new Tone.Reverb(d.reverb);
        e.delay      = new Tone.FeedbackDelay(d.delay);
        e.filter     = new Tone.Filter(d.filter);
        e.chorus     = new Tone.Chorus(d.chorus);
        e.distortion = new Tone.Distortion(d.distortion);
        e.phaser     = new Tone.Phaser(d.phaser);
        e.tremolo    = new Tone.Tremolo({ frequency: d.tremolo.frequency, depth: 0 });
        e.vibrato    = new Tone.Vibrato({ frequency: d.vibrato.frequency, depth: 0 });
        e.compressor = new Tone.Compressor(d.compressor);
        e.bitCrusher = new Tone.BitCrusher(d.bitCrusher);

        // LFOs
        e.filterLFO   = new Tone.LFO({ frequency: d.filterLFO.frequency, min: d.filterLFO.min, max: d.filterLFO.max, amplitude: 0 });
        e.tremoloLFO  = new Tone.LFO({ frequency: d.tremoloLFO.frequency, min: 0, max: 1, amplitude: 0 });
        e.vibratoLFO  = new Tone.LFO({ frequency: d.vibratoLFO.frequency, min: -d.vibratoLFO.depth, max: d.vibratoLFO.depth, amplitude: 0 });
        e.phaserLFO   = new Tone.LFO({ frequency: d.phaserLFO.frequency, min: 0.1, max: 10, amplitude: 0 });
    },

    setupAudioChain() {
        const e = this.effects;
        // Distortion -> Compressor
        e.chain1 = new Tone.Gain();
        e.inputGain.connect(e.distortion);
        e.distortion.connect(e.compressor);
        e.compressor.connect(e.chain1);

        // Chorus -> Phaser -> Tremolo -> Vibrato
        e.chain2 = new Tone.Gain();
        e.inputGain.connect(e.chorus);
        e.chorus.connect(e.phaser);
        e.phaser.connect(e.tremolo);
        e.tremolo.connect(e.vibrato);
        e.vibrato.connect(e.chain2);

        // BitCrusher
        e.chain3 = new Tone.Gain();
        e.inputGain.connect(e.bitCrusher);
        e.bitCrusher.connect(e.chain3);

        // Mixer
        const mixer = new Tone.Gain(0.33);
        e.chain1.connect(mixer);
        e.chain2.connect(mixer);
        e.chain3.connect(mixer);
        e.mixer = mixer;

        // Mixer -> Filter -> Delay -> Reverb -> Output
        mixer.connect(e.filter);
        e.filter.connect(e.delay);
        e.delay.connect(e.reverb);
        e.reverb.connect(e.outputGain);
    },

    applyDefaultSettings() {
        console.log('[EnhancedEffects] Applying default settings...');
        this.setupLFOConnections();
        Object.keys(this.defaults).forEach(name => {
            if (this.effects[name]) {
                this.setEffectParameters(name, this.defaults[name]);
                this.toggleEffect(name, this.enabled[name]);
            } else {
                console.warn(`[EnhancedEffects] Effect ${name} not found during default settings application.`);
            }
        });
        console.log('[EnhancedEffects] Default settings applied.');
    },

    setupLFOConnections() {
        const e = this.effects;
        console.log('[EnhancedEffects] Setting up LFO connections...');
        e.filterLFO?.connect(e.filter?.frequency);
        e.tremoloLFO?.connect(e.tremolo?.depth);
        e.vibratoLFO?.connect(e.vibrato?.depth);
        e.phaserLFO?.connect(e.phaser?.frequency);
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
        if (effect.wet !== undefined) {
            effect.wet.value = enabled ? (this.defaults[effectName]?.wet ?? 0.5) : 0;
        } else if (effectName.endsWith('LFO')) {
            const targetAmplitude = enabled ? (this.defaults[effectName]?.depth ?? 0.5) : 0;
            effect.amplitude.rampTo(targetAmplitude, 0.01);
            if (enabled && effect.start) effect.start();
        } else if ('bypass' in effect) {
            effect.bypass = !enabled;
        }
        // For always-in-chain effects: no toggle, control via params only.
        console.log(`[EnhancedEffects] ${effectName} ${enabled ? 'enabled' : 'disabled'}`);
    },

    setEffectParameters(effectName, params) {
        const effect = this.effects[effectName];
        if (!effect) {
            console.warn(`[EnhancedEffects] Cannot set parameters for ${effectName}, effect not found.`);
            return;
        }
        for (const [k, v] of Object.entries(params)) {
            try {
                if (effectName.endsWith('LFO')) {
                    if (k === 'depth') {
                        if (this.defaults[effectName]) this.defaults[effectName][k] = v;
                    } else if (k === 'min' || k === 'max') {
                        effect[k] = v;
                        if (this.defaults[effectName]) this.defaults[effectName][k] = v;
                    } else {
                        if (effect[k]?.value !== undefined) effect[k].value = v;
                        else effect[k] = v;
                        if (this.defaults[effectName]) this.defaults[effectName][k] = v;
                    }
                } else if ((effectName === 'tremolo' || effectName === 'vibrato') && k === 'depth') {
                    if (effect[k]?.value !== undefined) effect[k].value = v;
                    else effect[k] = v;
                    if (this.defaults[effectName]) this.defaults[effectName][k] = v;
                } else {
                    if (effect[k] !== undefined) {
                        if (effect[k]?.value !== undefined) effect[k].value = v;
                        else effect[k] = v;
                        if (this.defaults[effectName]) this.defaults[effectName][k] = v;
                    } else {
                        console.warn(`[EnhancedEffects] Parameter ${k} not found on effect ${effectName}`);
                    }
                }
            } catch (err) {
                console.warn(`[EnhancedEffects] Could not set ${k} on ${effectName}:`, err);
            }
        }
    },

    // API setters
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
            this.effects.outputGain.gain.value = clampedVol;
        }
    },

    savePreset() {
        const snap = (fx, def) =>
            Object.fromEntries(Object.keys(def).map(key => [key, fx[key]?.value ?? fx[key]]));
        return {
            enabled: { ...this.enabled },
            parameters: Object.fromEntries(
                Object.entries(this.defaults).map(([k, def]) =>
                    [k, this.effects[k] ? snap(this.effects[k], def) : {}]
                )
            )
        };
    },

    loadPreset(preset) {
        if (!preset) {
            console.warn('[EnhancedEffects] No preset provided to load.');
            return;
        }
        if (preset.enabled)
            Object.entries(preset.enabled).forEach(([k, v]) => this.toggleEffect(k, v));
        if (preset.parameters)
            Object.entries(preset.parameters).forEach(([k, v]) => this.setEffectParameters(k, v));
    },

    getEffectsList() { return Object.keys(this.defaults); },
    getEffectState(effectName) { return { enabled: this.enabled[effectName], parameters: this.defaults[effectName] || {} }; },

    dispose() {
        Object.values(this.effects).forEach(e => e?.dispose?.());
    }
};

    
   