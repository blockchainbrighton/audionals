// sequencerSettingsJsonFormatMaster.js

// Define the global settings for the song
var globalSettings = {
    songTitle: "", // Title of the song
    bpm: 120, // Beats per minute
    sampleUrls: new Array(16).fill(""), // URLs for the 16 audio samples
};

// Define the format for channel settings in a sequence
var channelSettingsFormat = {
    steps: new Array(64).fill(false), // Step sequence (e.g., 16 steps, true for active, false for inactive)
    // ... other channel-specific settings if needed
};

// Define the format for a sequence
var sequenceFormat = {
    channels: new Array(16).fill(null).map(() => JSON.parse(JSON.stringify(channelSettingsFormat))),
    // ... other sequence-specific settings if needed
};

// Function to create a new sequence with default channel settings
function createNewSequence() {
    return JSON.parse(JSON.stringify(sequenceFormat));
}

// Function to validate the global settings format
function validateGlobalSettings(settings) {
    // Implement validation logic here for global settings
    // Return true if valid, false otherwise
}

// Function to validate a sequence's format
function validateSequenceFormat(sequence) {
    // Implement validation logic here for sequence format
    // Return true if valid, false otherwise
}