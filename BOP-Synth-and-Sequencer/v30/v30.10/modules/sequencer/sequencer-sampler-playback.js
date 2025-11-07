/**
 * Module: sequencer-sampler-channel-playback.js
 * Purpose: Contains the isolated logic for triggering a single sampler channel,
 * including the safety envelope to prevent audio artifacts.
 * Exports: playSamplerChannel
 * Depends on: sequencer-state.js
 */

import { runtimeState, ensureSamplerChannelDefaults } from './sequencer-state.js';
import { normalizeFadeShape, getToneCurveForShape } from './fade-shapes.js';
import { ensureChannelGain } from './sequencer-channel-mixer.js';
import { ensureChannelInsertChain, attachSourceToChannelInserts } from './plugins/channel-insert-manager.js';

const MAX_OVERLAP_VOICES = 8;

function createSamplerVoiceEntry(Tone) {
    const ampEnv = new Tone.AmplitudeEnvelope({
        attack: 0.005,
        decay: 0,
        sustain: 1.0,
        release: 0.05
    });
    const player = new Tone.Player({ autostart: false });
    player.connect(ampEnv);
    const entry = {
        player,
        ampEnv,
        outputTarget: null,
        isPlaying: false,
        busyUntil: 0
    };
    player.onstop = () => {
        entry.isPlaying = false;
        entry.busyUntil = 0;
    };
    return entry;
}

function getSamplerVoice(channelData) {
    const Tone = runtimeState.Tone;
    if (!Tone) return null;

    let voice = runtimeState.samplerVoices.get(channelData);
    if (voice) return voice;

    voice = {
        voices: [],
        outputGain: null,
        insertTarget: null,
        allowOverlap: !!channelData.allowOverlap
    };
    runtimeState.samplerVoices.set(channelData, voice);
    return voice;
}

function routeVoiceEntry(entry, channelData, insertChain, channelGain) {
    const target = insertChain || channelGain || null;
    if (entry.outputTarget === target) return;
    try {
        entry.ampEnv.disconnect();
    } catch (err) {
        /* ignore disconnect issues */
    }
    if (insertChain) {
        try {
            attachSourceToChannelInserts(channelData, entry.ampEnv);
        } catch (err) {
            console.warn('[AUDIO] Failed to attach sampler voice to insert chain:', err);
        }
    } else if (channelGain) {
        try {
            entry.ampEnv.connect(channelGain);
        } catch (err) {
            console.warn('[AUDIO] Failed to connect sampler voice to channel gain:', err);
        }
    }
    entry.outputTarget = target;
}

function acquireVoiceEntry(channelVoice, allowOverlap, time, estimatedRelease) {
    const Tone = runtimeState.Tone;
    if (!Tone) return null;
    channelVoice.allowOverlap = allowOverlap;

    const voices = channelVoice.voices;
    const now = Tone.now?.() ?? time;
    const tolerance = 0.004;

    if (!allowOverlap) {
        if (!voices.length) {
            voices.push(createSamplerVoiceEntry(Tone));
        }
        return voices[0];
    }

    let available = voices.find(v => !v.isPlaying || v.busyUntil <= now + tolerance);
    if (available) return available;

    if (voices.length < MAX_OVERLAP_VOICES) {
        const entry = createSamplerVoiceEntry(Tone);
        voices.push(entry);
        return entry;
    }

    voices.sort((a, b) => a.busyUntil - b.busyUntil);
    available = voices[0];
    try {
        available.player.stop(time);
    } catch (err) {
        /* ignore */
    }
    available.busyUntil = now + estimatedRelease;
    return available;
}

/**
 * Plays a sample for a given channel at a specific time, wrapped in a safety envelope.
 * @param {number} time - The Tone.js transport time to schedule the playback.
 * @param {object} channelData - The channel object from the project state.
 * @param {object|null} samplerOverride - Optional precomputed sampler settings.
 * @param {boolean|null} allowOverlapOverride - Force overlap behaviour when set.
 */
export function playSamplerChannel(time, channelData, samplerOverride = null, allowOverlapOverride = null) {
    const buffer = runtimeState.allSampleBuffers[channelData.selectedSampleIndex];
    if (!buffer) return;

    ensureSamplerChannelDefaults(channelData);

    const voice = getSamplerVoice(channelData);
    if (!voice) return;
    const allowOverlap = typeof allowOverlapOverride === 'boolean'
        ? allowOverlapOverride
        : !!channelData.allowOverlap;

    const insertChain = ensureChannelInsertChain(channelData);
    const channelGain = ensureChannelGain(channelData);
    const bufferDuration = buffer.duration || (buffer.length / buffer.sampleRate) || 0;
    if (bufferDuration <= 0) return;

    const source = samplerOverride ?? {
        regionStart: channelData.sampleRegion?.start,
        regionEnd: channelData.sampleRegion?.end,
        playbackRate: channelData.samplePlaybackRate,
        fadeIn: channelData.sampleFadeIn,
        fadeOut: channelData.sampleFadeOut,
        fadeInShape: channelData.sampleFadeInShape,
        fadeOutShape: channelData.sampleFadeOutShape,
        sampleIndex: channelData.selectedSampleIndex
    };

    const regionStart = Number.isFinite(source?.regionStart) ? source.regionStart : 0;
    const regionEnd = Number.isFinite(source?.regionEnd) ? source.regionEnd : 1;

    const normalizedStart = Math.max(0, Math.min(0.99, regionStart));
    const normalizedEndRaw = Math.max(normalizedStart + 0.01, Math.min(1, regionEnd));
    const normalizedEnd = Number.isFinite(normalizedEndRaw)
        ? normalizedEndRaw
        : Math.min(1, normalizedStart + 0.01);

    if (!Number.isFinite(normalizedStart) || !Number.isFinite(normalizedEnd)) {
        console.warn('[AUDIO] Skipping sampler playback due to invalid region bounds', {
            start: channelData.sampleRegion?.start,
            end: channelData.sampleRegion?.end
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

    const samplePlaybackRate = typeof source?.playbackRate === 'number' && !Number.isNaN(source.playbackRate)
        ? source.playbackRate
        : 1;
    const rawFadeIn = typeof source?.fadeIn === 'number' ? Math.max(0, source.fadeIn) : 0.005;
    const rawFadeOut = typeof source?.fadeOut === 'number' ? Math.max(0, source.fadeOut) : 0.05;
    const effectivePlaybackRate = Math.max(0.0001, samplePlaybackRate);
    const actualDuration = selectionDuration / effectivePlaybackRate;
    const sampleFadeIn = Math.min(rawFadeIn, actualDuration);
    const sampleFadeOut = Math.min(rawFadeOut, actualDuration);
    const fadeInShape = normalizeFadeShape(source?.fadeInShape ?? channelData.sampleFadeInShape);
    const fadeOutShape = normalizeFadeShape(source?.fadeOutShape ?? channelData.sampleFadeOutShape);

    const sustainDuration = Math.max(0, actualDuration - sampleFadeOut);
    const releaseEstimate = actualDuration + sampleFadeOut + 0.05;
    const voiceEntry = acquireVoiceEntry(voice, allowOverlap, time, releaseEstimate);
    if (!voiceEntry) return;

    if (voiceEntry.player.buffer !== buffer) {
        voiceEntry.player.buffer = buffer;
    }

    routeVoiceEntry(voiceEntry, channelData, insertChain, channelGain);

    voiceEntry.player.playbackRate = samplePlaybackRate;
    voiceEntry.player.loop = false;
    voiceEntry.player.fadeIn = sampleFadeIn;
    voiceEntry.player.fadeOut = sampleFadeOut;
    voiceEntry.ampEnv.attackCurve = getToneCurveForShape(fadeInShape);
    voiceEntry.ampEnv.releaseCurve = getToneCurveForShape(fadeOutShape);
    voiceEntry.ampEnv.attack = sampleFadeIn;
    voiceEntry.ampEnv.release = sampleFadeOut;

    if (!allowOverlap) {
        try {
            voiceEntry.player.stop(time);
        } catch (err) {
            /* ignore double stop */
        }
    }

    voiceEntry.ampEnv.triggerAttackRelease(sustainDuration, time);
    voiceEntry.player.start(time, offsetSeconds, selectionDuration);
    voiceEntry.isPlaying = true;
    voiceEntry.busyUntil = time + actualDuration + 0.05;

    const Tone = runtimeState.Tone;
    const audioStartTime = typeof time === 'number'
        ? time
        : (Tone?.now?.() ?? null);
    if (typeof window !== 'undefined' && window?.dispatchEvent && audioStartTime !== null) {
        try {
            window.dispatchEvent(new CustomEvent('sampler-playback', {
                detail: {
                    channel: channelData,
                    startTime: audioStartTime,
                    duration: actualDuration,
                    bufferDuration,
                    offsetSeconds,
                    range: {
                        start: normalizedStart,
                        end: normalizedEnd
                    },
                    playbackRate: samplePlaybackRate,
                    allowOverlap
                }
            }));
        } catch (err) {
            console.warn('[AUDIO] Failed to dispatch sampler playback event:', err);
        }
    }

    const displayTime = typeof time === 'number' ? time.toFixed(3) : 'n/a';
    console.debug(`[AUDIO]   ├─ [SAMPLER] at ${displayTime} → offset ${offsetSeconds.toFixed(3)}s duration ${selectionDuration.toFixed(3)}s overlap=${allowOverlap}`);
}

export function disposeSamplerVoices() {
    runtimeState.samplerVoices.forEach(voice => {
        if (!voice) return;
        if (Array.isArray(voice.voices)) {
            voice.voices.forEach(entry => {
                try { entry.player?.dispose?.(); } catch (err) { console.warn('[AUDIO] Failed to dispose sampler player:', err); }
                try { entry.ampEnv?.dispose?.(); } catch (err) { console.warn('[AUDIO] Failed to dispose sampler envelope:', err); }
            });
            voice.voices.length = 0;
        } else {
            try { voice.player?.dispose?.(); } catch (err) { console.warn('[AUDIO] Failed to dispose sampler player:', err); }
            try { voice.ampEnv?.dispose?.(); } catch (err) { console.warn('[AUDIO] Failed to dispose sampler envelope:', err); }
        }
    });
    runtimeState.samplerVoices.clear();
}
