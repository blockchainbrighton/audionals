import { runtimeState } from './audio.js';
import { setSynthType, setSynthParams, setSample, toggleStep, setNote, toggleMute, clearChannel, toggleRecording, clearRecordedNotes } from './state.js'; // Import recording actions
import { getAvailableSynthTypes, getSynthClass } from './audio.js';

// --- UI Rendering Logic ---
export function renderSampleChannel(header, channel, channelIndex, dispatch) {
    // Create file input for drag/drop
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'audio/*';
    fileInput.style.display = 'none';
    fileInput.onchange = (e) => handleFileSelect(e.target.files[0]);

    // Create drop zone
    const dropZone = document.createElement('div');
    dropZone.textContent = channel.sampleFile ? channel.sampleFile.name : 'Drop audio file';
    dropZone.style.cssText = `
        padding: 5px;
        margin-top: 5px;
        background: #2c3e50;
        border-radius: 4px;
        cursor: pointer;
        font-size: 10px;
        overflow: hidden;
        text-overflow: ellipsis;
    `;
    dropZone.onclick = () => fileInput.click();

    // Drag and drop handling
    dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.style.background = '#34495e';
    };
    dropZone.ondragleave = () => {
        dropZone.style.background = '#2c3e50';
    };
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.style.background = '#2c3e50';
        if (e.dataTransfer.files.length) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    function handleFileSelect(file) {
        if (!file.type.startsWith('audio/')) return;
        const player = new runtimeState.Tone.Player(URL.createObjectURL(file)).toDestination();
        dispatch(setSample(channelIndex, file, player));
        dropZone.textContent = file.name;
    }

    header.appendChild(fileInput);
    header.appendChild(dropZone);
}

export function renderSynthChannel(header, channel, channelIndex, dispatch, globalState) { // Pass global state for recording flag
    // Clear any previous synth controls
    const existingControls = header.querySelector('.dynamic-synth-controls');
    if (existingControls) {
        header.removeChild(existingControls);
    }

    const synthControlsContainer = document.createElement('div');
    synthControlsContainer.className = 'dynamic-synth-controls';
    synthControlsContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 5px;
        margin-top: 5px;
    `;

    // --- 1. Synth Type Selector ---
    const synthTypeSelect = document.createElement('select');
    synthTypeSelect.title = 'Select Synth Engine';
    getAvailableSynthTypes().forEach(type => {
        const option = document.createElement('option');
        // Simple mapping for display names, could be part of synth class if needed
        const displayName = type === 'BasicSynth' ? 'Basic Synth' : type === 'FMSynth' ? 'FM Synth' : type;
        option.value = type;
        option.textContent = displayName;
        synthTypeSelect.appendChild(option);
    });
    synthTypeSelect.value = channel.synthType;
    synthTypeSelect.onchange = () => {
        dispatch(setSynthType(channelIndex, synthTypeSelect.value));
        // Re-render controls for the new synth type
        // This will be triggered by the state change listener in main.js
    };
    synthControlsContainer.appendChild(synthTypeSelect);

    // --- 2. Dynamic Parameter Controls ---
    const SynthClass = getSynthClass(channel.synthType);
    if (SynthClass && typeof SynthClass.getUI === 'function') {
        const uiConfig = SynthClass.getUI();
        const paramControlsContainer = document.createElement('div');
        paramControlsContainer.className = 'synth-controls';
        paramControlsContainer.style.cssText = `
             display: grid;
             grid-template-columns: 1fr 1fr;
             gap: 5px;
             margin-top: 5px;
         `;

        uiConfig.forEach(controlDef => {
            const label = document.createElement('label');
            label.textContent = controlDef.label || controlDef.param;
            label.title = controlDef.param;

            let input;
            if (controlDef.type === 'range') {
                input = document.createElement('input');
                input.type = 'range';
                input.min = controlDef.min !== undefined ? controlDef.min : '0';
                input.max = controlDef.max !== undefined ? controlDef.max : '1';
                input.step = controlDef.step !== undefined ? controlDef.step : '0.01';
                input.value = channel.params[controlDef.param] !== undefined ? channel.params[controlDef.param] : controlDef.defaultValue;
                input.oninput = () => {
                    const value = input.type === 'range' ? parseFloat(input.value) : input.value;
                    dispatch(setSynthParams(channelIndex, { [controlDef.param]: value }));
                };
            } else if (controlDef.type === 'select') {
                input = document.createElement('select');
                controlDef.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    input.appendChild(option);
                });
                input.value = channel.params[controlDef.param] !== undefined ? channel.params[controlDef.param] : controlDef.defaultValue;
                input.onchange = () => {
                    dispatch(setSynthParams(channelIndex, { [controlDef.param]: input.value }));
                };
            }

            if (input) {
                paramControlsContainer.appendChild(label);
                paramControlsContainer.appendChild(input);
            }
        });

        synthControlsContainer.appendChild(paramControlsContainer);
    } else {
        const errorMsg = document.createElement('div');
        errorMsg.textContent = `UI config not found for ${channel.synthType}`;
        errorMsg.style.color = 'red';
        errorMsg.style.fontSize = '10px';
        synthControlsContainer.appendChild(errorMsg);
    }

    // --- 3. Recording Controls ---
    const recordingControls = document.createElement('div');
    recordingControls.className = 'recording-controls';
    recordingControls.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 3px;
        margin-top: 5px;
        font-size: 10px;
    `;

    const recordBtn = document.createElement('button');
    recordBtn.textContent = globalState.isRecording ? 'Stop Rec' : 'Rec';
    recordBtn.style.background = globalState.isRecording ? '#f44336' : '#2196F3';
    recordBtn.onclick = () => dispatch(toggleRecording()); // Toggle global recording state

    const clearRecordBtn = document.createElement('button');
    clearRecordBtn.textContent = 'Clear Rec';
    clearRecordBtn.onclick = () => dispatch(clearRecordedNotes(channelIndex));

    const recordedNotesDisplay = document.createElement('div');
    recordedNotesDisplay.textContent = `Notes: ${channel.recordedNotes.length}`;
    recordedNotesDisplay.title = JSON.stringify(channel.recordedNotes, null, 2); // Show notes on hover

    recordingControls.appendChild(recordBtn);
    recordingControls.appendChild(clearRecordBtn);
    recordingControls.appendChild(recordedNotesDisplay);

    synthControlsContainer.appendChild(recordingControls);
    // --- End Recording Controls ---

    header.appendChild(synthControlsContainer);
}


export function renderSequencerGrid(container, state, dispatch) {
    container.innerHTML = '';
    state.channels.forEach((channel, channelIndex) => {
        const row = document.createElement('div');
        row.className = channel.type === 'sample' ? 'sample-row' : 'synth-row';
        row.style.cssText = `
            display: contents;
        `;
        // Row header
        const header = document.createElement('div');
        header.className = 'row-header';
        header.textContent = channel.name;
        // Channel controls
        const controls = document.createElement('div');
        controls.className = 'channel-controls';
        const muteBtn = document.createElement('button');
        muteBtn.textContent = channel.muted ? 'Unmute' : 'Mute';
        muteBtn.onclick = () => dispatch(toggleMute(channelIndex));
        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Clear';
        clearBtn.onclick = () => dispatch(clearChannel(channelIndex));
        controls.appendChild(muteBtn);
        controls.appendChild(clearBtn);
        header.appendChild(controls);
        row.appendChild(header);
        // Steps
        channel.steps.forEach((isActive, stepIndex) => {
            const step = document.createElement('div');
            step.className = 'step';
            step.dataset.channel = channelIndex;
            step.dataset.step = stepIndex;
            if (isActive) step.classList.add('active');
            if (channel.muted) step.classList.add('muted');
            if (state.currentStep === stepIndex) step.classList.add('playing');
            step.onclick = () => {
                if (channel.type === 'sample') {
                    dispatch(toggleStep(channelIndex, stepIndex));
                } else {
                    // For synth channels, prompt for note selection
                    const note = prompt(`Enter note for step ${stepIndex + 1} (e.g. C4, D#5)`, channel.notes[stepIndex]);
                    if (note) {
                        dispatch(setNote(channelIndex, stepIndex, note.toUpperCase()));
                        dispatch(toggleStep(channelIndex, stepIndex));
                    }
                }
            };
            row.appendChild(step);
        });
        container.appendChild(row);
        // Render channel-specific controls
        if (channel.type === 'sample') {
            renderSampleChannel(header, channel, channelIndex, dispatch);
        } else {
            // Pass global state for recording controls
            renderSynthChannel(header, channel, channelIndex, dispatch, state);
        }
    });
}

// Updated to handle recording button
export function setupTransportControls(state, dispatch, ToneContext) {
    const playBtn = document.getElementById('play-btn');
    const stopBtn = document.getElementById('stop-btn');
    const bpmInput = document.getElementById('bpm-input');

    // --- New Recording Button ---
    const recordBtn = document.createElement('button');
    recordBtn.id = 'record-btn';
    recordBtn.className = 'record-btn'; // Add CSS class if needed
    recordBtn.textContent = state.isRecording ? 'Stop Rec' : 'Rec';
    recordBtn.style.background = state.isRecording ? '#f44336' : '#2196F3';
    recordBtn.onclick = () => dispatch(toggleRecording());
    // Insert record button next to stop button
    stopBtn.parentNode.insertBefore(recordBtn, stopBtn.nextSibling);
    // --- End New Recording Button ---

    playBtn.onclick = () => {
        dispatch({ type: 'TOGGLE_PLAY' }); // Dispatch directly to avoid circular dep
        if (state.isPlaying) {
            ToneContext.Transport.stop();
        } else {
            ToneContext.Transport.start();
        }
    };
    stopBtn.onclick = () => {
        ToneContext.Transport.stop();
        ToneContext.Transport.seconds = 0;
        dispatch({ type: 'TOGGLE_PLAY' }); // Dispatch directly
        // Optionally stop recording on stop
        // if (state.isRecording) dispatch(toggleRecording());
    };
    bpmInput.value = state.bpm;
    bpmInput.onchange = () => {
        const bpm = parseInt(bpmInput.value);
        if (bpm >= 20 && bpm <= 300) {
            ToneContext.Transport.bpm.value = bpm;
            dispatch({ type: 'SET_BPM', payload: bpm }); // Dispatch directly
        }
    };

    // Subscribe to state changes to update record button text/color
     const updateRecordButton = (newState) => {
         if (recordBtn) {
             recordBtn.textContent = newState.isRecording ? 'Stop Rec' : 'Rec';
             recordBtn.style.background = newState.isRecording ? '#f44336' : '#2196F3';
         }
     };
     updateRecordButton(state); // Initial update
     return updateRecordButton; // Return for subscription in main.js
}

export function createPianoKeys(ToneContext, containerId) {
    const pianoContainer = document.getElementById(containerId);
    if (!pianoContainer) return;

    pianoContainer.innerHTML = ''; // Clear if re-creating

    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    notes.forEach(note => {
        const key = document.createElement('div');
        key.className = 'key';
        key.textContent = note;
        key.dataset.note = `${note}4`;
        if (!whiteKeys.includes(note)) {
            key.classList.add('black');
        }
        key.onmousedown = () => {
            // Use a simple synth for piano keys, independent of sequencer synths
            const synth = new ToneContext.Synth().toDestination();
            synth.triggerAttackRelease(`${note}4`, '8n');
            key.classList.add('active');
            setTimeout(() => key.classList.remove('active'), 200);
        };
        pianoContainer.appendChild(key);
    });
}
// --- End UI Rendering Logic ---