// BOP-Sequencer-V10-Modular/sequencer-state.js

import { INITIAL_INSTRUMENT_CHANNELS, INITIAL_SAMPLER_CHANNELS, INITIAL_SEQUENCES, TOTAL_STEPS } from './sequencer-config.js';
import { SimpleSampleLoader } from './sequencer-sample-loader.js';

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
    allSampleBuffers: {},
    samplerVoices: new Map(),
    channelGainNodes: new Map(),
    sampleMetadata: {
        names: [],
        bpms: [],
        isLoop: []
    },
    instrumentPlaybackState: new Map(),
    sequenceCycle: 0,
    lastStepIndex: -1
};

const DEFAULT_SAMPLE_REGION = Object.freeze({ start: 0, end: 1 });
const DEFAULT_SAMPLE_PLAYBACK_RATE = 1;
const DEFAULT_SAMPLE_FADE_IN = 0.005;
const DEFAULT_SAMPLE_FADE_OUT = 0.05;

export const samplerChannelDefaults = Object.freeze({
    regionStart: DEFAULT_SAMPLE_REGION.start,
    regionEnd: DEFAULT_SAMPLE_REGION.end,
    playbackRate: DEFAULT_SAMPLE_PLAYBACK_RATE,
    fadeIn: DEFAULT_SAMPLE_FADE_IN,
    fadeOut: DEFAULT_SAMPLE_FADE_OUT
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
export function createNewChannel(type = 'sampler') {
    const channel = {
        type,
        steps: Array(TOTAL_STEPS).fill(false),
        muted: false,
        solo: false,
        volume: 1,
    };
    if (type === 'sampler') {
        channel.selectedSampleIndex = 0;
        channel.sampleRegion = { ...DEFAULT_SAMPLE_REGION };
        channel.samplePlaybackRate = DEFAULT_SAMPLE_PLAYBACK_RATE;
        channel.sampleFadeIn = DEFAULT_SAMPLE_FADE_IN;
        channel.sampleFadeOut = DEFAULT_SAMPLE_FADE_OUT;
        syncSamplerOrdinal(channel);
    } else {
        // Assign unique, auto-incremented instrumentId
        channel.instrumentId = `inst-${projectState.nextInstrumentId++}`;
        channel.patch = null;
        console.log(`[STATE] Created new instrument channel. instrumentId=${channel.instrumentId}, patch=null.`);
    }
    return channel;
}

export function ensureSamplerChannelDefaults(channel) {
    if (!channel || channel.type !== 'sampler') return channel;

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

    syncSamplerOrdinal(channel);

    return channel;
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
    projectState.nextInstrumentId = 0;
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
    return channel;
}
