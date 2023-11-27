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

function convertTriggersToSteps(triggers) {
    // Create a new array starting from the second element and including only the next 64 elements
    return triggers.slice(1, 65).map(trigger => trigger === true); // Convert to boolean values
}

function packageSettingsForGlobalObject(jsonString) {
    const importedSettings = parseAndValidateSettings(jsonString);
    if (!importedSettings || !Array.isArray(importedSettings)) return;

    const firstSequence = importedSettings[0];
    if (firstSequence) {
        // Update project name and BPM
        if (firstSequence.name) {
            window.unifiedSequencerSettings.updateSetting('projectName', firstSequence.name);
        }
        if (firstSequence.bpm) {
            window.unifiedSequencerSettings.updateSetting('projectBPM', firstSequence.bpm);
        }

        // Update URLs from the first sequence
        if (Array.isArray(firstSequence.channels)) {
            const projectURLs = firstSequence.channels.map(ch => ch[0] || ''); // Get URL from the first element
            window.unifiedSequencerSettings.updateSetting('projectURLs', projectURLs);
        }
    }

    // Update step states for each sequence and channel
    importedSettings.forEach((sequence, sequenceIndex) => {
        if (sequence && Array.isArray(sequence.channels)) {
            sequence.channels.forEach((channel, channelIndex) => {
                if (Array.isArray(channel)) {
                    const steps = convertTriggersToSteps(channel);
                    steps.forEach((stepState, stepIndex) => {
                        window.unifiedSequencerSettings.updateStepState(sequenceIndex, channelIndex, stepIndex, stepState);
                    });
                }
            });
        }
    });

    console.log("Final data sent to global object:", window.unifiedSequencerSettings.viewCurrentSettings());
}


// Example usage:
// let jsonString = /* your JSON string here */;
// packageSettingsForGlobalObject(jsonString);
console.log("Updated global object:", window.unifiedSequencerSettings.settings.masterSettings);
