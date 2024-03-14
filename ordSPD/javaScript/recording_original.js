// recording.js

// Get reference to the record button
const recordButton = document.getElementById('recordButton');

// Get reference to the tooltip text element
const tooltipText = document.querySelector('.tooltiptext');

// Variables to track the toggle state of the recording and live recording mode
let isRecording = false;
let isLiveRecording = false; // New variable to track live recording state

// Function to update the recording button text based on its state
function updateButtonAndTooltipText() {
  if (isLiveRecording) {
    tooltipText.innerText = "Recording.";
    recordButton.innerText = "Recording"; // Text when live recording
    recordButton.classList.add('live-recording'); // A new class for live recording visual cues
  } else if (isRecording) {
    tooltipText.innerText = "Recording will begin when the first sample is triggered by the user.";
    recordButton.innerText = "Ready to Record"; // Text when ready to record
    recordButton.classList.remove('live-recording');
  } else {
    tooltipText.innerText = "Place SPD in record ready mode to prepare for recording.";
    recordButton.innerText = "Record Live Set"; // Default text
    recordButton.classList.remove('live-recording');
  }
}

// Function to toggle the flashing effect and update button text
function toggleFlashing() {
  if (isRecording) {
    // If already recording, stop flashing and reset button text
    tooltipText.innerText = "Place SPD in record ready mode to prepare for recording.";
    recordButton.classList.remove('toggled');
    recordButton.innerText = "Record Live Set"; // Default text
    isLiveRecording = false; // Reset live recording state
  } else {
    // If not recording, start flashing and update button text
    tooltipText.innerText = "Recording will begin when the first sample is triggered by the user.";
    recordButton.classList.add('toggled');
    recordButton.innerText = "Ready to Record"; // Text when active
  }
  
  // Toggle the recording state
  isRecording = !isRecording;
  // Ensure live recording state is updated
  updateButtonAndTooltipText();
}





// Event listener for the record button click
recordButton.addEventListener('click', toggleFlashing);

// Get reference to the play recording button
const playRecordingButton = document.getElementById('playRecordingButton');

// Variable to track the toggle state of the playback
let isPlaying = false;



let recordingState = {
  isRecording: false,
  startTime: null,
  actions: [],
  initialSettings: {}
};


function startRecording() {
  // Clear previous recording data
  window.recordingData = [];

  // Capture the initial state of the global settings
  window.recordingData.push({
      type: 'initialState',
      timestamp: Date.now(),
      settings: JSON.parse(JSON.stringify(window.iframeSettings)) // Deep copy
  });

  console.log("Recording started");
}



function stopRecording() {
  recordingState.isRecording = false;
  console.log("Recording stopped. Recorded actions:", recordingState.actions);
}






// Function to toggle the playback styles and update button text
function togglePlayback() {
  if (isPlaying) {
    // If already playing, remove toggled class and reset button text
    playRecordingButton.classList.remove('toggled');
    playRecordingButton.innerText = "Play Recording"; // Default text
  } else {
    // If not playing, add toggled class and update button text
    playRecordingButton.classList.add('toggled');
    playRecordingButton.innerText = "Playing Recording"; // Text when active
  }
  
  // Toggle the playing state
  isPlaying = !isPlaying;
}

// Event listener for the play recording button click
playRecordingButton.addEventListener('click', togglePlayback);


function playbackRecording() {
  // Reset to the initial state
  window.iframeSettings = window.recordingData.find(d => d.type === 'initialState').settings;

  // Playback actions
  window.recordingData.filter(d => d.type === 'action').forEach(action => {
      setTimeout(() => {
          // Simulate action. Implementation depends on action type.
          // This might involve posting messages to iframes or adjusting settings.
          console.log("Playing back action", action);
          // Example for playAudio action
          if (action.action.type === 'playAudio') {
              // Simulate the play audio action
          }
      }, action.timestamp - window.recordingData[0].timestamp);
  });

  console.log("Playback started");
}

function simulateAction(action) {
  // Depending on the action type, simulate the user interaction or postMessage to iframe
  // This is a placeholder function and needs to be implemented based on your application's specifics
  console.log(`Simulating action: ${action.type}`, action.details);
}

// Example function that handles post messages from iframes
function handleIframePostMessage(action, iframeId) {
  // Example action object {type: 'playAudio', details: {...}}
  window.recordingData.push({
      type: 'action',
      timestamp: Date.now(),
      iframeId: iframeId,
      action: action
  });

  console.log("Action recorded", action);
}



// recordPlaybackListeners.js

// import { recordingState, startRecording, stopRecording, playRecording } from './recording.js';

// Listen for messages from iframes
window.addEventListener('message', function(event) {

    // Only record messages if recording is active
    if (!recordingState.isRecording) return;
    
   // Debug log to confirm message receipt
   console.log('Message received from iframe:', event);
 
   // Check the origin of the message to ensure it's from a trusted source
   // Assuming 'http://127.0.0.1:5500' for development. Adjust as necessary for production.
   if (event.origin !== "http://127.0.0.1:5500") {
       console.error('Message origin mismatch:', event.origin);
       return;
   }
 
   try {
       // Correcting the destructuring based on actual message structure
       const actionTimestamp = Date.now() - recordingState.startTime;
     const { action, ob1Number, sampleName, timestamp } = event.data;
 
     // Record the action
     recordingState.actions.push({
         type: 'iframeAction',
         details: { action, ob1Number, sampleName, timestamp },
         actionTimestamp
     });
 
     console.log(`Action recorded: ${action}`);
 
   } catch (error) {
       // Log any errors that occur during message processing
       console.error('Error processing message:', error);
   }
 });
 
 
 document.getElementById('recordButton').addEventListener('click', () => {
   if (recordingState.isRecording) {
       stopRecording();
   } else {
       startRecording();
   }
 });
 
 document.getElementById('playRecordingButton').addEventListener('click', playbackRecording);
 