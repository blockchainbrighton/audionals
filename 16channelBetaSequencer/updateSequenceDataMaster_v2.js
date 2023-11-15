// updateSequenceDataMaster_v2.js

let totalSequenceCount = 64;
let currentSequence = 1; 


let sequences = createArray(totalSequenceCount).map((_, index) => {
    return {
        sequenceName: `Sequence ${index + 1}`,
        channels: createArray(16).map(() => ({
            url: '',
            mute: false,
            triggers: createArray(64, false)
        }))
    };
});

// For the first sequence, add additional properties
sequences[0].bpm = 105; // Default BPM
sequences[0].projectName = 'Default Project'; // Default project name

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

let collectedURLsForSequences = Array(sequences.length).fill().map(() => []);




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
        sequences.push({ sequenceName: `Sequence ${i + 1}`, channels: [] });
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
    // Validate sequenceIndex
    if (params.sequenceIndex === undefined || params.sequenceIndex < 0 || params.sequenceIndex >= sequences.length) {
        console.error(`Invalid or missing sequenceIndex: ${params.sequenceIndex}`);
        return;
    }

    // Update sequence-level settings
    if (params.sequenceName) {
        sequences[params.sequenceIndex].sequenceName = params.sequenceName;
    }
    if (params.bpm) {
        sequenceBPMs[params.sequenceIndex] = params.bpm;
    }

    // Validate and update channel-level settings
    if (params.channelIndex !== undefined) {
        if (params.channelIndex < 0 || params.channelIndex >= channelURLs[params.sequenceIndex].length) {
            console.error(`Invalid channelIndex: ${params.channelIndex}`);
            return;
        }

        if (params.url) {
            channelURLs[params.sequenceIndex][params.channelIndex] = params.url;
        }
        if (params.muteState !== undefined) {
            channelMutes[params.channelIndex] = params.muteState;
        }
        if (params.stepSettings) {
            channelSettings[params.channelIndex] = params.stepSettings;
        }
    }
}

// Export functions if using modules
// module.exports = { initializeData, updateSequenceData };

// Example usage
initializeData(16, 64); // Initialize data for 16 sequences and 64 channels
