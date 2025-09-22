/**
 * Module: sequencer-sampler-channel-playback.js
 * Purpose: Contains the isolated logic for triggering a single sampler channel,
 * including the safety envelope to prevent audio artifacts.
 * Exports: playSamplerChannel
 * Depends on: sequencer-state.js
 */

import { runtimeState } from './sequencer-state.js';

/**
 * Plays a sample for a given channel at a specific time, wrapped in a safety envelope.
 * @param {number} time - The Tone.js transport time to schedule the playback.
 * @param {object} channelData - The channel object from the project state.
 */
export function playSamplerChannel(time, channelData) {
    const buffer = runtimeState.allSampleBuffers[channelData.selectedSampleIndex];
    if (!buffer) return;

    const ampEnv = new runtimeState.Tone.AmplitudeEnvelope({
        attack: 0.005,
        decay: 0,
        sustain: 1.0,
        release: 0.05
    });

    const player = new runtimeState.Tone.Player(buffer).chain(ampEnv, runtimeState.Tone.Destination);

    // --- START OF FIX ---

    // 1. Tell the envelope to open and close at the scheduled time.
    ampEnv.triggerAttackRelease('16n', time);

    // 2. CRITICAL: Tell the player to start playing its buffer at the same scheduled time.
    // This ensures audio is flowing when the envelope gate is open.
    player.start(time);

    // --- END OF FIX ---

    console.debug(`[AUDIO]   ├─ [SAMPLER] at ${time.toFixed(3)} → trigger with safe envelope`);

    // Schedule disposal of the temporary nodes after they've fully finished.
    // A 2-second delay is more than safe for any sample and its release tail.
    setTimeout(() => {
        try {
            player.dispose();
            ampEnv.dispose();
        } catch {}
    }, 2000);
}