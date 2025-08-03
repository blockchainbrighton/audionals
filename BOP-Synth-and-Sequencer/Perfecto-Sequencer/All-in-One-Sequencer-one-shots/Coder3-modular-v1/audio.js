// Audio Engine Manager and Synth Registry
import { reducer, initialState, setSynthParams } from './state.js';

// Runtime state to hold Tone.js reference
export const runtimeState = {
    Tone: null
};

// --- Synth Registry ---
const synthRegistry = {};

export function registerSynth(synthType, synthClass) {
    synthRegistry[synthType] = synthClass;
    console.log(`[Audio] Registered synth: ${synthType}`);
}

export function getSynthClass(synthType) {
    return synthRegistry[synthType];
}

export function getAvailableSynthTypes() {
    return Object.keys(synthRegistry);
}
// --- End Synth Registry ---

// --- Synth Instance Management ---
// Updated to accept context for recording
export function createSynthInstance(ToneContext, channelState) {
    const SynthClass = getSynthClass(channelState.synthType);
    if (!SynthClass) {
        console.error(`[Audio] Synth type '${channelState.synthType}' not found in registry.`);
        return null;
    }
    try {
        // Pass the ToneContext to the constructor
        const synthInstance = new SynthClass(ToneContext, channelState.params);
        console.log(`[Audio] Created synth instance for ${channelState.synthType}`);
        return synthInstance;
    } catch (error) {
        console.error(`[Audio] Failed to create synth instance for ${channelState.synthType}:`, error);
        return null;
    }
}

export function updateSynthInstance(synthInstance, newParams) {
    if (synthInstance && typeof synthInstance.set === 'function') {
        try {
            synthInstance.set(newParams);
            console.log(`[Audio] Updated synth instance with params:`, newParams);
        } catch (error) {
            console.error("[Audio] Error updating synth instance:", error);
        }
    }
}

export function disposeSynthInstance(synthInstance) {
    if (synthInstance && typeof synthInstance.dispose === 'function') {
        try {
            synthInstance.dispose();
            console.log(`[Audio] Disposed synth instance.`);
        } catch (error) {
            console.error("[Audio] Error disposing synth instance:", error);
        }
    }
}
// --- End Synth Instance Management ---