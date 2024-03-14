// recordPlaybackEventListeners.js

// Import necessary functions and state from recording.js
import { recordingState, recordAction, toggleFlashing, updateButtonAndTooltipText } from './recording.js';
import { playbackRecording } from './playback.js';

// Ensure the record button is correctly referenced if needed
const recordButton = document.getElementById('recordButton');

// Function to handle incoming post messages
function handleMessage(event) {
    // Detailed log for debugging
    console.log('Received message:', event.data);

    // Check message origin for security
    if (event.origin !== "http://127.0.0.1:5500") {
        console.error('Message origin mismatch:', event.origin);
        return;
    }

    try {
        const { action, ob1Number, sampleName, timestamp } = event.data;

        console.log(`Processing action: ${action}`);

        // Handling 'playAudioBuffer' action
        if (action === 'playAudioBuffer') {
            console.log(`'playAudioBuffer' action detected for sample "${sampleName}" (OB1 Number: ${ob1Number}), timestamp: ${timestamp}`);

            // Check recording state before proceeding
            if (!recordingState.isLiveRecording) {
                if (!recordingState.isRecording) {
                    toggleFlashing(); // Adjusts UI to "ready to record" mode if not already set
                    console.log('Toggled to ready to record due to playAudioBuffer action.');
                }

                // Update state to indicate live recording has started
                recordingState.isLiveRecording = true;
                console.log('Live recording mode activated.');

                // Record the action
                recordAction({
                    action: 'playAudioBuffer',
                    ob1Number: ob1Number,
                    sampleName: sampleName,
                    timestamp: timestamp
                });

                // Reflect UI changes for "live recording" mode
                recordButton.classList.remove('toggled'); // Remove "ready to record" indication
                recordButton.classList.add('live-recording'); // Indicate live recording
                updateButtonAndTooltipText(); // Update button text and tooltip accordingly
            } else {
                // If already in live recording mode, just log the action
                recordAction({
                    action: 'playAudioBuffer',
                    ob1Number: ob1Number,
                    sampleName: sampleName,
                    timestamp: timestamp
                });
            }
        }
    } catch (error) {
        console.error('Error processing message:', error);
    }
}

// Listen for messages from iframes
window.addEventListener('message', handleMessage);

// Attach event listener to the record button for toggling between ready and off modes
recordButton.addEventListener('click', () => {
    toggleFlashing();
    console.log(`Record button clicked. Current state - isRecording: ${recordingState.isRecording}, isLiveRecording: ${recordingState.isLiveRecording}`);
});

// Attach event listener to the play recording button for playback functionality
document.getElementById('playRecordingButton').addEventListener('click', () => {
    playbackRecording();
    console.log('Playback initiated.');
});
