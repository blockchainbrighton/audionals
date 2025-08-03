// synths/FMSynth.js

export class FMSynth {
    constructor(Tone, initialParams = {}) {
        this.Tone = Tone;

        // Set default parameters, merged with initialParams
        const params = {
            modulationType: 'sine',
            harmonicity: 3,
            modulationIndex: 10,
            attack: 0.01,
            decay: 0.4,
            sustain: 0.3,
            release: 1,
            ...initialParams
        };

        // Create Tone.js FMSynth node
        this.synth = new this.Tone.FMSynth({
            modulation: {
                type: params.modulationType
            },
            harmonicity: params.harmonicity,
            modulationIndex: params.modulationIndex,
            envelope: {
                attack: params.attack,
                decay: params.decay,
                sustain: params.sustain,
                release: params.release
            }
        }).toDestination();

        // Store current params
        this.currentParams = { ...params };
    }

    trigger(note, duration, time) {
        if (this.synth) {
            this.synth.triggerAttackRelease(note, duration, time);
        }
    }

    set(paramsObject) {
        // Update internal parameters and Tone.js nodes
        Object.assign(this.currentParams, paramsObject);

        if (this.synth) {
            if (paramsObject.modulationType !== undefined) this.synth.modulation.type = paramsObject.modulationType;
            if (paramsObject.harmonicity !== undefined) this.synth.harmonicity.value = paramsObject.harmonicity;
            if (paramsObject.modulationIndex !== undefined) this.synth.modulationIndex.value = paramsObject.modulationIndex;
            if (paramsObject.attack !== undefined) this.synth.envelope.attack = paramsObject.attack;
            if (paramsObject.decay !== undefined) this.synth.envelope.decay = paramsObject.decay;
            if (paramsObject.sustain !== undefined) this.synth.envelope.sustain = paramsObject.sustain;
            if (paramsObject.release !== undefined) this.synth.envelope.release = paramsObject.release;
        }
    }

    dispose() {
        if (this.synth) {
            this.synth.dispose();
            this.synth = null;
        }
    }

    static getUI() {
        return [
            {
                type: 'select',
                label: 'Modulation Type',
                param: 'modulationType',
                options: ['sine', 'square', 'sawtooth', 'triangle'],
                defaultValue: 'sine'
            },
            {
                type: 'range',
                label: 'Harmonicity',
                param: 'harmonicity',
                min: 0.1,
                max: 20,
                step: 0.1,
                defaultValue: 3
            },
            {
                type: 'range',
                label: 'Modulation Index',
                param: 'modulationIndex',
                min: 0,
                max: 100,
                step: 1,
                defaultValue: 10
            },
            {
                type: 'range',
                label: 'Attack',
                param: 'attack',
                min: 0.001,
                max: 2,
                step: 0.001,
                defaultValue: 0.01
            },
            {
                type: 'range',
                label: 'Decay',
                param: 'decay',
                min: 0.01,
                max: 2,
                step: 0.01,
                defaultValue: 0.4
            },
            {
                type: 'range',
                label: 'Sustain',
                param: 'sustain',
                min: 0,
                max: 1,
                step: 0.01,
                defaultValue: 0.3
            },
            {
                type: 'range',
                label: 'Release',
                param: 'release',
                min: 0.01,
                max: 5,
                step: 0.01,
                defaultValue: 1
            }
        ];
    }
}