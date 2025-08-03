// Basic Synthesizer Implementation
import { runtimeState } from '../audio.js'; // To access Tone.js if needed within the class methods

export class BasicSynth {
    constructor(toneContext, initialParams = {}) {
        this.toneContext = toneContext;

        // Create Tone.js components
        this.envelope = new toneContext.AmplitudeEnvelope({
            attack: initialParams.attack ?? 0.1,
            decay: initialParams.decay ?? 0.3,
            sustain: initialParams.sustain ?? 0.5,
            release: initialParams.release ?? 0.8
        });

        // Adding a simple filter for better sound shaping
        this.filter = new toneContext.Filter(800, "lowpass");
        this.envelope.connect(this.filter);
        this.filter.toDestination();

        this.oscillator = new toneContext.Oscillator(initialParams.waveform ?? 'sine');
        this.oscillator.connect(this.filter);

        // Store current params
        this.params = { ...initialParams };
    }

    // Updated trigger signature to accept recording context
    trigger(note, duration, time, context = {}) {
        // `context` can contain { channelIndex, step, recordingEvent }
        // The synth itself doesn't need to do anything special with this for recording,
        // as the recording logic is handled in main.js based on the global flag.
        // But it's available if the synth wants to log or react to being recorded.
        // console.log(`[BasicSynth] Triggering ${note} at step ${context.step} on channel ${context.channelIndex}`, context.recordingEvent);

        if (this.oscillator && this.envelope) {
            this.oscillator.frequency.value = this.toneContext.Frequency(note).toFrequency();
            this.envelope.triggerAttackRelease(duration, time);
        }
    }

    set(paramsObject) {
        this.params = { ...this.params, ...paramsObject };

        if (paramsObject.waveform !== undefined && this.oscillator) {
            this.oscillator.type = paramsObject.waveform;
        }
        if (paramsObject.attack !== undefined && this.envelope) {
            this.envelope.attack = paramsObject.attack;
        }
        if (paramsObject.decay !== undefined && this.envelope) {
            this.envelope.decay = paramsObject.decay;
        }
        if (paramsObject.sustain !== undefined && this.envelope) {
            this.envelope.sustain = paramsObject.sustain;
        }
        if (paramsObject.release !== undefined && this.envelope) {
            this.envelope.release = paramsObject.release;
        }
        // Example of handling filter param if added to UI
        if (paramsObject.filterFrequency !== undefined && this.filter) {
             this.filter.frequency.value = paramsObject.filterFrequency;
        }
    }

    dispose() {
        if (this.oscillator) {
            this.oscillator.dispose();
        }
        if (this.envelope) {
            this.envelope.dispose();
        }
        if (this.filter) {
             this.filter.dispose();
        }
        console.log('[BasicSynth] Disposed');
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
            },
            // Example of adding a filter control
            // {
            //     type: 'range',
            //     label: 'Filter Freq',
            //     param: 'filterFrequency',
            //     min: 100,
            //     max: 5000,
            //     step: 10,
            //     defaultValue: 800
            // }
        ];
    }
}

// Register the synth with the audio manager
import { registerSynth } from '../audio.js';
registerSynth('BasicSynth', BasicSynth);