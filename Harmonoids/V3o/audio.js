// Audio Manager for Harmonoids Game
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.harmonoidOscillators = new Map(); // Map harmonoid ID to oscillator data
        this.isInitialized = false;
        this.isEnabled = true;
    }
    
    async initialize() {
        try {
            // Create audio context (requires user interaction)
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain node
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
            await this.audioContext.resume();
        }
    }
    
    createHarmonoidSound(harmonoidId, frequency) {
        if (!this.isInitialized || !this.isEnabled) return;
        
        try {
            // Create oscillator for the harmonoid
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Set up the oscillator
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            
            // Set up gain (volume)
            gainNode.gain.value = 0.05; // Individual harmonoid volume
            
            // Connect the audio graph
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Start the oscillator
            oscillator.start();
            
            // Store the oscillator data
            this.harmonoidOscillators.set(harmonoidId, {
                oscillator: oscillator,
                gainNode: gainNode,
                frequency: frequency,
                baseFrequency: frequency
            });
            
        } catch (error) {
            console.error('Failed to create harmonoid sound:', error);
        }
    }
    
    updateHarmonoidFrequency(harmonoidId, newFrequency) {
        if (!this.isInitialized || !this.isEnabled) return;
        
        const oscillatorData = this.harmonoidOscillators.get(harmonoidId);
        if (oscillatorData) {
            try {
                // Smoothly transition to new frequency
                const now = this.audioContext.currentTime;
                oscillatorData.oscillator.frequency.setTargetAtTime(newFrequency, now, 0.1);
                oscillatorData.frequency = newFrequency;
            } catch (error) {
                console.error('Failed to update harmonoid frequency:', error);
            }
        }
    }
    
    updateHarmonoidVolume(harmonoidId, volume) {
        if (!this.isInitialized || !this.isEnabled) return;
        
        const oscillatorData = this.harmonoidOscillators.get(harmonoidId);
        if (oscillatorData) {
            try {
                const now = this.audioContext.currentTime;
                oscillatorData.gainNode.gain.setTargetAtTime(volume * 0.05, now, 0.1);
            } catch (error) {
                console.error('Failed to update harmonoid volume:', error);
            }
        }
    }
    
    removeHarmonoidSound(harmonoidId) {
        if (!this.isInitialized || !this.isEnabled) return;
        
        const oscillatorData = this.harmonoidOscillators.get(harmonoidId);
        if (oscillatorData) {
            try {
                // Fade out and stop
                const now = this.audioContext.currentTime;
                oscillatorData.gainNode.gain.setTargetAtTime(0, now, 0.1);
                
                setTimeout(() => {
                    try {
                        oscillatorData.oscillator.stop();
                        oscillatorData.oscillator.disconnect();
                        oscillatorData.gainNode.disconnect();
                    } catch (e) {
                        // Oscillator might already be stopped
                    }
                }, 200);
                
                this.harmonoidOscillators.delete(harmonoidId);
            } catch (error) {
                console.error('Failed to remove harmonoid sound:', error);
            }
        }
    }
    
    playSelectionSound() {
        if (!this.isInitialized || !this.isEnabled) return;
        
        try {
            // Create a short beep for selection
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.value = 800;
            
            gainNode.gain.value = 0;
            const now = this.audioContext.currentTime;
            gainNode.gain.setTargetAtTime(0.1, now, 0.01);
            gainNode.gain.setTargetAtTime(0, now + 0.1, 0.01);
            
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
        
        try {
            // Create a chord for gate opening/closing
            const frequencies = isOpening ? [440, 550, 660] : [660, 550, 440];
            const duration = 0.5;
            const now = this.audioContext.currentTime;
            
            frequencies.forEach((freq, index) => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.type = 'triangle';
                oscillator.frequency.value = freq;
                
                gainNode.gain.value = 0;
                gainNode.gain.setTargetAtTime(0.03, now + index * 0.1, 0.05);
                gainNode.gain.setTargetAtTime(0, now + duration, 0.1);
                
                oscillator.connect(gainNode);
                gainNode.connect(this.masterGain);
                
                oscillator.start(now + index * 0.1);
                oscillator.stop(now + duration + 0.2);
            });
        } catch (error) {
            console.error('Failed to play gate sound:', error);
        }
    }
    
    generateHarmonicSeries(fundamentalFreq, harmonicCount = 4) {
        const harmonics = [];
        for (let i = 1; i <= harmonicCount; i++) {
            harmonics.push(fundamentalFreq * i);
        }
        return harmonics;
    }
    
    calculateDissonance(frequencies) {
        // Simple dissonance calculation based on frequency ratios
        let dissonance = 0;
        for (let i = 0; i < frequencies.length; i++) {
            for (let j = i + 1; j < frequencies.length; j++) {
                const ratio = frequencies[j] / frequencies[i];
                // Consonant ratios: 2/1, 3/2, 4/3, 5/4, 6/5
                const consonantRatios = [2, 1.5, 1.333, 1.25, 1.2];
                let minDistance = Infinity;
                
                consonantRatios.forEach(consonantRatio => {
                    const distance = Math.abs(ratio - consonantRatio);
                    minDistance = Math.min(minDistance, distance);
                });
                
                dissonance += minDistance;
            }
        }
        return dissonance;
    }
    
    setMasterVolume(volume) {
        if (this.masterGain) {
            const now = this.audioContext.currentTime;
            this.masterGain.gain.setTargetAtTime(volume, now, 0.1);
        }
    }
    
    toggleAudio() {
        this.isEnabled = !this.isEnabled;
        if (!this.isEnabled) {
            // Stop all sounds
            this.harmonoidOscillators.forEach((data, id) => {
                this.removeHarmonoidSound(id);
            });
        }
        return this.isEnabled;
    }
}

