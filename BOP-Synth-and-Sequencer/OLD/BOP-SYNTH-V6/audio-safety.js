// --- audio-safety.js (Correct and Complete Version) ---

// Define the object as a normal constant first.
const AudioSafety = {
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
        this.startMonitoring(); // This will now work!
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
                const db = typeof level === 'number' ? level : Math.max(level.left ?? -Infinity, level.right ?? -Infinity);
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
            this.isOverloading = false;
            this.overloadCount = 0;
        }, 2000);

        const v = document.getElementById('voiceCount');
        v?.classList.add('overload');
        setTimeout(() => v?.classList.remove('overload'), 2000);
    },

    emergencyStop() {
        this.masterGainNode?.gain.rampTo(0, 0.1);
        setTimeout(() => this.masterGainNode?.gain.rampTo(this.masterVolume, 0.1), 200);
        this.activeVoices.clear();
        this.voiceCount = 0;
        this.updateVoiceDisplay();
        try { window.synthApp?.synth?.releaseAll(); }
        catch (err) { console.warn('[AudioSafety] Error during emergency stop:', err); }
        console.log('[AudioSafety] Emergency stop executed');
    }
};

// Export the complete object as the default export for this module.
export default AudioSafety;