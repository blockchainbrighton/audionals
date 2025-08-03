import { NUM_CHANNELS, NUM_STEPS, DEFAULT_SAMPLE_NAME, DEFAULT_SYNTH_NAME } from './constants.js';

// Initial state for the application
export const initialState = {
    isPlaying: false,
    bpm: 120,
    currentStep: -1,
    channels: Array(NUM_CHANNELS).fill().map((_, i) => {
        const isSample = i < 4;
        const channel = {
            id: i,
            type: isSample ? 'sample' : 'synth',
            name: isSample ? `${DEFAULT_SAMPLE_NAME} ${i+1}` : `${DEFAULT_SYNTH_NAME} ${i-3}`,
            muted: false,
            steps: Array(NUM_STEPS).fill(false),
        };

        if (isSample) {
            // Sample-specific properties
            channel.sampleFile = null;
            channel.player = null;
        } else {
            // Synth-specific properties - using the new pluggable structure
            channel.synthType = 'BasicSynth'; // Default synth type
            channel.params = {
                waveform: 'sine',
                attack: 0.1,
                decay: 0.3,
                sustain: 0.5,
                release: 0.8
            };
            channel.synthInstance = null; // Will hold the actual synth instance
            channel.notes = Array(NUM_STEPS).fill('C4');
        }

        return channel;
    })
};

// State reducer
export function reducer(state, action) {
    switch(action.type) {
        case 'TOGGLE_PLAY':
            return { ...state, isPlaying: !state.isPlaying };
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
        // --- New actions for synth management ---
        case 'SET_SYNTH_TYPE':
            return {
                ...state,
                channels: state.channels.map((channel, i) =>
                    i === action.channelIndex && channel.type === 'synth'
                        ? {
                            ...channel,
                            synthType: action.synthType,
                            // Reset params to defaults for the new synth type
                            // This would ideally be handled by the synth itself or a default param registry
                            params: { ...action.defaultParams }
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
        // --- End of new actions ---
        default:
            return state;
    }
}

// Action creators
export const togglePlay = () => ({ type: 'TOGGLE_PLAY' });
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
// --- New action creators ---
export const setSynthType = (channelIndex, synthType, defaultParams) => ({
    type: 'SET_SYNTH_TYPE',
    channelIndex,
    synthType,
    defaultParams
});
export const setSynthParams = (channelIndex, params) => ({
    type: 'SET_SYNTH_PARAMS',
    channelIndex,
    params
});
// --- End of new action creators ---