// recordPlaybackEventListeners.js

// Import necessary functions and state from recording.js
import { recordingState, recordAction, toggleFlashing, updateButtonAndTooltipText } from './recording.js';
import { playbackRecording } from './playback.js';

// Ensure the record button is correctly referenced if needed
const recordButton = document.getElementById('recordButton');

// Function to handle incoming post messages
function handleMessage(event) {
    // // Implement origin check for security
    // if (event.origin !== "http://127.0.0.1:5500") {
    //     console.error('Message origin mismatch:', event.origin);
    //     return;
    // }

    try {
        const { action, ob1Number, sampleName, timestamp } = event.data;
        if (action === 'playAudioBuffer' && !recordingState.isRecording) {
            // Log only when action is playAudioBuffer and not recording
            console.log(`Received: ${action}, Sample: "${sampleName}", OB1: ${ob1Number}, Timestamp: ${timestamp}`);
            
            // Record the action
            recordAction({ action, ob1Number, sampleName, timestamp });
        } else if (action !== 'playAudioBuffer') {
            console.log(`Unrecognized action '${action}'.`);
        }
    } catch (error) {
        console.error('Error processing message:', error);
    }
}

// Setup message event listener once
if (!window.messageListenerAdded) {
    window.addEventListener('message', handleMessage);
    window.messageListenerAdded = true;
}

// Toggle recording state and UI updates
recordButton.addEventListener('click', () => {
    toggleFlashing();
    // Assuming refreshAllIframes is defined elsewhere and relevant here
    if (recordingState.isRecording) console.log('Refreshing all iframes.');
    updateButtonAndTooltipText(); // Ensure UI reflects current state accurately
    console.log(`Record button clicked. Recording state: ${recordingState.isRecording}`);
});

// Setup playback functionality
document.getElementById('playRecordingButton').addEventListener('click', () => {
    playbackRecording();
    console.log('Playback initiated.');
});