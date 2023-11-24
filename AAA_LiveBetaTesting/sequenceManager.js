// sequenceManager.js

// Assuming the existence of necessary utility functions like createArray
let totalSequenceCount = 1;
let channelURLs = Array(16).fill('');
let sequences = createArray(totalSequenceCount, createArray(16, createArray(64, false)));
let channelSettings = createArray(16, [null].concat(createArray(64, false)));

let newJsonImport = false;

let masterBPM = 105; // Default value for master BPM
let liveSequences = [];  // Array to keep track of "live" sequences

// Function to mark a sequence as "live" when edited
function markSequenceAsLive(seqIndex) {
    if (!liveSequences.includes(seqIndex)) {
        liveSequences.push(seqIndex);
        console.log('[sequenceManager.js] markSequenceAsLive: Marking sequence as live', seqIndex);
    } else {
        console.log('[sequenceManager.js] markSequenceAsLive: Sequence already marked as live', seqIndex);
    }
}

// Function to update the URL for a specific channel in a specific sequence
function updateChannelURL(sequenceIndex, channelIndex, url) {
    channelURLs[sequenceIndex][channelIndex] = url;
    console.log(`Updated URL for sequence ${sequenceIndex + 1}, channel ${channelIndex + 1}:`, url);
}

// Function to add URLs to our structure
function addURLsToSequenceArrays(urls) {
    urls.forEach((url, index) => {
        channelURLs[currentSequence - 1][index] = url;
    });
    console.log("Updated channelURLs:", channelURLs);
}

// Function to get the current settings for a specific channel
function getChannelSettings(channelIndex) {
    return channelSettings[channelIndex];
}

// Function to set the settings for a specific channel
function setChannelSettings(channelIndex, settings) {
    channelSettings[channelIndex] = settings;
    console.log(`Settings set for Channel-${channelIndex + 1}:`, channelSettings[channelIndex]);
}

// Function to update channel settings for a sequence
function updateChannelSettingsForSequence() {
    // Implementation depends on how sequenceData is structured and updated
    // Example:
    // updateSequenceData((sequenceData) => {
    //     sequenceData.channels.forEach((channel, index) => {
    //         channel.triggers.forEach(trigger => {
    //             channelSettings[index][trigger] = true;
    //         });
    //     });
    // });
}


// Function to convert channel settings to step settings
function convertSequenceSettings(settings) {
    if (!settings || !Array.isArray(settings.channels)) {
        console.error("convertSequenceSettings: Invalid settings provided", settings);
        return [];
    }

    let channels = settings.channels;
    if (channels.length < 16) {
        let emptyChannelsToAdd = 16 - channels.length;
        for (let i = 0; i < emptyChannelsToAdd; i++) {
            channels.push(EMPTY_CHANNEL);
        }
        console.log("convertSequenceSettings: Added empty channels to sequence", channels);
    }

    return channels.map((ch, index) => {
        if (!ch) {
            console.error(`convertSequenceSettings: Channel ${index} is undefined or null`);
            return Array(64).fill(false);
        }

        let convertedChannel = convertChannelToStepSettings(ch);
        console.log(`convertSequenceSettings: Converted channel ${index}`, convertedChannel);
        console.log("[sequenceManager.js]{settingsDataChecks} Sequence 1 settings after conversion:", sequences[0]);
        return convertedChannel;
    });
}


function convertChannelToStepSettings(channel) {
    if (!channel || !Array.isArray(channel.triggers)) {
        console.error("convertChannelToStepSettings: Invalid channel data", channel);
        return Array(64).fill(false);
    }

    let stepSettings = Array(64).fill(false);

    channel.triggers.forEach(i => {
        if (typeof i === 'number' && i >= 0 && i < 64) {
            stepSettings[i] = true;
        } else {
            console.error(`convertChannelToStepSettings: Invalid trigger index ${i} for channel`, channel);
        }
    });

    console.log("convertChannelToStepSettings: Processed step settings for channel", stepSettings);
    return stepSettings;
}

// Additional helper functions or data related to sequences can go here
function isValidSequence(seq) {
    const isValid = seq && Array.isArray(seq.channels) && typeof seq.name === 'string';
    return isValid;
}
