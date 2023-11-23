// importManager_v2.js

// Function to import settings

    function importSettings(settings) {
        console.log("[importManager_v2.js] {importSettings}: Starting import process.");

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
            console.log("[importManager_v2.js] {importSettings}: Parsed settings", parsedSettings);
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
                masterBPM[seqIndex] = seqSettings.bpm || 105; // Update the BPM value
                console.log(`[importManager_v2.js] {importSettings}: Processed sequence ${seqIndex + 1}`, convertSequenceSettings(seqSettings));

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
        console.log("[importManager_v2.js] {importSettings}: Current sequence set to:", currentSequence);
    
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

        console.log("[importManager_v2.js] {importSettings}: Updating UI for sequence", currentSequence);

        updateUIForSequence(currentSequence);
        saveCurrentSequence(currentSequence);
    
        console.log("Final sequences array:", sequences);
    
        loadAndDisplaySequence(currentSequence);
    
console.log("[importManager_v2.js] {importSettings}: Import process completed. Final sequences:", sequences);
    }
    
    // Additional functions (applyMasterSettings, markSequenceAsLive, convertSequenceSettings, convertChannelToStepSettings) remain unchanged
    


    function applyMasterSettings(masterSettings) {
        console.log("[importManager_v2.js] {importSettings}: Applying master settings for project:", projectName);

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


// function testSequenceProcessing() {
//     // Sample data for new JSON format
//     let newJsonSample = {
//         masterSettings: {/*...*/},
//         sequences: [/* array of sequences in new format ... */]
//     };
// 
//     // Sample data for existing JSON format
//     let existingJsonSample = [/* array of sequences in existing format ... */];
// 
//     // Process new JSON format
//     console.log("Processing new JSON format:");
//     let parsedNewFormat = parseNewJsonFormat(newJsonSample);
//     console.log("Parsed new format:", parsedNewFormat);
// 
//     // Process existing JSON format
//     console.log("Processing existing JSON format:");
//     let parsedExistingFormat = parseExistingJsonFormat(existingJsonSample);
//     console.log("Parsed existing format:", parsedExistingFormat);
// 
//     // Convert sequence settings for both formats
//     let convertedNewFormat = convertSequenceSettings(parsedNewFormat);
//     console.log("Converted new format sequences:", convertedNewFormat);
// 
//     let convertedExistingFormat = convertSequenceSettings(parsedExistingFormat);
//     console.log("Converted existing format sequences:", convertedExistingFormat);
// 
//     // Add additional calls and logging as needed
//     // ...
// 
//     // This is a simple outline, and you can expand it based on your specific application logic
// }
// 
// // Call the test function
// testSequenceProcessing();