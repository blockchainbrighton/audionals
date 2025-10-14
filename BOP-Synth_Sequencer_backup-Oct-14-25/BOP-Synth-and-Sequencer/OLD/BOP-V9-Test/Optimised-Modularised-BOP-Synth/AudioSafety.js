/**
 * @file AudioSafety.js
 * @description Refactored audio safety module as an ES6 class for the BOP Synthesizer component.
 * Handles audio safety features like voice limiting, volume control, and overload protection.
 */

export class AudioSafety {
    constructor(mainComponent) {
        this.mainComponent = mainComponent;
        this.Tone = mainComponent.Tone;
        
        // Configuration
        this.maxPolyphony = 16;
        this.masterVolume = 0.7;
        this.limiterThreshold = -3;
        this.limiterRatio = 10;
        
        // Audio nodes
        this.masterLimiter = null;
        this.masterGainNode = null;
        this.dcBlocker = null;
        this.compressor = null;
        this.meter = null;
        
        // Voice tracking
        this.activeVoices = new Set();
        this.voiceCount = 0;
        
        // Overload protection
        this.isOverloading = false;
        this.overloadCount = 0;
        this.monitoringInterval = null;
        
        // Initialize the audio safety system
        this.init();
    }

    init() {
        this.createAudioChain();
        this.startMonitoring();
        this.setupEventListeners();
        console.log('[AudioSafety] Initialized audio safety system');
    }

    setupEventListeners() {
        // Listen for master volume changes
        this.mainComponent.on('masterVolumeChange', (data) => {
            this.setMasterVolume(data.value);
        });

        // Listen for emergency stop requests
        this.mainComponent.on('emergencyStop', () => {
            this.emergencyStop();
        });
    }

    createAudioChain() {
        this.masterGainNode = new this.Tone.Gain(this.masterVolume);
        this.dcBlocker = new this.Tone.Filter(5, 'highpass');
        this.compressor = new this.Tone.Compressor({ 
            threshold: -24, 
            ratio: 4, 
            attack: 0.003, 
            release: 0.1 
        });
        this.masterLimiter = new this.Tone.Limiter(this.limiterThreshold);
        
        // Connect the audio chain
        this.dcBlocker.connect(this.compressor);
        this.compressor.connect(this.masterGainNode);
        this.masterGainNode.connect(this.masterLimiter);
        this.masterLimiter.toDestination();
        
        console.log('[AudioSafety] Created audio safety chain');
    }

    getInputNode() { 
        return this.dcBlocker; 
    }

    canPlayNote() { 
        return this.voiceCount < this.maxPolyphony && !this.isOverloading; 
    }

    addVoice(noteId) {
        if (this.voiceCount >= this.maxPolyphony) {
            const oldest = this.activeVoices.values().next().value;
            if (oldest) {
                this.removeVoice(oldest);
                console.log(`[AudioSafety] Voice stealing: removed ${oldest}`);
            }
        }
        this.activeVoices.add(noteId);
        this.voiceCount = this.activeVoices.size;
        this.updateVoiceDisplay();
    }

    removeVoice(noteId) {
        this.activeVoices.delete(noteId);
        this.voiceCount = this.activeVoices.size;
        this.updateVoiceDisplay();
    }

    updateVoiceDisplay() {
        const voiceCountEl = this.mainComponent.getElementById('voiceCount');
        if (voiceCountEl) {
            voiceCountEl.textContent = `Voices: ${this.voiceCount}/${this.maxPolyphony}`;
            voiceCountEl.className = this.voiceCount >= this.maxPolyphony ? 'voice-count warning' : 'voice-count';
        }
    }

    setMasterVolume(vol) {
        vol = Math.max(0, Math.min(1, +vol));
        this.masterVolume = vol;
        if (this.masterGainNode) {
            this.masterGainNode.gain.rampTo(vol, 0.1);
        }
        console.log(`[AudioSafety] Set master volume to ${vol}`);
    }

    setLimiterThreshold(thresh) {
        thresh = Math.max(-20, Math.min(0, +thresh));
        this.limiterThreshold = thresh;
        if (this.masterLimiter) {
            this.masterLimiter.threshold.value = thresh;
        }
        console.log(`[AudioSafety] Set limiter threshold to ${thresh}dB`);
    }

    startMonitoring() {
        if (this.Tone && this.Tone.Meter) {
            this.meter = new this.Tone.Meter();
            this.masterLimiter.connect(this.meter);
            
            this.monitoringInterval = setInterval(() => {
                if (!this.meter) return;
                
                const level = this.meter.getValue();
                const db = typeof level === 'number' ? level : 
                          Math.max(level.left ?? -Infinity, level.right ?? -Infinity);
                
                if (db > -1) {
                    this.overloadCount++;
                    if (this.overloadCount > 3) {
                        this.isOverloading = true;
                        this.handleOverload();
                    }
                } else {
                    this.overloadCount = Math.max(0, this.overloadCount - 1);
                    if (!this.overloadCount) {
                        this.isOverloading = false;
                    }
                }
            }, 100);
        }
    }

    handleOverload() {
        console.warn('[AudioSafety] Audio overload detected, reducing volume');
        const curVol = this.masterVolume;
        this.setMasterVolume(curVol * 0.7);
        
        setTimeout(() => {
            this.setMasterVolume(curVol);
            this.isOverloading = false;
            this.overloadCount = 0;
        }, 2000);

        const voiceCountEl = this.mainComponent.getElementById('voiceCount');
        if (voiceCountEl) {
            voiceCountEl.classList.add('overload');
            setTimeout(() => voiceCountEl.classList.remove('overload'), 2000);
        }
    }

    emergencyStop() {
        if (this.masterGainNode) {
            this.masterGainNode.gain.rampTo(0, 0.1);
            setTimeout(() => {
                if (this.masterGainNode) {
                    this.masterGainNode.gain.rampTo(this.masterVolume, 0.1);
                }
            }, 200);
        }
        
        this.activeVoices.clear();
        this.voiceCount = 0;
        this.updateVoiceDisplay();
        
        try {
            if (this.mainComponent.state.synth && this.mainComponent.state.synth.releaseAll) {
                this.mainComponent.state.synth.releaseAll();
            }
        } catch (err) {
            console.warn('[AudioSafety] Error during emergency stop:', err);
        }
        
        console.log('[AudioSafety] Emergency stop executed');
    }

    /**
     * Get current voice count
     */
    getVoiceCount() {
        return this.voiceCount;
    }

    /**
     * Get maximum polyphony
     */
    getMaxPolyphony() {
        return this.maxPolyphony;
    }

    /**
     * Set maximum polyphony
     */
    setMaxPolyphony(max) {
        this.maxPolyphony = Math.max(1, Math.min(32, max));
        console.log(`[AudioSafety] Set max polyphony to ${this.maxPolyphony}`);
    }

    /**
     * Check if system is overloading
     */
    isSystemOverloading() {
        return this.isOverloading;
    }

    /**
     * Clean up and dispose of resources
     */
    dispose() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        if (this.meter) {
            this.meter.dispose();
            this.meter = null;
        }
        
        if (this.masterLimiter) {
            this.masterLimiter.dispose();
        }
        if (this.masterGainNode) {
            this.masterGainNode.dispose();
        }
        if (this.dcBlocker) {
            this.dcBlocker.dispose();
        }
        if (this.compressor) {
            this.compressor.dispose();
        }
        
        this.activeVoices.clear();
        this.voiceCount = 0;
    }

    /**
     * Destroy the audio safety system
     */
    destroy() {
        this.dispose();
        console.log('[AudioSafety] Audio safety system destroyed');
    }
}

export default AudioSafety;

