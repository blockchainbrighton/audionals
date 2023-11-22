// sequenceManager.js

let liveSequences = [];  // New array to keep track of "live" sequences
let sequenceBPMs = Array(totalSequenceCount).fill(105);  // Initialize with 105 BPM for all sequences
let collectedURLsForSequences = Array(sequences.length).fill().map(() => []);

// Function to mark a sequence as "live" when edited
function markSequenceAsLive(seqIndex) {
    if (!liveSequences.includes(seqIndex)) {
        liveSequences.push(seqIndex);
    }
}

// Function to convert sequence settings to channel settings
function convertSequenceSettings(settings) {
    let channels = settings.channels;
    if (channels.length < 16) {
        let emptyChannelsToAdd = 16 - channels.length;
        for (let i = 0; i < emptyChannelsToAdd; i++) {
            channels.push(EMPTY_CHANNEL);
        }
    }
    return channels.map(ch => {
        let convertedChannel = convertChannelToStepSettings(ch);
        return convertedChannel;
    });
}

// Function to convert channel settings to step settings
function convertChannelToStepSettings(channel) {
    let stepSettings = [channel.url].concat(Array(64).fill(false)); 
    channel.triggers.forEach(i => {
        stepSettings[i] = true;
    });
    return stepSettings;
}

// Additional helper functions or data related to sequences can go here
