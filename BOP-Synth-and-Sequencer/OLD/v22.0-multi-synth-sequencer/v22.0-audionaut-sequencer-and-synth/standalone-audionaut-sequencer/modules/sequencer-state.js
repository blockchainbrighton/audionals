// BOP-Sequencer-V10-Modular/sequencer-state.js

import { INITIAL_INSTRUMENT_CHANNELS, INITIAL_SAMPLER_CHANNELS, INITIAL_SEQUENCES, TOTAL_STEPS } from './sequencer-config.js';

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
    sampleMetadata: {
        names: [],
        bpms: [],
        isLoop: []
    },
    activeInstrumentTriggers: new Set()
};

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
    };
    if (type === 'sampler') {
        channel.selectedSampleIndex = 0;
    } else {
        channel.instrumentId = null;
        channel.synthId = null;
        channel.patch = null;
        console.log('[STATE] Created new instrument channel. instrumentId=null, synthId=null, patch=null.');
    }
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

    runtimeState.samplerVoices.forEach(voice => {
        try {
            voice.player?.dispose();
            voice.ampEnv?.dispose();
        } catch (err) {
            console.warn('[STATE] Failed to dispose sampler voice during project init:', err);
        }
    });
    runtimeState.samplerVoices.clear();
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
