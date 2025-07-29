// state.js (Rewritten with light logging for context)
import { INITIAL_SEQUENCES, INITIAL_CHANNELS_PER_SEQUENCE, TOTAL_STEPS } from './config.js';

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

export function createNewChannel(type = 'sampler') {
    const channel = {
        type,
        steps: Array(TOTAL_STEPS).fill(false),
    };
    if (type === 'sampler') {
        channel.selectedSampleIndex = 0;
    } else {
        // This is a synth channel
        channel.instrumentId = null;
        // This is the crucial property. We log its initialization.
        channel.patch = null;
        console.log('[STATE] Created new instrument channel. Initial `patch` is set to null.');
    }
    return channel;
}

export function createNewSequence(numChannels = INITIAL_CHANNELS_PER_SEQUENCE) {
    console.log(`[STATE] Creating new sequence with ${numChannels} channels.`);
    return {
        channels: Array(numChannels).fill(null).map(() => createNewChannel('sampler'))
    };
}

export function initializeProject() {
    console.log('[STATE] Initializing project state...');
    projectState.sequences = [createNewSequence()];
    console.log('[STATE] Project initialized.');
}

export function getCurrentSequence() {
    return projectState.sequences[projectState.currentSequenceIndex];
}