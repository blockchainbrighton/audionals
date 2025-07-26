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
        e.tremolo    = new Tone.Tremolo(d.tremolo);
        e.vibrato    = new Tone.Vibrato(d.vibrato);
        e.compressor = new Tone.Compressor(d.compressor);
        e.bitCrusher = new Tone.BitCrusher(d.bitCrusher);

        // LFOs
        e.filterLFO   = new Tone.LFO(d.filterLFO.frequency, d.filterLFO.min, d.filterLFO.max);
        e.tremoloLFO  = new Tone.LFO(d.tremoloLFO.frequency, 0, 1);
        e.vibratoLFO  = new Tone.LFO(d.vibratoLFO.frequency, -d.vibratoLFO.depth, d.vibratoLFO.depth);
        e.phaserLFO   = new Tone.LFO(d.phaserLFO.frequency, 0.1, 10);

        // Start all LFOs
        Object.values(e).forEach(fx => fx?.start?.());
    },

    setupAudioChain() {
        const e = this.effects;
        e.chain1 = e.inputGain.chain(e.filter, e.distortion, e.compressor);
        e.chain2 = e.inputGain.chain(e.chorus, e.phaser, e.tremolo, e.vibrato);
        e.chain3 = e.inputGain.connect(e.bitCrusher);
        const mixer = new Tone.Gain(0.33);
        e.chain1.connect(mixer); e.chain2.connect(mixer); e.chain3.connect(mixer);
        mixer.chain(e.delay, e.reverb, e.outputGain);
        e.mixer = mixer;
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
        e.filterLFO?.connect(e.filter?.frequency);
        e.tremoloLFO?.connect(e.tremolo?.depth);
        e.vibratoLFO?.connect(e.vibrato?.depth);
        e.phaserLFO?.connect(e.phaser?.frequency);
    },

    getInputNode() { return this.effects.inputGain; },
    getOutputNode() { return this.effects.outputGain; },

    toggleEffect(effectName, enabled) {
        const effect = this.effects[effectName];
        if (!effect) return;
        this.enabled[effectName] = enabled;

        if (effect.wet !== undefined) {
            effect.wet.value = enabled ? (this.defaults[effectName]?.wet ?? 0.5) : 0;
        } else if (effectName.endsWith('LFO')) {
            effect.amplitude.value = enabled ? (this.defaults[effectName]?.depth ?? 0.5) : 0;
        } else if ('bypass' in effect) {
            effect.bypass = !enabled;
        }
        console.log(`[EnhancedEffects] ${effectName} ${enabled ? 'enabled' : 'disabled'}`);
    },

    setEffectParameters(effectName, params) {
        const effect = this.effects[effectName];
        if (!effect) return;
        for (const [k, v] of Object.entries(params)) {
            try {
                if (effect[k] !== undefined) {
                    effect[k]?.value !== undefined ? effect[k].value = v : effect[k] = v;
                }
            } catch (err) {
                console.warn(`[EnhancedEffects] Could not set ${k} on ${effectName}:`, err);
            }
        }
    },

    // Effect param setters (API)
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
    setFilterLFO(p) {
        this.setEffectParameters('filterLFO', p);
        const lfo = this.effects.filterLFO, d = this.defaults.filterLFO;
        if (p.min !== undefined || p.max !== undefined) {
            lfo.min = p.min ?? d.min;
            lfo.max = p.max ?? d.max;
        }
    },
    setTremoloLFO(p) { this.setEffectParameters('tremoloLFO', p); },
    setVibratoLFO(p) { this.setEffectParameters('vibratoLFO', p); },
    setPhaserLFO(p)  { this.setEffectParameters('phaserLFO',  p); },

    setMasterVolume(vol) {
        this.effects.outputGain && (this.effects.outputGain.gain.value = Math.max(0, Math.min(1, vol)));
    },

    savePreset() {
        const snap = (fx, def) => Object.fromEntries(
            Object.keys(def).map(k =>
                [k, fx[k]?.value ?? fx[k]]
            )
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
        preset.enabled && Object.entries(preset.enabled).forEach(([k, v]) => this.toggleEffect(k, v));
        preset.parameters && Object.entries(preset.parameters).forEach(([k, v]) => this.setEffectParameters(k, v));
        console.log('[EnhancedEffects] Preset loaded');
    },

    getEffectsList() { return Object.keys(this.defaults); },
    getEffectState(effectName) { return { enabled: this.enabled[effectName], parameters: this.defaults[effectName] }; },

    dispose() {
        Object.values(this.effects).forEach(e => e?.dispose?.());
        console.log('[EnhancedEffects] Effects disposed');
    }
};
