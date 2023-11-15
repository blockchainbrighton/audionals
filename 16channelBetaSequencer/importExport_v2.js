// importExport.js

let newJsonImport = false;
let liveSequences = [];  // New array to keep track of "live" sequences



const EMPTY_CHANNEL = {
    "url": "",
    "mute": false,
    "triggers": []
};

let sequenceBPMs = Array(totalSequenceCount).fill(105);  // Initialize with 0 BPM for all sequences
let collectedURLsForSequences = Array(sequences.length).fill().map(() => []);



// Function to mark a sequence as "live" when edited
function markSequenceAsLive(seqIndex) {
    if (!liveSequences.includes(seqIndex)) {
        liveSequences.push(seqIndex);
    }
}

// Call this function whenever a sequence is edited
// For example, when a URL is added or a step is toggled
// You need to identify these places in your code and call this function

function exportSettings() {
    console.log("Live Sequences:", liveSequences);
    console.log("All Sequences:", sequences);

    let allSequencesSettings = [];

    for (let seqIndex of liveSequences) {
        const sequence = sequences[seqIndex];
        if (!sequence) {
            console.error(`Sequence at index ${seqIndex} is undefined`);
            continue;
        }

        let settings = {
            sequenceName: sequence.sequenceName,
            channels: sequence.channels.map(channel => ({
                triggers: channel.triggers
            }))
        };

        // Include additional details only for the first sequence
        if (seqIndex === 0) {
            settings.bpm = sequence.bpm;
            settings.channels = settings.channels.map((channel, i) => ({
                ...channel,
                url: sequence.channels[i].url,
                mute: sequence.channels[i].mute
            }));
        }

        allSequencesSettings.push(settings);
    }

    let filename = `Audional_Sequencer_Settings.json`;
    return { settings: JSON.stringify(allSequencesSettings, null, 2), filename: filename };
}




function importSettings(settings) {
    console.log("Importing settings...");

    // Reset sequences and BPMs
    sequences = [];
    sequenceBPMs = Array(totalSequenceCount).fill(105);

    let parsedSettings;
    try {
        parsedSettings = JSON.parse(settings);
        console.log("Parsed settings:", parsedSettings);
    } catch (error) {
        console.error("Error parsing settings:", error);
        return;
    }

    if (!Array.isArray(parsedSettings)) {
        console.error("Imported JSON doesn't match expected format.");
        return;
    }

    parsedSettings.forEach((seqSettings, index) => {
        if (!isValidSequence(seqSettings)) {
            console.error(`Invalid sequence format at index ${index}`);
            return;
        }

        let newSequence = {
            sequenceName: seqSettings.sequenceName,
            channels: seqSettings.channels.map(ch => convertChannelToStepSettings(ch))
        };

        if (index === 0) {
            newSequence.bpm = seqSettings.bpm;
            newSequence.channels = newSequence.channels.map((channel, i) => ({
                ...channel,
                url: seqSettings.channels[i].url || "",
                mute: seqSettings.channels[i].mute || false
            }));
        }

        sequences.push(newSequence);
        sequenceBPMs[index] = seqSettings.bpm || 105;
    });

    // Update UI and settings for each channel
    channels.forEach((channel, index) => {
        updateMuteState(channel, false); // unmute
        setChannelVolume(index, 1); // set volume to 1
        if (sequences.length > 0) {
            const channelData = sequences[0].channels[index];
            if (channelData) {
                updateMuteState(channel, channelData.mute);
                setChannelVolume(index, channelData.volume || 1);
            }
        }
    });

    // Set current sequence to the first one and update UI
    currentSequence = 1;
    setActiveSequence(currentSequence);
    updateUIForSequence(currentSequence);
    saveCurrentSequence(currentSequence);

    // Mark all loaded sequences as "live"
    liveSequences = sequences.map((_, index) => index);

    console.log("Import settings completed.");
}

function isValidSequence(seq) {
    return seq && Array.isArray(seq.channels) && typeof seq.sequenceName === 'string';
}


// Function to mark a sequence as "live" when edited
function markSequenceAsLive(seqIndex) {
    if (!liveSequences.includes(seqIndex)) {
        liveSequences.push(seqIndex);
    }
}

function convertSequenceSettings(settings) {
    let channels = settings.channels;
    if (channels.length < 16) {
        let emptyChannelsToAdd = 16 - channels.length;
        for (let i = 0; i < emptyChannelsToAdd; i++) {
            channels.push(EMPTY_CHANNEL);
        }
        // console.log("Converted channel:", convertedChannel);
    }

    return channels.map(ch => {
        let convertedChannel = convertChannelToStepSettings(ch);
       //  console.log("Converted channel:", convertedChannel);
        return convertedChannel;
    });
}

function convertChannelToStepSettings(channel) {
    let stepSettings = [channel.url].concat(Array(64).fill(false)); // Store the URL at the 0th index

    channel.triggers.forEach(i => {
        stepSettings[i] = true;
    });

    return stepSettings;
}