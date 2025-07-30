import { INITIAL_INSTRUMENT_CHANNELS, INITIAL_SAMPLER_CHANNELS, INITIAL_SEQUENCES, TOTAL_STEPS } from './config.js';

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
    sampleMetadata: {
        names: [],
        bpms: [],
        isLoop: []
    },
    activeInstrumentTriggers: new Set()
};

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
        // Assign unique, auto-incremented instrumentId
        channel.instrumentId = `inst-${projectState.nextInstrumentId++}`;
        channel.patch = null;
        console.log(`[STATE] Created new instrument channel. instrumentId=${channel.instrumentId}, patch=null.`);
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

    const samplerChs    = Array.from({ length: numSamplers },    () => createNewChannel('sampler'));
    const instrumentChs = Array.from({ length: numInstruments }, () => createNewChannel('instrument'));

    return { channels: [...samplerChs, ...instrumentChs] };
}

export function initializeProject() {
    console.log('[STATE] Initializing new project...');
    projectState.sequences = [];
    for (let i = 0; i < INITIAL_SEQUENCES; i++) {
        const seq = createNewSequence();
        projectState.sequences.push(seq);
    }
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
