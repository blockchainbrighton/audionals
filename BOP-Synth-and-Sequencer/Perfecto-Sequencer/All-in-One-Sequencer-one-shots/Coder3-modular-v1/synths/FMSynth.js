// FM Synthesizer Implementation using Tone.FMSynth
import { runtimeState } from '../audio.js'; // To access Tone.js if needed within the class methods

export class FMSynth {
    constructor(toneContext, initialParams = {}) {
        this.toneContext = toneContext;

        // Create Tone.js FMSynth
        // Pass initial params, mapping our generic names to Tone.js names where needed
        this.synth = new toneContext.FMSynth({
            harmonicity: initialParams.harmonicity ?? 3,
            modulationIndex: initialParams.modulationIndex ?? 10,
            oscillator: {
                type: initialParams.oscillatorType ?? 'sine'
            },
            envelope: {
                attack: initialParams.attack ?? 0.01,
                decay: initialParams.decay ?? 0.01,
                sustain: initialParams.sustain ?? 1,
                release: initialParams.release ?? 0.5
            },
            modulation: {
                type: initialParams.modulationType ?? 'square'
            },
            modulationEnvelope: {
                attack: initialParams.modulationAttack ?? 0.5,
                decay: initialParams.modulationDecay ?? 0.0,
                sustain: initialParams.modulationSustain ?? 1,
                release: initialParams.modulationRelease ?? 0.5
            }
        }).toDestination();

        // Store current params
        this.params = { ...initialParams };
    }

    // Updated trigger signature to accept recording context
    trigger(note, duration, time, context = {}) {
         // `context` can contain { channelIndex, step, recordingEvent }
         // The synth itself doesn't need to do anything special with this for recording,
         // as the recording logic is handled in main.js based on the global flag.
         // But it's available if the synth wants to log or react to being recorded.
         // console.log(`[FMSynth] Triggering ${note} at step ${context.step} on channel ${context.channelIndex}`, context.recordingEvent);

        if (this.synth) {
            this.synth.triggerAttackRelease(note, duration, time);
        }
    }

    set(paramsObject) {
        this.params = { ...this.params, ...paramsObject };

        if (this.synth) {
            // Map our generic param names to Tone.FMSynth properties
            if (paramsObject.harmonicity !== undefined) {
                this.synth.harmonicity.value = paramsObject.harmonicity;
            }
            if (paramsObject.modulationIndex !== undefined) {
                this.synth.modulationIndex.value = paramsObject.modulationIndex;
            }
            if (paramsObject.oscillatorType !== undefined) {
                this.synth.oscillator.type = paramsObject.oscillatorType;
            }
            if (paramsObject.attack !== undefined) {
                this.synth.envelope.attack = paramsObject.attack;
            }
            if (paramsObject.decay !== undefined) {
                this.synth.envelope.decay = paramsObject.decay;
            }
            if (paramsObject.sustain !== undefined) {
                this.synth.envelope.sustain = paramsObject.sustain;
            }
            if (paramsObject.release !== undefined) {
                this.synth.envelope.release = paramsObject.release;
            }
            if (paramsObject.modulationType !== undefined) {
                this.synth.modulation.type = paramsObject.modulationType;
            }
            if (paramsObject.modulationAttack !== undefined) {
                this.synth.modulationEnvelope.attack = paramsObject.modulationAttack;
            }
            if (paramsObject.modulationDecay !== undefined) {
                this.synth.modulationEnvelope.decay = paramsObject.modulationDecay;
            }
            if (paramsObject.modulationSustain !== undefined) {
                this.synth.modulationEnvelope.sustain = paramsObject.modulationSustain;
            }
            if (paramsObject.modulationRelease !== undefined) {
                this.synth.modulationEnvelope.release = paramsObject.modulationRelease;
            }
        }
    }

    dispose() {
        if (this.synth) {
            this.synth.dispose();
        }
        console.log('[FMSynth] Disposed');
    }

    static getUI() {
        return [
            {
                type: 'range',
                label: 'Harmonicity',
                param: 'harmonicity',
                min: 0.1,
                max: 10,
                step: 0.1,
                defaultValue: 3
            },
            {
                type: 'range',
                label: 'Modulation Index',
                param: 'modulationIndex',
                min: 0,
                max: 50,
                step: 0.1,
                defaultValue: 10
            },
            {
                type: 'select',
                label: 'Oscillator Type',
                param: 'oscillatorType',
                options: ['sine', 'square', 'sawtooth', 'triangle'],
                defaultValue: 'sine'
            },
            {
                type: 'select',
                label: 'Modulation Type',
                param: 'modulationType',
                options: ['sine', 'square', 'sawtooth', 'triangle'],
                defaultValue: 'square'
            },
            {
                type: 'range',
                label: 'Attack',
                param: 'attack',
                min: 0.005,
                max: 2,
                step: 0.005,
                defaultValue: 0.01
            },
            {
                type: 'range',
                label: 'Decay',
                param: 'decay',
                min: 0.005,
                max: 2,
                step: 0.005,
                defaultValue: 0.01
            },
            {
                type: 'range',
                label: 'Sustain',
                param: 'sustain',
                min: 0,
                max: 1,
                step: 0.01,
                defaultValue: 1
            },
            {
                type: 'range',
                label: 'Release',
                param: 'release',
                min: 0.01,
                max: 5,
                step: 0.01,
                defaultValue: 0.5
            },
            {
               type: 'range',
               label: 'Mod Attack',
               param: 'modulationAttack',
               min: 0.005,
               max: 2,
               step: 0.005,
               defaultValue: 0.5
            },
            {
               type: 'range',
               label: 'Mod Decay',
               param: 'modulationDecay',
               min: 0.005,
               max: 2,
               step: 0.005,
               defaultValue: 0.0
            },
            {
               type: 'range',
               label: 'Mod Sustain',
               param: 'modulationSustain',
               min: 0,
               max: 1,
               step: 0.01,
               defaultValue: 1
            },
            {
               type: 'range',
               label: 'Mod Release',
               param: 'modulationRelease',
               min: 0.01,
               max: 5,
               step: 0.01,
               defaultValue: 0.5
            }
        ];
    }
}

// Register the synth with the audio manager
import { registerSynth } from '../audio.js';
registerSynth('FMSynth', FMSynth);