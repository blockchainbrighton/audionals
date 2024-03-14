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





function startRecordingProcess(details) {
    isLiveRecording = true; // Transition to live recording mode
    updateButtonAndTooltipText();

    // Logic to start recording, using details for logging or processing
    console.log("Recording started for:", details);
    // Additional code to handle recording based on the instrument/sample played
}
// Event listener for the record button click
recordButton.addEventListener('click', toggleFlashing);

// Get reference to the play recording button
const playRecordingButton = document.getElementById('playRecordingButton');

// Variable to track the toggle state of the playback
let isPlaying = false;

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


// Listen for messages from iframes
window.addEventListener('message', function(event) {
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
      const { action, ob1Number, sampleName, timestamp } = event.data;

      if (action === "playAudioBuffer") {
          console.log(`Action: ${action}, OB1 Number: ${ob1Number}, Sample Name: ${sampleName}, Timestamp: ${timestamp}`);
          // Proceed to handle the action as intended
          startRecordingProcess({ ob1Number, sampleName, timestamp });
      } else {
          // Log a warning if the action is not recognized
          console.warn('Unrecognized action:', action);
      }
  } catch (error) {
      // Log any errors that occur during message processing
      console.error('Error processing message:', error);
  }
});

