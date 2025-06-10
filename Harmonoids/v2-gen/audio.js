// Audio Manager for Harmonoids Game
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.harmonoidOscillators = new Map(); // Map harmonoid ID to { oscillator, gainNode, baseFrequency, currentFrequency, originalGain }
        this.isInitialized = false;
        this.isEnabled = true;
        this.soloedHarmonoidId = null; // ID of the currently soloed harmonoid
    }
    
    async initialize() {
        if (this.isInitialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await this.resumeContext(); // Resume if suspended by autoplay policies
            
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.1; // Keep volume low initially
            this.masterGain.connect(this.audioContext.destination);
            
            this.isInitialized = true;
            console.log('Audio system initialized');
        } catch (error) {
            console.error('Failed to initialize audio system:', error);
            this.isEnabled = false;
        }
    }
    
    async resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('AudioContext resumed.');
            } catch (e) {
                console.error('Error resuming AudioContext:', e);
            }
        }
    }
    
    createHarmonoidSound(harmonoidId, frequency) {
        if (!this.isInitialized || !this.isEnabled) return;
        this.resumeContext(); // Ensure context is running before creating nodes
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const originalGainValue = 0.05; // Individual harmonoid volume
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(originalGainValue, this.audioContext.currentTime);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            oscillator.start();
            
            this.harmonoidOscillators.set(harmonoidId, {
                oscillator: oscillator,
                gainNode: gainNode,
                baseFrequency: frequency,
                currentFrequency: frequency,
                originalGain: originalGainValue,
                isMuted: false 
            });
            
        } catch (error) {
            console.error(`Failed to create harmonoid sound for ID ${harmonoidId}:`, error);
        }
    }
    
    updateHarmonoidFrequency(harmonoidId, newFrequency) {
        if (!this.isInitialized || !this.isEnabled) return;
        
        const oscillatorData = this.harmonoidOscillators.get(harmonoidId);
        if (oscillatorData) {
            try {
                const now = this.audioContext.currentTime;
                oscillatorData.oscillator.frequency.setTargetAtTime(newFrequency, now, 0.05); // Faster transition
                oscillatorData.currentFrequency = newFrequency;
            } catch (error) {
                console.error(`Failed to update frequency for ID ${harmonoidId}:`, error);
            }
        }
    }
    
    // For temporary effects like resonance fields
    setTemporaryHarmonoidGain(harmonoidId, gainMultiplier, durationSeconds) {
        if (!this.isInitialized || !this.isEnabled) return;
        const oscillatorData = this.harmonoidOscillators.get(harmonoidId);
        if (oscillatorData && !oscillatorData.isMuted && (this.soloedHarmonoidId === null || this.soloedHarmonoidId === harmonoidId)) {
            const now = this.audioContext.currentTime;
            const targetGain = oscillatorData.originalGain * gainMultiplier;
            oscillatorData.gainNode.gain.setValueAtTime(targetGain, now);
            // Return to original gain after duration (if not muted/soloed differently by then)
            oscillatorData.gainNode.gain.setValueAtTime(oscillatorData.originalGain, now + durationSeconds);
        }
    }

    muteHarmonoid(harmonoidId, mute) {
        if (!this.isInitialized) return;
        const oscillatorData = this.harmonoidOscillators.get(harmonoidId);
        if (oscillatorData) {
            oscillatorData.isMuted = mute;
            if (this.soloedHarmonoidId === harmonoidId && mute) { // If soloed harmonoid is muted, unsolo it
                this.soloHarmonoid(null);
            }
            this.applyGainState(harmonoidId);
        }
    }

    soloHarmonoid(harmonoidIdToSolo) {
        if (!this.isInitialized) return;
        this.soloedHarmonoidId = harmonoidIdToSolo;
        // Apply gain changes to all harmonoids based on new solo state
        this.harmonoidOscillators.forEach((data, id) => {
            this.applyGainState(id);
        });
    }

    applyGainState(harmonoidId) {
        if (!this.isInitialized || !this.isEnabled) return;
        const oscillatorData = this.harmonoidOscillators.get(harmonoidId);
        if (oscillatorData) {
            const now = this.audioContext.currentTime;
            let targetGain = 0; // Default to silent

            if (this.soloedHarmonoidId !== null) { // If a harmonoid is soloed
                if (harmonoidId === this.soloedHarmonoidId && !oscillatorData.isMuted) {
                    targetGain = oscillatorData.originalGain;
                }
            } else { // No harmonoid is soloed
                if (!oscillatorData.isMuted) {
                    targetGain = oscillatorData.originalGain;
                }
            }
            oscillatorData.gainNode.gain.setTargetAtTime(targetGain, now, 0.05);
        }
    }
    
    removeHarmonoidSound(harmonoidId) {
        if (!this.isInitialized) return; // No need for !this.isEnabled check here, as we want to remove even if audio globally disabled
        
        const oscillatorData = this.harmonoidOscillators.get(harmonoidId);
        if (oscillatorData) {
            try {
                const now = this.audioContext.currentTime;
                oscillatorData.gainNode.gain.setTargetAtTime(0, now, 0.1); // Fade out
                
                // Stop and disconnect after fade out
                setTimeout(() => {
                    try {
                        oscillatorData.oscillator.stop();
                        oscillatorData.oscillator.disconnect();
                        oscillatorData.gainNode.disconnect();
                    } catch (e) { /* Oscillator might already be stopped or disconnected */ }
                }, 200); // 200ms for fade out
                
                this.harmonoidOscillators.delete(harmonoidId);
                if (this.soloedHarmonoidId === harmonoidId) {
                    this.soloedHarmonoidId = null; // Unsolo if removed
                    this.soloHarmonoid(null); // Update other gains
                }
            } catch (error) {
                console.error(`Failed to remove sound for ID ${harmonoidId}:`, error);
            }
        }
    }
    
    playSelectionSound() {
        if (!this.isInitialized || !this.isEnabled) return;
        this.resumeContext();
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const now = this.audioContext.currentTime;
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, now);
            
            gainNode.gain.setValueAtTime(0, now); // Start silent
            gainNode.gain.linearRampToValueAtTime(0.1, now + 0.02); // Quick attack
            gainNode.gain.linearRampToValueAtTime(0, now + 0.15);  // Decay
            
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            oscillator.start(now);
            oscillator.stop(now + 0.2);
        } catch (error) {
            console.error('Failed to play selection sound:', error);
        }
    }
    
    playGateSound(isOpening) {
        if (!this.isInitialized || !this.isEnabled) return;
        this.resumeContext();
        try {
            const frequencies = isOpening ? [392, 493.88, 587.33] : [587.33, 493.88, 392]; // G4, B4, D5 (G Major) vs D5, B4, G4
            const duration = 0.4;
            const now = this.audioContext.currentTime;
            
            frequencies.forEach((freq, index) => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now);
                
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.03, now + index * 0.05 + 0.05);
                gain.gain.linearRampToValueAtTime(0, now + duration + index * 0.05);
                
                osc.connect(gain);
                gain.connect(this.masterGain);
                
                osc.start(now + index * 0.05);
                osc.stop(now + duration + index * 0.05 + 0.1);
            });
        } catch (error) {
            console.error('Failed to play gate sound:', error);
        }
    }

    playResonanceFieldSound(isActive) {
        // Placeholder for a sound when a resonance field is created or interacts
        if (!this.isInitialized || !this.isEnabled) return;
        this.resumeContext();
        try {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const now = this.audioContext.currentTime;

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(isActive ? 220 : 110, now); // Higher for activation

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.02, now + 0.05);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.35);
        } catch (e) {
            console.error("Resonance field sound error:", e);
        }
    }
    
    calculateDissonance(frequencies) {
        if (frequencies.length < 2) return 0;
        let dissonanceScore = 0;
        const SEMITONE_RATIO = Math.pow(2, 1/12);
    
        for (let i = 0; i < frequencies.length; i++) {
            for (let j = i + 1; j < frequencies.length; j++) {
                const f1 = Math.min(frequencies[i], frequencies[j]);
                const f2 = Math.max(frequencies[i], frequencies[j]);
                const ratio = f2 / f1;
    
                // Penalize close dissonant intervals like minor 2nd, tritone
                if (ratio > 1.0 && ratio < SEMITONE_RATIO * 1.5) { // minor 2nd range
                    dissonanceScore += 2.0 * (1 - (ratio - 1) / (SEMITONE_RATIO * 1.5 -1));
                } else if (ratio > SEMITONE_RATIO * 5.5 && ratio < SEMITONE_RATIO * 6.5) { // tritone range
                    dissonanceScore += 1.0 * (1 - Math.abs(ratio - SEMITONE_RATIO * 6) / (SEMITONE_RATIO * 0.5));
                }
                // Less penalty for other non-perfect intervals
                else if ( (ratio % 1 !== 0) && ( (ratio*2) % 1 !==0) && ((ratio*3/2)%1 !==0) && ((ratio*4/3)%1 !==0) ) {
                    dissonanceScore += 0.2;
                }
            }
        }
        return dissonanceScore / (frequencies.length * (frequencies.length -1) / 2 || 1); // Normalize
    }
    
    setMasterVolume(volume) {
        if (this.masterGain) {
            const now = this.audioContext.currentTime;
            this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), now, 0.05);
        }
    }
    
    toggleAudio() {
        this.isEnabled = !this.isEnabled;
        if (this.isEnabled) {
            this.resumeContext();
            // Re-apply gain states for all harmonoids as they might have been silenced
            this.harmonoidOscillators.forEach((data, id) => {
                this.applyGainState(id); 
            });
        } else {
            // Silence all sounds by setting their gain to 0 without changing their muted/soloed state
            this.harmonoidOscillators.forEach(data => {
                if (data.gainNode) {
                    data.gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
                }
            });
        }
        return this.isEnabled;
    }
}