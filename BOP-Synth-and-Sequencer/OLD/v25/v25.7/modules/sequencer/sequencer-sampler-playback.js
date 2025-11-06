/**
 * Module: sequencer-sampler-channel-playback.js
 * Purpose: Contains the isolated logic for triggering a single sampler channel,
 * including the safety envelope to prevent audio artifacts.
 * Exports: playSamplerChannel
 * Depends on: sequencer-state.js
 */

import { runtimeState } from './sequencer-state.js';
import { ensureChannelGain } from './sequencer-channel-mixer.js';

function getSamplerVoice(channelData) {
    const Tone = runtimeState.Tone;
    if (!Tone) return null;

    let voice = runtimeState.samplerVoices.get(channelData);
    if (voice) return voice;

    const ampEnv = new Tone.AmplitudeEnvelope({
        attack: 0.005,
        decay: 0,
        sustain: 1.0,
        release: 0.05
    });

    const player = new Tone.Player({ autostart: false });
    player.connect(ampEnv);

    voice = { player, ampEnv, outputGain: null };
    runtimeState.samplerVoices.set(channelData, voice);
    return voice;
}

/**
 * Plays a sample for a given channel at a specific time, wrapped in a safety envelope.
 * @param {number} time - The Tone.js transport time to schedule the playback.
 * @param {object} channelData - The channel object from the project state.
 */
export function playSamplerChannel(time, channelData) {
    const buffer = runtimeState.allSampleBuffers[channelData.selectedSampleIndex];
    if (!buffer) return;

    const voice = getSamplerVoice(channelData);
    if (!voice) return;

    if (voice.player.buffer !== buffer) {
        voice.player.buffer = buffer;
    }

    const channelGain = ensureChannelGain(channelData);
    if (voice.outputGain !== channelGain) {
        try {
            if (voice.outputGain) voice.ampEnv.disconnect(voice.outputGain);
        } catch (err) { /* ignore disconnect issues */ }
        if (channelGain) {
            try { voice.ampEnv.connect(channelGain); }
            catch (err) { console.warn('[AUDIO] Failed to route sampler envelope to channel gain:', err); }
        }
        voice.outputGain = channelGain || null;
    }

    // Ensure any previously scheduled playback is cancelled before retriggering.
    voice.player.stop(time);
    voice.ampEnv.triggerAttackRelease('16n', time);
    voice.player.start(time);

    const displayTime = typeof time === 'number' ? time.toFixed(3) : 'n/a';
    console.debug(`[AUDIO]   ├─ [SAMPLER] at ${displayTime} → trigger with safe envelope`);
}

export function disposeSamplerVoices() {
    runtimeState.samplerVoices.forEach(voice => {
        try {
            voice.player?.dispose();
            voice.ampEnv?.dispose();
        } catch (err) {
            console.warn('[AUDIO] Failed to dispose sampler voice:', err);
        }
    });
    runtimeState.samplerVoices.clear();
}
