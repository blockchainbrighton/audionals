/**
 * @file bop-wam-processor.js
 * @description The WAM-compliant AudioWorkletProcessor for the BOP Synth.
 * This runs in the AudioWorkletGlobalScope, completely separate from the main UI thread.
 */

// We need to load Tone.js and the WAM SDK within the worklet scope.
// This assumes you have the WAM SDK files available.
// A host would typically provide these. For now, we'll assume they are loaded.

const { WamProcessor, WamParameterInfo } = window; // In a real scenario, you'd use importScripts

class BopWamProcessor extends WamProcessor {
    // A static method to define the WAM's unique name.
    static get aName() { return 'BopSynthV6'; }

    // Define all controllable parameters for the host DAW.
    // This is the core of the "Comprehensive Control API".
    static get parameterInfo() {
        return {
            // Synth Voice Parameters
            'voiceAttack': new WamParameterInfo('float', { defaultValue: 0.01, minValue: 0.001, maxValue: 2 }),
            'voiceDecay': new WamParameterInfo('float', { defaultValue: 0.1, minValue: 0.01, maxValue: 2 }),
            'voiceSustain': new WamParameterInfo('float', { defaultValue: 0.5, minValue: 0, maxValue: 1 }),
            'voiceRelease': new WamParameterInfo('float', { defaultValue: 0.4, minValue: 0.01, maxValue: 5 }),

            // Distortion
            'distortionWet': new WamParameterInfo('float', { defaultValue: 0, minValue: 0, maxValue: 1 }),
            'distortionAmount': new WamParameterInfo('float', { defaultValue: 0.1, minValue: 0, maxValue: 1 }),

            // Delay
            'delayWet': new WamParameterInfo('float', { defaultValue: 0, minValue: 0, maxValue: 1 }),
            'delayTime': new WamParameterInfo('string', { defaultValue: '8n', values: ['16n', '8n', '8t', '4n', '4t', '2n'] }),
            'delayFeedback': new WamParameterInfo('float', { defaultValue: 0.5, minValue: 0, maxValue: 0.95 }),

            // Reverb
            'reverbWet': new WamParameterInfo('float', { defaultValue: 0, minValue: 0, maxValue: 1 }),
            'reverbDecay': new WamParameterInfo('float', { defaultValue: 1.5, minValue: 0.1, maxValue: 10 }),
        };
    }

    constructor(options) {
        super(options);
        const { moduleId, instanceId } = options.processorOptions;
        this.moduleId = moduleId;
        this.instanceId = instanceId;
        this.Tone = window.Tone; // Tone.js must be loaded in the worklet scope
    }

    /** The host calls this to create the audio nodes. */
    _createAudioNode() {
        if (!this.Tone) {
            console.error('BOP WAM: Tone.js is not loaded in the AudioWorkletGlobalScope!');
            return;
        }
        // Create the PolySynth - it's the output node of our WAM
        this.polySynth = new this.Tone.PolySynth(this.Tone.Synth);

        // Create the effects chain
        this.nodes = {
            distortion: new this.Tone.Distortion(),
            delay: new this.Tone.FeedbackDelay(),
            reverb: new this.Tone.Reverb(),
        };

        // Chain everything together and connect to the WAM's output
        this.polySynth.chain(
            this.nodes.distortion,
            this.nodes.delay,
            this.nodes.reverb,
            this.output
        );
    }
    
    /** The host calls this when a MIDI message is received. */
    _onMidi(midiData) {
        const [status, a, b] = midiData;
        const channel = status & 0x0F;
        const command = status & 0xF0;

        if (command === 144) { // Note On
            this.polySynth.triggerAttack(this.Tone.Frequency(a, 'midi').toNote(), this.Tone.now(), b / 127);
        } else if (command === 128) { // Note Off
            this.polySynth.triggerRelease(this.Tone.Frequency(a, 'midi').toNote(), this.Tone.now());
        }
    }

    /** The host calls this when an automation parameter changes. */
    _onParameterValueChange(info) {
        const { parameterId, value } = info;
        switch (parameterId) {
            case 'voiceAttack': this.polySynth.set({ envelope: { attack: value }}); break;
            case 'voiceDecay': this.polySynth.set({ envelope: { decay: value }}); break;
            case 'voiceSustain': this.polySynth.set({ envelope: { sustain: value }}); break;
            case 'voiceRelease': this.polySynth.set({ envelope: { release: value }}); break;
            
            case 'distortionWet': this.nodes.distortion.wet.value = value; break;
            case 'distortionAmount': this.nodes.distortion.distortion = value; break;

            case 'delayWet': this.nodes.delay.wet.value = value; break;
            case 'delayTime': this.nodes.delay.delayTime.value = value; break;
            case 'delayFeedback': this.nodes.delay.feedback.value = value; break;

            case 'reverbWet': this.nodes.reverb.wet.value = value; break;
            case 'reverbDecay': this.nodes.reverb.decay = value; break;
        }
    }

    /** The host calls this to save the synth's state (the patch). */
    async _getState() {
        const state = {
            polySynth: this.polySynth.get(),
            distortion: this.nodes.distortion.get(),
            delay: this.nodes.delay.get(),
            reverb: this.nodes.reverb.get(),
        };
        return state;
    }

    /** The host calls this to load a synth's state. */
    async _setState(state) {
        if (!state) return;
        this.polySynth.set(state.polySynth);
        this.nodes.distortion.set(state.distortion);
        this.nodes.delay.set(state.delay);
        this.nodes.reverb.set(state.reverb);
    }
}

try {
    registerProcessor(BopWamProcessor.aName, BopWamProcessor);
} catch (e) {
    console.warn(e);
}