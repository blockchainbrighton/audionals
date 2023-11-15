// updateSequenceDataMaster_v2.js

let totalSequenceCount = 16;
let currentSequence = 1; 
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



const EMPTY_CHANNEL = {
    "url": "",
    "mute": false,
    "triggers": []
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
 * Initializes the data structures for sequences and channels.
 */
function initializeData(totalSequences, totalChannels) {
    for (let i = 0; i < totalSequences; i++) {
        sequencerMaster.sequences.push({ sequenceName: `Sequence ${i + 1}`, channels: [] });
        channelURLs.push(new Array(totalChannels).fill(''));
        channelMutes.push(new Array(totalChannels).fill(false));
        channelSettings.push(new Array(totalChannels).fill([])); // Assuming each channel has an array of settings
        sequenceBPMs.push(120); // Default BPM
    }
}

/**
 * Centralized function to update sequence data.
 * @param {Object} params - Parameters for updating sequence data.
 * @param {number} [params.sequenceIndex] - The index of the sequence.
 * @param {string} [params.sequenceName] - The name of the sequence.
 * @param {number} [params.bpm] - Beats per minute for the sequence.
 * @param {number} [params.channelIndex] - The index of the channel.
 * @param {string} [params.url] - URL for the channel's audio sample.
 * @param {boolean} [params.muteState] - Mute state for the channel.
 * @param {Array} [params.stepSettings] - An array of step button states for the channel.
 */

function updateSequenceData(params) {
    console.log("[updateSequenceDataMaster_v2 - updateSequenceData] sequenceIndex:", params.sequenceIndex, "currentSequence:", currentSequence);

    // Validate sequenceIndex
    if (params.sequenceIndex === undefined || params.sequenceIndex < 0 || params.sequenceIndex >= sequencerMaster.sequences.length) {
        console.error(`Invalid sequenceIndex: ${params.sequenceIndex}`);
        return;
    }

    let sequence = sequencerMaster.sequences[params.sequenceIndex];
    console.log("Accessed sequence:", sequence);

    // Update sequence-level settings
    if (params.sequenceName) {
        sequence.sequenceName = params.sequenceName;
        console.log(`Sequence name updated to: ${sequence.sequenceName}`);
    }
    if (params.bpm) {
        sequencerMaster.bpm = params.bpm; // Update global BPM
        console.log(`Global BPM updated to: ${sequencerMaster.bpm}`);
    }

    // Validate and update channel-level settings
    if (params.channelIndex !== undefined) {
        if (params.channelIndex < 0 || params.channelIndex >= sequence.channels.length) {
            console.error(`Invalid channelIndex: ${params.channelIndex}`);
            return;
        }

        let channel = sequence.channels[params.channelIndex];
        console.log("Accessed channel:", channel);

        if (params.url) {
            sequencerMaster.audioURLs[params.channelIndex] = params.url; // Update global audio URL
            console.log(`Global audio URL for channel ${params.channelIndex} updated to: ${sequencerMaster.audioURLs[params.channelIndex]}`);
        }
        if (params.muteState !== undefined) {
            channel.mute = params.muteState;
            console.log(`Channel ${params.channelIndex} mute state updated to: ${channel.mute}`);
        }
        if (params.stepSettings) {
            channel.triggers = params.stepSettings;
            console.log(`Channel ${params.channelIndex} step settings updated`);
        }
    }
}




// Example usage
initializeData(16, 16); // Initialize data for 16 sequences and 64 channels



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