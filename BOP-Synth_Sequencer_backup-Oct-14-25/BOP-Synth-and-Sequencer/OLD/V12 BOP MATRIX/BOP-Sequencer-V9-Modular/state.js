// state.js
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
    instrumentRack: {}, // key: "inst-0", value: BopSynthAdapter instance
    allSampleBuffers: {},
    sampleMetadata: {
        names: [],
        bpms: [],
        isLoop: []
    },
    activeInstrumentTriggers: new Set() // NEW: Stores instrumentId of currently playing instruments
};

export function createNewChannel(type = 'sampler') {
    const channel = {
        type,
        steps: Array(TOTAL_STEPS).fill(false),
    };
    if (type === 'sampler') {
        channel.selectedSampleIndex = 0;
    } else {
        channel.instrumentId = null;
        channel.patch = null;
    }
    return channel;
}

export function createNewSequence(numChannels = INITIAL_CHANNELS_PER_SEQUENCE) {
    return {
        channels: Array(numChannels).fill(null).map(() => createNewChannel('sampler'))
    };
}

export function initializeProject() {
    projectState.sequences = [createNewSequence()];
}

export function getCurrentSequence() {
    return projectState.sequences[projectState.currentSequenceIndex];
}