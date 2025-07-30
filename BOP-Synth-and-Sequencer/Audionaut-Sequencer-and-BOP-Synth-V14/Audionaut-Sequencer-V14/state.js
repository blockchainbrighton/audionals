/**
 * Module: BOP-Sequencer-V14-Modular/state.js
 * Purpose: Application state management
 * Exports: initializeProject, projectState, getCurrentSequence, runtimeState, createNewSequence
 * Depends on: config.js
 */

// state.js (Rewritten with light logging for context)
import { INITIAL_INSTRUMENT_CHANNELS, INITIAL_SAMPLER_CHANNELS, TOTAL_STEPS } from './config.js';

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

export function createNewSequence(
        numSamplers   = INITIAL_SAMPLER_CHANNELS,
        numInstruments= INITIAL_INSTRUMENT_CHANNELS
    ) {
        console.log(
            `[STATE] Creating new sequence with ${numSamplers} sampler ` +
            `and ${numInstruments} instrument channels.`
        );

        const samplerChs   = Array(numSamplers)   .fill(null).map(() => createNewChannel('sampler'));
        const instrumentChs= Array(numInstruments).fill(null).map(() => createNewChannel('instrument'));

        return { channels: [...samplerChs, ...instrumentChs] };
    }

export function initializeProject() {
    console.log('[STATE] Initializing project state...');
    projectState.sequences = [createNewSequence()];
    console.log('[STATE] Project initialized.');
}

export function getCurrentSequence() {
    return projectState.sequences[projectState.currentSequenceIndex];
}