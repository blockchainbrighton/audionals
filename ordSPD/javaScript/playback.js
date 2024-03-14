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
      console.log("Playback started. Implement logic to reset to initial state and play actions.");

      // Sort actions by timestamp to ensure correct sequence
      const sortedActions = [...recordingState.actions].sort((a, b) => a.timestamp - b.timestamp);
      const firstActionTime = sortedActions[0].timestamp; // Reference time (time zero)

      sortedActions.forEach(action => {
        const relativeDelay = action.timestamp - firstActionTime; // Calculate delay relative to the first action
        const iframeId = Object.keys(window.iframeSettings).find(id => window.iframeSettings[id].url === action.url);

        if (iframeId) {
          setTimeout(() => { // Schedule playback with calculated delay
            const iframe = document.getElementById(iframeId);
            if (iframe) {
              const message = { type: 'playLoop', data: { sampleName: action.sampleName } };
              const origin = iframe.src; // Directly use iframe's src for origin
              iframe.contentWindow.postMessage(message, "*");
              console.log(`Playing back action in iframe ${iframeId} after delay ${relativeDelay}ms:`, message);
            } else {
              console.warn("Iframe not found for ID:", iframeId);
            }
          }, relativeDelay);
        } else {
          console.warn("No matching iframe settings for URL:", action.url);
        }
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
  
  