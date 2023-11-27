// importSettingsToGlobalObject.js

function parseAndValidateSettings(jsonString) {
    let parsedSettings;
    try {
        parsedSettings = JSON.parse(jsonString);
        // Add additional validation if necessary
        // For example, check if parsedSettings has required properties
    } catch (error) {
        console.error("Error parsing settings:", error);
        return null;
    }
    return parsedSettings;
}

function convertTriggersToSteps(triggers) {
    // Assuming triggers are an array of boolean values
    // Convert them to the format expected by the global object
    return triggers.map(trigger => trigger ? 1 : 0);
}

function packageSettingsForGlobalObject(jsonString) {
    const importedSettings = parseAndValidateSettings(jsonString);
    if (!importedSettings) return;

    // Update project name and BPM
    if (importedSettings.projectName) {
        window.unifiedSequencerSettings.updateSetting('projectName', importedSettings.projectName);
    }
    if (importedSettings.projectBPM) {
        window.unifiedSequencerSettings.updateSetting('projectBPM', importedSettings.projectBPM);
    }

    // Update URLs and URL names
    if (Array.isArray(importedSettings.projectURLs)) {
        window.unifiedSequencerSettings.updateSetting('projectURLs', importedSettings.projectURLs);
    }
    if (Array.isArray(importedSettings.projectURLNames)) {
        window.unifiedSequencerSettings.updateSetting('projectURLNames', importedSettings.projectURLNames);
    }

    // Update step states for each sequence and channel
    Object.keys(importedSettings.projectSequences).forEach(sequenceKey => {
        const sequenceNumber = parseInt(sequenceKey.replace('Sequence', ''), 10) - 1;
        const channels = importedSettings.projectSequences[sequenceKey];

        Object.keys(channels).forEach(channelKey => {
            const channelIndex = parseInt(channelKey.replace('ch', ''), 10) - 1;
            const triggers = channels[channelKey];
            const steps = convertTriggersToSteps(triggers);

            steps.forEach((stepState, stepIndex) => {
                window.unifiedSequencerSettings.updateStepState(sequenceNumber, channelIndex, stepIndex, stepState);
            });
        });
    });
}

// Example usage:
// let jsonString = /* your JSON string here */;
// packageSettingsForGlobalObject(jsonString);
console.log("Updated global object:", window.unifiedSequencerSettings.settings.masterSettings);
