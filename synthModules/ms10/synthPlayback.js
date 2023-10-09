// synthPlayback.js

let isPlaying = false;
let isLooping = false;  // Variable to keep track if looping is enabled
let loopStartTimestamp;  // Timestamp to determine when to start the loop
let isPlayingRecording = false;
let playbackInterval; 
let startTime; // Move startTime to global scope
let loopDuration; // Global variable for the loop duration

let timeoutIDs = [];


function playRecording() {
    loopDuration = 60000 / currentBPM * beatsPerBar * selectedLoopBars;
    startTime = Date.now();
    scheduledLoopTime = startTime + loopDuration;

    console.log("[DEBUG] [playRecording] Loop Duration (ms):", loopDuration);
    console.log("[DEBUG] [playRecording] Scheduled Loop Time:", new Date(scheduledLoopTime).toISOString());
    console.log("[synthRecording.js] [playRecording] Playback started at:", new Date(startTime).toISOString());
        
    if (!isSequencerPlaying) {
        processMIDIEventsWithTimeout(0);
    } else if (!isPlayingRecording) {
        isPlayingRecording = true;
        playFromStart();
    }
}

function processMIDIEventsWithTimeout(currentIndex) {
    if (currentIndex >= recordingData.length) {
        if (isLooping) {
            let timeRemaining = scheduledLoopTime - Date.now();
            console.log("[DEBUG] [processMIDIEventsWithTimeout] Time remaining until next loop:", timeRemaining);
            setTimeout(() => {
                playRecording();
            }, timeRemaining);
        } else {
            console.log("[synthRecording.js] [playRecording] Playback finished.");
            return;
        }
    } else {
        let event = recordingData[currentIndex];
        let delay = event.timestamp - (Date.now() - startTime);
        delay = delay < 0 ? 0 : delay;
        console.log("[DEBUG] [processMIDIEventsWithTimeout] Delay for event at index", currentIndex, ":", delay);
        let timeoutId = setTimeout(() => {
            handleMIDIMessage(event.midiMessage, event.synthSettings);
            processMIDIEventsWithTimeout(currentIndex + 1);
        }, delay);
        timeoutIDs.push(timeoutId);
    }
}

function playFromStart() {
    let currentIndex = 0;

    function processMIDIEvents() {
        let currentTime = Date.now() - startTime;
        console.log("[DEBUG] [processMIDIEvents] Current Time:", currentTime);


        while (currentIndex < recordingData.length && recordingData[currentIndex].timestamp <= currentTime) {
            console.log("[synthRecording.js] [playRecording] Processing MIDI message at index:", currentIndex);
            handleMIDIMessage(recordingData[currentIndex].midiMessage, recordingData[currentIndex].synthSettings);
            currentIndex++;
        }

        if (currentIndex >= recordingData.length) {
            console.log("[synthRecording.js] [playFromStart] End of recording reached.");

            if (isLooping) {
                console.log("[synthRecording.js] [playFromStart] Decided to loop.");
                currentIndex = 0;
                startTime = Date.now();
                scheduledLoopTime = startTime + loopDuration; // Access the global variable without issues
                console.log("[DEBUG] [playFromStart] New Scheduled Loop Time:", new Date(scheduledLoopTime).toISOString());
            } else {
                console.log("[synthRecording.js] [playFromStart] Decided NOT to loop.");
                isPlayingRecording = false;
            }
        } else {
            // Keep processing events until the recording ends
            setTimeout(processMIDIEvents, 10);
        }
    }

    sequencerChannel.onmessage = function(event) {
        console.log("[synthRecording.js] [sequencerChannel.onmessage] Received a message on sequencerChannel:", event.data);
        if (event.data.type === 'beat' && Date.now() >= scheduledLoopTime) {
            console.log("[synthRecording.js] [sequencerChannel.onmessage] Scheduled time for loop reached.");
            // Restart the loop if the current time has passed the scheduled loop time
            isPlayingRecording = true;
            currentIndex = 0;
            scheduledLoopTime += loopDuration;  // Schedule the next loop
            console.log("[DEBUG] [sequencerChannel.onmessage] Next Scheduled Loop Time:", new Date(scheduledLoopTime).toISOString());
        }
    };

    // Start processing events immediately
    processMIDIEvents();
}


function stopPlayback() {
    isPlayingRecording = false;  // Stop the current playback
    clearInterval(playbackInterval);

    // Clear all scheduled timeouts
    timeoutIDs.forEach(id => clearTimeout(id));
    timeoutIDs = [];  // Reset the timeoutIDs array

    console.log("[synthRecording.js] [stopPlayback] Playback stopped at " + new Date().toISOString());
    currentLoopBeat = 1;
    loopStartTimestamp = null;
    console.log("[synthRecording.js] [stopPlayback] Reset loop counters and timestamps.");
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

// Toggle loop functionality
function toggleLoop() {
    isLooping = !isLooping;  // Toggle the boolean value
    console.log("[synthRecording.js] [toggleLoop] isLooping state:", isLooping);
    const loopButton = document.getElementById("loopToggle");
    loopButton.dataset.state = isLooping ? "on" : "off";
    if (isLooping) {
        loopButton.style.backgroundColor = "#A0A0A0";  // Light up the button
    } else {
        loopButton.style.backgroundColor = "";  // Reset the button color
    }
}