// audio.js
export class AudioModule {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.activeNodes = new Set();
    }

    // Initialize the AudioContext
    initAudioContext() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        console.log("Audio Context initialized:", this.context);
    }

    // Initialize the Master Gain node
    initMasterGain() {
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = 0.8; // Set a reasonable default volume
        this.masterGain.connect(this.context.destination);
        console.log("Master Gain connected to destination.");
    }

    // Utility function to clamp values
    clamp(value, min, max) {
        return isFinite(value) ? Math.min(Math.max(value, min), max) : min;
    }

    // Set an AudioParam value at a specific time
    setAudioParam(param, value, time) {
        if (isFinite(value)) {
            param.setValueAtTime(value, time);
        } else {
            console.warn(`Invalid value (${value}) for AudioParam. Using default value.`);
            param.setValueAtTime(0, time);
        }
    }

    // Ramp an AudioParam value linearly to a specific value at a specific time
    rampAudioParam(param, value, time) {
        if (isFinite(value)) {
            param.linearRampToValueAtTime(value, time);
        } else {
            console.warn(`Invalid ramp value (${value}) for AudioParam.`);
        }
    }

    /**
     * Creates an oscillator with the specified waveform type.
     * @param {string} type - The waveform type ('sine', 'square', 'sawtooth', 'triangle', etc.).
     * @returns {OscillatorNode}
     */
    createOscillator(type = 'sine') {
        const oscillator = this.context.createOscillator();
        oscillator.type = type;
        this.activeNodes.add(oscillator);
        return oscillator;
    }

    /**
     * Creates a filter with specified parameters.
     * @param {string} type - The filter type ('lowpass', 'highpass', 'bandpass', etc.).
     * @param {number} frequency - The cutoff frequency in Hz.
     * @param {number} Q - The quality factor.
     * @returns {BiquadFilterNode}
     */
    createFilter(type = 'lowpass', frequency = 1000, Q = 1) {
        const filter = this.context.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = frequency;
        filter.Q.value = Q;
        this.activeNodes.add(filter);
        return filter;
    }

    // Example: Modify existing note scheduling to accept waveform type
    createOscillatorWithWaveform(type, frequency, time, gainValue = 0.5) {
        const oscillator = this.createOscillator(type);
        oscillator.frequency.setValueAtTime(frequency, time);
        oscillator.type = type;

        const gainNode = this.context.createGain();
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(gainValue, time + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, time + 1); // Adjust as needed

        oscillator.connect(gainNode).connect(this.masterGain);
        oscillator.start(time);
        oscillator.stop(time + 1); // Adjust duration as needed

        return oscillator;
    }

    /**
     * Smoothly fades out the master gain to near zero using an exponential ramp.
     * @param {number} duration - Duration of the fade-out in seconds.
     * @param {Function} callback - Function to call after fade-out completes.
     */
    fadeOutMasterGain(duration, callback) {
        const now = this.context.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        
        // Exponential ramp to avoid zero (which is invalid for exponential ramps)
        this.masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        if (callback) {
            // Schedule the callback slightly after the fade-out completes
            setTimeout(callback, (duration + 0.1) * 1000); // Adding 100ms buffer
        }
    }

    // Rest of AudioModule methods (createReverbEffect, createDistortionEffect, etc.)

    // Create a Reverb effect
    createReverbEffect(effectNodes) {
        const convolver = this.context.createConvolver();
        this.activeNodes.add(convolver);
        effectNodes.push(convolver);

        // Create a simple impulse response
        const buffer = this.context.createBuffer(2, 3 * this.context.sampleRate, this.context.sampleRate);
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / buffer.length, 2);
            }
        }
        convolver.buffer = buffer;
        return { input: convolver, output: convolver };
    }

    // Create a Distortion effect
    createDistortionEffect(effectNodes) {
        const distortion = this.context.createWaveShaper();
        this.activeNodes.add(distortion);
        effectNodes.push(distortion);

        const curve = new Float32Array(44100);
        const amount = this.clamp(400 * Math.random(), 0, 1000);
        const deg = Math.PI / 180;
        for (let i = 0; i < 44100; ++i) {
            const x = i * 2 / 44100 - 1;
            curve[i] = (3 + amount) * x * 20 * deg / (Math.PI + amount * Math.abs(x));
        }
        distortion.curve = curve;
        distortion.oversample = '4x';
        return { input: distortion, output: distortion };
    }

    // Create a Chorus effect
    createChorusEffect(effectNodes) {
        const delayNode = this.context.createDelay();
        const lfo = this.context.createOscillator();
        const lfoGain = this.context.createGain();

        this.activeNodes.add(delayNode);
        this.activeNodes.add(lfo);
        this.activeNodes.add(lfoGain);
        effectNodes.push(delayNode, lfo, lfoGain);

        delayNode.delayTime.value = this.clamp(0.005 + 0.02 * Math.random(), 0.005, 0.03);
        lfo.frequency.value = this.clamp(0.1 + 0.4 * Math.random(), 0.1, 0.5);
        lfoGain.gain.value = this.clamp(0.005 + 0.005 * Math.random(), 0.005, 0.01);

        lfo.connect(lfoGain).connect(delayNode.delayTime);
        lfo.start();

        return { input: delayNode, output: delayNode };
    }

    // Create a Phaser effect
    createPhaserEffect(effectNodes) {
        const phaserStages = 4;
        let inputNode = this.context.createGain();
        let lastNode = inputNode;
        this.activeNodes.add(inputNode);
        effectNodes.push(inputNode);

        const lfo = this.context.createOscillator();
        const lfoGain = this.context.createGain();

        this.activeNodes.add(lfo);
        this.activeNodes.add(lfoGain);
        effectNodes.push(lfo, lfoGain);

        lfo.frequency.value = this.clamp(0.05 + 0.2 * Math.random(), 0.05, 0.25);
        lfoGain.gain.value = this.clamp(500 + 500 * Math.random(), 500, 1000);

        for (let i = 0; i < phaserStages; i++) {
            const allpass = this.context.createBiquadFilter();
            allpass.type = 'allpass';
            allpass.frequency.value = 1000 * (i + 1);

            this.activeNodes.add(allpass);
            effectNodes.push(allpass);

            lfo.connect(lfoGain).connect(allpass.frequency);
            lastNode.connect(allpass);
            lastNode = allpass;
        }

        lfo.start();
        return { input: inputNode, output: lastNode };
    }

    /**
     * Creates a dynamic lowpass filter that can change its cutoff frequency over time.
     * @param {number} initialFrequency - Initial cutoff frequency in Hz.
     * @param {number} modulationAmount - Amount by which the frequency can modulate.
     * @param {number} modulationRate - Rate of modulation in Hz.
     * @returns {BiquadFilterNode}
     */
    createDynamicLowpassFilter(initialFrequency = 1000, modulationAmount = 100, modulationRate = 0.5) {
        const filter = this.createFilter('lowpass', initialFrequency, 1);
        
        // Create an LFO for modulation
        const lfo = this.context.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = modulationRate; // Hz

        const lfoGain = this.context.createGain();
        lfoGain.gain.value = modulationAmount;

        lfo.connect(lfoGain).connect(filter.frequency);
        lfo.start();

        // Store references for cleanup
        filter._lfo = lfo;
        filter._lfoGain = lfoGain;

        return filter;
    }

    /**
     * Stops and disconnects the dynamic lowpass filter's LFO.
     * @param {BiquadFilterNode} filter 
     */
    stopDynamicLowpassFilter(filter) {
        if (filter._lfo) {
            filter._lfo.stop();
            filter._lfo.disconnect();
            filter._lfoGain.disconnect();
            delete filter._lfo;
            delete filter._lfoGain;
        }
    }

    // Create a Compressor effect
    createCompressorEffect(effectNodes) {
        const compressor = this.context.createDynamicsCompressor();
        this.activeNodes.add(compressor);
        effectNodes.push(compressor);

        compressor.threshold.value = this.clamp(-50 + -20 * Math.random(), -90, 0);
        compressor.knee.value = this.clamp(10 + 30 * Math.random(), 0, 40);
        compressor.ratio.value = this.clamp(4 + 8 * Math.random(), 1, 20);
        compressor.attack.value = this.clamp(0.005 + 0.05 * Math.random(), 0, 1);
        compressor.release.value = this.clamp(0.05 + 0.3 * Math.random(), 0, 1);

        return { input: compressor, output: compressor };
    }

    // Create a chain of global effects based on preferred effects
    createGlobalEffectsChain(preferredEffects) {
        const effects = [];
        const effectFunctions = {
            'reverb': this.createReverbEffect.bind(this),
            'distortion': this.createDistortionEffect.bind(this),
            'chorus': this.createChorusEffect.bind(this),
            'phaser': this.createPhaserEffect.bind(this),
            'compressor': this.createCompressorEffect.bind(this)
        };

        const effectNodes = []; // To keep track of nodes for cleanup

        preferredEffects.forEach(effectName => {
            if (effectFunctions[effectName]) {
                const effect = effectFunctions[effectName](effectNodes);
                effects.push(effect);
                console.log(`Global Effects Chain: Added ${effectName.charAt(0).toUpperCase() + effectName.slice(1)} Effect`);
            }
        });

        let inputNode = this.context.createGain();
        let outputNode = inputNode;
        this.activeNodes.add(inputNode);

        effects.forEach(effect => {
            outputNode.connect(effect.input);
            outputNode = effect.output;
        });

        return { input: inputNode, output: outputNode, nodes: effectNodes };
    }

    // Clean up all effects in the effects chain
    cleanupEffectsChain(effectsChain) {
        if (effectsChain && effectsChain.nodes) {
            effectsChain.nodes.forEach(node => {
                try {
                    if (node instanceof OscillatorNode) {
                        node.stop();
                    }
                    node.disconnect();
                } catch (e) {
                    console.warn("Error cleaning up effect node:", e);
                }
            });
        }
    }

    // Clean up all active audio nodes
    cleanupAudio() {
        try {
            // Disconnect and stop all active nodes
            this.activeNodes.forEach(node => {
                try {
                    if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
                        node.stop();
                    }
                    node.disconnect();
                } catch (e) {
                    console.warn("Error disconnecting node:", e);
                }
            });
            this.activeNodes.clear();

            // Reset master gain
            if (this.masterGain) {
                this.setAudioParam(this.masterGain.gain, 0.8, this.context.currentTime);
            }
            console.log("Audio cleanup completed.");
        } catch (error) {
            console.warn("Error during audio cleanup:", error);
        }
    }
}
