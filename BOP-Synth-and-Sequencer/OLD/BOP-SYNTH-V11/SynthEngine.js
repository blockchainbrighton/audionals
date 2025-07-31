/**
 * @file SynthEngine.js
 * @description Core audio synthesis engine for BOP Synth.
 * Refactored to work with dependency injection and event-driven architecture.
 */

export class SynthEngine {
    /**
     * @param {object} Tone - The loaded Tone.js library.
     * @param {object} [config={}] - Configuration for the engine.
     * @param {AudioNode} [config.outputNode=Tone.getDestination()] - The node to connect the final output to.
     */
    constructor(Tone, config = {}) {
        this.Tone = Tone;
        if (!this.Tone) throw new Error('SynthEngine requires a loaded Tone.js instance.');
        
        // Use the provided output node, or default to the master destination for standalone use.
        this.output = config.outputNode || this.Tone.getDestination();
        
        this.effectState = {}; // Stores the 'wet' value when an effect is enabled

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

        // --- Effects (unchanged) ---
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

        // LFOs (unchanged)
        this.nodes.filterLFO   = new T.LFO({ frequency: 0.5, min: 200, max: 2000, amplitude: 0 }).start();
        this.nodes.tremoloLFO  = new T.LFO({ frequency: 4, min: 0, max: 1, amplitude: 0 }).start();
        this.nodes.vibratoLFO  = new T.LFO({ frequency: 6, min: -0.02, max: 0.02, amplitude: 0 }).start();
        this.nodes.phaserLFO   = new T.LFO({ frequency: 0.3, min: 0.1, max: 10, amplitude: 0 }).start();

        // PolySynth (unchanged)
        this.nodes.oscillator = { type: 'sawtooth', detune: 0 };
        this.nodes.envelope   = { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 };
        this.polySynth = new T.PolySynth(T.Synth, {
            oscillator: this.nodes.oscillator,
            envelope:   this.nodes.envelope,
        });

        // Connect LFOs to effect params (unchanged)
        this.nodes.filterLFO.connect(this.nodes.filter.frequency);
        this.nodes.tremoloLFO.connect(this.nodes.tremolo.depth);
        this.nodes.vibratoLFO.connect(this.nodes.vibrato.depth);
        this.nodes.phaserLFO.connect(this.nodes.phaser.frequency);

        // Signal Chain - NOW CONNECTS TO THE CONFIGURABLE OUTPUT
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
            this.output // <<< THE CRUCIAL CHANGE
        );
    }
    
    // ===================================================
    // PUBLIC API (These methods define the synth's interface)
    // ===================================================

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
    
    /** NEW: Essential for host integration. Returns the final node in the chain. */
    getOutputNode() {
        return this.nodes.master;
    }

    /** The setParameter method remains unchanged as its internal logic is sound. */
    setParameter(path, value) {
        // ... (existing implementation is kept as-is)
        const [root, ...rest] = path.split('.');
        const prop = rest[0];
        let target;
        const hasProp = (node, property) => node && typeof node[property] !== 'undefined';
        switch (root) {
            case 'master': if (prop === 'volume') this.nodes.master.gain.value = value; return;
            case 'limiter': if (prop === 'threshold') this.nodes.limiter.threshold.value = value; return;
            case 'oscillator': if (prop === 'type' || prop === 'detune') { this.nodes.oscillator[prop] = value; this.polySynth.set({ oscillator: this.nodes.oscillator }); } return;
            case 'envelope': if (['attack', 'decay', 'sustain', 'release'].includes(prop)) { this.nodes.envelope[prop] = value; this.polySynth.set({ envelope: this.nodes.envelope }); } return;
            case 'filterLFO': case 'tremoloLFO': case 'vibratoLFO': case 'phaserLFO':
                target = this.nodes[root]; if (!target) break; if (prop === 'frequency') target.frequency.value = value; else if (prop === 'depth') target.amplitude.value = value; else if (prop === 'min') target.min = value; else if (prop === 'max') target.max = value; return;
            case 'reverb': target = this.nodes.reverb; if (!hasProp(target, prop)) break; if (prop === 'wet') target.wet.value = value; else if (prop === 'decay') target.decay = value; else if (prop === 'preDelay') target.preDelay = value; return;
            case 'delay': target = this.nodes.delay; if (!hasProp(target, prop)) break; if (prop === 'wet') target.wet.value = value; else if (prop === 'delayTime') target.delayTime.value = value; else if (prop === 'feedback') target.feedback.value = value; return;
            case 'filter': target = this.nodes.filter; if (!hasProp(target, prop)) break; if (prop === 'frequency') target.frequency.value = value; else if (prop === 'Q') target.Q.value = value; else if (prop === 'type') target.type = value; else if (prop === 'rolloff') target.rolloff = value; return;
            case 'chorus': target = this.nodes.chorus; if (!hasProp(target, prop)) break; if (prop === 'wet') target.wet.value = value; else if (prop === 'frequency') target.frequency.value = value; else if (prop === 'feedback') target.feedback.value = value; else if (prop === 'delayTime') target.delayTime = value; else if (prop === 'depth') target.depth = value; else if (prop === 'spread') target.spread = value; return;
            case 'distortion': target = this.nodes.distortion; if (!hasProp(target, prop)) break; if (prop === 'wet') target.wet.value = value; else if (prop === 'distortion') target.distortion = value; else if (prop === 'oversample') target.oversample = value; return;
            case 'phaser': target = this.nodes.phaser; if (!hasProp(target, prop)) break; if (prop === 'wet') target.wet.value = value; else if (prop === 'frequency') target.frequency.value = value; else if (prop === 'Q') target.Q.value = value; else if (prop === 'octaves') target.octaves = value; else if (prop === 'baseFrequency') target.baseFrequency = value; else if (prop === 'stages') target.stages = value; return;
            case 'tremolo': target = this.nodes.tremolo; if (!hasProp(target, prop)) break; if (prop === 'wet') target.wet.value = value; else if (prop === 'frequency') target.frequency.value = value; else if (prop === 'depth') target.depth.value = value; else if (prop === 'spread') target.spread = value; return;
            case 'vibrato': target = this.nodes.vibrato; if (!hasProp(target, prop)) break; if (prop === 'wet') target.wet.value = value; else if (prop === 'frequency') target.frequency.value = value; else if (prop === 'depth') target.depth.value = value; return;
            case 'compressor': target = this.nodes.compressor; if (!hasProp(target, prop)) break; if (prop === 'threshold') target.threshold.value = value; else if (prop === 'ratio') target.ratio.value = value; else if (prop === 'knee') target.knee.value = value; else if (prop === 'attack') target.attack.value = value; else if (prop === 'release') target.release.value = value; return;
            case 'bitCrusher': target = this.nodes.bitCrusher; if (!hasProp(target, prop)) break; if (prop === 'bits') target.bits.value = value; return;
            default: console.warn(`[SynthEngine] Invalid root in path: ${path}`); return;
        }
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

    /**
     * Toggles an effect on or off by controlling its 'wet' signal.
     * @param {string} effectName - The name of the effect node (e.g., 'reverb', 'delay').
     * @param {boolean} enabled - True to turn the effect on, false to turn it off.
     */
    toggleEffect(effectName, enabled) {
        const effectNode = this.nodes[effectName];
        if (!effectNode || !effectNode.wet) {
            console.warn(`[SynthEngine] Cannot toggle unknown or non-wettable effect: ${effectName}`);
            return;
        }

        if (enabled) {
            // Turning ON: Restore the previous wet value, or default to a sensible value if none exists.
            const wetValue = this.effectState[effectName] ?? effectNode.get().wet ?? 0.5;
            effectNode.wet.value = wetValue;
            console.log(`[SynthEngine] Enabled ${effectName}, wet set to ${wetValue.toFixed(2)}`);
        } else {
            // Turning OFF: Store the current wet value, then set it to 0.
            this.effectState[effectName] = effectNode.wet.value;
            effectNode.wet.value = 0;
            console.log(`[SynthEngine] Disabled ${effectName}, stored wet value ${this.effectState[effectName].toFixed(2)}`);
        }
    }
    
    /**
     * Cleanup method
     */
    destroy() {
        this.dispose();
    }

    dispose() {
        if (this.polySynth) this.polySynth.dispose();
        Object.values(this.nodes).forEach(node => node?.dispose?.());
        console.log('[SynthEngine] All nodes disposed.');
    }
}

