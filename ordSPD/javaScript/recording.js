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
    console.log('Attempting to record action:', actionDetails);
  
    if (!recordingState.isLiveRecording) {
      console.log('Aborting action recording; not in live recording mode.');
      return; // Only record if we're actively recording
    }
  
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
    if (!recordingState.isLiveRecording) {
      recordingState.isRecording = true;
      recordingState.isLiveRecording = true;
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
    recordingState.isLiveRecording = false;
    updateButtonAndTooltipText();
    // Consider removing event listeners here if they are no longer needed after stopping recording
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
export { recordingState, toggleFlashing, startRecording, stopRecording, recordAction, updateButtonAndTooltipText };