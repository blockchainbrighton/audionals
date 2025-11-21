/**
 * Module: sequencer-sampler-channel-playback.js
 * Purpose: Contains the isolated logic for triggering a single sampler channel,
 * including the safety envelope to prevent audio artifacts.
 * Exports: playSamplerChannel
 * Depends on: sequencer-state.js
 */

import { runtimeState, ensureSamplerChannelDefaults, markSampleRecentlyUsed } from './sequencer-state.js';
import { normalizeFadeShape, getToneCurveForShape } from './fade-shapes.js';
import { ensureChannelGain } from './sequencer-channel-mixer.js';
import { ensureChannelInsertChain, attachSourceToChannelInserts } from './plugins/channel-insert-manager.js';

const MAX_OVERLAP_VOICES = 8;
const SAMPLER_VOICE_IDLE_TIMEOUT_MS = 4000;
const MIN_REGION_SPAN = 0.01;
const MIN_PLAYBACK_RATE = 0.25;
const MAX_PLAYBACK_RATE = 4;
const MAX_FADE_SECONDS = 2;

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
        busyUntil: 0,
        channelRef: null
    };
    player.onstop = () => {
        entry.isPlaying = false;
        entry.busyUntil = 0;
        if (entry.channelRef) {
            const voice = runtimeState.samplerVoices.get(entry.channelRef);
            if (voice) {
                scheduleVoiceDisposal(entry.channelRef, voice);
            }
        }
    };
    return entry;
}

function getSamplerVoice(channelData) {
    const Tone = runtimeState.Tone;
    if (!Tone) return null;

    let voice = runtimeState.samplerVoices.get(channelData);
    if (voice) {
        if (voice.idleTimer) {
            clearTimeout(voice.idleTimer);
            voice.idleTimer = null;
        }
        return voice;
    }

    voice = {
        voices: [],
        outputGain: null,
        insertTarget: null,
        allowOverlap: !!channelData.allowOverlap,
        idleTimer: null,
        lastActiveAt: Date.now()
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
    entry.channelRef = channelData;
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

function clampRegionStart(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(0.99, value));
}

function clampRegionEnd(start, end) {
    if (!Number.isFinite(end)) return Math.min(1, start + MIN_REGION_SPAN);
    const normalizedEnd = Math.max(start + MIN_REGION_SPAN, Math.min(1, end));
    if (normalizedEnd <= start) {
        return Math.min(1, start + MIN_REGION_SPAN);
    }
    return normalizedEnd;
}

function clampPlaybackRate(value) {
    if (!Number.isFinite(value)) return 1;
    return Math.max(MIN_PLAYBACK_RATE, Math.min(MAX_PLAYBACK_RATE, value));
}

function clampBaseFade(value, fallback) {
    const numeric = Number.isFinite(value) ? value : fallback;
    return Math.max(0, Math.min(MAX_FADE_SECONDS, numeric));
}

function buildPlaybackSource(channelData, samplerOverride = null) {
    const region = channelData.sampleRegion || {};
    const source = samplerOverride ? { ...samplerOverride } : {};
    const start = clampRegionStart(source.regionStart ?? region.start);
    const end = clampRegionEnd(start, source.regionEnd ?? region.end);
    const fadeInShape = source.fadeInShape ?? channelData.sampleFadeInShape;
    const fadeOutShape = source.fadeOutShape ?? channelData.sampleFadeOutShape;

    return {
        regionStart: start,
        regionEnd: end,
        playbackRate: clampPlaybackRate(source.playbackRate ?? channelData.samplePlaybackRate),
        fadeIn: clampBaseFade(source.fadeIn ?? channelData.sampleFadeIn, 0.005),
        fadeOut: clampBaseFade(source.fadeOut ?? channelData.sampleFadeOut, 0.05),
        fadeInShape: normalizeFadeShape(fadeInShape),
        fadeOutShape: normalizeFadeShape(fadeOutShape)
    };
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
    markSampleRecentlyUsed(channelData.selectedSampleIndex);

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

    const playbackSource = buildPlaybackSource(channelData, samplerOverride);
    const normalizedStart = playbackSource.regionStart;
    const normalizedEnd = playbackSource.regionEnd;
    const offsetSeconds = normalizedStart * bufferDuration;
    const selectionDuration = Math.max(MIN_REGION_SPAN, (normalizedEnd - normalizedStart)) * bufferDuration;

    if (!Number.isFinite(offsetSeconds) || !Number.isFinite(selectionDuration)) {
        console.warn('[AUDIO] Skipping sampler playback due to invalid timing values', {
            offsetSeconds,
            selectionDuration
        });
        return;
    }

    const samplePlaybackRate = playbackSource.playbackRate;
    const effectivePlaybackRate = Math.max(0.0001, samplePlaybackRate);
    const actualDuration = selectionDuration / effectivePlaybackRate;
    const sampleFadeIn = Math.min(playbackSource.fadeIn, actualDuration);
    const sampleFadeOut = Math.min(playbackSource.fadeOut, actualDuration);
    const fadeInShape = playbackSource.fadeInShape;
    const fadeOutShape = playbackSource.fadeOutShape;

    const sustainDuration = Math.max(0, actualDuration - sampleFadeOut);
    const releaseEstimate = actualDuration + sampleFadeOut + 0.05;
    const voiceEntry = acquireVoiceEntry(voice, allowOverlap, time, releaseEstimate);
    if (!voiceEntry) return;
    markVoiceActive(voice);

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
    // console.debug(`[AUDIO]   ├─ [SAMPLER] at ${displayTime} → offset ${offsetSeconds.toFixed(3)}s duration ${selectionDuration.toFixed(3)}s overlap=${allowOverlap}`);
}

export function disposeSamplerVoices() {
    runtimeState.samplerVoices.forEach(voice => {
        if (!voice) return;
        if (voice.idleTimer) {
            clearTimeout(voice.idleTimer);
            voice.idleTimer = null;
        }
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

export function scheduleSamplerVoiceDisposal(channel) {
    const voice = runtimeState.samplerVoices.get(channel);
    if (!voice) return;
    scheduleVoiceDisposal(channel, voice);
}
function scheduleVoiceDisposal(channelData, voice = runtimeState.samplerVoices.get(channelData)) {
    if (!voice || voice.idleTimer) return;
    voice.idleTimer = setTimeout(() => {
        voice.idleTimer = null;
        const stillPlaying = voice.voices.some(entry => entry.isPlaying);
        if (stillPlaying) {
            scheduleVoiceDisposal(channelData, voice);
            return;
        }
        voice.voices.forEach(entry => {
            try { entry.player?.dispose?.(); } catch { /* ignore */ }
            try { entry.ampEnv?.dispose?.(); } catch { /* ignore */ }
        });
        voice.voices.length = 0;
        runtimeState.samplerVoices.delete(channelData);
    }, SAMPLER_VOICE_IDLE_TIMEOUT_MS);
}

function markVoiceActive(voice) {
    voice.lastActiveAt = Date.now();
    if (voice.idleTimer) {
        clearTimeout(voice.idleTimer);
        voice.idleTimer = null;
    }
}
