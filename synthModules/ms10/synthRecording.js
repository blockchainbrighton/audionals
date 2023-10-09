// synthRecording.js
let isPlaying = false;
let isRecording = false;
let recordingData = [];
let recordingStartTime;
let isLooping = false;  // Variable to keep track if looping is enabled
let loopStartTimestamp;  // Timestamp to determine when to start the loop
let isPlayingRecording = false;
let playbackInterval; 


let selectedLoopBars = 1; // Default to 1 bar loop
let currentLoopBeat = 1; // Track the current beat within the loop

const elements = {
    attack: document.getElementById('attack'),
    release: document.getElementById('release'),
    cutoff: document.getElementById('cutoff'),
    resonance: document.getElementById('resonance'),
    volume: document.getElementById('volume'),
    note: document.getElementById('note')
};

function getCurrentSynthSettings() {
    return {
        attack: parseFloat(elements.attack.value),
        release: parseFloat(elements.release.value),
        cutoff: parseFloat(elements.cutoff.value),
        resonance: parseFloat(elements.resonance.value),
        volume: getVolume()
    };
}

function logCurrentSettings(action) {
    console.log(`[synthRecording.js] [${action}] Current settings:`, getCurrentSynthSettings());
}

let hasStartedRecording = false; // This will be true once the first note is pressed during recording

function startRecording() {
    if (!isRecording) {
        isRecording = true;
        hasStartedRecording = false; // Reset this flag when starting a new recording session
        recordingData = [];
        console.log("[synthRecording.js] [startRecording] Recording initialized and waiting for the first note.");
        logCurrentSettings("startRecording");
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
        isRecording = false;
        hasStartedRecording = false; // Reset the flag when stopping recording
        console.log(`[synthRecording.js] [stopRecording] Recording stopped at ${new Date().toISOString()}`);
        console.log("[synthRecording.js] [stopRecording] Recorded data:", recordingData);
        logCurrentSettings("stopRecording");
    }
}


function toggleLoop() {
    isLooping = !isLooping;  // Toggle looping status
    const loopButton = document.getElementById("loopToggle");
    loopButton.dataset.state = isLooping ? "on" : "off";  // Update button state
    loopButton.style.backgroundColor = isLooping ? "#A0A0A0" : "";  // Update button color
}

let currentBar = 1; // Current bar in the sequence
let currentBeat = 1; // Current beat within the bar
const beatsPerBar = 4; // Assuming a 4/4 time signature

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

function playRecording() {
    
    let startTime = Date.now();
    let currentIndex = 0;

    console.log("[synthRecording.js] [playRecording] Playback started at:", new Date(startTime).toISOString());

    let loopDuration = 60000 / currentBPM * beatsPerBar * selectedLoopBars;
    if (isSequencerPlaying) {
        // If the sequencer is playing, rely on its beat and bar messages
        if (!isPlayingRecording) {
            isPlayingRecording = true;
            playFromStart();
        }
    } else {
    function processMIDIEvents() {
        let currentTime = Date.now() - startTime;

        while (currentIndex < recordingData.length && recordingData[currentIndex].timestamp <= currentTime) {
            console.log("[synthRecording.js] [playRecording] Processing MIDI message at index:", currentIndex);
            handleMIDIMessage(recordingData[currentIndex].midiMessage, recordingData[currentIndex].synthSettings);
            currentIndex++;
        }

        // Check for loop conditions
        if (currentTime >= loopDuration) {
            console.log("[synthRecording.js] [playRecording] Looping started at:", new Date().toISOString());
            clearInterval(playbackInterval);
            playRecording();
            return;
        }

        if (currentIndex >= recordingData.length) {
            clearInterval(playbackInterval);
            console.log("[synthRecording.js] [playRecording] Waiting for loop restart.");
            setTimeout(() => {
                playRecording();
            }, loopDuration - currentTime);
        }
    }

    playbackInterval = setInterval(processMIDIEvents, 10); // Check every 10ms to see if we have any events to play
}

}

function playFromStart() {
    let currentIndex = 0;

    function processMIDIEvents() {
        if (currentIndex < recordingData.length) {
            handleMIDIMessage(recordingData[currentIndex].midiMessage, recordingData[currentIndex].synthSettings);
            currentIndex++;
        } else {
            // End of recording; wait for the next loop
            isPlayingRecording = false;
        }
    }

    // Subscribe to beat messages from the sequencer
    sequencerChannel.onmessage = function(event) {
        if (event.data.type === 'beat') {
            if (syncBeat === 1 && syncBar % selectedLoopBars === 0) {
                // Start or restart the loop
                currentIndex = 0;
            }
            processMIDIEvents();
        }
    };
}
function handleBarButtonClick(event) {
    barButtons.forEach(button => {
        button.classList.remove('selected');
        button.style.backgroundColor = "";
    });
    
    event.target.classList.add('selected');
    event.target.style.backgroundColor = "#A0A0A0";

    selectedLoopBars = parseInt(event.target.getAttribute('data-bar'));
    console.log("[synthRecording.js] [handleBarButtonClick] Selected Loop Bars:", selectedLoopBars);

    currentLoopBeat = 1;
    loopStartTimestamp = null;
    console.log("[synthRecording.js] [handleBarButtonClick] Reset loop counters.");
}

function handleMIDIMessage(midiMessage, synthSettings) {
    console.log("[synthRecording.js] [handleMIDIMessage] Applying settings:", synthSettings);
    let command = midiMessage[0] & 0xF0;
    let midiNote = midiMessage[1];
    let velocity = (midiMessage.length > 2) ? midiMessage[2] : 0;

    switch (command) {
        case 0x90:
            if (velocity > 0) {
                let frequency = midiNoteToFrequency(midiNote);
                console.log("[synthRecording.js] [handleMIDIMessage] Playing note with frequency:", frequency);
                playMS10TriangleBass(frequency, synthSettings);
            } 
            break;
    }
}

function stopPlayback() {
    clearInterval(playbackInterval);
    console.log("[synthRecording.js] [stopPlayback] Playback stopped at " + new Date().toISOString());
    currentLoopBeat = 1;
    loopStartTimestamp = null;
    console.log("[synthRecording.js] [stopPlayback] Reset loop counters and timestamps.");
}

['attack', 'release', 'cutoff', 'resonance', 'volume'].forEach(id => {
    elements[id].addEventListener('input', () => {
        if (isRecording) {
            const interaction = { event: `${id}Changed`, value: elements[id].value };
            recordingData.push({
                timestamp: Date.now() - recordingStartTime,
                interaction
            });
            console.log("[synthRecording.js] [recordSynthInteraction] Synth interaction recorded:", interaction);
        }
    });
});

// Toggle loop functionality
function toggleLoop() {
    isLooping = !isLooping;  // Toggle the boolean value
    const loopButton = document.getElementById("loopToggle");
    loopButton.dataset.state = isLooping ? "on" : "off";
    if (isLooping) {
        loopButton.style.backgroundColor = "#A0A0A0";  // Light up the button
    } else {
        loopButton.style.backgroundColor = "";  // Reset the button color
    }
}

// Event listeners for various buttons and interactions
document.getElementById("startRecording").addEventListener("click", startRecording);
document.getElementById("stopRecording").addEventListener("click", stopRecording);
document.getElementById("playRecording").addEventListener("click", playRecording);
document.getElementById("stopPlayback").addEventListener("click", stopPlayback);
document.getElementById("loopToggle").addEventListener("click", toggleLoop);

document.querySelector("button[onclick='playMS10TriangleBass()']").addEventListener("click", function() {
    recordSynthInteraction({ event: "notePlayed", note: elements.note.value });
});

document.addEventListener('midiMessageReceived', function(e) {
    recordMIDIInput(e.detail.midiMessage);
    logCurrentSettings("midiMessageReceived");
});

// Get references to the bar selection buttons
const barButtons = document.querySelectorAll('#selectBar1, #selectBar2, #selectBar4');

// Function to handle button clicks
function handleBarButtonClick(event) {
    // Remove the 'selected' class from all bar buttons
    barButtons.forEach(button => {
        button.classList.remove('selected');
        button.style.backgroundColor = "";  // Reset the button color
    });
    
    // Highlight the clicked button and set its state
    event.target.classList.add('selected');
    event.target.style.backgroundColor = "#A0A0A0";  // Highlight the button

    // Update the number of bars for looping based on the selected button
    selectedLoopBars = parseInt(event.target.getAttribute('data-bar'));
}

// Attach click event listeners to the bar selection buttons
barButtons.forEach(button => {
    button.addEventListener('click', handleBarButtonClick);
});
