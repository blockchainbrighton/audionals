// exportManager_v2.js

// Function to export the settings of the sequences
function exportSettings() {
    console.log('[exportManager_v2.js] exportSettings: Starting export process');

    let projectName = document.getElementById('project-name').value.trim();
    if (!projectName) {
        projectName = 'Default_Project';
    }

    // Step 1: Gather Master Settings from the first sequence or master settings
    const masterSettings = {
        projectName: projectName,
        bpm: sequenceBPMs[0], // Adjust if necessary
        channels: []
    };

    // Fetch URL, mute, and trim settings from the first sequence
    const firstSequence = sequences[0];
    for (let i = 0; i < 16; i++) {
        let channelSteps = firstSequence[i] || [];
        let url = channelSteps[0] || "";
        let mute = channels[i] && channels[i].dataset ? channels[i].dataset.muted === 'true' : false;
        let trimSettings = { start: 0.01, end: 100 };

        masterSettings.channels.push({
            url: url,
            mute: mute,
            trimSettings: trimSettings
        });
    }

    // Step 2: Compile Data for Each Live Sequence (Only Active Trigger Step Numbers)
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

    // Step 3: Format the Export Object
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

