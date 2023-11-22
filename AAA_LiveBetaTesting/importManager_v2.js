// importManager_v2.js

let newJsonImport = false;

// Function to import settings
function importSettings(settings) {
    console.log("Importing settings...");
    channels.forEach(channel => {
        const channelIndex = parseInt(channel.dataset.id.split('-')[1]) - 1;
        updateMuteState(channel, false); // unmute
        setChannelVolume(channelIndex, 1); // set volume to 1
    });

    let parsedSettings;
    let projectName = "";
    newJsonImport = true;

    try {
        parsedSettings = JSON.parse(settings);
        console.log("Parsed settings:", parsedSettings);
    } catch (error) {
        console.error("Error parsing settings:", error);
        return;
    }

    function importSettings(settings) {
        console.log("Importing settings...");
        channels.forEach(channel => {
            const channelIndex = parseInt(channel.dataset.id.split('-')[1]) - 1;
            updateMuteState(channel, false); // unmute
            setChannelVolume(channelIndex, 1); // set volume to 1
        });
    
        let parsedSettings;
        let projectName = "";
        newJsonImport = true;
    
        try {
            parsedSettings = JSON.parse(settings);
            console.log("Parsed settings:", parsedSettings);
        } catch (error) {
            console.error("Error parsing settings:", error);
            return;
        }
    
        // Determine if the new JSON format is used
        let sequenceData;
        if (parsedSettings.masterSettings && Array.isArray(parsedSettings.sequences)) {
            // New format processing
            projectName = parsedSettings.masterSettings.projectName || "Default_Project";
            applyMasterSettings(parsedSettings.masterSettings);
            sequenceData = parsedSettings.sequences;
        } else if (Array.isArray(parsedSettings) && parsedSettings.length > 0) {
            // Existing format processing
            projectName = parsedSettings[0].projectName || "Default_Project";
            sequenceData = parsedSettings;
        } else {
            console.error("Imported JSON doesn't match expected format.");
            return;
        }
    
        // Update the project name in the text box
        document.getElementById('project-name').value = projectName;
    
        // Process the sequence data
        sequences = sequenceData.map((seqSettings, seqIndex) => {         
            if (isValidSequence(seqSettings)) {
                sequenceBPMs[seqIndex] = seqSettings.bpm || 105; // Update the BPM value
                return convertSequenceSettings(seqSettings);
            } else {
                console.error("One of the sequences in the imported array doesn't match the expected format.");
                return null;
            }
        }).filter(Boolean);
    
        console.log("Final sequences:", sequences);
        
        // Mark all loaded sequences as "live"
        for (let i = 0; i < sequences.length; i++) {
            liveSequences.push(i);
        }
    
        // Set current sequence to the first one
        currentSequence = 1;
        console.log("Setting current sequence to:", currentSequence);
    
        // Activate the quick play button for sequence 1
        setActiveSequence(currentSequence);
    
        const currentSeqSettings = sequenceData[0]; // since currentSequence is set to 1
        currentSeqSettings.channels.forEach((channelData, channelIndex) => {
            const channel = document.querySelector(`.channel[data-id="Channel-${channelIndex + 1}"]`);
            if (channelData.mute !== undefined) {
                updateMuteState(channel, channelData.mute);
            }
            if (channelData.volume !== undefined) {
                setChannelVolume(channelIndex, channelData.volume);
            }
        });
    
        updateUIForSequence(currentSequence);
        saveCurrentSequence(currentSequence);
    
        console.log("Final sequences array:", sequences);
    
        loadAndDisplaySequence(currentSequence);
    
        console.log("Import settings completed.");
    }
    
    // Additional functions (applyMasterSettings, markSequenceAsLive, convertSequenceSettings, convertChannelToStepSettings) remain unchanged
    
}

    function applyMasterSettings(masterSettings) {
        // Update BPM
        if (masterSettings.bpm !== undefined) {
            bpmSlider.value = masterSettings.bpm;
            bpmDisplay.textContent = masterSettings.bpm;
            emitMessage('BPMUpdate', masterSettings.bpm);
        }
    
        // Update channel volumes and mute states
        masterSettings.channels.forEach((channel, index) => {
            if (channel.volume !== undefined) {
                setChannelVolume(index, channel.volume);
            }
            if (channel.mute !== undefined) {
                const channelElement = document.querySelector(`.channel[data-id="Channel-${index + 1}"]`);
                updateMuteState(channelElement, channel.mute);
            }
        });
    
        // Additional settings can be applied here based on your requirements
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