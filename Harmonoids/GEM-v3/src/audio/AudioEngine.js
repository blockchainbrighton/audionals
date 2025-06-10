const MAX_OSCILLATORS = 128; // Global limit

export class AudioEngine {
    /** @type {AudioContext | null} */
    audioContext = null;
    /** @type {GainNode | null} */
    masterGain = null;
    /** @type {ConvolverNode | null} */
    reverbNode = null;
    /** @type {GainNode | null} */
    reverbSendGain = null;
    /** @type {GainNode | null} */
    reverbWetGain = null;
    /** @type {GainNode | null} */
    reverbDryGain = null;
    
    /** @type {GainNode | null} */
    backgroundPadGain = null;
    /** @type {OscillatorNode | null} */
    padOsc1 = null;
    /** @type {OscillatorNode | null} */
    padOsc2 = null;

    /** @type {Map<string, {osc: OscillatorNode, gain: GainNode, type: OscillatorType, baseFreq: number, currentFreq: number,isPlaying: boolean, detuneOsc?: OscillatorNode }>} */
    activeOscillators = new Map();
    /** @type {Array<{osc: OscillatorNode, gain: GainNode, detuneOsc?: OscillatorNode}>} */
    oscillatorPool = []; // For simple pooling, not fully implemented for complexity

    constructor() {
        // Defer AudioContext creation until user interaction
    }

    async start() {
        if (this.audioContext) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await this.audioContext.resume(); // Resume if suspended

            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.setValueAtTime(0.7, this.audioContext.currentTime); // Default master volume
            
            // Setup Reverb
            this.reverbNode = this.audioContext.createConvolver();
            this.reverbSendGain = this.audioContext.createGain(); // For sending signals to reverb
            this.reverbDryGain = this.audioContext.createGain(); // For direct signal
            this.reverbWetGain = this.audioContext.createGain(); // For reverberated signal

            this.reverbSendGain.connect(this.reverbNode);
            this.reverbNode.connect(this.reverbWetGain);
            
            this.reverbDryGain.connect(this.masterGain);
            this.reverbWetGain.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);
            
            this.setGlobalReverbMix(0.5); // Initial reverb mix (0 = dry, 1 = wet)
            this.loadImpulseResponseForReverb('/assets/impulse/default_reverb.wav'); // Placeholder path

            // Setup background pads (simple example)
            this.backgroundPadGain = this.audioContext.createGain();
            this.backgroundPadGain.gain.setValueAtTime(0.0, this.audioContext.currentTime); // Start muted
            this.backgroundPadGain.connect(this.masterGain);
            // this.setupBackgroundPads(); // Start them softly later based on harmony

            console.log("AudioEngine started.");
        } catch (e) {
            console.error("Failed to initialize AudioContext:", e);
            // Potentially show a message to the user that audio cannot be enabled.
        }
    }

    async loadImpulseResponseForReverb(url) {
        if (!this.audioContext || !this.reverbNode) return;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to load impulse response');
            const arrayBuffer = await response.arrayBuffer();
            this.audioContext.decodeAudioData(arrayBuffer, 
                (buffer) => {
                    if (this.reverbNode) this.reverbNode.buffer = buffer;
                    console.log("Impulse response loaded for reverb.");
                },
                (e) => { console.error("Error decoding impulse response:", e); }
            );
        } catch (error) {
            console.warn("Could not load impulse response for reverb:", error.message, "Reverb will be dry.");
             // If impulse is not found or fails to load, reverb won't work as intended.
             // Fallback: Reverb node might pass through dry if buffer is null.
        }
    }
    
    setupBackgroundPads(baseFreq = 110) { // A2
        if (!this.audioContext || !this.backgroundPadGain) return;
        if(this.padOsc1 || this.padOsc2) {
            this.padOsc1.stop(); this.padOsc2.stop();
        }

        this.padOsc1 = this.audioContext.createOscillator();
        this.padOsc1.type = 'sine';
        this.padOsc1.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
        
        this.padOsc2 = this.audioContext.createOscillator();
        this.padOsc2.type = 'sine';
        this.padOsc2.frequency.setValueAtTime(baseFreq * 1.5, this.audioContext.currentTime); // Perfect fifth
        this.padOsc2.detune.setValueAtTime(5, this.audioContext.currentTime); // Slight detune

        const padFilter = this.audioContext.createBiquadFilter();
        padFilter.type = 'lowpass';
        padFilter.frequency.setValueAtTime(400, this.audioContext.currentTime);

        this.padOsc1.connect(padFilter);
        this.padOsc2.connect(padFilter);
        padFilter.connect(this.backgroundPadGain);

        this.padOsc1.start();
        this.padOsc2.start();
        this.backgroundPadGain.gain.setTargetAtTime(0.1, this.audioContext.currentTime, 0.5); // Fade in pads
    }


    /**
     * @param {number} mix - 0 (mostly dry) to 1 (mostly wet/darker reverb). Affects reverb parameters.
     */
    setGlobalReverbMix(mix) { // Mix is 0 (dissonant, darker reverb) to 1 (harmonious, lighter reverb)
        if (!this.audioContext || !this.reverbDryGain || !this.reverbWetGain) return;
        // This 'mix' is from harmony calculation where higher is better harmony.
        // For dissonance (low mix value), we want more wet/dark reverb.
        // For harmony (high mix value), we want less wet/brighter reverb.
        const wetLevel = (1 - mix) * 0.6; // Dissonance = more reverb (e.g. 0.6 when mix is 0)
        const dryLevel = 1.0; // Keep dry fairly constant or slightly reduced by wet.

        this.reverbWetGain.gain.setTargetAtTime(wetLevel, this.audioContext.currentTime, 0.1);
        this.reverbDryGain.gain.setTargetAtTime(dryLevel, this.audioContext.currentTime, 0.1);
        
        // Adjust background pad volume based on harmony
        if (this.backgroundPadGain) {
            const padVolume = mix * 0.15; // Harmonious = louder pads
             this.backgroundPadGain.gain.setTargetAtTime(padVolume, this.audioContext.currentTime, 0.5);
             if (mix > 0.6 && (!this.padOsc1 || !this.padOsc2)) {
                this.setupBackgroundPads(); // Start pads if good harmony achieved and not already playing
             } else if (mix < 0.3 && (this.padOsc1 || this.padOsc2)) {
                this.backgroundPadGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.5); // Fade out
                // Optionally stop oscillators after fadeout
             }
        }
    }


    /**
     * @param {string} id Unique ID for the sound source
     * @param {number} frequency
     * @param {OscillatorType} type
     * @param {number} initialVolume
     * @param {boolean} isPercussive
     * @param {boolean} useDetune Adds a second slightly detuned oscillator for richness
     */
    playSound(id, frequency, type = 'sine', initialVolume = 0.5, isPercussive = false, useDetune = false) {
        if (!this.audioContext || !this.reverbSendGain || this.activeOscillators.size >= MAX_OSCILLATORS) {
            if(this.activeOscillators.size >= MAX_OSCILLATORS) console.warn("Max oscillator count reached.");
            return;
        }
        if (this.activeOscillators.has(id)) {
            this.updateSound(id, frequency, type); // Just update if already playing
            return;
        }

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        let detuneOsc = null;

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        gain.gain.setValueAtTime(0, this.audioContext.currentTime); // Start silent

        osc.connect(gain);
        gain.connect(this.reverbSendGain); // Send to reverb
        gain.connect(this.reverbDryGain); // Send to dry path as well

        if (useDetune) {
            detuneOsc = this.audioContext.createOscillator();
            detuneOsc.type = type;
            detuneOsc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            detuneOsc.detune.setValueAtTime(5, this.audioContext.currentTime); // 5 cents detune
            detuneOsc.connect(gain);
            detuneOsc.start();
        }
        
        osc.start();

        if (isPercussive) {
            // Quick attack and decay for percussive sounds
            gain.gain.linearRampToValueAtTime(initialVolume, this.audioContext.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2); // Fast decay
             // Schedule stop for percussive sounds to free up oscillator
            osc.stop(this.audioContext.currentTime + 0.3);
            if(detuneOsc) detuneOsc.stop(this.audioContext.currentTime + 0.3);
            osc.onended = () => { this.activeOscillators.delete(id); }; // Clean up map entry
        } else {
            // Smooth fade-in for sustained sounds
            gain.gain.linearRampToValueAtTime(initialVolume, this.audioContext.currentTime + 0.05);
        }
        
        this.activeOscillators.set(id, { osc, gain, type, baseFreq: frequency, currentFreq: frequency, isPlaying: true, detuneOsc });
    }

    /**
     * @param {string} id
     */
    stopSound(id) {
        if (!this.audioContext) return;
        const sound = this.activeOscillators.get(id);
        if (sound && sound.isPlaying) {
            sound.gain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.05); // Smooth fade-out
            sound.osc.stop(this.audioContext.currentTime + 0.1);
            if (sound.detuneOsc) sound.detuneOsc.stop(this.audioContext.currentTime + 0.1);
            sound.isPlaying = false; 
            // Remove from map once fully stopped, use onended event if available
            sound.osc.onended = () => {
                this.activeOscillators.delete(id);
                // console.log(`Oscillator ${id} stopped and removed.`);
            };
        }
    }

    stopAllSounds() {
        if (!this.audioContext) return;
        this.activeOscillators.forEach((sound, id) => {
            this.stopSound(id);
        });
        // Stop background pads if they are running
        if (this.padOsc1) this.padOsc1.stop();
        if (this.padOsc2) this.padOsc2.stop();
        this.padOsc1 = null; this.padOsc2 = null;
        if (this.backgroundPadGain) this.backgroundPadGain.gain.setValueAtTime(0, this.audioContext.currentTime);

        this.activeOscillators.clear();
    }


    /**
     * @param {string} id
     * @param {number} [frequency]
     * @param {OscillatorType} [type]
     * @param {number} [volume]
     */
    updateSound(id, frequency, type, volume) {
        if (!this.audioContext) return;
        const sound = this.activeOscillators.get(id);
        if (sound && sound.isPlaying) {
            if (frequency !== undefined) {
                sound.osc.frequency.setTargetAtTime(frequency, this.audioContext.currentTime, 0.01); // Smooth transition for pitch
                if(sound.detuneOsc) sound.detuneOsc.frequency.setTargetAtTime(frequency, this.audioContext.currentTime, 0.01);
                sound.currentFreq = frequency;
            }
            if (type !== undefined && sound.type !== type) {
                sound.osc.type = type;
                if(sound.detuneOsc) sound.detuneOsc.type = type;
                sound.type = type;
            }
            if (volume !== undefined) {
                sound.gain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.02);
            }
        }
    }

    suspend() {
        if (this.audioContext && this.audioContext.state === 'running') {
            this.audioContext.suspend();
            console.log("AudioContext suspended.");
        }
    }

    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
            console.log("AudioContext resumed.");
        }
    }
}