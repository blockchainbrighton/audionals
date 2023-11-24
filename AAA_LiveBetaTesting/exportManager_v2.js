// exportManager_v2.js

// Function to export the settings of the sequences
function exportSettings() {
    console.log('[exportManager_v2.js] exportSettings: Starting export process');

    let projectName = document.getElementById('project-name').value.trim() || 'Default_Project';

    // Master settings
    const masterSettings = {
        projectName: projectName,
        bpm: masterBPM, // Use the single master BPM
        channelURLs: [] // Rename channels to channelURLs
    };

    // Add URLs to the master settings
    for (let i = 0; i < 16; i++) {
        let url = channelURLs[currentSequence - 1][i] || "";
        masterSettings.channelURLs.push(url);
    }
    console.log('[exportManager_v2.js] Master settings prepared:', currentSequence, masterSettings);

    // Compile Data for Each Sequence
    let sequencesData = sequences.map((sequence, seqIndex) => {
        return {
            sequenceNumber: seqIndex + 1,
            channels: sequence.map((channel, chIndex) => {
                let triggers = [];
                channel.forEach((stepState, index) => {
                    if (stepState === true) { // Extract all triggers
                        triggers.push(index);
                    }
                });
                console.log(`[exportManager_v2.js] Triggers for Sequence ${seqIndex + 1}, Channel ${chIndex + 1}:`, triggers);
                return { triggers: triggers };
            })
        };
    });
    console.log('[exportManager_v2.js] Sequences data prepared:', sequencesData);

    // Format the Export Object
    const exportObject = {
        masterSettings: masterSettings,
        sequences: sequencesData,
        filename: `Audional_Sequencer_Settings_${projectName}.json`
    };

    // Serialize and Export
    const exportString = JSON.stringify(exportObject, null, 2);
    console.log('[exportManager_v2.js] Export data prepared', exportObject);

    // Return the expected object
    return { settings: exportString, filename: exportObject.filename };
}
