// Main Application Bootstrapper
import { TONE_ORDINALS_URL, NUM_STEPS } from './constants.js';
import { reducer, initialState } from './state.js';
import { runtimeState, registerSynth, createSynthInstance, updateSynthInstance, disposeSynthInstance } from './audio.js';
import { renderSequencerGrid, setupTransportControls, createPianoKeys } from './ui.js';
import { setSynthParams, addRecordedNote, toggleRecording } from './state.js'; // Import recording actions

// Import synth classes (they will register themselves)
import './synths/BasicSynth.js';
import './synths/FMSynth.js';

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

// Main application boot function
async function boot() {
    // Simple store implementation
    let state = initialState;
    const listeners = [];
    const getState = () => state;
    const dispatch = (action) => {
        console.log('[Main] Dispatching action:', action.type, action); // Debug log
        const newState = reducer(state, action);
        state = newState; // Update state reference
        listeners.forEach(listener => listener(action)); // Pass action to listeners
    };
    const subscribe = (listener) => {
        listeners.push(listener);
        return () => {
            const index = listeners.indexOf(listener);
            if (index > -1) listeners.splice(index, 1);
        };
    };

    // DOM elements
    const gridContainer = document.getElementById('sequencer-grid');

    // Render initial UI
    function render(action) {
        // Re-render grid on any state change
        renderSequencerGrid(gridContainer, state, dispatch);
    }

    // Subscribe UI renderer
    subscribe(render);

    // Initialize Tone.js Transport
    const Tone = runtimeState.Tone;
    Tone.Transport.bpm.value = state.bpm;
    Tone.Transport.loop = true;
    Tone.Transport.loopStart = 0;
    Tone.Transport.loopEnd = '4m';

    // Setup transport controls and get the record button updater
    const updateRecordButtonUI = setupTransportControls(state, dispatch, Tone);
    // Subscribe the record button updater to state changes
    subscribe((action) => {
         // Update record button if relevant state changes
         if (action.type === 'TOGGLE_RECORDING' || action.type === 'TOGGLE_PLAY') {
             updateRecordButtonUI(state);
         }
     });

    // Create sequencer callback with recording logic
    const noteSequence = new Tone.Sequence((time, step) => {
        dispatch({ type: 'SET_CURRENT_STEP', payload: step }); // Dispatch directly
        state.channels.forEach((channel, channelIndex) => { // Use current state
            if (channel.muted || !channel.steps[step]) return;
            if (channel.type === 'sample' && channel.player) {
                channel.player.start(time);
            } else if (channel.type === 'synth') {
                // --- Synth Management Logic ---
                // 1. Create synth instance if it doesn't exist or type changed
                if (!channel.synthInstance || channel.synthInstance._synthType !== channel.synthType) {
                    // Dispose old instance if it exists
                    if (channel.synthInstance) {
                        disposeSynthInstance(channel.synthInstance);
                    }
                    // Create new instance
                    const newSynthInstance = createSynthInstance(Tone, channel);
                    if (newSynthInstance) {
                        newSynthInstance._synthType = channel.synthType; // Tag for type checking
                        // Update state with the new instance reference
                        // Note: This mutates the state object directly, which is not ideal for pure reducers.
                        // A more robust solution would involve an action for this.
                        state.channels[channel.id].synthInstance = newSynthInstance;
                    }
                }

                // 2. Prepare recording event data
                const noteToPlay = channel.notes[step];
                const recordingEvent = {
                    step: step,
                    note: noteToPlay,
                    // velocity: 1.0, // Could add if synth supports it
                    // duration: '8n', // Could derive from sequencer
                    time: time // Tone.js scheduled time
                };

                // 3. Trigger the note if synth instance is valid
                if (channel.synthInstance && typeof channel.synthInstance.trigger === 'function') {
                    try {
                        // Pass the recording event context
                        channel.synthInstance.trigger(noteToPlay, "8n", time, { channelIndex, step, recordingEvent });
                    } catch (error) {
                        console.error(`[Main] Error triggering synth ${channel.synthType}:`, error);
                    }
                }

                // 4. Handle Recording: Add event to state if recording is active
                // This logic is in main.js because it modifies the global state based on the global recording flag.
                if (state.isRecording) { // Check global recording flag
                     dispatch(addRecordedNote(channelIndex, recordingEvent));
                }
                // --- End Synth Management & Recording Logic ---
            }
        });
    }, [...Array(NUM_STEPS).keys()], '16n');
    noteSequence.start(0);

    // Subscribe to state changes for synth parameter updates
    subscribe((action) => {
        if (action.type === 'SET_SYNTH_PARAMS') {
            const channelIndex = action.channelIndex;
            const channel = state.channels[channelIndex];
            if (channel && channel.type === 'synth' && channel.synthInstance) {
                updateSynthInstance(channel.synthInstance, action.params);
            }
        }
        // Handle synth type change to reset params
        if (action.type === 'SET_SYNTH_TYPE') {
             const channelIndex = action.channelIndex;
             const channel = state.channels[channelIndex];
             if (channel && channel.type === 'synth') {
                 const SynthClass = runtimeState.synthRegistry[action.synthType]; // Access registry directly
                 if (SynthClass && typeof SynthClass.getUI === 'function') {
                     const uiConfig = SynthClass.getUI();
                     const defaultParams = {};
                     uiConfig.forEach(control => {
                         defaultParams[control.param] = control.defaultValue;
                     });
                     // Dispatch an action to set the params to their defaults
                     // This will trigger the SET_SYNTH_PARAMS listener above to update the instance
                     dispatch(setSynthParams(channelIndex, defaultParams));
                 }
             }
         }
         // Handle global recording toggle
         if (action.type === 'TOGGLE_RECORDING') {
             console.log(`[Main] Global recording is now: ${state.isRecording ? 'ON' : 'OFF'}`);
             // Optional: Clear recorded notes when stopping?
             // if (!state.isRecording) {
             //     state.channels.forEach((channel, idx) => {
             //         if (channel.type === 'synth') {
             //             dispatch(clearRecordedNotes(idx));
             //         }
             //     });
             // }
         }
    });

    // Create piano keys
    createPianoKeys(Tone, 'piano');

    // Initial render
    render();

    // Hide loader after everything is rendered
    setLoaderStatus('');
}

// Load Tone.js and boot the app
document.addEventListener('DOMContentLoaded', async () => {
    setLoaderStatus('Loading Audio Engine...');
    try {
        await import(TONE_ORDINALS_URL);
        runtimeState.Tone = window.Tone;
        console.log('[Main] Tone.js loaded:', runtimeState.Tone?.version ?? 'Unknown');
        setLoaderStatus('Audio Engine Loaded');
        boot();
    } catch (err) {
        setLoaderStatus('Failed to load Tone.js. App cannot start.', true);
        console.error('[Main] Critical Tone.js load error:', err);
    }
});