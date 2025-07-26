// modules/envelope.js
export const EnvelopeManager = {
    // Default envelope settings
    defaultEnvelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.7,
        release: 0.3,
        attackCurve: 'exponential',
        decayCurve: 'exponential',
        releaseCurve: 'exponential'
    },

    // Envelope presets
    presets: {
        'piano': { attack: 0.01, decay: 0.3, sustain: 0.4, release: 1.2 },
        'organ': { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.1 },
        'strings': { attack: 0.3, decay: 0.2, sustain: 0.8, release: 1.5 },
        'brass': { attack: 0.1, decay: 0.2, sustain: 0.7, release: 0.8 },
        'pad': { attack: 1.0, decay: 0.5, sustain: 0.6, release: 2.0 },
        'pluck': { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
        'bass': { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.4 }
    },

    // Current envelope settings
    currentEnvelope: null,

    init() {
        this.currentEnvelope = { ...this.defaultEnvelope };
        console.log('[EnvelopeManager] Initialized with default envelope');
    },

    // Create envelope object for Tone.js
    createEnvelope() {
        return {
            attack: this.currentEnvelope.attack,
            decay: this.currentEnvelope.decay,
            sustain: this.currentEnvelope.sustain,
            release: this.currentEnvelope.release,
            attackCurve: this.currentEnvelope.attackCurve,
            decayCurve: this.currentEnvelope.decayCurve,
            releaseCurve: this.currentEnvelope.releaseCurve
        };
    },

    // Update envelope parameter
    setParameter(param, value) {
        if (this.currentEnvelope.hasOwnProperty(param)) {
            // Validate and clamp values
            switch (param) {
                case 'attack':
                case 'decay':
                case 'release':
                    value = Math.max(0.001, Math.min(5.0, parseFloat(value)));
                    break;
                case 'sustain':
                    value = Math.max(0.0, Math.min(1.0, parseFloat(value)));
                    break;
                case 'attackCurve':
                case 'decayCurve':
                case 'releaseCurve':
                    if (!['linear', 'exponential'].includes(value)) {
                        value = 'exponential';
                    }
                    break;
            }
            
            this.currentEnvelope[param] = value;
            this.updateSynth();
            console.log(`[EnvelopeManager] Set ${param} to ${value}`);
        }
    },

    // Load preset
    loadPreset(presetName) {
        if (this.presets[presetName]) {
            this.currentEnvelope = {
                ...this.defaultEnvelope,
                ...this.presets[presetName]
            };
            this.updateSynth();
            this.updateUI();
            console.log(`[EnvelopeManager] Loaded preset: ${presetName}`);
        }
    },

    // Update synth with current envelope
    updateSynth() {
        if (window.synthApp?.synth) {
            const envelope = this.createEnvelope();
            window.synthApp.synth.set({ envelope });
            console.log('[EnvelopeManager] Updated synth envelope');
        }
    },

    // Update UI controls
    updateUI() {
        const panel = document.getElementById('control-panel');
        if (!panel) return;

        // Update envelope controls
        const attackSlider = panel.querySelector('#envelopeAttack');
        const decaySlider = panel.querySelector('#envelopeDecay');
        const sustainSlider = panel.querySelector('#envelopeSustain');
        const releaseSlider = panel.querySelector('#envelopeRelease');

        if (attackSlider) {
            attackSlider.value = this.currentEnvelope.attack;
            panel.querySelector('#envelopeAttackVal').textContent = this.currentEnvelope.attack.toFixed(3);
        }
        if (decaySlider) {
            decaySlider.value = this.currentEnvelope.decay;
            panel.querySelector('#envelopeDecayVal').textContent = this.currentEnvelope.decay.toFixed(3);
        }
        if (sustainSlider) {
            sustainSlider.value = this.currentEnvelope.sustain;
            panel.querySelector('#envelopeSustainVal').textContent = this.currentEnvelope.sustain.toFixed(2);
        }
        if (releaseSlider) {
            releaseSlider.value = this.currentEnvelope.release;
            panel.querySelector('#envelopeReleaseVal').textContent = this.currentEnvelope.release.toFixed(3);
        }

        // Update preset selector
        const presetSelect = panel.querySelector('#envelopePreset');
        if (presetSelect) {
            // Don't change selection, just ensure it's available
        }
    },

    // Get current envelope settings
    getSettings() {
        return { ...this.currentEnvelope };
    },

    // Set envelope from settings (for save/load)
    setSettings(settings) {
        this.currentEnvelope = {
            ...this.defaultEnvelope,
            ...settings
        };
        this.updateSynth();
        this.updateUI();
    }
};

// Audio Safety Manager
export const AudioSafety = {
    // Safety settings
    maxPolyphony: 16,
    masterVolume: 0.7,
    limiterThreshold: -3, // dB
    limiterRatio: 10,
    
    // Audio nodes
    masterLimiter: null,
    masterGainNode: null,
    dcBlocker: null,
    compressor: null,
    
    // Voice tracking
    activeVoices: new Set(),
    voiceCount: 0,

    // Audio monitoring
    isOverloading: false,
    overloadCount: 0,

    init() {
        this.createAudioChain();
        this.startMonitoring();
        console.log('[AudioSafety] Initialized audio safety system');
    },

    createAudioChain() {
        // Create master gain control
        this.masterGainNode = new Tone.Gain(this.masterVolume);
        
        // Create DC blocker (high-pass filter at very low frequency)
        this.dcBlocker = new Tone.Filter(5, 'highpass');
        
        // Create compressor for smooth dynamics
        this.compressor = new Tone.Compressor({
            threshold: -24,
            ratio: 4,
            attack: 0.003,
            release: 0.1
        });
        
        // Create soft limiter
        this.masterLimiter = new Tone.Limiter(this.limiterThreshold);
        
        // Chain: input -> DC blocker -> compressor -> master gain -> limiter -> destination
        this.dcBlocker.connect(this.compressor);
        this.compressor.connect(this.masterGainNode);
        this.masterGainNode.connect(this.masterLimiter);
        this.masterLimiter.toDestination();
        
        console.log('[AudioSafety] Created audio safety chain');
    },

    // Get the input node for the safety chain
    getInputNode() {
        return this.dcBlocker;
    },

    // Check if we can play another note
    canPlayNote() {
        return this.voiceCount < this.maxPolyphony && !this.isOverloading;
    },

    // Register a new voice
    addVoice(noteId) {
        if (this.voiceCount >= this.maxPolyphony) {
            // Voice stealing: remove oldest voice
            const oldestVoice = this.activeVoices.values().next().value;
            if (oldestVoice) {
                this.removeVoice(oldestVoice);
                console.log(`[AudioSafety] Voice stealing: removed ${oldestVoice}`);
            }
        }
        
        this.activeVoices.add(noteId);
        this.voiceCount = this.activeVoices.size;
        this.updateVoiceDisplay();
    },

    // Remove a voice
    removeVoice(noteId) {
        this.activeVoices.delete(noteId);
        this.voiceCount = this.activeVoices.size;
        this.updateVoiceDisplay();
    },

    // Update voice count display
    updateVoiceDisplay() {
        const voiceDisplay = document.getElementById('voiceCount');
        if (voiceDisplay) {
            voiceDisplay.textContent = `Voices: ${this.voiceCount}/${this.maxPolyphony}`;
            voiceDisplay.className = this.voiceCount >= this.maxPolyphony ? 'voice-count warning' : 'voice-count';
        }
    },

    // Set master volume
    setMasterVolume(volume) {
        volume = Math.max(0, Math.min(1, parseFloat(volume)));
        this.masterVolume = volume;
        if (this.masterGainNode) {
            this.masterGainNode.gain.rampTo(volume, 0.1);
        }
        console.log(`[AudioSafety] Set master volume to ${volume}`);
    },

    // Set limiter threshold
    setLimiterThreshold(threshold) {
        threshold = Math.max(-20, Math.min(0, parseFloat(threshold)));
        this.limiterThreshold = threshold;
        if (this.masterLimiter) {
            this.masterLimiter.threshold.value = threshold;
        }
        console.log(`[AudioSafety] Set limiter threshold to ${threshold}dB`);
    },

    // Start audio monitoring
    startMonitoring() {
        if (typeof Tone !== 'undefined' && Tone.Meter) {
            this.meter = new Tone.Meter();
            this.masterLimiter.connect(this.meter);
            
            // Check for overload every 100ms
            setInterval(() => {
                if (this.meter) {
                    const level = this.meter.getValue();
                    const dbLevel = typeof level === 'number' ? level : Math.max(level.left || -Infinity, level.right || -Infinity);
                    
                    if (dbLevel > -1) { // Close to 0dB
                        this.overloadCount++;
                        if (this.overloadCount > 3) {
                            this.isOverloading = true;
                            this.handleOverload();
                        }
                    } else {
                        this.overloadCount = Math.max(0, this.overloadCount - 1);
                        if (this.overloadCount === 0) {
                            this.isOverloading = false;
                        }
                    }
                }
            }, 100);
        }
    },

    // Handle audio overload
    handleOverload() {
        console.warn('[AudioSafety] Audio overload detected, reducing volume');
        
        // Temporarily reduce master volume
        const currentVolume = this.masterVolume;
        this.setMasterVolume(currentVolume * 0.7);
        
        // Restore volume after 2 seconds
        setTimeout(() => {
            this.setMasterVolume(currentVolume);
            this.isOverloading = false;
            this.overloadCount = 0;
        }, 2000);
        
        // Update UI indicator
        const voiceDisplay = document.getElementById('voiceCount');
        if (voiceDisplay) {
            voiceDisplay.classList.add('overload');
            setTimeout(() => {
                voiceDisplay.classList.remove('overload');
            }, 2000);
        }
    },

    // Emergency stop - fade out all audio
    emergencyStop() {
        if (this.masterGainNode) {
            this.masterGainNode.gain.rampTo(0, 0.1);
            setTimeout(() => {
                this.masterGainNode.gain.rampTo(this.masterVolume, 0.1);
            }, 200);
        }
        
        // Clear all active voices
        this.activeVoices.clear();
        this.voiceCount = 0;
        this.updateVoiceDisplay();
        
        // Stop all notes in synth
        if (window.synthApp?.synth) {
            try {
                window.synthApp.synth.releaseAll();
            } catch (err) {
                console.warn('[AudioSafety] Error during emergency stop:', err);
            }
        }
        
        console.log('[AudioSafety] Emergency stop executed');
    }
};

