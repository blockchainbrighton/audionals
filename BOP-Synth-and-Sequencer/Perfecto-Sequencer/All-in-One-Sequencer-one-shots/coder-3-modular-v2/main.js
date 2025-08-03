import { initialState, reducer } from './state.js';
import { SynthManager } from './audio.js';
import { UIManager } from './ui.js';
import { BEAT_DIVISION, LOOP_LENGTH, NUM_STEPS } from './constants.js';

// Import synth implementations
import { BasicSynth } from './synths/BasicSynth.js';
import { FMSynth } from './synths/FMSynth.js';

// Loader status handler
function setLoaderStatus(message, isError = false) {
    const loader = document.getElementById('loader');
    const status = document.getElementById('loader-status');
    status.textContent = message;
    if (isError) {
        status.style.color = 'red';
    } else if (message === '') {
        loader.classList.add('hidden');
    }
}

// Runtime state
const runtimeState = {
    Tone: null
};

// Main application boot function
async function boot() {
    try {
        // Dynamically import Tone.js
        setLoaderStatus('Loading Audio Engine...');
        const TONE_ORDINALS_URL = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';
        await import(TONE_ORDINALS_URL);
        runtimeState.Tone = window.Tone;
        console.log('[4-Bar Sequencer] Tone.js loaded:', runtimeState.Tone?.version ?? 'Unknown');
        setLoaderStatus('Audio Engine Loaded');

        // --- Initialize Core Modules ---
        // 1. Create Store (Simple implementation)
        let state = initialState;
        const listeners = [];
        const dispatch = (action) => {
            state = reducer(state, action);
            listeners.forEach(listener => listener());
        };
        const subscribe = (listener) => {
            listeners.push(listener);
            return () => {
                const index = listeners.indexOf(listener);
                if (index > -1) listeners.splice(index, 1);
            };
        };

        // 2. Initialize Synth Manager
        const synthManager = new SynthManager(runtimeState.Tone);

        // 3. Create Synth Registry (mapping string IDs to classes)
        const synthRegistry = {
            'BasicSynth': BasicSynth,
            'FMSynth': FMSynth
        };

        // 4. Register Synths with the Manager
        Object.entries(synthRegistry).forEach(([type, synthClass]) => {
            synthManager.registerSynth(type, synthClass);
        });

        // 5. Initialize UI Manager
        const uiManager = new UIManager(runtimeState.Tone, synthManager, synthRegistry);
        uiManager.setStateAndDispatch(state, dispatch); // Initial state/dispatch

        // --- DOM Elements ---
        const gridContainer = document.getElementById('sequencer-grid');
        const pianoContainer = document.getElementById('piano');

        // --- Render Initial UI ---
        function render() {
            uiManager.setStateAndDispatch(state, dispatch); // Update UI manager with latest state
            uiManager.renderSequencerGrid(gridContainer);
        }

        // --- Initialize Tone.js Transport ---
        runtimeState.Tone.Transport.bpm.value = state.bpm;
        runtimeState.Tone.Transport.loop = true;
        runtimeState.Tone.Transport.loopStart = 0;
        runtimeState.Tone.Transport.loopEnd = LOOP_LENGTH;

        // --- Create Sequencer Callback ---
        const noteSequence = new runtimeState.Tone.Sequence((time, step) => {
            dispatch({ type: 'SET_CURRENT_STEP', payload: step });
            state.channels.forEach(channel => { // Use the latest state
                if (channel.muted || !channel.steps[step]) return;

                if (channel.type === 'sample' && channel.player) {
                    channel.player.start(time);
                } else if (channel.type === 'synth') {
                    // Ensure synth instance exists and is up-to-date
                    let synthInstance = synthManager.channelSynths[channel.id];
                    if (!synthInstance || synthInstance.constructor.name !== synthRegistry[channel.synthType]?.name) {
                         synthInstance = synthManager.createSynthForChannel(channel, dispatch);
                    } else {
                        // Update parameters if synth already exists
                        synthManager.updateSynthForChannel(channel);
                    }

                    if (synthInstance) {
                        synthManager.triggerNote(channel, step, time);
                    }
                }
            });
        }, [...Array(NUM_STEPS).keys()], BEAT_DIVISION);

        noteSequence.start(0);

        // --- Setup UI Controls ---
        uiManager.setupTransportControls();
        uiManager.createPiano(pianoContainer);

        // --- Subscribe to State Changes ---
        subscribe(render);

        // --- Initial Render ---
        render();

        // Hide loader
        setLoaderStatus('');

    } catch (err) {
        setLoaderStatus('Failed to load Tone.js. App cannot start.', true);
        console.error('[4-Bar Sequencer] Critical Tone.js load error:', err);
    }
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', boot);