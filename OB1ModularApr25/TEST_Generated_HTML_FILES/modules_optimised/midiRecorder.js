// midiRecorder.js
// import { createElement } from './utils.js';

// --- midiRecorder.js ---

// Original: import { createElement } from './utils.js';
import { createElement } from '/content/6ee146a17e6582c989ebaa2f2c8b6a039f29493f858d59a89edfb0d3485a7fc4i0';

// --- Module State ---
let audioProcRef = null;
let isArmedForRecording = false, isRecording = false, isPlaying = false;
let recordedEvents = [], recordingStartTime = 0;
let playbackTimeoutIds = [];
let uiPanel = null;
let recordButton, playButton, stopButton, saveButton, loadButton, statusIndicator;
let isUIVisible = false;

// --- Constants ---
const FORMAT_VERSION = "1.0", PANEL_ID = 'midi-recorder-panel';

// --- UI Creation & Management ---
const panelStyle = `
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    background-color: rgba(40, 40, 40, 0.9); border: 1px solid #555; border-radius: 5px;
    padding: 10px 15px; z-index: 1000; display: flex; flex-direction: column;
    align-items: center; gap: 8px; visibility: hidden; opacity: 0;
    transition: visibility 0s 0.2s, opacity 0.2s ease-in-out; color: #ccc; font-size: 0.9em;
`;
const buttonRowStyle = `display: flex; gap: 10px; width: 100%; justify-content: center;`;
const buttonStyle = `padding: 5px 10px; cursor: pointer; min-width: 70px; text-align: center;
    background-color: #333; border: 1px solid #555; color: #ddd; border-radius: 3px;`;
const statusStyle = `min-height: 1.2em; font-style: italic; color: #aaa; text-align: center; width: 100%;`;

const _createUIPanel = () => {
    uiPanel = createElement('div', { id: PANEL_ID, style: panelStyle });
    statusIndicator = createElement('span', { style: statusStyle, textContent: 'Idle' });
    const buttonRow = createElement('div', { style: buttonRowStyle });
    
    recordButton = createElement('button', { style: buttonStyle, textContent: 'Record' });
    playButton   = createElement('button', { style: buttonStyle, textContent: 'Play' });
    stopButton   = createElement('button', { style: buttonStyle, textContent: 'Stop', disabled: true });
    saveButton   = createElement('button', { style: buttonStyle, textContent: 'Save' });
    loadButton   = createElement('button', { style: buttonStyle, textContent: 'Load' });

    recordButton.addEventListener('click', () => {
        !isArmedForRecording && !isRecording ? armRecording() : stopRecording();
    });
    playButton.addEventListener('click', () => { !isPlaying && startPlayback(); _updateUIState(); });
    stopButton.addEventListener('click', () => {
        if (isArmedForRecording) cancelArming();
        if (isRecording) stopRecording();
        if (isPlaying) stopPlayback();
    });
    saveButton.addEventListener('click', saveRecording);
    loadButton.addEventListener('click', loadRecording);
    
    buttonRow.append(recordButton, playButton, stopButton, saveButton, loadButton);
    uiPanel.append(statusIndicator, buttonRow);
    document.body.appendChild(uiPanel);
    _updateUIState();
};

const _updateUIState = () => {
    if (!uiPanel) return;
    let statusText = 'Idle', recButtonText = 'Record', recButtonColor = '';
    let stopEnabled = false, playSaveEnabled = recordedEvents.length > 0, loadEnabled = true;
    if (isArmedForRecording) {
        statusText = 'Armed (Waiting for first note...)';
        recButtonText = 'Cancel Arm';
        recButtonColor = '#d08770';
        stopEnabled = true; playSaveEnabled = false; loadEnabled = false;
    } else if (isRecording) {
        statusText = 'Recording...';
        recButtonText = 'Stop';
        recButtonColor = '#bf616a';
        stopEnabled = true; playSaveEnabled = false; loadEnabled = false;
    } else if (isPlaying) {
        statusText = 'Playing...';
        stopEnabled = true; playSaveEnabled = false; loadEnabled = false;
    } else {
        statusText = recordedEvents.length ? `Ready (${recordedEvents.length} events)` : 'Idle';
    }
    statusIndicator.textContent = statusText;
    recordButton.textContent = recButtonText;
    recordButton.style.backgroundColor = recButtonColor || '';
    recordButton.disabled = isPlaying;
    stopButton.disabled = !stopEnabled;
    playButton.disabled = !playSaveEnabled || isArmedForRecording || isRecording || isPlaying;
    saveButton.disabled = playButton.disabled;
    loadButton.disabled = !loadEnabled || isArmedForRecording || isRecording || isPlaying;
};

const toggleUI = () => {
    if (!uiPanel) _createUIPanel();
    isUIVisible = !isUIVisible;
    uiPanel.style.visibility = isUIVisible ? 'visible' : 'hidden';
    uiPanel.style.opacity = isUIVisible ? '1' : '0';
    uiPanel.style.transitionDelay = isUIVisible ? '0s' : '0s, 0.2s';
    console.log(`MIDI Recorder UI ${isUIVisible ? 'shown' : 'hidden'}.`);
};

// --- Recording Logic ---
const armRecording = () => {
    if (isArmedForRecording || isRecording || isPlaying) return;
    isArmedForRecording = true;
    isRecording = false;
    recordedEvents = [];
    recordingStartTime = 0;
    console.log("MIDI Recorder: Armed for recording. Waiting for first note...");
    _updateUIState();
};

const cancelArming = () => {
    if (!isArmedForRecording) return;
    isArmedForRecording = false;
    console.log("MIDI Recorder: Recording arm cancelled.");
    _updateUIState();
};

const stopRecording = () => {
    if (!isRecording && !isArmedForRecording) return;
    const wasRecording = isRecording, wasArmed = isArmedForRecording;
    isRecording = false; isArmedForRecording = false;
    if (wasRecording) {
        const duration = recordedEvents.length 
            ? recordedEvents[recordedEvents.length - 1].time / 1000 
            : 0;
        console.log(`MIDI Recorder: Recording stopped. Recorded ${recordedEvents.length} events over ~${duration.toFixed(2)}s.`);
    } else if (wasArmed) {
        console.log("MIDI Recorder: Recording arm cancelled via Stop button.");
    }
    recordingStartTime = 0;
    _updateUIState();
};

export const handleMidiEvent = (type, note, velocity, timestamp) => {
    if (!isArmedForRecording && !isRecording) return;
    if (isArmedForRecording && type === 'noteon' && velocity > 0) {
        isArmedForRecording = false;
        isRecording = true;
        recordingStartTime = timestamp;
        console.log("MIDI Recorder: First note received. Recording active.");
        recordedEvents.push({ type, time: 0, note, velocity });
        _updateUIState();
        return;
    }
    if (isRecording) {
        const relativeTime = Math.max(0, timestamp - recordingStartTime);
        recordedEvents.push({ type, time: relativeTime, note, velocity });
    }
};

// --- Playback Logic ---
const startPlayback = () => {
    if (isPlaying || isRecording || isArmedForRecording || recordedEvents.length === 0) return;
    if (!audioProcRef || typeof audioProcRef.playSampleAtRate !== 'function' || typeof audioProcRef.getPlaybackRateForNote !== 'function') {
        console.error("MIDI Recorder: Cannot play, invalid audioProcessor reference or methods.");
        return;
    }
    stopPlayback();
    isPlaying = true;
    console.log(`MIDI Recorder: Starting playback of ${recordedEvents.length} events.`);
    let eventsPlayed = 0;
    recordedEvents.forEach(event => {
        const timeoutId = setTimeout(() => {
            try {
                if (event.type === 'noteon' && event.velocity > 0) {
                    const rate = audioProcRef.getPlaybackRateForNote(event.note);
                    if (rate !== undefined) {
                        audioProcRef.playSampleAtRate(rate, event.velocity);
                    } else {
                        console.warn(`MIDI Recorder Playback: No playback rate for note ${event.note}`);
                    }
                }
                playbackTimeoutIds = playbackTimeoutIds.filter(id => id !== timeoutId);
                eventsPlayed++;
                if (eventsPlayed === recordedEvents.length && playbackTimeoutIds.length === 0 && isPlaying) {
                    console.log("MIDI Recorder: Playback finished.");
                    stopPlayback();
                }
            } catch (err) {
                console.error("MIDI Recorder: Error during playback:", err);
                if (isPlaying) stopPlayback();
            }
        }, event.time);
        playbackTimeoutIds.push(timeoutId);
    });
    _updateUIState();
};

const stopPlayback = () => {
    if (!isPlaying && playbackTimeoutIds.length === 0) return;
    console.log("MIDI Recorder: Stopping playback.");
    isPlaying = false;
    playbackTimeoutIds.forEach(clearTimeout);
    playbackTimeoutIds = [];
    _updateUIState();
};

// --- File Handling ---
const saveRecording = () => {
    if (!recordedEvents.length) {
        alert("No MIDI data recorded to save.");
        return;
    }
    if (isArmedForRecording || isRecording || isPlaying) {
        alert("Cannot save while recording, armed, or playing.");
        return;
    }
    const recordingData = { formatVersion: FORMAT_VERSION, events: recordedEvents };
    const jsonData = JSON.stringify(recordingData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = createElement('a', { href: url, download: `midi_recording_${Date.now()}.json` });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("MIDI Recorder: Recording saved to JSON.");
};

const loadRecording = () => {
    if (isArmedForRecording || isRecording || isPlaying) {
        alert("Cannot load while recording, armed, or playing.");
        return;
    }
    const input = createElement('input', { type: 'file', accept: '.json,application/json' });
    input.onchange = ({ target: { files } }) => {
        const file = files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ({ target: { result } }) => {
            try {
                const loadedData = JSON.parse(result);
                if (!loadedData || typeof loadedData !== 'object')
                    throw new Error("Invalid file content: Not a JSON object.");
                if (loadedData.formatVersion !== FORMAT_VERSION) {
                    console.warn(`Warning: Loaded format version ${loadedData.formatVersion} (expected ${FORMAT_VERSION}).`);
                }
                if (!Array.isArray(loadedData.events))
                    throw new Error("Invalid format: 'events' property missing or not an array.");
                if (loadedData.events.length > 0) {
                    const firstEventTime = loadedData.events[0].time || 0;
                    if (firstEventTime !== 0) {
                        console.warn(`MIDI Recorder: Normalizing events (first event time ${firstEventTime}ms).`);
                        loadedData.events.forEach(ev => ev.time = Math.max(0, ev.time - firstEventTime));
                    }
                }
                recordedEvents = loadedData.events;
                console.log(`MIDI Recorder: Loaded ${recordedEvents.length} events from ${file.name}.`);
                alert(`Loaded ${recordedEvents.length} events.`);
                _updateUIState();
            } catch (error) {
                console.error("MIDI Recorder: Error loading file:", error);
                alert(`Error loading file: ${error.message}`);
                recordedEvents = [];
                _updateUIState();
            }
        };
        reader.onerror = e => {
            console.error("MIDI Recorder: Error reading file:", e);
            alert("Error reading file.");
        };
        reader.readAsText(file);
    };
    input.click();
};

// --- Public API ---
export const init = audioProcessorReference => {
    if (!audioProcessorReference ||
        typeof audioProcessorReference.playSampleAtRate !== 'function' ||
        typeof audioProcessorReference.getPlaybackRateForNote !== 'function') {
        console.error("MIDI Recorder Init Error: Invalid audioProcessor reference or missing required methods.");
        return;
    }
    audioProcRef = audioProcessorReference;
    _createUIPanel();
    console.log("MIDI Recorder Initialized.");
};

export { toggleUI };
