// sequenceManager.js

let newJsonImport = false;
let sequences = createArray(totalSequenceCount, createArray(16, createArray(64, false)));
let liveSequences = [];  // Array to keep track of "live" sequences

// Global variable for master BPM
let masterBPM = 105; // Default value

let collectedURLsForSequences = Array(sequences.length).fill().map(() => []);

// Function to mark a sequence as "live" when edited
function markSequenceAsLive(seqIndex) {
    if (!liveSequences.includes(seqIndex)) {
        liveSequences.push(seqIndex);
        console.log('[sequenceManager.js] markSequenceAsLive: Marking sequence as live', seqIndex);
    } else {
        console.log('[sequenceManager.js] markSequenceAsLive: Sequence already marked as live', seqIndex);
    }
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
