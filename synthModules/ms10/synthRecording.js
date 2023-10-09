// synthRecording.js

let isRecording = false;
let recordingData = [];
let recordingStartTime;

// Start recording
function startRecording() {
    if (!isRecording) {
        isRecording = true;
        recordingData = []; // Clear previous recording data
        recordingStartTime = Date.now();
        console.log("[synthRecording.js] [startRecording] Recording started at " + new Date(recordingStartTime).toISOString());
    }
}

// Function to capture the current state of synth settings
function getCurrentSynthSettings() {
    const attack = parseFloat(document.getElementById('attack').value);
    const release = parseFloat(document.getElementById('release').value);
    const cutoff = parseFloat(document.getElementById('cutoff').value);
    const resonance = parseFloat(document.getElementById('resonance').value);
    const volume = getVolume();

    return { attack, release, cutoff, resonance, volume };
}

// Function to capture MIDI input during recording
function recordMIDIInput(midiMessage) {
    if (isRecording) {
        const timestamp = Date.now() - recordingStartTime;
        const synthSettings = getCurrentSynthSettings();
        recordingData.push({ timestamp, midiMessage, synthSettings });
        console.log("[synthRecording.js] [recordMIDIInput] MIDI message and synth settings recorded:", midiMessage, synthSettings);
    }
}

// Stop recording
function stopRecording() {
    if (isRecording) {
        isRecording = false;
        console.log("[synthRecording.js] [stopRecording] Recording stopped at " + new Date().toISOString());
        console.log("[synthRecording.js] [stopRecording] Recorded data:", recordingData);  // <-- This logs the recorded array
    }
}

// Play back the recorded MIDI messages
function playbackRecording() {
    let playbackStartTime = Date.now();
    console.log("[synthRecording.js] [playbackRecording] Playback started at."(playbackStartTime));
    recordingData.forEach(event => {
        setTimeout(() => {
            // Handle the MIDI message to generate audio
            handleMIDIMessage(event.midiMessage);
            console.log("[synthRecording.js] [playbackRecording] MIDI message played:", event.midiMessage);
        }, event.timestamp);
    });
    console.log("[synthRecording.js] [playbackRecording] Playback scheduled.");
}

// Save recording to a JSON file
function saveRecording() {
    const blob = new Blob([JSON.stringify(recordingData)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "synthRecording.json";
    a.click();
    console.log("[RECORDING] Saved to file.");
}

// Load recording from a JSON file
function loadRecording(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = function() {
        recordingData = JSON.parse(reader.result);
        console.log("[synthRecording.js] [loadRecording] Loaded from file at " + new Date().toISOString());
        console.log("[synthRecording.js] [loadRecording] Loaded data:", recordingData);
    };

    reader.readAsText(file);
}

// Play the recording
// Play the recording
function playRecording() {
    let startTime = Date.now();
    let currentIndex = 0;

    console.log("[synthRecording.js] [playRecording] Playback initiated at " + new Date(startTime).toISOString());

    playbackInterval = setInterval(() => {
        let currentTime = Date.now() - startTime;
        while (currentIndex < recordingData.length && recordingData[currentIndex].timestamp <= currentTime) {
            console.log("[synthRecording.js] [playRecording] Playing event at " + new Date(Date.now()).toISOString() + ": ", recordingData[currentIndex]);
            
            // Determine the type of MIDI message
            let midiMessage = recordingData[currentIndex].midiMessage;
            let command = midiMessage[0] & 0xF0; // Mask the channel bits to get the message type
            let midiNote = midiMessage[1];
            let velocity = (midiMessage.length > 2) ? midiMessage[2] : 0;

            switch (command) {
                case 0x90: // noteOn for all channels
                    if (velocity > 0) {
                        let frequency = midiNoteToFrequency(midiNote);
                        playMS10TriangleBass(frequency, recordingData[currentIndex].synthSettings);  // Pass the recorded synth settings
                    } else {
                        stopMS10TriangleBass();
                    }
                    break;
                case 0x80: // noteOff for all channels
                    stopMS10TriangleBass();
                    break;
            }

            currentIndex++;
        }

        // If we have played back all the recorded events, stop the playback
        if (currentIndex >= recordingData.length) {
            stopPlayback();
        }
    }, 10); // Check every 10ms to see if we have any events to play
}

// Function to stop the current oscillator
function stopMS10TriangleBass() {
    if (currentOscillator) {
        currentOscillator.stop();
        currentOscillator = null;
    }
}


// Stop the playback
function stopPlayback() {
    clearInterval(playbackInterval);
    console.log("[synthRecording.js] [stopPlayback] Playback stopped at " + new Date().toISOString());
}


// Event listeners for the buttons
document.getElementById("startRecording").addEventListener("click", startRecording);
document.getElementById("stopRecording").addEventListener("click", stopRecording);
document.getElementById("saveRecording").addEventListener("click", saveRecording);
document.getElementById("loadRecordingInput").addEventListener("change", loadRecording);
document.getElementById("playRecording").addEventListener("click", playRecording);
document.getElementById("stopPlayback").addEventListener("click", stopPlayback);


// For demonstration purposes, let's record a note interaction when the "Play Note" button is clicked
document.querySelector("button[onclick='playMS10TriangleBass()']").addEventListener("click", function() {
    recordSynthInteraction({ event: "notePlayed", note: document.getElementById("note").value });
});

// Integration with midiControl.js
document.addEventListener('midiMessageReceived', function(e) {
    recordMIDIInput(e.detail.midiMessage);
});