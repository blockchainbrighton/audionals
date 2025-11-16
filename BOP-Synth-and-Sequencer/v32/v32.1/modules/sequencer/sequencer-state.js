// BOP-Sequencer-V10-Modular/sequencer-state.js

import { INITIAL_INSTRUMENT_CHANNELS, INITIAL_SAMPLER_CHANNELS, INITIAL_SEQUENCES, TOTAL_STEPS } from './sequencer-config.js';
import { SimpleSampleLoader } from './sequencer-sample-loader.js';
import { normalizeFadeShape, DEFAULT_FADE_SHAPE } from './fade-shapes.js';
import { DEFAULT_EQ_SETTINGS } from './plugins/eq-plugin.js';
import { DEFAULT_COMPRESSOR_SETTINGS } from './plugins/compressor-plugin.js';
import { DEFAULT_GATE_SETTINGS } from './plugins/gate-plugin.js';
import { DEFAULT_REVERB_SETTINGS } from './plugins/reverb-plugin.js';
import { DEFAULT_DELAY_SETTINGS } from './plugins/delay-plugin.js';
import { DEFAULT_CHORUS_SETTINGS } from './plugins/chorus-plugin.js';
import { DEFAULT_PHASER_SETTINGS } from './plugins/phaser-plugin.js';
import { DEFAULT_BITCRUSHER_SETTINGS } from './plugins/bitcrusher-plugin.js';
import { normalizeInsertQuality, inferReverbQualityFromSettings, inferDelayQualityFromSettings } from './plugins/insert-quality.js';
import { DEFAULT_INSTRUMENT_TYPE } from './instrument-registry.js';

export const projectState = {
    sequences: [],
    currentSequenceIndex: 0,
    bpm: 120.00,
    isPlaying: false,
    playMode: null,
    nextInstrumentId: 0
};

export const runtimeState = {
    Tone: null,
    isToneStarted: false,
    currentStepIndex: 0,
    currentPlaybackSequenceIndex: 0,
    instrumentRack: {},
    instrumentLiveStatuses: new Map(),
    activeInstrumentId: null,
    activeInstrumentChannel: null,
    allSampleBuffers: {},
    sampleCacheMeta: new Map(),
    samplerVoices: new Map(),
    channelGainNodes: new Map(),
    channelInsertChains: new Map(),
    instrumentClips: new Map(),
    sampleMetadata: {
        names: [],
        bpms: [],
        isLoop: []
    },
    instrumentPlaybackState: new Map(),
    insertPanelState: new Map(),
    auxBuses: new Map(),
    sequenceCycle: 0,
    lastStepIndex: -1
};

const SAMPLE_CACHE_IDLE_MS = 60000;

const DEFAULT_SAMPLE_REGION = Object.freeze({ start: 0, end: 1 });
const DEFAULT_SAMPLE_PLAYBACK_RATE = 1;
const DEFAULT_SAMPLE_FADE_IN = 0.005;
const DEFAULT_SAMPLE_FADE_OUT = 0.05;
const DEFAULT_SAMPLE_FADE_IN_SHAPE = DEFAULT_FADE_SHAPE;
const DEFAULT_SAMPLE_FADE_OUT_SHAPE = DEFAULT_FADE_SHAPE;

const DEFAULT_INSERT_SETTINGS = Object.freeze({
    eq: { ...DEFAULT_EQ_SETTINGS },
    compressor: { ...DEFAULT_COMPRESSOR_SETTINGS },
    gate: { ...DEFAULT_GATE_SETTINGS },
    bitcrusher: { ...DEFAULT_BITCRUSHER_SETTINGS },
    chorus: { ...DEFAULT_CHORUS_SETTINGS },
    phaser: { ...DEFAULT_PHASER_SETTINGS },
    delay: { ...DEFAULT_DELAY_SETTINGS },
    reverb: { ...DEFAULT_REVERB_SETTINGS }
});

export const samplerChannelDefaults = Object.freeze({
    regionStart: DEFAULT_SAMPLE_REGION.start,
    regionEnd: DEFAULT_SAMPLE_REGION.end,
    playbackRate: DEFAULT_SAMPLE_PLAYBACK_RATE,
    fadeIn: DEFAULT_SAMPLE_FADE_IN,
    fadeOut: DEFAULT_SAMPLE_FADE_OUT,
    fadeInShape: DEFAULT_SAMPLE_FADE_IN_SHAPE,
    fadeOutShape: DEFAULT_SAMPLE_FADE_OUT_SHAPE,
    allowOverlap: false
});

function syncSamplerOrdinal(channel) {
    if (!channel || channel.type !== 'sampler') return;
    if (!Number.isInteger(channel.selectedSampleIndex) || channel.selectedSampleIndex < 0) {
        channel.selectedSampleOrdinal = null;
        channel.sampleDescriptor = null;
        return;
    }
    const ordinalId = SimpleSampleLoader.getOrdinalIdByIndex(channel.selectedSampleIndex);
    if (ordinalId) {
        channel.selectedSampleOrdinal = ordinalId;
    } else if (typeof channel.selectedSampleOrdinal !== 'string') {
        channel.selectedSampleOrdinal = null;
    }
    updateSamplerDescriptor(channel);
}

function updateSamplerDescriptor(channel) {
    if (!channel || channel.type !== 'sampler') return;
    try {
        const snapshot = SimpleSampleLoader.getSampleDescriptorSnapshot(channel.selectedSampleIndex);
        channel.sampleDescriptor = snapshot ? { ...snapshot } : null;
    } catch (err) {
        console.warn('[STATE] Failed to capture sampler descriptor', err);
        channel.sampleDescriptor = null;
    }
}

// Order: Kick, Snare, Closed Hat, Clap, Crash, Cowbell, Synth Bass 1, Synth Bass 2
export const defaultSampleOrder = [8, 1, 2, 3, 4, 13, 5, 6];
// (13 is Cowbell, based on your ogSampleUrls list; adjust if needed)


/**
 * ALWAYS assigns a unique instrumentId when creating an instrument channel.
 */
export function createDefaultInsertSettings() {
    const settings = {};
    for (const [key, defaults] of Object.entries(DEFAULT_INSERT_SETTINGS)) {
        settings[key] = { ...defaults };
    }
    return settings;
}

export function ensureChannelInsertSettings(channel) {
    if (!channel || channel.type !== 'sampler') return channel;
    if (!channel.insertSettings || typeof channel.insertSettings !== 'object') {
        channel.insertSettings = createDefaultInsertSettings();
        return channel;
    }

    Object.entries(DEFAULT_INSERT_SETTINGS).forEach(([key, defaults]) => {
        const target = channel.insertSettings[key];
        if (!target || typeof target !== 'object') {
            channel.insertSettings[key] = { ...defaults };
            return;
        }
        for (const [param, defaultValue] of Object.entries(defaults)) {
            if (typeof target[param] === 'undefined' || Number.isNaN(target[param])) {
                target[param] = defaultValue;
            }
        }
        target.enabled = !!target.enabled;
        if (key === 'reverb') {
            target.quality = normalizeInsertQuality(target.quality ?? inferReverbQualityFromSettings(target));
        } else if (key === 'delay') {
            target.quality = normalizeInsertQuality(target.quality ?? inferDelayQualityFromSettings(target));
        }
    });

    return channel;
}

export function createNewChannel(type = 'sampler') {
    const channel = {
        type,
        steps: Array(TOTAL_STEPS).fill(false),
        muted: false,
        solo: false,
        volume: 1,
        insertSettings: type === 'sampler' ? createDefaultInsertSettings() : null
    };
    if (type === 'sampler') {
        channel.selectedSampleIndex = 0;
        channel.sampleRegion = { ...DEFAULT_SAMPLE_REGION };
        channel.samplePlaybackRate = DEFAULT_SAMPLE_PLAYBACK_RATE;
        channel.sampleFadeIn = DEFAULT_SAMPLE_FADE_IN;
        channel.sampleFadeOut = DEFAULT_SAMPLE_FADE_OUT;
        channel.sampleFadeInShape = DEFAULT_SAMPLE_FADE_IN_SHAPE;
        channel.sampleFadeOutShape = DEFAULT_SAMPLE_FADE_OUT_SHAPE;
        channel.allowOverlap = false;
        syncSamplerOrdinal(channel);
    } else {
        // Assign unique, auto-incremented instrumentId
        channel.instrumentId = `inst-${projectState.nextInstrumentId++}`;
        channel.patch = null;
        channel.patchInstrumentType = null;
        channel.instrumentType = null;
        channel.pendingInstrumentType = DEFAULT_INSTRUMENT_TYPE;
        channel.instrumentClip = null;
        console.log(`[STATE] Created new instrument channel. instrumentId=${channel.instrumentId}, patch=null.`);
    }
    return channel;
}

export function ensureInstrumentChannelDefaults(channel) {
    if (!channel || channel.type !== 'instrument') return channel;
    if (typeof channel.pendingInstrumentType !== 'string') {
        channel.pendingInstrumentType = channel.instrumentType || DEFAULT_INSTRUMENT_TYPE;
    }
    if (channel.instrumentType && typeof channel.instrumentType !== 'string') {
        channel.instrumentType = null;
    }
    if (typeof channel.patchInstrumentType === 'undefined') {
        channel.patchInstrumentType = null;
    }
    if (channel.insertSettings && typeof channel.insertSettings === 'object') {
        channel.insertSettings = null;
    }
    if (typeof channel.instrumentClip === 'undefined') {
        channel.instrumentClip = null;
    }
    return channel;
}

export function ensureSamplerChannelDefaults(channel) {
    if (!channel || channel.type !== 'sampler') return channel;

    ensureChannelInsertSettings(channel);

    if (!channel.sampleRegion || typeof channel.sampleRegion !== 'object') {
        channel.sampleRegion = { ...DEFAULT_SAMPLE_REGION };
    }

    let { start, end } = channel.sampleRegion;
    const isValidNumber = value => typeof value === 'number' && Number.isFinite(value);
    if (!isValidNumber(start)) start = DEFAULT_SAMPLE_REGION.start;
    if (!isValidNumber(end)) end = DEFAULT_SAMPLE_REGION.end;

    start = Math.max(0, Math.min(0.99, start));
    end = Math.max(start + 0.01, Math.min(1, end));
    if (end <= start) end = Math.min(1, start + 0.01);
    channel.sampleRegion.start = start;
    channel.sampleRegion.end = Math.min(1, end);

    if (!isValidNumber(channel.samplePlaybackRate)) {
        channel.samplePlaybackRate = DEFAULT_SAMPLE_PLAYBACK_RATE;
    } else {
        channel.samplePlaybackRate = Math.max(0.25, Math.min(4, channel.samplePlaybackRate));
    }

    if (!isValidNumber(channel.sampleFadeIn)) {
        channel.sampleFadeIn = DEFAULT_SAMPLE_FADE_IN;
    } else {
        channel.sampleFadeIn = Math.max(0, Math.min(2, channel.sampleFadeIn));
    }

    if (!isValidNumber(channel.sampleFadeOut)) {
        channel.sampleFadeOut = DEFAULT_SAMPLE_FADE_OUT;
    } else {
        channel.sampleFadeOut = Math.max(0, Math.min(2, channel.sampleFadeOut));
    }

    channel.sampleFadeInShape = normalizeFadeShape(channel.sampleFadeInShape ?? DEFAULT_SAMPLE_FADE_IN_SHAPE);
    channel.sampleFadeOutShape = normalizeFadeShape(channel.sampleFadeOutShape ?? DEFAULT_SAMPLE_FADE_OUT_SHAPE);

    if (typeof channel.allowOverlap !== 'boolean') {
        channel.allowOverlap = samplerChannelDefaults.allowOverlap;
    }

    syncSamplerOrdinal(channel);

    return channel;
}

export function markSampleRecentlyUsed(sampleIndex) {
    if (!Number.isInteger(sampleIndex) || sampleIndex < 0) return;
    runtimeState.sampleCacheMeta.set(sampleIndex, Date.now());
}

export function collectActiveSampleIndices(target = new Set()) {
    projectState.sequences.forEach(sequence => {
        sequence?.channels?.forEach(channel => {
            if (channel?.type !== 'sampler') return;
            const idx = Number(channel.selectedSampleIndex);
            if (Number.isInteger(idx) && idx >= 0) {
                target.add(idx);
            }
        });
    });
    runtimeState.samplerVoices.forEach((voice, channel) => {
        const idx = Number(channel?.selectedSampleIndex);
        if (Number.isInteger(idx) && idx >= 0) {
            target.add(idx);
        }
    });
    return target;
}

export function pruneInactiveSampleCaches({ maxIdleMs = SAMPLE_CACHE_IDLE_MS } = {}) {
    const now = Date.now();
    const activeIndices = collectActiveSampleIndices(new Set());

    Object.keys(runtimeState.allSampleBuffers).forEach(key => {
        const idx = Number(key);
        if (!Number.isInteger(idx) || idx < 0) return;

        if (activeIndices.has(idx)) {
            runtimeState.sampleCacheMeta.set(idx, now);
            return;
        }

        const lastUsed = runtimeState.sampleCacheMeta.get(idx);
        if (lastUsed === undefined) {
            runtimeState.sampleCacheMeta.set(idx, now);
            if (maxIdleMs > 0) return;
        } else if (maxIdleMs > 0 && (now - lastUsed) < maxIdleMs) {
            return;
        }

        delete runtimeState.allSampleBuffers[idx];
        runtimeState.sampleCacheMeta.delete(idx);
        SimpleSampleLoader.releaseSampleBuffer(idx);
    });
}

export function createNewSequence(
    numSamplers   = INITIAL_SAMPLER_CHANNELS,
    numInstruments= INITIAL_INSTRUMENT_CHANNELS
) {
    console.log(
        `[STATE] Creating new sequence with ${numSamplers} sampler ` +
        `and ${numInstruments} instrument channels.`
    );

    const samplerChs = Array.from({ length: numSamplers }, (_, i) => {
        const chan = createNewChannel('sampler');
        // Assign default sample index per channel, cycling if needed
        chan.selectedSampleIndex = defaultSampleOrder[i % defaultSampleOrder.length] ?? 0;
        syncSamplerOrdinal(chan);
        return chan;
    });

    const instrumentChs = Array.from({ length: numInstruments }, () => createNewChannel('instrument'));

    return { channels: [...samplerChs, ...instrumentChs] };
}

export function createSequenceFromTemplate(templateSequence) {
    if (!templateSequence?.channels?.length) {
        return createNewSequence();
    }

    const clonedChannels = templateSequence.channels.map(sourceChannel => {
        if (!sourceChannel) return createNewChannel('sampler');

        const mergedInsertSettings = createDefaultInsertSettings();
        if (sourceChannel.insertSettings && typeof sourceChannel.insertSettings === 'object') {
            Object.entries(DEFAULT_INSERT_SETTINGS).forEach(([key, defaults]) => {
                const sourceSettings = sourceChannel.insertSettings[key];
                mergedInsertSettings[key] = {
                    ...defaults,
                    ...(sourceSettings && typeof sourceSettings === 'object' ? sourceSettings : {})
                };
                mergedInsertSettings[key].enabled = !!mergedInsertSettings[key].enabled;
            });
        }

        const baseChannel = {
            type: sourceChannel.type === 'instrument' ? 'instrument' : 'sampler',
            steps: Array(TOTAL_STEPS).fill(false),
            muted: !!sourceChannel.muted,
            solo: !!sourceChannel.solo,
            volume: (typeof sourceChannel.volume === 'number' && !Number.isNaN(sourceChannel.volume))
                ? sourceChannel.volume
                : 1,
            insertSettings: mergedInsertSettings
        };

        if (baseChannel.type === 'sampler') {
            const sampler = createNewChannel('sampler');
            sampler.steps = baseChannel.steps;
            sampler.muted = baseChannel.muted;
            sampler.solo = baseChannel.solo;
            sampler.volume = baseChannel.volume;
            sampler.insertSettings = baseChannel.insertSettings;
            sampler.selectedSampleIndex = sourceChannel.selectedSampleIndex ?? sampler.selectedSampleIndex ?? 0;
            sampler.selectedSampleOrdinal = typeof sourceChannel.selectedSampleOrdinal === 'string'
                ? sourceChannel.selectedSampleOrdinal
                : sampler.selectedSampleOrdinal ?? null;
            sampler.sampleRegion = sourceChannel.sampleRegion
                ? {
                    start: typeof sourceChannel.sampleRegion.start === 'number'
                        ? sourceChannel.sampleRegion.start
                        : samplerChannelDefaults.regionStart,
                    end: typeof sourceChannel.sampleRegion.end === 'number'
                        ? sourceChannel.sampleRegion.end
                        : samplerChannelDefaults.regionEnd
                }
                : {
                    start: samplerChannelDefaults.regionStart,
                    end: samplerChannelDefaults.regionEnd
                };
            sampler.samplePlaybackRate = (typeof sourceChannel.samplePlaybackRate === 'number' && Number.isFinite(sourceChannel.samplePlaybackRate))
                ? sourceChannel.samplePlaybackRate
                : samplerChannelDefaults.playbackRate;
            sampler.sampleFadeIn = (typeof sourceChannel.sampleFadeIn === 'number' && Number.isFinite(sourceChannel.sampleFadeIn))
                ? sourceChannel.sampleFadeIn
                : samplerChannelDefaults.fadeIn;
            sampler.sampleFadeOut = (typeof sourceChannel.sampleFadeOut === 'number' && Number.isFinite(sourceChannel.sampleFadeOut))
                ? sourceChannel.sampleFadeOut
                : samplerChannelDefaults.fadeOut;
            sampler.sampleFadeInShape = normalizeFadeShape(sourceChannel.sampleFadeInShape);
            sampler.sampleFadeOutShape = normalizeFadeShape(sourceChannel.sampleFadeOutShape);
            ensureSamplerChannelDefaults(sampler);
            return sampler;
        }

        return {
            ...baseChannel,
            instrumentId: typeof sourceChannel.instrumentId === 'string' ? sourceChannel.instrumentId : null,
            patch: sourceChannel.patch ? structuredCloneSafe(sourceChannel.patch) : null,
            instrumentClip: sourceChannel.instrumentClip ? structuredCloneSafe(sourceChannel.instrumentClip) : null
        };
    });

    return { channels: clonedChannels };
}

function structuredCloneSafe(value) {
    if (value == null) return value;

    let cloneFn = null;
    if (typeof globalThis === 'object' && typeof globalThis.structuredClone === 'function') {
        cloneFn = globalThis.structuredClone.bind(globalThis);
    } else if (typeof window === 'object' && typeof window.structuredClone === 'function') {
        cloneFn = window.structuredClone.bind(window);
    }

    if (cloneFn) {
        try {
            return cloneFn(value);
        } catch (err) {
            console.warn('[STATE] structuredClone failed, falling back to JSON copy.', err);
        }
    }

    try {
        return JSON.parse(JSON.stringify(value));
    } catch (err) {
        console.warn('[STATE] JSON clone failed, returning original reference.', err);
        return value;
    }
}

// --- NEW FUNCTION ---
/**
 * Populates the first three channels of a sequence with a basic
 * kick, snare, and hi-hat pattern. This function assumes the first three
 * channels are samplers assigned to Kick, Snare, and Hat, respectively.
 * @param {object} sequence The sequence object to modify.
 */
export function setupDefaultRhythm(sequence) {
    if (!sequence || !sequence.channels) {
        console.warn('[STATE] setupDefaultRhythm called with invalid sequence.');
        return;
    }
    console.log('[STATE] Setting up default rhythm on sequence.');

    const kickChannel = sequence.channels[0];
    const snareChannel = sequence.channels[1];
    const hatChannel = sequence.channels[2];

    // Channel 1 (Kick): Four-on-the-floor pattern
    if (kickChannel) {
        for (let i = 0; i < TOTAL_STEPS; i += 4) {
            kickChannel.steps[i] = true;
        }
    }

    // Channel 2 (Snare): On the backbeats (2 and 4)
    if (snareChannel) {
        for (let i = 4; i < TOTAL_STEPS; i += 8) {
            snareChannel.steps[i] = true;
        }
    }

    // Channel 3 (Hat): On every 8th note
    if (hatChannel) {
        for (let i = 0; i < TOTAL_STEPS; i += 2) {
            hatChannel.steps[i] = true;
        }
    }
}

export function initializeProject() {
    console.log('[STATE] Initializing new project...');

    runtimeState.channelGainNodes.forEach(gain => {
        try { gain.disconnect(); } catch (err) { /* ignore */ }
        try { gain.dispose?.(); } catch (err) { console.warn('[STATE] Failed to dispose channel gain during project init:', err); }
    });
    runtimeState.channelGainNodes.clear();
    runtimeState.channelInsertChains.forEach(chain => {
        try { chain.dispose?.(); } catch (err) { console.warn('[STATE] Failed to dispose insert chain during project init:', err); }
    });
    runtimeState.channelInsertChains.clear();
    runtimeState.samplerVoices.forEach(voice => {
        try {
            voice.player?.dispose();
            voice.ampEnv?.dispose();
        } catch (err) {
            console.warn('[STATE] Failed to dispose sampler voice during project init:', err);
        }
    });
    runtimeState.samplerVoices.clear();
    runtimeState.instrumentPlaybackState.clear();
    runtimeState.insertPanelState.clear();
    runtimeState.instrumentClips.clear();
    runtimeState.sequenceCycle = 0;
    runtimeState.lastStepIndex = -1;
    projectState.sequences = [];
    for (let i = 0; i < INITIAL_SEQUENCES; i++) {
        const seq = createNewSequence();
        projectState.sequences.push(seq);
    }

    // --- MODIFICATION ---
    // Set up a default rhythm on the very first sequence
    if (projectState.sequences[0]) {
        setupDefaultRhythm(projectState.sequences[0]);
    }
    // --- END MODIFICATION ---

    projectState.currentSequenceIndex = 0;
    projectState.bpm = 120;
    projectState.isPlaying = false;
    projectState.playMode = null;
    pruneInactiveSampleCaches({ maxIdleMs: 0 });
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('sequencer:project-reset'));
    }
    syncNextInstrumentIdAfterLoad();
    logSequenceSummary();
    console.log('[STATE] Project initialized.');
}

// --- Utility to sync nextInstrumentId after loading ---
export function syncNextInstrumentIdAfterLoad() {
    let maxId = 0;
    projectState.sequences.forEach(seq => {
        seq.channels.forEach(chan => {
            if (chan.type === 'instrument' && typeof chan.instrumentId === 'string') {
                const n = parseInt(chan.instrumentId.replace('inst-', ''), 10);
                if (!isNaN(n) && n >= maxId) maxId = n + 1;
            }
        });
    });
    projectState.nextInstrumentId = maxId;
}

// --- Logging utility for debugging ---
function logSequenceSummary() {
    projectState.sequences.forEach((seq, idx) => {
        const types = seq.channels.map(ch => ch.type[0].toUpperCase()).join('');
        console.log(`[SEQ ${idx}] Channels: ${types} (S=sampler, I=instrument)`);
    });
}

export function getCurrentSequence() {
    return projectState.sequences[projectState.currentSequenceIndex];
}

export function ensureChannelMixDefaults(channel) {
    if (!channel) return channel;
    if (typeof channel.volume !== 'number' || Number.isNaN(channel.volume)) channel.volume = 1;
    if (typeof channel.muted !== 'boolean') channel.muted = false;
    if (typeof channel.solo !== 'boolean') channel.solo = false;
    ensureChannelInsertSettings(channel);
    return channel;
}
