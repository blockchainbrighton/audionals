// modules/envelope.js
export const EnvelopeManager = {
    defaultEnvelope: {
        attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3,
        attackCurve: 'exponential', decayCurve: 'exponential', releaseCurve: 'exponential'
    },
    presets: {
        piano:   { attack: 0.01, decay: 0.3, sustain: 0.4, release: 1.2 },
        organ:   { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.1 },
        strings: { attack: 0.3,  decay: 0.2, sustain: 0.8, release: 1.5 },
        brass:   { attack: 0.1,  decay: 0.2, sustain: 0.7, release: 0.8 },
        pad:     { attack: 1.0,  decay: 0.5, sustain: 0.6, release: 2.0 },
        pluck:   { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
        bass:    { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.4 }
    },
    currentEnvelope: null,

    init() {
        this.currentEnvelope = { ...this.defaultEnvelope };
        console.log('[EnvelopeManager] Initialized with default envelope');
    },

    createEnvelope() { return { ...this.currentEnvelope }; },

    setParameter(param, value) {
        if (!(param in this.currentEnvelope)) return;
        const clamp = (v, min, max) => Math.max(min, Math.min(max, +v));
        if (['attack', 'decay', 'release'].includes(param)) value = clamp(value, 0.001, 5.0);
        if (param === 'sustain') value = clamp(value, 0, 1);
        if (['attackCurve', 'decayCurve', 'releaseCurve'].includes(param) &&
            !['linear', 'exponential'].includes(value)) value = 'exponential';
        this.currentEnvelope[param] = value;
        this.updateSynth();
        console.log(`[EnvelopeManager] Set ${param} to ${value}`);
    },

    loadPreset(name) {
        if (!this.presets[name]) return;
        this.currentEnvelope = { ...this.defaultEnvelope, ...this.presets[name] };
        this.updateSynth(); this.updateUI();
        console.log(`[EnvelopeManager] Loaded preset: ${name}`);
    },

    updateSynth() {
        if (window.synthApp?.synth)
            window.synthApp.synth.set({ envelope: this.createEnvelope() }),
            console.log('[EnvelopeManager] Updated synth envelope');
    },

    updateUI() {
        const p = document.getElementById('control-panel');
        if (!p) return;
        const env = this.currentEnvelope;
        [
            ['#envelopeAttack',   env.attack,   3],
            ['#envelopeDecay',    env.decay,    3],
            ['#envelopeSustain',  env.sustain,  2],
            ['#envelopeRelease',  env.release,  3]
        ].forEach(([id, val, dp]) => {
            const s = p.querySelector(id);
            const v = p.querySelector(id + 'Val');
            if (s) s.value = val;
            if (v) v.textContent = (+val).toFixed(dp);
        });
    },

    getSettings() { return { ...this.currentEnvelope }; },
    setSettings(settings) {
        this.currentEnvelope = { ...this.defaultEnvelope, ...settings };
        this.updateSynth(); this.updateUI();
    }
};

// ---- Audio Safety ----
export const AudioSafety = {
    maxPolyphony: 16,
    masterVolume: 0.7,
    limiterThreshold: -3,
    limiterRatio: 10,
    masterLimiter: null,
    masterGainNode: null,
    dcBlocker: null,
    compressor: null,
    activeVoices: new Set(),
    voiceCount: 0,
    isOverloading: false,
    overloadCount: 0,

    init() {
        this.createAudioChain();
        this.startMonitoring();
        console.log('[AudioSafety] Initialized audio safety system');
    },

    createAudioChain() {
        this.masterGainNode = new Tone.Gain(this.masterVolume);
        this.dcBlocker = new Tone.Filter(5, 'highpass');
        this.compressor = new Tone.Compressor({ threshold: -24, ratio: 4, attack: 0.003, release: 0.1 });
        this.masterLimiter = new Tone.Limiter(this.limiterThreshold);
        this.dcBlocker.connect(this.compressor);
        this.compressor.connect(this.masterGainNode);
        this.masterGainNode.connect(this.masterLimiter);
        this.masterLimiter.toDestination();
        console.log('[AudioSafety] Created audio safety chain');
    },

    getInputNode() { return this.dcBlocker; },
    canPlayNote() { return this.voiceCount < this.maxPolyphony && !this.isOverloading; },

    addVoice(noteId) {
        if (this.voiceCount >= this.maxPolyphony) {
            const oldest = this.activeVoices.values().next().value;
            oldest && this.removeVoice(oldest);
            console.log(`[AudioSafety] Voice stealing: removed ${oldest}`);
        }
        this.activeVoices.add(noteId);
        this.voiceCount = this.activeVoices.size;
        this.updateVoiceDisplay();
    },

    removeVoice(noteId) {
        this.activeVoices.delete(noteId);
        this.voiceCount = this.activeVoices.size;
        this.updateVoiceDisplay();
    },

    updateVoiceDisplay() {
        const v = document.getElementById('voiceCount');
        if (v) {
            v.textContent = `Voices: ${this.voiceCount}/${this.maxPolyphony}`;
            v.className = this.voiceCount >= this.maxPolyphony ? 'voice-count warning' : 'voice-count';
        }
    },

    setMasterVolume(vol) {
        vol = Math.max(0, Math.min(1, +vol));
        this.masterVolume = vol;
        this.masterGainNode?.gain.rampTo(vol, 0.1);
        console.log(`[AudioSafety] Set master volume to ${vol}`);
    },

    setLimiterThreshold(thresh) {
        thresh = Math.max(-20, Math.min(0, +thresh));
        this.limiterThreshold = thresh;
        this.masterLimiter && (this.masterLimiter.threshold.value = thresh);
        console.log(`[AudioSafety] Set limiter threshold to ${thresh}dB`);
    },

    startMonitoring() {
        if (typeof Tone !== 'undefined' && Tone.Meter) {
            this.meter = new Tone.Meter();
            this.masterLimiter.connect(this.meter);
            setInterval(() => {
                if (!this.meter) return;
                const level = this.meter.getValue();
                const db = typeof level === 'number' ? level : Math.max(level.left || -Infinity, level.right || -Infinity);
                if (db > -1) {
                    this.overloadCount++;
                    if (this.overloadCount > 3) this.isOverloading = true, this.handleOverload();
                } else {
                    this.overloadCount = Math.max(0, this.overloadCount - 1);
                    if (!this.overloadCount) this.isOverloading = false;
                }
            }, 100);
        }
    },

    handleOverload() {
        console.warn('[AudioSafety] Audio overload detected, reducing volume');
        const curVol = this.masterVolume;
        this.setMasterVolume(curVol * 0.7);
        setTimeout(() => {
            this.setMasterVolume(curVol);
            this.isOverloading = false; this.overloadCount = 0;
        }, 2000);

        const v = document.getElementById('voiceCount');
        v?.classList.add('overload');
        setTimeout(() => v?.classList.remove('overload'), 2000);
    },

    emergencyStop() {
        this.masterGainNode?.gain.rampTo(0, 0.1);
        setTimeout(() => this.masterGainNode?.gain.rampTo(this.masterVolume, 0.1), 200);
        this.activeVoices.clear(); this.voiceCount = 0; this.updateVoiceDisplay();
        try { window.synthApp?.synth?.releaseAll(); }
        catch (err) { console.warn('[AudioSafety] Error during emergency stop:', err); }
        console.log('[AudioSafety] Emergency stop executed');
    }
};
