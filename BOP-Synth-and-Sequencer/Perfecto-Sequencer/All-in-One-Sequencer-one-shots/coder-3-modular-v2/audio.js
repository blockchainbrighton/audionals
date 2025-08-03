import { setSynthParams } from './state.js';

// Synth Manager Module
export class SynthManager {
    constructor(Tone) {
        this.Tone = Tone;
        this.synthRegistry = {}; // Maps synthType string to class constructor
        this.channelSynths = {}; // Maps channel ID to synth instance
    }

    // Register a new synth class
    registerSynth(synthType, synthClass) {
        this.synthRegistry[synthType] = synthClass;
    }

    // Create a synth instance for a channel
    createSynthForChannel(channel, dispatch) {
        const SynthClass = this.synthRegistry[channel.synthType];
        if (!SynthClass) {
            console.error(`Synth type '${channel.synthType}' not registered.`);
            return null;
        }

        try {
            // Dispose of any existing synth for this channel
            this.disposeSynthForChannel(channel.id);

            // Create new instance
            const synthInstance = new SynthClass(this.Tone, channel.params);
            this.channelSynths[channel.id] = synthInstance;

            // Update state with the new instance reference
            // Note: In a more complex state management system, you might not store the instance directly in state.
            // For simplicity here, we'll assume the state reducer handles it or we update it directly if needed.
            // The main sequencer logic will call methods on this instance.

            return synthInstance;
        } catch (error) {
            console.error(`Failed to create synth instance for type '${channel.synthType}':`, error);
            return null;
        }
    }

    // Update synth parameters for a channel
    updateSynthForChannel(channel) {
        const synthInstance = this.channelSynths[channel.id];
        if (synthInstance && synthInstance.set) {
            synthInstance.set(channel.params);
        }
    }

    // Dispose of a synth instance for a channel
    disposeSynthForChannel(channelId) {
        const synthInstance = this.channelSynths[channelId];
        if (synthInstance && synthInstance.dispose) {
            synthInstance.dispose();
        }
        delete this.channelSynths[channelId];
    }

    // Trigger a note on a channel's synth
    triggerNote(channel, stepIndex, time) {
        const synthInstance = this.channelSynths[channel.id];
        if (synthInstance && synthInstance.trigger) {
            const note = channel.notes[stepIndex];
            const duration = "8n"; // Could be made configurable per channel/step
            synthInstance.trigger(note, duration, time);
        }
    }

    // Clean up all synths
    disposeAll() {
        Object.keys(this.channelSynths).forEach(channelId => {
            this.disposeSynthForChannel(channelId);
        });
        this.channelSynths = {};
    }
}

// Export a singleton instance or create one in main.js
// For this structure, it's better to create it in main.js and pass it around.