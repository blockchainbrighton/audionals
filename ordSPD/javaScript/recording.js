// recording.js

// DOM elements
const recordButton = document.getElementById('recordButton');
const tooltipText = document.querySelector('.tooltiptext');

// Unified recording state object
const recordingState = {
  isRecording: false,
  isLiveRecording: false,
  startTime: null,
  actions: [],
  initialSettings: {}
};

// Function to update the recording button text based on its state
function updateButtonAndTooltipText() {
  if (recordingState.isLiveRecording) {
    tooltipText.innerText = "Recording.";
    recordButton.innerText = "Recording";
    recordButton.classList.add('live-recording');
    recordButton.classList.remove('toggled');
  } else if (recordingState.isRecording) {
    tooltipText.innerText = "Recording will begin when the first sample is triggered by the user.";
    recordButton.innerText = "Ready to Record";
    recordButton.classList.add('toggled');
    recordButton.classList.remove('live-recording');
  } else {
    tooltipText.innerText = "Place SPD in record ready mode to prepare for recording.";
    recordButton.innerText = "Record Live Set";
    recordButton.classList.remove('toggled', 'live-recording');
  }
}

// Adjust startRecording to only start when actual recording should start
function startRecording() {
  if (!recordingState.isLiveRecording) {
    recordingState.isRecording = true;
    recordingState.isLiveRecording = true;
    recordingState.startTime = Date.now();
    recordingState.actions = [];
    updateButtonAndTooltipText();
    console.log("Recording started");
  }
}

// Function to stop recording
function stopRecording() {
  recordingState.isRecording = false;
  recordingState.isLiveRecording = false;
  updateButtonAndTooltipText();
  console.log("Recording stopped. Recorded actions:", recordingState.actions);
}

// Modify toggleFlashing to handle transitions correctly
function toggleFlashing() {
  if (recordingState.isRecording || recordingState.isLiveRecording) {
    // This stops recording and goes back to the initial "off" state directly
    stopRecording();
  } else {
    // Enter "record ready" mode
    recordingState.isRecording = true;
    updateButtonAndTooltipText();
  }
}

// Export functions and unified state for use in other modules
export { recordingState, toggleFlashing, startRecording, stopRecording, updateButtonAndTooltipText };
