// synths/BasicSynth.js

export class BasicSynth {
    constructor(Tone, initialParams = {}) {
        this.Tone = Tone;

        // Set default parameters, merged with initialParams
        const params = {
            waveform: 'sine',
            attack: 0.1,
            decay: 0.3,
            sustain: 0.5,
            release: 0.8,
            ...initialParams
        };

        // Create Tone.js nodes
        this.envelope = new this.Tone.AmplitudeEnvelope({
            attack: params.attack,
            decay: params.decay,
            sustain: params.sustain,
            release: params.release
        }).toDestination();

        // Optional filter for shaping
        this.filter = new this.Tone.Filter(800, "lowpass").connect(this.envelope);

        this.oscillator = new this.Tone.Oscillator(params.waveform).connect(this.filter);

        // Store current params
        this.currentParams = { ...params };
    }

    trigger(note, duration, time) {
        if (this.oscillator && this.envelope) {
            this.oscillator.frequency.value = this.Tone.Frequency(note).toFrequency();
            this.envelope.triggerAttackRelease(duration, time);
        }
    }

    set(paramsObject) {
        // Update internal parameters and Tone.js nodes
        Object.assign(this.currentParams, paramsObject);

        if (paramsObject.attack !== undefined) this.envelope.attack = paramsObject.attack;
        if (paramsObject.decay !== undefined) this.envelope.decay = paramsObject.decay;
        if (paramsObject.sustain !== undefined) this.envelope.sustain = paramsObject.sustain;
        if (paramsObject.release !== undefined) this.envelope.release = paramsObject.release;
        if (paramsObject.waveform !== undefined) this.oscillator.type = paramsObject.waveform;
        // Add filter updates if needed
    }

    dispose() {
        if (this.oscillator) {
            this.oscillator.dispose();
            this.oscillator = null;
        }
        if (this.filter) {
            this.filter.dispose();
            this.filter = null;
        }
        if (this.envelope) {
            this.envelope.dispose();
            this.envelope = null;
        }
    }

    static getUI() {
        return [
            {
                type: 'select',
                label: 'Waveform',
                param: 'waveform',
                options: ['sine', 'square', 'sawtooth', 'triangle'],
                defaultValue: 'sine'
            },
            {
                type: 'range',
                label: 'Attack',
                param: 'attack',
                min: 0.01,
                max: 2,
                step: 0.01,
                defaultValue: 0.1
            },
            {
                type: 'range',
                label: 'Decay',
                param: 'decay',
                min: 0.01,
                max: 2,
                step: 0.01,
                defaultValue: 0.3
            },
            {
                type: 'range',
                label: 'Sustain',
                param: 'sustain',
                min: 0,
                max: 1,
                step: 0.01,
                defaultValue: 0.5
            },
            {
                type: 'range',
                label: 'Release',
                param: 'release',
                min: 0.01,
                max: 2,
                step: 0.01,
                defaultValue: 0.8
            }
        ];
    }
}