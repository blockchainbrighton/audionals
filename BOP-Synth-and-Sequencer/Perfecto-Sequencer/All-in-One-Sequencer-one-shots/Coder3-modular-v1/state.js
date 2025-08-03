import { NUM_CHANNELS, NUM_STEPS, SAMPLE_CHANNEL_COUNT, SYNTH_CHANNEL_COUNT, DEFAULT_BPM, DEFAULT_NOTE } from './constants.js';

// Initial application state
export const initialState = {
    isPlaying: false,
    // --- New State for Recording ---
    isRecording: false, // Global recording flag
    // --- End New State ---
    bpm: DEFAULT_BPM,
    currentStep: -1,
    channels: Array(NUM_CHANNELS).fill().map((_, i) => {
        const isSampleChannel = i < SAMPLE_CHANNEL_COUNT;
        const channelBase = {
            id: i,
            type: isSampleChannel ? 'sample' : 'synth',
            name: isSampleChannel ? `Sample ${i + 1}` : `Synth ${i - SAMPLE_CHANNEL_COUNT + 1}`,
            muted: false,
            steps: Array(NUM_STEPS).fill(false),
        };

        if (isSampleChannel) {
            return {
                ...channelBase,
                sampleFile: null,
                player: null,
            };
        } else {
            // Synth channel now uses the new structure
            return {
                ...channelBase,
                synthType: 'BasicSynth', // Default synth type
                params: {
                    waveform: 'sine',
                    attack: 0.1,
                    decay: 0.3,
                    sustain: 0.5,
                    release: 0.8,
                },
                notes: Array(NUM_STEPS).fill(DEFAULT_NOTE),
                synthInstance: null, // Will hold the actual Tone.js synth instance
                // --- New State for Recording ---
                recordedNotes: [] // Array to store recorded MIDI events: { step, note, velocity?, duration? }
                // --- End New State ---
            };
        }
    })
};

// State reducer
export function reducer(state, action) {
    switch (action.type) {
        case 'TOGGLE_PLAY':
            return { ...state, isPlaying: !state.isPlaying };
        // --- New Action for Recording ---
        case 'TOGGLE_RECORDING':
            return { ...state, isRecording: !state.isRecording };
        case 'ADD_RECORDED_NOTE':
             return {
                 ...state,
                 channels: state.channels.map((channel, i) =>
                     i === action.channelIndex && channel.type === 'synth'
                         ? {
                             ...channel,
                             recordedNotes: [...channel.recordedNotes, action.noteEvent]
                         }
                         : channel
                 )
             };
        case 'CLEAR_RECORDED_NOTES':
            return {
                ...state,
                channels: state.channels.map((channel, i) =>
                    i === action.channelIndex && channel.type === 'synth'
                        ? { ...channel, recordedNotes: [] }
                        : channel
                )
            };
        // --- End New Actions ---
        case 'SET_BPM':
            return { ...state, bpm: action.payload };
        case 'SET_CURRENT_STEP':
            return { ...state, currentStep: action.payload };
        case 'TOGGLE_STEP':
            return {
                ...state,
                channels: state.channels.map((channel, i) =>
                    i === action.channelIndex
                        ? {
                            ...channel,
                            steps: channel.steps.map((step, j) =>
                                j === action.stepIndex ? !step : step
                            )
                        }
                        : channel
                )
            };
        case 'SET_NOTE':
            return {
                ...state,
                channels: state.channels.map((channel, i) =>
                    i === action.channelIndex
                        ? {
                            ...channel,
                            notes: channel.notes.map((note, j) =>
                                j === action.stepIndex ? action.note : note
                            )
                        }
                        : channel
                )
            };
        case 'TOGGLE_MUTE':
            return {
                ...state,
                channels: state.channels.map((channel, i) =>
                    i === action.channelIndex
                        ? { ...channel, muted: !channel.muted }
                        : channel
                )
            };
        case 'CLEAR_CHANNEL':
            return {
                ...state,
                channels: state.channels.map((channel, i) =>
                    i === action.channelIndex
                        ? { ...channel, steps: Array(NUM_STEPS).fill(false) }
                        : channel
                )
            };
        case 'SET_SAMPLE':
            return {
                ...state,
                channels: state.channels.map((channel, i) =>
                    i === action.channelIndex
                        ? { ...channel, sampleFile: action.file, player: action.player }
                        : channel
                )
            };
        // --- New Actions for Synth Management ---
        case 'SET_SYNTH_TYPE':
            return {
                ...state,
                channels: state.channels.map((channel, i) =>
                    i === action.channelIndex && channel.type === 'synth'
                        ? {
                            ...channel,
                            synthType: action.synthType,
                            // Reset params to defaults for the new synth type is handled by audio.js
                            params: {}, // Will be initialized by audio.js
                            synthInstance: null // Clear old instance
                        }
                        : channel
                )
            };
        case 'SET_SYNTH_PARAMS':
            return {
                ...state,
                channels: state.channels.map((channel, i) =>
                    i === action.channelIndex && channel.type === 'synth'
                        ? {
                            ...channel,
                            params: { ...channel.params, ...action.params }
                        }
                        : channel
                )
            };
        // --- End New Actions ---
        default:
            return state;
    }
}

// Action creators
export const togglePlay = () => ({ type: 'TOGGLE_PLAY' });
// --- New Action Creators for Recording ---
export const toggleRecording = () => ({ type: 'TOGGLE_RECORDING' });
export const addRecordedNote = (channelIndex, noteEvent) => ({
    type: 'ADD_RECORDED_NOTE',
    channelIndex,
    noteEvent // { step, note, velocity, duration, time }
});
export const clearRecordedNotes = (channelIndex) => ({ type: 'CLEAR_RECORDED_NOTES', channelIndex });
// --- End New Action Creators ---
export const setBpm = (bpm) => ({ type: 'SET_BPM', payload: bpm });
export const setCurrentStep = (step) => ({ type: 'SET_CURRENT_STEP', payload: step });
export const toggleStep = (channelIndex, stepIndex) => ({
    type: 'TOGGLE_STEP',
    channelIndex,
    stepIndex
});
export const setNote = (channelIndex, stepIndex, note) => ({
    type: 'SET_NOTE',
    channelIndex,
    stepIndex,
    note
});
export const toggleMute = (channelIndex) => ({ type: 'TOGGLE_MUTE', channelIndex });
export const clearChannel = (channelIndex) => ({ type: 'CLEAR_CHANNEL', channelIndex });
export const setSample = (channelIndex, file, player) => ({
    type: 'SET_SAMPLE',
    channelIndex,
    file,
    player
});
// --- New Action Creators ---
export const setSynthType = (channelIndex, synthType) => ({
    type: 'SET_SYNTH_TYPE',
    channelIndex,
    synthType
});
export const setSynthParams = (channelIndex, params) => ({
    type: 'SET_SYNTH_PARAMS',
    channelIndex,
    params
});
// --- End New Action Creators ---