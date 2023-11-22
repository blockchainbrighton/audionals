// importManager_v2.js

let newJsonImport = false;

// Function to import settings
function importSettings(settings) {
    console.log("Importing settings...");

    let parsedSettings;
    let projectName = "";
    let newFormat = false;

    try {
        parsedSettings = JSON.parse(settings);
        console.log("Parsed settings:", parsedSettings);

        // Determine if the new format is used
        if (parsedSettings.masterSettings && Array.isArray(parsedSettings.sequences)) {
            projectName = parsedSettings.masterSettings.projectName || "Default_Project";
            // Apply master settings like BPM, URLs, mute, and trim settings
            applyMasterSettings(parsedSettings.masterSettings);
            parsedSettings = parsedSettings.sequences; // Focus on the sequences array for further processing
            newFormat = true;
        } else if (Array.isArray(parsedSettings) && parsedSettings.length > 0) {
            // Existing format
            projectName = parsedSettings[0].projectName || "Default_Project";
        } else {
            console.error("Imported JSON doesn't match expected format.");
            return;
        }
    } catch (error) {
        console.error("Error parsing settings:", error);
        return;
    }

    // Update the project name in the text box
    document.getElementById('project-name').value = projectName;

    // Process and apply sequence settings
    processAndApplySequenceSettings(parsedSettings);

    console.log("Import settings completed.");
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