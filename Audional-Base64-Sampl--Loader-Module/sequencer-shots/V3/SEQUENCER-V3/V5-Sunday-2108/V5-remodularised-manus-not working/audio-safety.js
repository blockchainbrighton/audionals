// audio-safety.js - Audio safety and voice management system
// Dependencies: Tone.js (global)

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
    meter: null,

    init() {
        this.createAudioChain();
        this.startMonitoring();
        this.bindEmergencyStop();
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
    },

    bindEmergencyStop() {
        // Bind emergency stop button if it exists
        const emergencyBtn = document.getElementById('emergencyStop');
        if (emergencyBtn) {
            emergencyBtn.onclick = () => this.emergencyStop();
        }
        
        // Keyboard shortcut for emergency stop (Escape key)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !e.repeat) {
                this.emergencyStop();
            }
        });
    },

    // Voice management utilities
    getAllActiveVoices() {
        return Array.from(this.activeVoices);
    },

    clearAllVoices() {
        this.activeVoices.clear();
        this.voiceCount = 0;
        this.updateVoiceDisplay();
        console.log('[AudioSafety] Cleared all active voices');
    },

    setMaxPolyphony(max) {
        this.maxPolyphony = Math.max(1, Math.min(32, max));
        console.log(`[AudioSafety] Set max polyphony to ${this.maxPolyphony}`);
        this.updateVoiceDisplay();
    },

    getAudioStats() {
        return {
            voiceCount: this.voiceCount,
            maxPolyphony: this.maxPolyphony,
            masterVolume: this.masterVolume,
            limiterThreshold: this.limiterThreshold,
            isOverloading: this.isOverloading,
            overloadCount: this.overloadCount
        };
    }
};

// Audio utility functions
const AudioUtils = {
    // Convert MIDI note number to frequency
    midiToFreq(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    },

    // Convert frequency to MIDI note number
    freqToMidi(freq) {
        return 69 + 12 * Math.log2(freq / 440);
    },

    // Convert decibels to linear gain
    dbToGain(db) {
        return Math.pow(10, db / 20);
    },

    // Convert linear gain to decibels
    gainToDb(gain) {
        return 20 * Math.log10(Math.max(gain, 0.000001));
    },

    // Clamp value between min and max
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    // Linear interpolation
    lerp(a, b, t) {
        return a + (b - a) * this.clamp(t, 0, 1);
    },

    // Map value from one range to another
    mapRange(value, inMin, inMax, outMin, outMax) {
        return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
    },

    // Generate random value between min and max
    random(min = 0, max = 1) {
        return min + Math.random() * (max - min);
    },

    // Generate random integer between min and max (inclusive)
    randomInt(min, max) {
        return Math.floor(this.random(min, max + 1));
    },

    // Smooth step function for easing
    smoothStep(t) {
        t = this.clamp(t, 0, 1);
        return t * t * (3 - 2 * t);
    },

    // Convert beats per minute to seconds per beat
    bpmToSeconds(bpm) {
        return 60 / bpm;
    },

    // Convert seconds per beat to beats per minute
    secondsToBpm(seconds) {
        return 60 / seconds;
    },

    // Format time in seconds to MM:SS format
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    // Parse time string (MM:SS) to seconds
    parseTime(timeStr) {
        const parts = timeStr.split(':');
        if (parts.length === 2) {
            const mins = parseInt(parts[0], 10) || 0;
            const secs = parseInt(parts[1], 10) || 0;
            return mins * 60 + secs;
        }
        return 0;
    },

    // Validate and sanitize audio parameter values
    sanitizeAudioParam(value, min, max, defaultValue) {
        const num = parseFloat(value);
        if (isNaN(num)) return defaultValue;
        return this.clamp(num, min, max);
    },

    // Create a simple envelope curve
    createEnvelopeCurve(attack, decay, sustain, release, sampleRate = 44100) {
        const attackSamples = Math.floor(attack * sampleRate);
        const decaySamples = Math.floor(decay * sampleRate);
        const releaseSamples = Math.floor(release * sampleRate);
        const totalSamples = attackSamples + decaySamples + releaseSamples;
        
        const curve = new Float32Array(totalSamples);
        let index = 0;
        
        // Attack phase
        for (let i = 0; i < attackSamples; i++) {
            curve[index++] = i / attackSamples;
        }
        
        // Decay phase
        for (let i = 0; i < decaySamples; i++) {
            curve[index++] = 1 - (1 - sustain) * (i / decaySamples);
        }
        
        // Release phase
        for (let i = 0; i < releaseSamples; i++) {
            curve[index++] = sustain * (1 - i / releaseSamples);
        }
        
        return curve;
    }
};

// Performance monitoring utilities
const PerformanceMonitor = {
    metrics: {
        audioLatency: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        droppedFrames: 0
    },

    init() {
        this.startMonitoring();
        console.log('[PerformanceMonitor] Initialized performance monitoring');
    },

    startMonitoring() {
        // Monitor audio context performance
        if (typeof Tone !== 'undefined' && Tone.context) {
            setInterval(() => {
                this.updateAudioMetrics();
            }, 1000);
        }
    },

    updateAudioMetrics() {
        if (Tone.context) {
            this.metrics.audioLatency = Tone.context.baseLatency * 1000; // Convert to ms
            
            // Estimate CPU usage based on audio context state
            if (Tone.context.state === 'running') {
                this.metrics.cpuUsage = Math.min(100, AudioSafety.voiceCount * 2 + Math.random() * 10);
            } else {
                this.metrics.cpuUsage = 0;
            }
        }
    },

    getMetrics() {
        return { ...this.metrics };
    },

    logMetrics() {
        console.log('[PerformanceMonitor] Current metrics:', this.getMetrics());
    }
};

// Export modules for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AudioSafety, AudioUtils, PerformanceMonitor };
} else {
    window.AudioSafety = AudioSafety;
    window.AudioUtils = AudioUtils;
    window.PerformanceMonitor = PerformanceMonitor;
}

