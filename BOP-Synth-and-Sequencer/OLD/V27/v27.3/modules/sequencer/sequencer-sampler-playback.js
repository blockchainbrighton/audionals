/**
 * Module: sequencer-sampler-channel-playback.js
 * Purpose: Contains the isolated logic for triggering a single sampler channel,
 * including the safety envelope to prevent audio artifacts.
 * Exports: playSamplerChannel
 * Depends on: sequencer-state.js
 */

import { runtimeState, ensureSamplerChannelDefaults } from './sequencer-state.js';
import { ensureChannelGain } from './sequencer-channel-mixer.js';
import { ensureChannelInsertChain, attachSourceToChannelInserts } from './plugins/channel-insert-manager.js';

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

    voice = { player, ampEnv, outputGain: null, insertTarget: null };
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

    ensureSamplerChannelDefaults(channelData);

    const voice = getSamplerVoice(channelData);
    if (!voice) return;

    if (voice.player.buffer !== buffer) {
        voice.player.buffer = buffer;
    }

    const insertChain = ensureChannelInsertChain(channelData);
    const channelGain = ensureChannelGain(channelData);
    if (insertChain) {
        if (voice.insertTarget !== insertChain) {
            try { voice.ampEnv.disconnect(); } catch (err) { /* ignore */ }
            try {
                attachSourceToChannelInserts(channelData, voice.ampEnv);
            } catch (err) {
                console.warn('[AUDIO] Failed to route sampler envelope through insert chain:', err);
            }
            voice.insertTarget = insertChain;
            voice.outputGain = channelGain || null;
        }
    } else if (voice.outputGain !== channelGain) {
        try { voice.ampEnv.disconnect(); } catch (err) { /* ignore disconnect issues */ }
        if (channelGain) {
            try { voice.ampEnv.connect(channelGain); }
            catch (err) { console.warn('[AUDIO] Failed to route sampler envelope to channel gain:', err); }
        }
        voice.outputGain = channelGain || null;
        voice.insertTarget = channelGain || null;
    }

    const bufferDuration = buffer.duration || (buffer.length / buffer.sampleRate) || 0;
    if (bufferDuration <= 0) return;

    const { sampleRegion, samplePlaybackRate, sampleFadeIn, sampleFadeOut } = channelData;
    const regionStart = Number.isFinite(sampleRegion?.start) ? sampleRegion.start : 0;
    const regionEnd = Number.isFinite(sampleRegion?.end) ? sampleRegion.end : 1;

    const normalizedStart = Math.max(0, Math.min(0.99, regionStart));
    const normalizedEndRaw = Math.max(normalizedStart + 0.01, Math.min(1, regionEnd));
    const normalizedEnd = Number.isFinite(normalizedEndRaw)
        ? normalizedEndRaw
        : Math.min(1, normalizedStart + 0.01);

    if (!Number.isFinite(normalizedStart) || !Number.isFinite(normalizedEnd)) {
        console.warn('[AUDIO] Skipping sampler playback due to invalid region bounds', {
            start: sampleRegion?.start,
            end: sampleRegion?.end
        });
        return;
    }

    const offsetSeconds = normalizedStart * bufferDuration;
    const selectionDuration = Math.max(0.01, (normalizedEnd - normalizedStart) * bufferDuration);

    if (!Number.isFinite(offsetSeconds) || !Number.isFinite(selectionDuration)) {
        console.warn('[AUDIO] Skipping sampler playback due to invalid timing values', {
            offsetSeconds,
            selectionDuration
        });
        return;
    }

    voice.player.playbackRate = samplePlaybackRate ?? 1;
    voice.player.loop = false;

    voice.ampEnv.attack = sampleFadeIn ?? 0.005;
    voice.ampEnv.release = sampleFadeOut ?? 0.05;

    // Ensure any previously scheduled playback is cancelled before retriggering.
    voice.player.stop(time);
    voice.ampEnv.triggerAttackRelease(selectionDuration, time);
    voice.player.start(time, offsetSeconds, selectionDuration);

    const displayTime = typeof time === 'number' ? time.toFixed(3) : 'n/a';
    console.debug(`[AUDIO]   ├─ [SAMPLER] at ${displayTime} → offset ${offsetSeconds.toFixed(3)}s duration ${selectionDuration.toFixed(3)}s`);
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
