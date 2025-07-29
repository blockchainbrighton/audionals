/**
 * @file synth-engine.js
 * @description The decoupled audio engine for the BOP Synth.
 * This module encapsulates all Tone.js objects and audio processing.
 * It exposes a clean API for control from the main application.
 */

export class SynthEngine {
    /**
     * Initializes the entire synth and effects chain.
     * @param {object} Tone - The loaded Tone.js library object.
     */
    constructor(Tone) {
        if (!Tone) {
            throw new Error('SynthEngine requires a loaded Tone.js instance.');
        }
        this.Tone = Tone;
        this.nodes = {}; // To hold all our Tone.js nodes for easy access

        // 1. Create the master output and a limiter to prevent clipping
        this.limiter = new Tone.Limiter(-6).toDestination();

        // 2. Create Effects Nodes
        // These are created but disconnected. The `setPatch` or UI will enable them.
        this.nodes.reverb = new Tone.Reverb({ wet: 0, decay: 1.5 });
        this.nodes.delay = new Tone.FeedbackDelay({ wet: 0, delayTime: "8n", feedback: 0.5 });
        this.nodes.chorus = new Tone.Chorus({ wet: 0, frequency: 1.5, depth: 0.7 });
        this.nodes.distortion = new Tone.Distortion({ wet: 0, distortion: 0.1 });
        this.nodes.filter = new Tone.AutoFilter({ wet: 1, frequency: 1, baseFrequency: 200, octaves: 4 }).stop(); // Wet=1 but stopped
        this.nodes.phaser = new Tone.Phaser({ wet: 0, frequency: 0.5, octaves: 3 });
        this.nodes.tremolo = new Tone.Tremolo({ wet: 0, frequency: 5, depth: 0.5 }).start();
        this.nodes.vibrato = new Tone.Vibrato({ wet: 0, frequency: 5, depth: 0.1 });

        // 3. Create the Polyphonic Synthesizer
        // The voice is a standard Tone.Synth, which is highly configurable.
        this.polySynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'fatsawtooth', count: 3, spread: 30 },
            envelope: {
                attack: 0.01,
                decay: 0.1,
                sustain: 0.5,
                release: 0.4,
                attackCurve: 'exponential'
            }
        });
        
        // 4. Define the Signal Chain
        // Synth -> Distortion -> Filter -> Phaser -> Vibrato -> Chorus -> Tremolo -> Delay -> Reverb -> Limiter -> Destination
        this.polySynth.chain(
            this.nodes.distortion,
            this.nodes.filter,
            this.nodes.phaser,
            this.nodes.vibrato,
            this.nodes.chorus,
            this.nodes.tremolo,
            this.nodes.delay,
            this.nodes.reverb,
            this.limiter
        );

        console.log('[SynthEngine] Audio engine created and signal chain connected.');
    }

    /**
     * Triggers the attack of a note or a chord.
     * @param {string|string[]} notes - The note(s) to play (e.g., "C4" or ["C4", "E4"]).
     * @param {number} [velocity=1.0] - The velocity of the note attack.
     */
    noteOn(notes, velocity = 1.0) {
        this.polySynth.triggerAttack(notes, this.Tone.now(), velocity);
    }

    /**
     * Triggers the release of a note or a chord.
     * @param {string|string[]} notes - The note(s) to release.
     */
    noteOff(notes) {
        this.polySynth.triggerRelease(notes, this.Tone.now());
    }

    /**
     * A generic method to set any parameter on the synth or its effects.
     * This is the primary interface for UI controls.
     * @param {string} path - The parameter path (e.g., "reverb.wet" or "polySynth.envelope.attack").
     * @param {*} value - The value to set.
     */
    setParameter(path, value) {
        // Find the target object and the final property key
        const pathParts = path.split('.');
        const key = pathParts.pop();
        
        // Resolve the object reference (e.g., this.polySynth, this.nodes.reverb)
        let target = this;
        if (pathParts[0] === 'polySynth') {
             target = this.polySynth;
             pathParts.shift();
        } else if (this.nodes[pathParts[0]]) {
             target = this.nodes[pathParts[0]];
             pathParts.shift();
        }

        // Traverse the remaining path to find the final object
        let finalObject = target;
        for (const part of pathParts) {
            finalObject = finalObject[part];
            if (!finalObject) {
                console.warn(`[SynthEngine] Invalid path for setParameter: ${path}`);
                return;
            }
        }
        
        // Set the value on the target parameter
        if (finalObject && typeof finalObject[key] !== 'undefined') {
            if (finalObject[key]?.value !== undefined) {
                // This is a Tone.Signal or similar object
                finalObject[key].value = value;
            } else {
                finalObject[key] = value;
            }
        } else {
            console.warn(`[SynthEngine] Could not set parameter at path: ${path}`);
        }
    }

    /**
     * Gathers the current state of all configurable parameters into a JSON object.
     * @returns {object} A serializable patch object.
     */
    getPatch() {
        const patch = {
            polySynth: this.polySynth.get(),
            effects: {
                reverb: this.nodes.reverb.get(),
                delay: this.nodes.delay.get(),
                chorus: this.nodes.chorus.get(),
                distortion: this.nodes.distortion.get(),
                filter: this.nodes.filter.get(),
                phaser: this.nodes.phaser.get(),
                tremolo: this.nodes.tremolo.get(),
                vibrato: this.nodes.vibrato.get(),
            }
        };
        // Manual override for AutoFilter state, as .get() doesn't capture it.
        patch.effects.filter.state = this.nodes.filter.state;
        return patch;
    }

    /**
     * Applies a patch object to the synth, reconfiguring it.
     * @param {object} patch - A patch object, likely from getPatch() or a file.
     */
    setPatch(patch) {
        if (!patch) return;
        if (patch.polySynth) {
            this.polySynth.set(patch.polySynth);
        }
        if (patch.effects) {
            for (const effectName in patch.effects) {
                if (this.nodes[effectName]) {
                    this.nodes[effectName].set(patch.effects[effectName]);
                    // Special handling for AutoFilter state
                    if (effectName === 'filter' && patch.effects.filter.state === 'started') {
                        this.nodes.filter.start();
                    } else if (effectName === 'filter') {
                        this.nodes.filter.stop();
                    }
                }
            }
        }
        console.log('[SynthEngine] Patch loaded.');
    }

    /**
     * Cleanly disposes of all Tone.js objects to free up resources.
     */
    dispose() {
        this.polySynth.dispose();
        Object.values(this.nodes).forEach(node => node.dispose());
        this.limiter.dispose();
        console.log('[SynthEngine] All nodes disposed.');
    }
}