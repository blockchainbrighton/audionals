// midiRecorder.js

console.log('midiRecorder.js loaded');

let isRecordingMIDI = false;
let midiRecording = [];
let playbackInterval;
let playbackStartTime = 0;
let nextEventIndex = 0;
let isReadyToRecord = false; // Flag to indicate readiness to record

function startMIDIRecording() {
    // Only set the flag and UI, actual recording starts on first MIDI event
    if (!isRecordingMIDI && !isReadyToRecord) {
        isReadyToRecord = true;
        document.getElementById('recordMIDIButton').classList.add('active');
        console.log('Ready to start MIDI Recording on first note');
    }
}

function stopMIDIRecording() {
    if (isRecordingMIDI || isReadyToRecord) {
        isRecordingMIDI = false;
        isReadyToRecord = false;
        document.getElementById('recordMIDIButton').classList.remove('active');
        console.log('MIDI Recording stopped');
    }
}

function playBackMIDI(channelToPlayBack) {
    if (midiRecording.length > 0) {
        playbackStartTime = performance.now();
        nextEventIndex = 0;
        playbackInterval = setInterval(() => playbackNextMIDIEvent(channelToPlayBack), 0);
        document.getElementById('playMIDIRecordButton').classList.add('active');
        console.log('Playback started for channel:', channelToPlayBack);
    }
}

function playbackNextMIDIEvent(channelToPlayBack) {
    if (nextEventIndex < midiRecording.length) {
        const now = performance.now() - playbackStartTime;
        const nextEvent = midiRecording[nextEventIndex];
        // Check if the event's channel matches the channel we want to playback
        if (now >= nextEvent.timestamp && nextEvent.channelIndex === channelToPlayBack) {
            handleMIDIEvent(nextEvent.message); // Assume existing function to process MIDI message
            console.log(`Playing MIDI Event on channel ${nextEvent.channelIndex}:`, nextEvent.message);
            nextEventIndex++;
        }
    } else {
        clearInterval(playbackInterval);
        document.getElementById('playMIDIRecordButton').classList.remove('active');
        console.log('Playback stopped for channel:', channelToPlayBack);
    }
}

// Modified to start recording on first MIDI event
function recordMIDIEvent(message, channelIndex) {
    if (isReadyToRecord && !isRecordingMIDI) {
        isRecordingMIDI = true;
        isReadyToRecord = false;
        playbackStartTime = performance.now();
        console.log('MIDI Recording started with first note');
    }

    if (isRecordingMIDI) {
        const currentTime = performance.now();
        const timestamp = currentTime - playbackStartTime;
        // Include channelIndex with each recorded event
        midiRecording.push({ timestamp, message, channelIndex });
        console.log(`Recorded MIDI Event on channel ${channelIndex}:`, message, 'at timestamp:', timestamp);
    }
}

window.recordMIDIEvent = recordMIDIEvent; // Make it accessible globally


function prepareToRecordMIDI() {
    metronomeCount = 0;
    metronomeInterval = setInterval(playMetronomeBeforeRecording, 500); // 500ms for a simple 4/4 count
}

function playMetronomeBeforeRecording() {
    console.log('Metronome Click');
    playMetronome();
    metronomeCount++;
    if (metronomeCount >= 4) {
        clearInterval(metronomeInterval);
        startMIDIRecording();
    }
}

// You can add more logs as needed for debugging other parts of your code.
