// Audio Manager for Harmonoids Game
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.harmonoidOscillators = new Map(); // Map harmonoid ID to { oscillator, gainNode, frequency }
        this.isInitialized = false;
        this.isEnabled = true;
    }
    
    async initialize() {
        if (this.isInitialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            // Wait for context to be running, especially after user gesture
            await this.resumeContext(); 

            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.setValueAtTime(0.15, this.audioContext.currentTime); // Master volume
            this.masterGain.connect(this.audioContext.destination);
            
            this.isInitialized = true;
            console.log('Audio system initialized and context running.');
        } catch (error) {
            console.error('Failed to initialize audio system:', error);
            this.isEnabled = false; // Mark as not usable
            this.isInitialized = false; // Explicitly mark as not initialized
            // Potentially alert the user that audio could not be started
             alert("Could not initialize audio. Gameplay might be affected. Please check browser permissions for audio.");
        }
    }
    
    async resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            console.log("Resuming suspended audio context...");
            await this.audioContext.resume();
            console.log("Audio context state:", this.audioContext.state);
        }
    }
    
    async createHarmonoidSound(harmonoidId, frequency) {
        if (!this.isInitialized || !this.isEnabled) return;
        await this.resumeContext();
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine'; // Pure tone for harmonoids
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime); // Individual volume
            
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            oscillator.start();
            
            this.harmonoidOscillators.set(harmonoidId, { oscillator, gainNode, frequency });
        } catch (error) {
            console.error(`Failed to create harmonoid sound for ID ${harmonoidId}:`, error);
        }
    }
    
    async updateHarmonoidFrequency(harmonoidId, newFrequency) {
        if (!this.isInitialized || !this.isEnabled) return;
        await this.resumeContext();
        
        const data = this.harmonoidOscillators.get(harmonoidId);
        if (data) {
            try {
                // setTargetAtTime for smooth transition
                data.oscillator.frequency.setTargetAtTime(newFrequency, this.audioContext.currentTime, 0.05);
                data.frequency = newFrequency;
            } catch (error) {
                console.error(`Failed to update frequency for ID ${harmonoidId}:`, error);
            }
        }
    }
        
    removeHarmonoidSound(harmonoidId) {
        // No async needed here unless resumeContext is strictly required before stopping
        if (!this.isInitialized || !this.isEnabled) return; 
        
        const data = this.harmonoidOscillators.get(harmonoidId);
        if (data) {
            try {
                const now = this.audioContext.currentTime;
                data.gainNode.gain.setTargetAtTime(0, now, 0.1); // Fade out
                
                // Stop and disconnect after fade out
                setTimeout(() => {
                    try {
                        data.oscillator.stop();
                        data.oscillator.disconnect();
                        data.gainNode.disconnect();
                    } catch(e) { /* Oscillator might already be stopped or disconnected */ }
                }, 150); // Slightly longer than fade
                                
                this.harmonoidOscillators.delete(harmonoidId);
            } catch (error) {
                console.error(`Failed to remove sound for ID ${harmonoidId}:`, error);
            }
        }
    }

    async _playSoundEffect(type, freq, attackTime = 0.01, decayTime = 0.1, sustainLevel = 0, volume = 0.1) {
        if (!this.isInitialized || !this.isEnabled) return;
        await this.resumeContext();

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const now = this.audioContext.currentTime;

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(freq, now);

            gainNode.gain.setValueAtTime(0, now); // Start silent
            gainNode.gain.linearRampToValueAtTime(volume, now + attackTime); // Attack
            if (sustainLevel < volume && decayTime > 0) { // Decay to sustain or zero
                 gainNode.gain.linearRampToValueAtTime(sustainLevel * volume, now + attackTime + decayTime);
                 gainNode.gain.linearRampToValueAtTime(0, now + attackTime + decayTime + 0.05); // Final release
            } else {
                 gainNode.gain.linearRampToValueAtTime(0, now + attackTime + decayTime); // Release
            }


            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);

            oscillator.start(now);
            oscillator.stop(now + attackTime + decayTime + 0.1); // Total duration
        } catch (error) {
            console.error(`Failed to play sound effect (${type}):`, error);
        }
    }
    
    playSelectionSound() {
        this._playSoundEffect('triangle', 880, 0.01, 0.05, 0, 0.08); // Higher pitch, short click
    }

    playDropSound() {
        if (!this.isInitialized || !this.isEnabled) return;
        this.resumeContext(); // Ensure context is active

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const now = this.audioContext.currentTime;

            oscillator.type = 'triangle'; 
            oscillator.frequency.setValueAtTime(300, now);
            oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.1);

            gainNode.gain.setValueAtTime(0,now);
            gainNode.gain.linearRampToValueAtTime(0.06, now + 0.01); // Quick attack
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15); // Decay

            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);

            oscillator.start(now);
            oscillator.stop(now + 0.2);
        } catch (error) {
            console.error('Failed to play drop sound:', error);
        }
    }
    
    playGateSound(isOpening) {
        if (!this.isInitialized || !this.isEnabled) return;
        this.resumeContext();

        try {
            const baseFrequencies = isOpening ? [261.63, 329.63, 392.00] : [392.00, 329.63, 261.63]; // C Major / C Major descending
            const duration = 0.4;
            const now = this.audioContext.currentTime;
            
            baseFrequencies.forEach((freq, index) => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.type = 'sine'; // Cleaner sound for gate
                osc.frequency.setValueAtTime(freq, now);
                
                gain.gain.setValueAtTime(0, now);
                // Staggered attack and slightly longer release
                gain.gain.linearRampToValueAtTime(0.04, now + index * 0.08 + 0.05); // Volume of gate tone
                gain.gain.linearRampToValueAtTime(0, now + duration + index * 0.05); 
                
                osc.connect(gain);
                gain.connect(this.masterGain);
                
                osc.start(now + index * 0.08);
                osc.stop(now + duration + index * 0.08 + 0.2);
            });
        } catch (error) {
            console.error('Failed to play gate sound:', error);
        }
    }
    
    calculateDissonance(frequencies) {
        if (frequencies.length < 2) return 0;
        let dissonanceScore = 0;
        const dissonantIntervalThreshold = 0.15; // How far from a consonant ratio is considered "dissonant"
        // Key consonant ratios (octave, fifth, fourth, Major third, minor third, Major sixth, minor sixth)
        // Expressed as simple fractions: 2/1, 3/2, 4/3, 5/4, 6/5, 5/3, 8/5
        const consonantRatios = [2, 1.5, 4/3, 1.25, 1.2, 5/3, 1.6];

        for (let i = 0; i < frequencies.length; i++) {
            for (let j = i + 1; j < frequencies.length; j++) {
                let f1 = Math.min(frequencies[i], frequencies[j]);
                let f2 = Math.max(frequencies[i], frequencies[j]);
                if (f1 === 0) continue; // Avoid division by zero
                let ratio = f2 / f1;

                // Normalize ratio to be within one octave (1.0 to 2.0) for easier comparison
                while (ratio >= 2.0) ratio /= 2;
                while (ratio < 1.0) ratio *= 2; // Should not happen if f1 <= f2

                let minDistanceToConsonance = Infinity;
                consonantRatios.forEach(consonant => {
                    minDistanceToConsonance = Math.min(minDistanceToConsonance, Math.abs(ratio - consonant));
                });
                
                if (minDistanceToConsonance > dissonantIntervalThreshold) {
                    dissonanceScore += minDistanceToConsonance; // Add "dissonance value" of this interval
                }
            }
        }
        // Normalize dissonance score (very basic normalization)
        return frequencies.length > 1 ? dissonanceScore / (frequencies.length * (frequencies.length -1) / 2) : 0;
    }
    
    toggleAudio() {
        this.isEnabled = !this.isEnabled;
        console.log(`Audio ${this.isEnabled ? 'enabled' : 'disabled'}`);
        if (this.masterGain && this.audioContext) {
            const now = this.audioContext.currentTime;
            this.masterGain.gain.setTargetAtTime(this.isEnabled ? 0.15 : 0, now, 0.1);
        }
        
        if (!this.isEnabled) {
             // Stop all harmonoid sounds immediately if audio is disabled globally
            this.harmonoidOscillators.forEach((data, id) => {
                try {
                    data.oscillator.stop(); data.oscillator.disconnect(); data.gainNode.disconnect();
                } catch(e) {}
            });
            this.harmonoidOscillators.clear();
        }
        // If re-enabling, sounds will be created as new harmonoids spawn or actions occur
        return this.isEnabled;
    }
}