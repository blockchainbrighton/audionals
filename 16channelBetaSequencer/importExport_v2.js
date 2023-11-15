// importExport_v2.js

// Assuming liveSequences, sequencerMaster, channels, updateMuteState, setChannelVolume, setActiveSequence, updateUIForSequence, saveCurrentSequence are defined elsewhere

// Function to mark a sequence as "live" when edited
function markSequenceAsLive(seqIndex) {
    if (!liveSequences.includes(seqIndex)) {
        liveSequences.push(seqIndex);
    }
}

function exportSettings() {
    console.log("Live Sequences:", liveSequences);

    let allSequencesSettings = liveSequences.map(seqIndex => {
        const sequence = sequencerMaster.sequences[seqIndex];
        if (!sequence) {
            console.error(`Sequence at index ${seqIndex} is undefined`);
            return null;
        }

        return {
            sequenceName: sequence.sequenceName,
            channels: sequence.channels.map(channel => ({
                triggers: channel.triggers,
                url: channel.url,
                mute: channel.mute
            }))
        };
    }).filter(settings => settings !== null);

    let filename = `Audional_Sequencer_Settings.json`;
    return { settings: JSON.stringify(allSequencesSettings, null, 2), filename: filename };
}

function importSettings(settings) {
    console.log("Importing settings...");

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

        setSequenceName(index, seqSettings.sequenceName);
        seqSettings.channels.forEach((ch, chIndex) => {
            setChannelURL(chIndex, ch.url || "");
            setChannelMute(index, chIndex, ch.mute || false);
            setChannelTriggers(index, chIndex, ch.triggers);
        });
    });

    // Update UI and settings for each channel
    channels.forEach((channel, index) => {
        const channelData = sequencerMaster.sequences[0].channels[index];
        updateMuteState(channel, channelData.mute);
        setChannelVolume(index, 1); // Assuming volume is set to 1 by default
    });

    // Set current sequence to the first one and update UI
    setCurrentSequence(1);
    setActiveSequence(getCurrentSequence());
    updateUIForSequence(getCurrentSequence());
    saveCurrentSequence(getCurrentSequence());

    // Mark all loaded sequences as "live"
    liveSequences = parsedSettings.map((_, index) => index);

    console.log("Import settings completed.");
}

function isValidSequence(seq) {
    return seq && Array.isArray(seq.channels) && typeof seq.sequenceName === 'string';
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