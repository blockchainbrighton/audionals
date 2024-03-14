// recordPlaybackEventListeners.js

// Import necessary functions and state from recording.js
import { recordingState, startRecording, toggleFlashing, updateButtonAndTooltipText } from './recording.js';
import { playbackRecording } from './playback.js';

// Ensure the record button is correctly referenced if needed
const recordButton = document.getElementById('recordButton');

// Listen for messages from iframes
window.addEventListener('message', function(event) {
    // Check message origin for security
    if (event.origin !== "http://127.0.0.1:5500") {
        console.error('Message origin mismatch:', event.origin);
        return;
    }

    try {
        const { action, ob1Number, sampleName, timestamp } = event.data;

        // Check for the 'playAudioBuffer' action to start recording
        if (action === 'playAudioBuffer') {
            // Ensure we're not already in live recording mode before proceeding
            if (!recordingState.isLiveRecording) {
                // If the system isn't already recording, update the state and UI
                if (!recordingState.isRecording) {
                    // If the system isn't in "ready to record" mode, toggle it to be ready
                    toggleFlashing(); // Adjusts the state to be ready to record
                }
                // Transition to live recording mode
                recordingState.isLiveRecording = true;
                startRecording(); // Start the recording process

                // Reflect UI changes for "live recording" mode
                recordButton.classList.remove('toggled'); // Remove if it was in "ready to record" mode
                recordButton.classList.add('live-recording'); // Indicate live recording mode
                updateButtonAndTooltipText(); // Update button text and tooltip
            }
            // Log or handle the received 'playAudioBuffer' action as needed
            console.log(`Received playAudioBuffer action for sample "${sampleName}" (OB1 Number: ${ob1Number}) at timestamp: ${timestamp}.`);
        }

        // Additional message handling as required...

    } catch (error) {
        console.error('Error processing message:', error);
    }
});

// Attach event listener to the record button for toggling between ready and off modes
recordButton.addEventListener('click', toggleFlashing);

// Attach event listener to the play recording button for playback functionality
document.getElementById('playRecordingButton').addEventListener('click', playbackRecording);
