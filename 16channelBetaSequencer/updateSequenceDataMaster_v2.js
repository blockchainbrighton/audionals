// updateSequenceDataMaster_v2.js

let totalSequenceCount = 16;
let currentSequence = 1; 
let channelURLs = [];
let channelMutes = [];
let channelSettings = [];
let sequenceBPMs = [];
let sequenceCount = 1;
const collectedURLs = Array(16).fill(''); 

const sequenceLength = 64;
const maxSequenceCount = 64; // sequences
const allSequencesLength = 4096;

let newJsonImport = false;
let liveSequences = [];  // New array to keep track of "live" sequences

// New top-level structure
let sequencerMaster = {
    projectName: 'Default Project', // Default project name
    bpm: 105, // Default BPM
    audioURLs: new Array(16).fill(''), // Initialize with empty URLs
    sequences: createArray(totalSequenceCount).map(() => ({
        channels: createArray(16).map(() => ({
            mute: false,
            triggers: createArray(64, false)
        }))
    }))
};

let collectedURLsForSequences = Array(sequencerMaster.sequences.length).fill().map(() => []);

// Utility function to create an array with a default value
function createArray(length, defaultValue) {
    return Array(length).fill(defaultValue);
}

// Function to get the current sequence
function getCurrentSequence() {
    return currentSequence;
}

// Function to set the current sequence
function setCurrentSequence(sequenceIndex) {
    if (sequenceIndex < 1 || sequenceIndex > totalSequenceCount) {
        console.error(`Invalid sequenceIndex: ${sequenceIndex}`);
        return;
    }
    currentSequence = sequenceIndex;
}

/**
 * Updates the name of a sequence.
 * @param {number} sequenceIndex - Index of the sequence.
 * @param {string} sequenceName - New name for the sequence.
 */
function updateSequenceName(sequenceIndex, sequenceName) {
    if (sequenceIndex < 0 || sequenceIndex >= sequencerMaster.sequences.length) {
        console.error(`Invalid sequenceIndex: ${sequenceIndex}`);
        return;
    }
    sequencerMaster.sequences[sequenceIndex].sequenceName = sequenceName;
}

/**
 * Updates the global BPM.
 * @param {number} bpm - New BPM value.
 */
function updateGlobalBPM(bpm) {
    sequencerMaster.bpm = bpm;
}

/**
 * Updates the URL for a specific channel.
 * @param {number} channelIndex - Index of the channel.
 * @param {string} url - New URL for the channel's audio sample.
 */
function updateChannelURL(channelIndex, url) {
    if (channelIndex < 0 || channelIndex >= sequencerMaster.audioURLs.length) {
        console.error(`Invalid channelIndex: ${channelIndex}`);
        return;
    }
    sequencerMaster.audioURLs[channelIndex] = url;
}

/**
 * Updates the mute state for a specific channel.
 * @param {number} sequenceIndex - Index of the sequence.
 * @param {number} channelIndex - Index of the channel.
 * @param {boolean} muteState - New mute state for the channel.
 */
function updateChannelMute(sequenceIndex, channelIndex, muteState) {
    if (sequenceIndex < 0 || sequenceIndex >= sequencerMaster.sequences.length ||
        channelIndex < 0 || channelIndex >= sequencerMaster.sequences[sequenceIndex].channels.length) {
        console.error(`Invalid sequenceIndex or channelIndex: ${sequenceIndex}, ${channelIndex}`);
        return;
    }
    sequencerMaster.sequences[sequenceIndex].channels[channelIndex].mute = muteState;
}

/**
 * Updates the trigger settings for a specific channel.
 * @param {number} sequenceIndex - Index of the sequence.
 * @param {number} channelIndex - Index of the channel.
 * @param {Array} stepSettings - New trigger settings for the channel.
 */
function updateChannelTriggers(sequenceIndex, channelIndex, stepSettings) {
    if (sequenceIndex < 0 || sequenceIndex >= sequencerMaster.sequences.length ||
        channelIndex < 0 || channelIndex >= sequencerMaster.sequences[sequenceIndex].channels.length) {
        console.error(`Invalid sequenceIndex or channelIndex: ${sequenceIndex}, ${channelIndex}`);
        return;
    }
    sequencerMaster.sequences[sequenceIndex].channels[channelIndex].triggers = stepSettings;
}

// Example usage of the new functions
setCurrentSequence(2); 
console.log(`Current sequence set to: ${getCurrentSequence()}`);

updateSequenceName(1, 'My New Sequence');
console.log(`Sequence name for sequence 2 updated to: ${sequencerMaster.sequences[1].sequenceName}`);

updateGlobalBPM(120);
console.log(`Global BPM updated to: ${sequencerMaster.bpm}`);

updateChannelURL(3, 'http://newurl.com/sample.mp3');
console.log(`URL for channel 4 updated to: ${sequencerMaster.audioURLs[3]}`);

updateChannelMute(1, 3, true);
console.log(`Mute state for channel 4 in sequence 2 updated to: ${sequencerMaster.sequences[1].channels[3].mute}`);

updateChannelTriggers(1, 3, createArray(64, true));
console.log(`Trigger settings for channel 4 in sequence 2 updated`);


//    TEMPLATE
//    SequencerMaster
//    │
//    ├── projectName: "Default Project"
//    ├── bpm: 120
//    ├── audioURLs: [url1, url2, ..., url16]
//    │
//    └── sequences: Array[16] 
//        ├── Sequence 1: Array[16]
//        │   ├── Channel 1: { triggers: [true, false, ...], channelName: "Channel 1" }
//        │   ├── Channel 2: { triggers: [false, true, ...], channelName: "Channel 2" }
//        │   ...
//        │   └── Channel 16: { triggers: [false, false, ...], channelName: "Channel 16" }
//        ├── Sequence 2: Array[16]
//        │   ...
//        └── Sequence 16: Array[16]
//    