// playback.js

// Import necessary items from recording.js
import { recordingState } from './recording.js';

// DOM elements
const playRecordingButton = document.getElementById('playRecordingButton');

// State variable for playback
let isPlaying = false;

// Function to toggle the playback styles and update button text
export function togglePlayback() {
  if (isPlaying) {
    playRecordingButton.classList.remove('toggled');
    playRecordingButton.innerText = "Play Recording";
  } else {
    playRecordingButton.classList.add('toggled');
    playRecordingButton.innerText = "Playing Recording";
  }
  
  isPlaying = !isPlaying;
}

// Function to play back the recorded actions
export function playbackRecording() {
  if (recordingState.actions.length > 0) {
    // Reset to initial settings or state if applicable
    console.log("Playback started. Implement logic to reset to initial state and play actions.");

    // Playback the recorded actions
    recordingState.actions.forEach(action => {
      setTimeout(() => {
        console.log("Playing back action", action);
        // Simulate action here based on your application's logic
      }, action.actionTimestamp);
    });
  } else {
    console.log("No recorded actions to play back.");
  }
}

// Event listener for the play recording button click
playRecordingButton.addEventListener('click', () => {
  togglePlayback();
  playbackRecording();
});
