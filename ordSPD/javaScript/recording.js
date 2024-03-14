// recording.js
import { refreshAllIframes } from "./IframeManager.js";

// DOM elements
const recordButton = document.getElementById('recordButton');
const tooltipText = document.querySelector('.tooltiptext');

// Add this to your recordingState object
let recordingState = {
  isRecording: false,
  isRecordReady: false, // New flag for "record ready" mode
  isPlaybackActive: false,
  startTime: null,
  actions: [],
  initialSettings: {}
};


// Function to update the recording button text based on its state
function updateButtonAndTooltipText() {
  if (recordingState.isRecording) {
    tooltipText.innerText = "Recording.";
    recordButton.innerText = "Recording";
    recordButton.classList.add('recording');
  } else if (recordingState.isRecordReady) {
    tooltipText.innerText = "Recording will begin when the first sample is triggered by the user.";
    recordButton.innerText = "Ready to Record";
    recordButton.classList.add('recordReady');
    recordButton.classList.remove('recording');
  } else if (recordingState.isPlaybackActive) {
    tooltipText.innerText = "Playback mode active. Recording disabled.";
    recordButton.innerText = "Playback Active";
    recordButton.classList.remove('recording');
    recordButton.classList.remove('recordReady');
  } else {
    tooltipText.innerText = "Place SPD in record ready mode to prepare for recording.";
    recordButton.innerText = "Record Live Set";
    recordButton.classList.remove('toggled', 'live-recording');
  }
}

  // Set up listeners for keyboard and mouse events
  function setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      const action = { type: 'keydown', key: e.key, keyCode: e.keyCode, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey };
      recordAction(action);
    });
  
    document.addEventListener('click', (e) => {
      const action = { type: 'click', x: e.clientX, y: e.clientY, button: e.button };
      recordAction(action);
    });
  
    // Example for capturing post messages (adjust as needed)
    window.addEventListener('message', (event) => {
      // Filter messages here as needed
      const action = { type: 'postMessage', data: event.data };
      recordAction(action);
    });
  }

  // Add to recording.js or within recordPlaybackEventListeners.js as appropriate

  function recordAction(actionDetails) {
      // Update state to indicate recording has started
    // recordingState.isRecording = true;
    updateButtonAndTooltipText();
    console.log('Attempting to record action:', actionDetails);
  
    // Append the URL to the action details based on the OB1 number
    const url = ob1NumberToUrlMap[`#${actionDetails.ob1Number}`];
    const actionWithTimestampAndUrl = {
      ...actionDetails,
      url,
      timestamp: Date.now() - recordingState.startTime
    };
  
    recordingState.actions.push(actionWithTimestampAndUrl);
    console.log('Action successfully recorded:', actionWithTimestampAndUrl);
  }
  
  
  // Define the mapping outside of your functions so it's accessible to both recording and playback logic
const ob1NumberToUrlMap = {
    "#1": "https://ordinals.com/content/e7d344ef3098d0889856978c4d2e81ccf2358f7f8b66feecc71e03036c59ad48i0",
    "#2": "https://ordinals.com/content/ef5707e6ecf4d5b6edb4c3a371ca1c57b5d1057c6505ccb5f8bdc8918b0c4d94i0",
    "#3": "https://ordinals.com/content/d030eb3d8bcd68b0ed02b0c67fdb981342eea40b0383814f179a48e76927db93i0",
    "#4": "https://ordinals.com/content/3b7482a832c4f27c32fc1da7cc4249bbbac1cbdfbdb8673079cad0c33486d233i0",
    "#5": "https://ordinals.com/content/5a42d7b2e2fe01e4f31cbad5dd671997f87339d970faaab37f6355c4a2f3be5ai0",
    "#6": "https://ordinals.com/content/ddc1838c1a6a3c45b2c6e19ff278c3b51b0797c3f1339c533370442d23687a68i0",
    "#7": "https://ordinals.com/content/1e3c2571e96729153e4b63e2b561d85aec7bc5ba372d293af469a525dfa3ed59i0",
    "#8": "https://ordinals.com/content/91f52a4ca00bb27383ae149f24b605d75ea99df033a6cbb6de2389455233bf51i0",
    "#9": "https://ordinals.com/content/437868aecce108d49f9b29c2f477987cb5834ffdf639a650335af7f0fdd5e55bi0",
    "#10": "https://ordinals.com/content/3be1f8e37b718f5b9874aecad792504c5822dc8dfc727ad4928594f7725db987i0",
    "#11": "https://ordinals.com/content/1bda678460ef08fb64435b57c9b69fd78fd4556822ccd8e9839b4eb71b3621edi0"
  };
  
  
  
  // Adjust startRecording to set up event listeners
  function startRecording() {
    if (!recordingState.isRecording) {
      recordingState.isRecording = true;
      recordingState.startTime = Date.now();
      recordingState.actions = [];
      updateButtonAndTooltipText();
      setupEventListeners(); // Set up the event listeners upon starting recording
      console.log("Recording started");
    }
  }
  
  // Add any necessary cleanup in stopRecording, such as removing event listeners if required
  function stopRecording() {
    recordingState.isRecording = false;
    updateButtonAndTooltipText();
    refreshAllFrames();
    console.log("Recording stopped. Refreshing All Frames. Recorded actions:", recordingState.actions);
  
    // Record an end-of-recording marker
    const endMarker = {
      type: 'endOfRecording',
      timestamp: Date.now() - recordingState.startTime
    };
    recordingState.actions.push(endMarker);
  
    console.log("Recording stopped. Recorded actions:", recordingState.actions);
  }
  

// Modify toggleFlashing to handle transitions correctly
function toggleFlashing() {

  
  // Toggle "record ready" mode without changing the recording state
  const isRecordReady = recordButton.classList.contains('recordReady');
  if (!isRecordReady) {
    // Entering "record ready" mode
    recordButton.classList.add('recordReady');
    tooltipText.innerText = "Ready to Record";
    recordButton.innerText = "Ready to Record";
  } else {
    // Exiting "record ready" mode
    recordButton.classList.remove('recordReady');
    tooltipText.innerText = "Place SPD in record ready mode to prepare for recording.";
    recordButton.innerText = "Record Live Set";
  }
}



// function muteAllIframes() {
//     const iframes = document.querySelectorAll('iframe');
//     const muteMessage = { type: "muteControl", data: { mute: true } };
  
//     iframes.forEach(iframe => {
//       const origin = new URL(iframe.src).origin; // Get the origin of the iframe for security
//       iframe.contentWindow.postMessage(muteMessage, "*");
//     });
//   }

// Export functions and unified state for use in other modules
export { recordingState, toggleFlashing, startRecording, stopRecording, recordAction, updateButtonAndTooltipText, };
