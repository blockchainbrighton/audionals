// *** @file SynthEngine.js ***
// *** Corrected for Tone.js v15+ Signal/Param assignment, including Compressor attack/release ***

export class SynthEngine {
    constructor(Tone) {
        this.Tone = Tone;
        if (!this.Tone) throw new Error('SynthEngine requires a loaded Tone.js instance.');
        this.nodes = {};
        this.init();
    }

    init() {
        this.createAudioChain();
        console.log('[SynthEngine] Audio engine created and signal chain connected.');
    }

    createAudioChain() {
        const T = this.Tone;
        // Core nodes
        this.nodes.master = new T.Gain(0.7);
        this.nodes.limiter = new T.Limiter(-3);

        // --- Effects ---
        this.nodes.reverb     = new T.Reverb({ decay: 2, preDelay: 0, wet: 0.3 });
        this.nodes.delay      = new T.FeedbackDelay({ delayTime: 0.25, feedback: 0.3, wet: 0.2 });
        this.nodes.filter     = new T.Filter({ frequency: 5000, Q: 1, type: 'lowpass' });
        this.nodes.chorus     = new T.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0.7, wet: 0.5 });
        this.nodes.distortion = new T.Distortion({ distortion: 0.4, oversample: 'none', wet: 0.3 });
        this.nodes.phaser     = new T.Phaser({ frequency: 0.5, octaves: 3, baseFrequency: 350, wet: 0.5 });
        this.nodes.tremolo    = new T.Tremolo({ frequency: 10, depth: 0.5, spread: 0, wet: 0.7 }).start();
        this.nodes.vibrato    = new T.Vibrato({ frequency: 5, depth: 0.1, wet: 0.8 });
        this.nodes.compressor = new T.Compressor({ threshold: -24, ratio: 12, attack: 0.003, release: 0.25, knee: 30 });
        this.nodes.bitCrusher = new T.BitCrusher(4);

        // LFOs
        this.nodes.filterLFO   = new T.LFO({ frequency: 0.5, min: 200, max: 2000, amplitude: 0 }).start();
        this.nodes.tremoloLFO  = new T.LFO({ frequency: 4, min: 0, max: 1, amplitude: 0 }).start();
        this.nodes.vibratoLFO  = new T.LFO({ frequency: 6, min: -0.02, max: 0.02, amplitude: 0 }).start();
        this.nodes.phaserLFO   = new T.LFO({ frequency: 0.3, min: 0.1, max: 10, amplitude: 0 }).start();

        // PolySynth
        this.nodes.oscillator = { type: 'sawtooth', detune: 0 };
        this.nodes.envelope   = { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 };
        this.polySynth = new T.PolySynth(T.Synth, {
            oscillator: this.nodes.oscillator,
            envelope:   this.nodes.envelope,
        });

        // Connect LFOs to effect params
        this.nodes.filterLFO.connect(this.nodes.filter.frequency);
        this.nodes.tremoloLFO.connect(this.nodes.tremolo.depth);
        this.nodes.vibratoLFO.connect(this.nodes.vibrato.depth);
        this.nodes.phaserLFO.connect(this.nodes.phaser.frequency);

        // Signal Chain
        this.polySynth.chain(
            this.nodes.bitCrusher,
            this.nodes.distortion,
            this.nodes.compressor,
            this.nodes.filter,
            this.nodes.chorus,
            this.nodes.phaser,
            this.nodes.tremolo,
            this.nodes.vibrato,
            this.nodes.delay,
            this.nodes.reverb,
            this.nodes.limiter,
            this.nodes.master,
            T.Destination
        );
    }

    noteOn(notes, velocity = 1.0) {
        if (this.polySynth) this.polySynth.triggerAttack(notes, this.Tone.now(), velocity);
    }

    noteOff(notes) {
        if (this.polySynth) this.polySynth.triggerRelease(notes, this.Tone.now());
    }

    triggerAttackRelease(notes, duration, time, velocity) {
        if (this.polySynth) this.polySynth.triggerAttackRelease(notes, duration, time, velocity);
    }

    releaseAll() {
        if (this.polySynth) this.polySynth.releaseAll();
        console.log('[SynthEngine] All notes released.');
    }

    /**
     * Universal parameter setter for UI integration.
     * Supports ALL flat paths (e.g. "reverb.wet", "chorus.frequency", "oscillator.type", "envelope.attack", etc.)
     * Only sets valid parameters for each effect node, using .value for Signal/Param types.
     */
    setParameter(path, value) {
        const [root, ...rest] = path.split('.');
        const prop = rest[0];
        let target;

        // Helper to check if a property exists on a target node
        const hasProp = (node, property) => node && typeof node[property] !== 'undefined';

        switch (root) {
            case 'master':
                if (prop === 'volume') this.nodes.master.gain.value = value;
                return;
            case 'limiter':
                if (prop === 'threshold') this.nodes.limiter.threshold.value = value;
                return;
            case 'oscillator':
                if (prop === 'type' || prop === 'detune') {
                    this.nodes.oscillator[prop] = value;
                    this.polySynth.set({ oscillator: this.nodes.oscillator });
                }
                return;
            case 'envelope':
                if (['attack', 'decay', 'sustain', 'release'].includes(prop)) {
                    this.nodes.envelope[prop] = value;
                    this.polySynth.set({ envelope: this.nodes.envelope });
                }
                return;
            // LFOs
            case 'filterLFO':
            case 'tremoloLFO':
            case 'vibratoLFO':
            case 'phaserLFO':
                target = this.nodes[root];
                if (!target) break;
                if (prop === 'frequency') target.frequency.value = value;
                else if (prop === 'depth') target.amplitude.value = value;
                else if (prop === 'min')   target.min = value;
                else if (prop === 'max')   target.max = value;
                else console.warn(`[SynthEngine] Unknown LFO param: ${prop}`);
                return;
            // Effects (using .value for Signal/Param types)
            case 'reverb':
                target = this.nodes.reverb;
                if (!hasProp(target, prop)) break;
                if (prop === 'wet') target.wet.value = value;
                else if (prop === 'decay') target.decay = value;
                else if (prop === 'preDelay') target.preDelay = value;
                return;
            case 'delay':
                target = this.nodes.delay;
                if (!hasProp(target, prop)) break;
                if (prop === 'wet') target.wet.value = value;
                else if (prop === 'delayTime') target.delayTime.value = value;
                else if (prop === 'feedback') target.feedback.value = value;
                return;
            case 'filter':
                target = this.nodes.filter;
                if (!hasProp(target, prop)) break;
                if (prop === 'frequency') target.frequency.value = value;
                else if (prop === 'Q') target.Q.value = value;
                else if (prop === 'type') target.type = value;
                else if (prop === 'rolloff') target.rolloff = value;
                return;
            case 'chorus':
                target = this.nodes.chorus;
                if (!hasProp(target, prop)) break;
                if (prop === 'wet') target.wet.value = value;
                else if (prop === 'frequency') target.frequency.value = value;
                else if (prop === 'feedback') target.feedback.value = value;
                else if (prop === 'delayTime') target.delayTime = value;
                else if (prop === 'depth') target.depth = value;
                else if (prop === 'spread') target.spread = value;
                return;
            case 'distortion':
                target = this.nodes.distortion;
                if (!hasProp(target, prop)) break;
                if (prop === 'wet') target.wet.value = value;
                else if (prop === 'distortion') target.distortion = value;
                else if (prop === 'oversample') target.oversample = value;
                return;
            case 'phaser':
                target = this.nodes.phaser;
                if (!hasProp(target, prop)) break;
                if (prop === 'wet') target.wet.value = value;
                else if (prop === 'frequency') target.frequency.value = value;
                else if (prop === 'Q') target.Q.value = value;
                else if (prop === 'octaves') target.octaves = value;
                else if (prop === 'baseFrequency') target.baseFrequency = value;
                else if (prop === 'stages') target.stages = value;
                return;
            case 'tremolo':
                target = this.nodes.tremolo;
                if (!hasProp(target, prop)) break;
                if (prop === 'wet') target.wet.value = value;
                else if (prop === 'frequency') target.frequency.value = value;
                else if (prop === 'depth') target.depth.value = value;
                else if (prop === 'spread') target.spread = value;
                return;
            case 'vibrato':
                target = this.nodes.vibrato;
                if (!hasProp(target, prop)) break;
                if (prop === 'wet') target.wet.value = value;
                else if (prop === 'frequency') target.frequency.value = value;
                else if (prop === 'depth') target.depth.value = value;
                return;
            case 'compressor':
                target = this.nodes.compressor;
                if (!hasProp(target, prop)) break;
                if (prop === 'threshold') target.threshold.value = value;
                else if (prop === 'ratio') target.ratio.value = value;
                else if (prop === 'knee') target.knee.value = value;
                else if (prop === 'attack') target.attack.value = value;     // <<< FIX HERE
                else if (prop === 'release') target.release.value = value;   // <<< FIX HERE
                return;
            case 'bitCrusher':
                target = this.nodes.bitCrusher;
                if (!hasProp(target, prop)) break;
                if (prop === 'bits') target.bits.value = value;
                return;
            default:
                console.warn(`[SynthEngine] Invalid root in path: ${path}`);
                return;
        }
        console.warn(`[SynthEngine] Could not set parameter at path: ${path}`);
    }

    getPatch() {
        return {
            polySynth: this.polySynth ? this.polySynth.get() : {},
            effects: Object.fromEntries(Object.entries(this.nodes)
                .filter(([k, node]) => typeof node.get === 'function')
                .map(([k, node]) => [k, node.get()]))
        };
    }

    setPatch(patch) {
        if (!patch || !this.polySynth) return;
        if (patch.polySynth) this.polySynth.set(patch.polySynth);
        if (patch.effects) {
            for (const effectName in patch.effects) {
                if (this.nodes[effectName] && typeof this.nodes[effectName].set === 'function' && patch.effects[effectName]) {
                    this.nodes[effectName].set(patch.effects[effectName]);
                }
            }
        }
        console.log('[SynthEngine] Patch loaded.');
    }

    dispose() {
        if (this.polySynth) this.polySynth.dispose();
        Object.values(this.nodes).forEach(node => node?.dispose?.());
        console.log('[SynthEngine] All nodes disposed.');
    }
}