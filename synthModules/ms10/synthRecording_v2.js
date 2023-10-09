// synthRecording_v2.js

let isRecording = false;
let recordingData = [];
let recordingStartTime;

let selectedLoopBars = 1; // Default to 1 bar loop
let currentLoopBeat = 1; // Track the current beat within the loop
let scheduledLoopTime = null;
let recordingTimeout = null; // Timeout for auto-stopping the recording

const beatsPerBar = 4; // Assuming a 4/4 time signature

// Buffered Playback
let bufferedEvents = [];
function bufferEvents() {
    bufferedEvents = recordingData.slice(); // Clone the recordingData array
}

function playBufferedEvents() {
    let startTime = Date.now();
    let currentIndex = 0;

    function processBufferedEvents() {
        let currentTime = Date.now() - startTime;
        while (currentIndex < bufferedEvents.length && bufferedEvents[currentIndex].timestamp <= currentTime) {
            handleMIDIMessage(bufferedEvents[currentIndex].midiMessage, bufferedEvents[currentIndex].synthSettings);
            currentIndex++;
        }
    }

    playbackInterval = setInterval(processBufferedEvents, 10);
}

// Optimized Looping
function scheduleLoopedPlayback() {
    let loopDuration = 60000 / currentBPM * beatsPerBar * selectedLoopBars;
    setTimeout(playBufferedEvents, loopDuration);
}

let hasStartedRecording = false; // This will be true once the first note is pressed during recording

function startRecording() {
    if (!isRecording) {
        isRecording = true;
        hasStartedRecording = false; // Reset this flag when starting a new recording session
        recordingData = [];
        console.log("[synthRecording.js] [startRecording] Recording initialized and waiting for the first note.");
        logCurrentSettings("startRecording");

        // Calculate loop duration and set a timeout to auto-stop recording
        let loopDuration = 60000 / currentBPM * beatsPerBar * selectedLoopBars;
        recordingTimeout = setTimeout(() => {
            stopRecording();
            if (isLooping) { // Using the correct variable 'isLooping' to check if looping is on
                playBufferedEvents();
            }
        }, loopDuration);
    }
}



function recordMIDIInput(midiMessage) {
    if (isRecording) {
        // Start the actual recording when the first note is pressed
        if (!hasStartedRecording) {
            recordingStartTime = Date.now();
            hasStartedRecording = true;
            console.log(`[synthRecording.js] [recordMIDIInput] Recording actually started at ${new Date(recordingStartTime).toISOString()}`);
        }

        recordingData.push({
            timestamp: Date.now() - recordingStartTime,
            midiMessage,
            synthSettings: getCurrentSynthSettings()
        });
        console.log("[synthRecording.js] [recordMIDIInput] MIDI message recorded:", midiMessage);
    }
}

function stopRecording() {
    if (isRecording) {
        clearTimeout(recordingTimeout); // Clear the auto-stop timeout
        isRecording = false;
        hasStartedRecording = false; // Reset the flag when stopping recording
        console.log(`[synthRecording.js] [stopRecording] Recording stopped at ${new Date().toISOString()}`);
        console.log("[synthRecording.js] [stopRecording] Recorded data:", recordingData);
        logCurrentSettings("stopRecording");
    }
}


let currentBar = 1; // Current bar in the sequence
let currentBeat = 1; // Current beat within the bar

function recordSilence(duration) {
    if (isRecording && hasStartedRecording) {
        recordingData.push({
            timestamp: Date.now() - recordingStartTime,
            midiMessage: null,  // null indicates silence
            duration: duration,
            synthSettings: getCurrentSynthSettings()
        });
        console.log("[synthRecording.js] [recordSilence] Silence recorded for duration:", duration);
    }
}


