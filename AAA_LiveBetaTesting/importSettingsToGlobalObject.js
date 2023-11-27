// importSettingsToGlobalObject.js

function parseAndValidateSettings(jsonString) {
    let parsedSettings;
    try {
        parsedSettings = JSON.parse(jsonString);
        // Add additional validation if necessary
    } catch (error) {
        console.error("Error parsing settings:", error);
        return null;
    }
    return parsedSettings;
}

function convertTriggersToSteps(triggers, numSteps = 64) {
    let steps = new Array(numSteps).fill(false);
    triggers.forEach(trigger => {
        if (trigger > 0 && trigger <= numSteps) {
            steps[trigger - 1] = true; // Adjust index to 0-based
        }
    });
    return steps;
}

function convertChannelArray(channelArray) {
    // Remove the URL from the first position and return the modified array
    return channelArray.slice(1);
}

function packageSettingsForGlobalObject(jsonString) {
    const importedSettings = parseAndValidateSettings(jsonString);
    if (!importedSettings || !Array.isArray(importedSettings)) return;

    console.log("Received data:", JSON.stringify(importedSettings, null, 2)); // Log received data

    const firstSequence = importedSettings[0];
    if (firstSequence) {
        if (firstSequence.name) {
            window.unifiedSequencerSettings.updateSetting('projectName', firstSequence.name);
        }
        if (firstSequence.bpm) {
            window.unifiedSequencerSettings.updateSetting('projectBPM', firstSequence.bpm);
        }

        if (Array.isArray(firstSequence.channels)) {
            const projectURLs = firstSequence.channels.map(ch => ch.url || '');
            window.unifiedSequencerSettings.updateSetting('projectURLs', projectURLs);
        }
    }

    importedSettings.slice(1).forEach((sequence, sequenceIndex) => {
        if (sequence && Array.isArray(sequence.channels)) {
            sequence.channels.forEach((channel, channelIndex) => {
                if (Array.isArray(channel.triggers)) {
                    const steps = convertTriggersToSteps(channel.triggers);
                    steps.forEach((stepState, stepIndex) => {
                        window.unifiedSequencerSettings.updateStepState(sequenceIndex, channelIndex, stepIndex, stepState);
                    });
                }
            });
        }
    });

    console.log("Final data sent to global object:", window.unifiedSequencerSettings.viewCurrentSettings()); // Log final data
}

// Example usage:
// let jsonString = /* your JSON string here */;
// packageSettingsForGlobalObject(jsonString);
