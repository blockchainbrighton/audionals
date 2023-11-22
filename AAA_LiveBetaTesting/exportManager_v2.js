// exportManager_v2.js

// Function to export the settings of the sequences
function exportSettings() {
    let projectName = document.getElementById('project-name').value.trim();
    if (!projectName) {
        projectName = 'Default_Project';
    }

    // Step 1: Gather Master Settings (assuming these are general and not sequence-specific)
    const masterSettings = {
        projectName: projectName,
        bpm: sequenceBPMs[0], // Default BPM, adjust if needed
        channels: [] // Initialize channels array
    };

    // Fetch URL, mute, and trim settings from the first sequence
    const firstSequence = sequences[0];
    for (let i = 0; i < 16; i++) {
        let channelSteps = firstSequence[i] || [];
        let url = channelSteps[0] || "";
        let mute = channels[i] && channels[i].dataset ? channels[i].dataset.muted === 'true' : false;
        let trimSettings = { start: 0.01, end: 100 }; // Default trim settings

        masterSettings.channels.push({
            url: url,
            mute: mute,
            trimSettings: trimSettings
        });
    }

    // Step 2: Compile Data for Live Sequences
    let sequencesData = liveSequences.map(seqIndex => {
        let sequence = sequences[seqIndex];
        return {
            sequenceNumber: seqIndex + 1,
            channels: sequence.map(channel => {
                let triggers = channel.slice(1).filter(step => {
                    console.log(`Step state: ${step}`); // Debugging log
                    return step !== 0;
                }).map((_, index) => index + 1); 
            })
        };
    });

    // Step 3: Format the Export Object
    const exportObject = {
        masterSettings: masterSettings,
        sequences: sequencesData,
        filename: `Audional_Sequencer_Settings_${projectName}.json`
    };

    // Step 4: Serialize and Export
    const exportString = JSON.stringify(exportObject, null, 2); // Pretty print JSON
    
    // Return the expected object
    return { settings: exportString, filename: exportObject.filename };
}

