// --- START OF FILE midiRecorder.js ---

import { createElement } from './utils.js';

let audioProcRef = null, isArmedForRecording = false, isRecording = false, isPlaying = false;
let recordedEvents = [], recordingStartTime = 0, playbackTimeoutIds = [], uiPanel = null;
let recordButton, playButton, stopButton, saveButton, loadButton, statusIndicator;
let isUIVisible = false;

const FORMAT_VERSION = "1.0", PANEL_ID = 'midi-recorder-panel';

const setStyle = (el, style) => Object.assign(el.style, Object.fromEntries(
    style.split(';').filter(Boolean).map(s => s.trim().split(/:(.+)/).map(v => v.trim()))
));

const makeButton = label => createElement('button', {
    style: `padding:5px 10px;cursor:pointer;min-width:70px;text-align:center;
            background:#333;border:1px solid #555;color:#ddd;border-radius:3px;`,
    textContent: label
});

function _createUIPanel() {
    uiPanel = createElement('div', { id: PANEL_ID });
    setStyle(uiPanel, `
        position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
        background:rgba(40,40,40,0.9);border:1px solid #555;border-radius:5px;
        padding:10px 15px;z-index:1000;display:flex;flex-direction:column;
        align-items:center;gap:8px;visibility:hidden;opacity:0;
        transition:visibility 0s 0.2s,opacity 0.2s ease-in-out;
        color:#ccc;font-size:0.9em;
    `);

    const buttonRow = createElement('div');
    setStyle(buttonRow, `display:flex;gap:10px;width:100%;justify-content:center;`);

    statusIndicator = createElement('span', {
        style: `min-height:1.2em;font-style:italic;color:#aaa;text-align:center;width:100%;`,
        textContent: 'Idle'
    });

    [recordButton, playButton, stopButton, saveButton, loadButton] = ['Record', 'Play', 'Stop', 'Save', 'Load'].map(makeButton);
    stopButton.disabled = true;

    recordButton.onclick = () => (!isArmedForRecording && !isRecording) ? armRecording() : stopRecording();
    playButton.onclick = () => { if (!isPlaying) startPlayback(); _updateUIState(); };
    stopButton.onclick = () => { isArmedForRecording && cancelArming(); isRecording && stopRecording(); isPlaying && stopPlayback(); };
    saveButton.onclick = saveRecording;
    loadButton.onclick = loadRecording;

    buttonRow.append(recordButton, playButton, stopButton, saveButton, loadButton);
    uiPanel.append(statusIndicator, buttonRow);
    document.body.appendChild(uiPanel);
    _updateUIState();
}

function _updateUIState() {
    if (!uiPanel) return;
    const hasEvents = recordedEvents.length > 0;
    const statusMap = {
        idle: () => [`Idle${hasEvents ? ` (${hasEvents} events)` : ''}`, 'Record', '', false, hasEvents, true],
        armed: () => ['Armed (Waiting for first note...)', 'Cancel Arm', '#d08770', true, false, false],
        recording: () => ['Recording...', 'Stop', '#bf616a', true, false, false],
        playing: () => ['Playing...', 'Record', '', true, false, false]
    };
    const [statusText, recText, recColor, stopOn, playSaveOn, loadOn] =
        isArmedForRecording ? statusMap.armed() :
        isRecording ? statusMap.recording() :
        isPlaying ? statusMap.playing() : statusMap.idle();

    Object.assign(statusIndicator, { textContent: statusText });
    Object.assign(recordButton, { textContent: recText, disabled: isPlaying });
    recordButton.style.backgroundColor = recColor;
    stopButton.disabled = !stopOn;
    [playButton, saveButton].forEach(btn => btn.disabled = !playSaveOn || isArmedForRecording || isRecording || isPlaying);
    loadButton.disabled = !loadOn || isArmedForRecording || isRecording || isPlaying;
    if (!isArmedForRecording && !isRecording) recordButton.style.backgroundColor = '';
}

export function toggleUI() {
    if (!uiPanel) _createUIPanel();
    isUIVisible = !isUIVisible;
    Object.assign(uiPanel.style, {
        visibility: isUIVisible ? 'visible' : 'hidden',
        opacity: isUIVisible ? '1' : '0',
        transitionDelay: isUIVisible ? '0s' : '0s,0.2s'
    });
    console.log(`MIDI Recorder UI ${isUIVisible ? 'shown' : 'hidden'}.`);
}

function armRecording() {
    if (isArmedForRecording || isRecording || isPlaying) return;
    isArmedForRecording = true; isRecording = false;
    recordedEvents = []; recordingStartTime = 0;
    console.log("MIDI Recorder: Armed for recording. Waiting for first note...");
    _updateUIState();
}

function cancelArming() {
    if (!isArmedForRecording) return;
    isArmedForRecording = false;
    console.log("MIDI Recorder: Recording arm cancelled.");
    _updateUIState();
}

function stopRecording() {
    if (!isRecording && !isArmedForRecording) return;
    const wasRecording = isRecording, wasArmed = isArmedForRecording;
    isRecording = isArmedForRecording = false;
    if (wasRecording) {
        const duration = recordedEvents.length ? recordedEvents.at(-1).time / 1000 : 0;
        console.log(`MIDI Recorder: Recording stopped. ${recordedEvents.length} events over ~${duration.toFixed(2)}s.`);
    } else if (wasArmed) {
        console.log("MIDI Recorder: Recording arm cancelled via Stop button.");
    }
    recordingStartTime = 0;
    _updateUIState();
}

export function handleMidiEvent(type, note, velocity, timestamp) {
    if (!isArmedForRecording && !isRecording) return;
    if (isArmedForRecording && type === 'noteon' && velocity > 0) {
        isArmedForRecording = false; isRecording = true;
        recordingStartTime = timestamp;
        recordedEvents.push({ type, time: 0, note, velocity });
        console.log("MIDI Recorder: First note received. Recording active.");
        _updateUIState();
        return;
    }
    if (isRecording) {
        const time = Math.max(0, timestamp - recordingStartTime);
        recordedEvents.push({ type, time, note, velocity });
    }
}

function startPlayback() {
    if (isPlaying || isRecording || isArmedForRecording || !recordedEvents.length || !audioProcRef?.playSampleAtRate || !audioProcRef?.getPlaybackRateForNote) return;
    stopPlayback();
    isPlaying = true;
    console.log(`MIDI Recorder: Starting playback of ${recordedEvents.length} events.`);
    let played = 0;
    recordedEvents.forEach(({ type, time, note, velocity }) => {
        const id = setTimeout(() => {
            try {
                if (type === 'noteon' && velocity > 0) {
                    const rate = audioProcRef.getPlaybackRateForNote(note);
                    if (rate !== undefined) audioProcRef.playSampleAtRate(rate, velocity);
                    else console.warn(`No playback rate for note ${note}`);
                }
                playbackTimeoutIds = playbackTimeoutIds.filter(t => t !== id);
                if (++played === recordedEvents.length && !playbackTimeoutIds.length && isPlaying) stopPlayback();
            } catch (e) {
                console.error("Playback error:", e);
                if (isPlaying) stopPlayback();
            }
        }, time);
        playbackTimeoutIds.push(id);
    });
    _updateUIState();
}

function stopPlayback() {
    if (!isPlaying && !playbackTimeoutIds.length) return;
    console.log("MIDI Recorder: Stopping playback.");
    isPlaying = false;
    playbackTimeoutIds.forEach(clearTimeout);
    playbackTimeoutIds = [];
    _updateUIState();
}

function saveRecording() {
    if (!recordedEvents.length) return alert("No MIDI data to save.");
    if (isArmedForRecording || isRecording || isPlaying) return alert("Cannot save while busy.");
    const blob = new Blob([JSON.stringify({ formatVersion: FORMAT_VERSION, events: recordedEvents }, null, 2)], { type: 'application/json' });
    const a = createElement('a', { href: URL.createObjectURL(blob), download: `midi_recording_${Date.now()}.json` });
    document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
    console.log("MIDI Recorder: Recording saved to JSON.");
}

function loadRecording() {
    if (isArmedForRecording || isRecording || isPlaying) return alert("Cannot load while busy.");
    const input = createElement('input', { type: 'file', accept: '.json,application/json' });
    input.onchange = ({ target: { files } }) => {
        const file = files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ({ target: { result } }) => {
            try {
                const data = JSON.parse(result);
                if (!data || typeof data !== 'object') throw new Error("Invalid JSON structure.");
                if (data.formatVersion !== FORMAT_VERSION)
                    console.warn(`Loading version ${data.formatVersion} (expected ${FORMAT_VERSION}).`);
                if (!Array.isArray(data.events)) throw new Error("Missing 'events' array.");
                const offset = data.events.at(0)?.time || 0;
                if (offset) data.events.forEach(e => e.time = Math.max(0, e.time - offset));
                recordedEvents = data.events;
                console.log(`Loaded ${recordedEvents.length} events from ${file.name}.`);
                alert(`Loaded ${recordedEvents.length} events.`);
                _updateUIState();
            } catch (e) {
                console.error("Error loading file:", e);
                alert(`Error: ${e.message}`);
                recordedEvents = [];
                _updateUIState();
            }
        };
        reader.onerror = e => { console.error("Read error:", e); alert("Error reading file."); };
        reader.readAsText(file);
    };
    input.click();
}

export function init(ref) {
    if (!ref?.playSampleAtRate || !ref?.getPlaybackRateForNote) return console.error("Invalid audioProcessor reference.");
    audioProcRef = ref;
    _createUIPanel();
    console.log("MIDI Recorder Initialized.");
}



// --- END OF FILE midiRecorder.js ---
