// globalExportSettings.js

function compressSequenceData(sequenceData) {
    let compressedData = {};
    for (const sequenceKey in sequenceData) {
        compressedData[sequenceKey] = {};
        for (const channelKey in sequenceData[sequenceKey]) {
            compressedData[sequenceKey][channelKey] = sequenceData[sequenceKey][channelKey]
                .map((stepState, index) => stepState ? index + 1 : null)
                .filter(stepNumber => stepNumber !== null);
        }
    }
    return compressedData;
}

function downloadJSONFile(data, filename) {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function exportCompressedSettings() {
    if (!window.unifiedSequencerSettings) {
        console.error('Global object unifiedSequencerSettings not found');
        return;
    }

    const settings = window.unifiedSequencerSettings.settings.masterSettings;
    const compressedSequences = compressSequenceData(settings.projectSequences);

    const exportedSettings = {
        projectName: settings.projectName,
        projectBPM: settings.projectBPM,
        projectURLs: settings.projectURLs,
        projectURLNames: settings.projectURLNames,
        projectSequences: compressedSequences
    };

    const jsonString = JSON.stringify(exportedSettings, null, 2);
    downloadJSONFile(jsonString, 'exportedSettings.json');
}

// Example usage
// exportCompressedSettings();
window.unifiedSequencerSettings.exportCompressedSettings = exportCompressedSettings;
