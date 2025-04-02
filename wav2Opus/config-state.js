// config-state.js

// State variables - these will be accessed and modified globally by other modules
let ffmpeg = null;
let selectedFile = null;
let fileDuration = null;
let convertedAudioBlob = null;
let base64String = null;
let originalAudioUrl = null;
let originalAudioElement = null; // Reference to the <audio> element for the original file

// Initial quality values (could be considered config)
const initialMp3Quality = 4; // Example default, adjust as needed
const initialOpusBitrate = 64; // Example default, adjust as needed