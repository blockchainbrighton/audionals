// exportManager.js

// Function to export the settings of the sequences
function exportSettings() {
    let projectName = document.getElementById('project-name').value.trim();
    if (!projectName) {
        projectName = 'Default_Project';
    }

    let allSequencesSettings = [];

    for (let seqIndex of liveSequences) {
        const sequence = sequences[seqIndex];
        let settings = {
            projectName: projectName,
            name: `Sequence_${seqIndex + 1}`,
            bpm: sequenceBPMs[seqIndex],
            channels: [],
        };

        for (let i = 0; i < 16; i++) {
            let channelSteps = sequence[i] || [];
            let url = sequence[i] && sequence[i][0] ? sequence[i][0] : "";
            let triggers = [];
            channelSteps.forEach((stepState, stepIndex) => {
                if (stepState && stepIndex !== 0) {
                    triggers.push(stepIndex);
                }
            });

            let mute = channels[i] && channels[i].dataset ? channels[i].dataset.muted === 'true' : false;
            settings.channels.push({
                url: url,
                mute: mute,
                triggers: triggers
            });
        }

        allSequencesSettings.push(settings);
    }

    let filename = `Audional_Sequencer_Settings_${projectName}.json`;
    return { settings: JSON.stringify(allSequencesSettings, null, 2), filename: filename };
}
