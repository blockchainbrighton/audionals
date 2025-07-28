
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