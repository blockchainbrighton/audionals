/**
 * @file SynthEngine.js
 * @description Refactored synth engine module as an ES6 class for the BOP Synthesizer component.
 * Encapsulates all Tone.js objects and audio processing with a clean API.
 */

// Use a named export, which matches how app.js imports it.
export class SynthEngine {
    /**
     * @param {object} Tone - The fully loaded Tone.js library object.
     */
    constructor(Tone) {
        // --- FIX 1: Accept the Tone object directly. ---
        // This is the primary fix for the crash.
        this.Tone = Tone;
        
        if (!this.Tone) {
            throw new Error('SynthEngine requires a loaded Tone.js instance to be passed to its constructor.');
        }
        
        this.nodes = {}; // To hold all our Tone.js nodes for easy access
        this.polySynth = null;
        this.limiter = null;
        
        // Initialize the synth engine
        this.init();
    }

    init() {
        this.createAudioChain();
        // --- FIX 2: Remove the incompatible event listener setup. ---
        // The app.js host uses direct method calls, not an event-driven system.
        // this.setupEventListeners(); 
        console.log('[SynthEngine] Audio engine created and signal chain connected.');
    }

    // --- REMOVED: setupEventListeners() method is no longer needed. ---

    createAudioChain() {
        // 1. Create the master output and a limiter to prevent clipping
        this.limiter = new this.Tone.Limiter(-6).toDestination();

        // 2. Create Effects Nodes
        this.nodes.reverb = new this.Tone.Reverb({ wet: 0, decay: 1.5 });
        this.nodes.delay = new this.Tone.FeedbackDelay({ wet: 0, delayTime: "8n", feedback: 0.5 });
        this.nodes.chorus = new this.Tone.Chorus({ wet: 0, frequency: 1.5, depth: 0.7 });
        this.nodes.distortion = new this.Tone.Distortion({ wet: 0, distortion: 0.1 });
        this.nodes.filter = new this.Tone.AutoFilter({ 
            wet: 1, 
            frequency: 1, 
            baseFrequency: 200, 
            octaves: 4 
        }).stop(); // Start with wet=1 but the LFO stopped
        this.nodes.phaser = new this.Tone.Phaser({ wet: 0, frequency: 0.5, octaves: 3 });
        this.nodes.tremolo = new this.Tone.Tremolo({ wet: 0, frequency: 5, depth: 0.5 }).start();
        this.nodes.vibrato = new this.Tone.Vibrato({ wet: 0, frequency: 5, depth: 0.1 });

        // 3. Create the Polyphonic Synthesizer
        this.polySynth = new this.Tone.PolySynth(this.Tone.Synth, {
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

        // --- FIX 3: Removed reference to non-existent mainComponent. ---
        // The assignment is done in app.js after instantiation.
        // this.mainComponent.state.synthEngine = this; 
    }

    /**
     * Triggers the attack of a note or a chord.
     * @param {string|string[]} notes - The note(s) to play (e.g., "C4" or ["C4", "E4"]).
     * @param {number} [velocity=1.0] - The velocity of the note attack.
     */
    noteOn(notes, velocity = 1.0) {
        if (this.polySynth) {
            this.polySynth.triggerAttack(notes, this.Tone.now(), velocity);
        }
    }

    /**
     * Triggers the release of a note or a chord.
     * @param {string|string[]} notes - The note(s) to release.
     */
    noteOff(notes) {
        if (this.polySynth) {
            this.polySynth.triggerRelease(notes, this.Tone.now());
        }
    }

    triggerAttackRelease(notes, duration, time, velocity) {
        if (this.polySynth) {
            this.polySynth.triggerAttackRelease(notes, duration, time, velocity);
        }
    }

    // --- THIS IS THE FIX ---
    /**
     * Triggers the release for all currently playing notes. This is the "panic" or "stop" function.
     */
    releaseAll() {
        if (this.polySynth) {
            // The PolySynth object from Tone.js has its own releaseAll method. We just call it.
            this.polySynth.releaseAll();
            console.log('[SynthEngine] All notes released.');
        }
    }


    /**
     * A generic method to set any parameter on the synth or its effects.
     * This is the primary interface for UI controls.
     * @param {string} path - The parameter path (e.g., "effects.reverb.wet" or "polySynth.envelope.attack").
     * @param {*} value - The value to set.
     */
    setParameter(path, value) {
        const pathParts = path.split('.');
        const key = pathParts.pop();
        
        let targetRoot;
        const rootKey = pathParts.shift();

        if (rootKey === 'polySynth') {
            targetRoot = this.polySynth;
        } else if (rootKey === 'effects') {
            const effectName = pathParts.shift();
            targetRoot = this.nodes[effectName];
        } else {
            console.warn(`[SynthEngine] Invalid root in path: ${path}`);
            return;
        }

        if (!targetRoot) {
            console.warn(`[SynthEngine] Invalid target in path: ${path}`);
            return;
        }

        let finalObject = targetRoot;
        for (const part of pathParts) {
            finalObject = finalObject[part];
            if (!finalObject) {
                console.warn(`[SynthEngine] Invalid path for setParameter: ${path}`);
                return;
            }
        }
        
        if (finalObject && typeof finalObject[key] !== 'undefined') {
            if (finalObject[key]?.value !== undefined && typeof finalObject[key].value === 'number') {
                // This is a Tone.Signal or similar object with a .value property
                finalObject[key].value = value;
            } else {
                // This is a direct property (like 'type' or 'state')
                finalObject[key] = value;
            }
        } else {
            console.warn(`[SynthEngine] Could not set parameter at path: ${path}`);
        }
    }

    // --- No changes needed to getPatch, setPatch, or other methods below ---
    
    getPatch() {
        if (!this.polySynth) return {};
        
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
        patch.effects.filter.state = this.nodes.filter.state;
        return patch;
    }

    setPatch(patch) {
        if (!patch || !this.polySynth) return;
        
        if (patch.polySynth) {
            this.polySynth.set(patch.polySynth);
        }
        if (patch.effects) {
            for (const effectName in patch.effects) {
                if (this.nodes[effectName] && patch.effects[effectName]) {
                    this.nodes[effectName].set(patch.effects[effectName]);
                    if (effectName === 'filter' && patch.effects[effectName].state === 'started') {
                        this.nodes.filter.start();
                    } else if (effectName === 'filter') {
                        this.nodes.filter.stop();
                    }
                }
            }
        }
        console.log('[SynthEngine] Patch loaded.');
    }

    dispose() {
        if (this.polySynth) this.polySynth.dispose();
        Object.values(this.nodes).forEach(node => node?.dispose());
        if (this.limiter) this.limiter.dispose();
        console.log('[SynthEngine] All nodes disposed.');
    }
}
// Removed redundant `export default`