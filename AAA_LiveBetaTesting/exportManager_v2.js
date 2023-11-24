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
            // Assuming channelURLs is accessible and contains the correct URLs
            let url = channelURLs[currentSequence - 1][i] || "";
            masterSettings.channelURLs.push(url);
        }

    // Compile Data for Each Live Sequence (Only Active Trigger Step Numbers)
    let sequencesData = liveSequences.map(seqIndex => {
        let sequence = sequences[seqIndex];
        return {
            sequenceNumber: seqIndex + 1,
            channels: sequence.map(channel => {
                let triggers = [];
                channel.forEach((stepState, index) => {
                    if (stepState === true && index !== 0) { // Extract only active triggers
                        triggers.push(index);
                    }
                });
                return { triggers: triggers };
            })
        };
    });

    // Format the Export Object
    const exportObject = {
        masterSettings: masterSettings,
        sequences: sequencesData,
        filename: `Audional_Sequencer_Settings_${projectName}.json`
    };

    // Serialize and Export
    const exportString = JSON.stringify(exportObject, null, 2);
    console.log('[exportManager_v2.js] exportSettings: Export data prepared', exportObject);

    // Return the expected object
    return { settings: exportString, filename: exportObject.filename };
}
