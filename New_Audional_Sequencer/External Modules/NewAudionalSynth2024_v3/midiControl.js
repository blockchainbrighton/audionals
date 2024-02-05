// midiControl.js

const A4_MIDI_NUMBER = 69;
const A4_FREQUENCY = 440;
const arpNoteNames = [];
let isRecordingMIDI = false;
let midiRecording = [];
let playbackStartTime = 0;
let nextEventIndex = 0; // Initialize the nextEventIndex
var playbackInterval; // Declare playbackInterval globally
let recordingStartTime = 0; // Initialize recording start time
let isRecordingStarted = false; // Flag to track if recording has started


function onMIDISuccess(e) {
    let o = e.inputs.values();
    for (let e = o.next(); e && !e.done; e = o.next()) {
        e.value.onmidimessage = onMIDIMessage;
    }
}

function onMIDIFailure() {
    console.warn("Could not access your MIDI devices.");
}

function onMIDIMessage(e) {
    let data = e.data;
    console.log("Received MIDI message:", e.data);

    // Ensure data is in the expected format for processing
    if (typeof data === 'object' && !Array.isArray(data)) {
        data = Array.from(data); // Convert data to a regular array format
    }

    let statusByte = data[0];
    let messageType = statusByte & 0xF0; // Get the message type
    let channel = statusByte & 0x0F; // Get the MIDI channel
    let noteNumber = data[1];
    let velocity = data[2]; // Correctly access the velocity

    // Start recording on the first Note On message with velocity > 0
    if (!isRecordingStarted && messageType === 144 && velocity > 0) {
        isRecordingStarted = true; // Flag indicating recording has started
        recordingStartTime = performance.now();
        console.log('MIDI Recording started with first note');
    }

    if (isRecordingMIDI && isRecordingStarted) {
        let messageTime = performance.now() - recordingStartTime;
        midiRecording.push({ timestamp: messageTime, message: data });
    }

    console.log(`Status Byte: ${statusByte}, Message Type: ${messageType}, Channel: ${channel}`);
    console.log(`Note Number: ${noteNumber}, Velocity: ${velocity}`);
    

    // Process Note On/Off messages
    switch (messageType) {
        case 144: // Note On
            if (velocity > 0) {
                let frequency = midiNoteToFrequency(noteNumber);
                console.log(`Note On. MIDI note: ${noteNumber}, Frequency: ${frequency}`);
                if (isArpeggiatorOn) {
                    arpNotes.push(frequency);
                    updateArpNotesDisplay();
                } else {
                    playMS10TriangleBass(frequency, velocity / 127);
                }
            }
            break;
        case 128: // Note Off
            console.log(`Note Off. MIDI note: ${noteNumber}`);
            if (isArpeggiatorOn) {
                let frequency = midiNoteToFrequency(noteNumber);
                let index = arpNotes.indexOf(frequency);
                if (index !== -1) arpNotes.splice(index, 1);
            }
            break;
        default:
            console.log(`Unhandled MIDI message type: ${messageType}`);
    }
}

function midiNoteToFrequency(e) {
    return e < 0 || e > 127 ? (console.error("Invalid MIDI note:", e), null) : Math.pow(2, (e - A4_MIDI_NUMBER) / 12) * A4_FREQUENCY;
}

function playNote(e, o = 1) {
    let n = 440 * Math.pow(2, (e - 69) / 12);
    playMS10TriangleBass(n, o);
}

function stopNote(e) {}

function getVolume() {
    return document.getElementById("volume").value / 100;
}

navigator.requestMIDIAccess ? navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure) : console.warn("WebMIDI is not supported in this browser.");

function startMIDIRecording() {
    isRecordingMIDI = true;
    midiRecording = []; // Ensure this is only here or checked to not clear unintentionally
    recordingStartTime = performance.now(); // Capture start time
    console.log('MIDI Recording started');
}

function stopMIDIRecording() {
    isRecordingMIDI = false;
    console.log('MIDI Recording stopped. Recorded data:', midiRecording);
}

// Function to record keyboard-triggered notes
function recordKeyboardNoteEvent(noteNumber, velocity, isNoteOn) {
    if (isRecordingMIDI) {
        let messageTime = performance.now();
        // Mimic MIDI message format: [status, noteNumber, velocity]
        let status = isNoteOn ? 144 : 128; // 144 for note on, 128 for note off
        let midiMessage = [status, noteNumber, velocity];
        midiRecording.push({ timestamp: messageTime, message: midiMessage });
    }
}

// Playback functionality
function playBackMIDI() {
    const playButton = document.getElementById('playMIDIRecordButton');
    if (midiRecording.length > 0) {
        // Start playback
        playbackStartTime = performance.now();
        nextEventIndex = 0;
        playbackInterval = setInterval(playbackNextMIDIEvent, 0);
        playButton.classList.add('active');
        // Update button text to "Stop"
        playButton.textContent = "Stop";
        console.log('Playback started');
    } else {
        // If there's nothing to play, reset button text (useful for repeated clicks)
        playButton.textContent = "Play MIDI Recording";
    }
}

function playbackNextMIDIEvent() {
    const playButton = document.getElementById('playMIDIRecordButton');
    if (nextEventIndex < midiRecording.length) {
        const now = performance.now() - playbackStartTime;
        const nextEvent = midiRecording[nextEventIndex];
        if (now >= nextEvent.timestamp) {
            // Construct a MIDI event object to match the expected format of onMIDIMessage
            const midiEvent = {data: nextEvent.message};
            onMIDIMessage(midiEvent); // Call onMIDIMessage with the constructed event
            console.log('Playing MIDI Event:', nextEvent.message);
            nextEventIndex++;
        }
    } else {
        // Stop playback
        clearInterval(playbackInterval);
        playButton.classList.remove('active');
        // Reset button text to "Play MIDI Recording"
        playButton.textContent = "Play MIDI Recording";
        console.log('Playback stopped');
    }
}


// Event listener setup with error checking
function addMIDIControlEventListeners() {
    const recordButton = document.getElementById('recordMIDIButton');
    const stopRecordButton = document.getElementById('stopMIDIRecordButton');
    const playRecordButton = document.getElementById('playMIDIRecordButton');

    if (recordButton) recordButton.addEventListener('click', startMIDIRecording);
    if (stopRecordButton) stopRecordButton.addEventListener('click', stopMIDIRecording);
    if (playRecordButton) playRecordButton.addEventListener('click', playBackMIDI);
}

addMIDIControlEventListeners();

navigator.requestMIDIAccess ? navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure) : console.warn("WebMIDI is not supported in this browser.");
