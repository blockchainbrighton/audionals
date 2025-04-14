// config-state.js

// State variables - these will be accessed and modified globally by other modules
let ffmpeg = null;
let selectedFile = null;
let fileDuration = null;
let convertedAudioBlob = null;
let base64String = null;
let originalAudioUrl = null;
let originalAudioElement = null; // Reference to the <audio> element for the original file

// Initial quality/bitrate values (could be considered config)
const initialMp3Quality = 4; // VBR quality setting (0-9, FFmpeg -q:a maps 9=worst to 0=best)
const initialOpusBitrate = 96; // kbps (Used for Opus and WebM output)

// Removed initialCafBitrate
// const initialCafBitrate = 128;