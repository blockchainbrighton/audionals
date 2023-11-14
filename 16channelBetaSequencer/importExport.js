// importExport.js

let newJsonImport = false;

const EMPTY_CHANNEL = {
    "url": "",
    "mute": false,
    "triggers": []
};

let sequenceBPMs = Array(totalSequenceCount).fill(105);  // Initialize BPM for all sequences
let collectedURLsForSequences = Array(sequences.length).fill().map(() => []);

function exportSettings() {
    let allSequencesSettings = [];

    for (let seqIndex = 0; seqIndex < 16; seqIndex++) {
        const sequence = sequences[seqIndex] || Array(16).fill(EMPTY_CHANNEL);
        let settings = {
            name: `Sequence_${seqIndex + 1}`,
            channels: sequence.map((channel, i) => ({
                url: channel && channel[0] ? channel[0] : "",
                mute: channels[i] && channels[i].dataset ? channels[i].dataset.muted === 'true' : false,
                triggers: channel.slice(1).map((stepState, index) => stepState ? index + 1 : null).filter(index => index !== null)
            }))
        };

        if (seqIndex === 0) settings.bpm = sequenceBPMs[seqIndex];
        allSequencesSettings.push(settings);
    }

    return { settings: JSON.stringify(allSequencesSettings, null, 2), filename: "Audional_Sequencer_Settings.json" };
}

function importSettings(settings) {
    console.log("Importing settings...");

    // Reset sequences, URLs, and BPMs to initial state
    sequences = Array(16).fill().map(() => Array(16).fill(EMPTY_CHANNEL));
    collectedURLsForSequences = Array(sequences.length).fill().map(() => []);
    sequenceBPMs.fill(105);  // Reset BPMs to default value

    // Reset channel states
    channels.forEach((channel, index) => {
        updateMuteState(channel, false); // unmute
        setChannelVolume(index, 1); // set volume to 1
    });

    let parsedSettings;
    newJsonImport = true;

    try {
        parsedSettings = JSON.parse(settings);
        console.log("Parsed settings:", parsedSettings);
    } catch (error) {
        console.error("Error parsing settings:", error);
        return;
    }

    if (!Array.isArray(parsedSettings) || parsedSettings.length === 0) {
        console.error("Imported JSON doesn't match expected format or is empty.");
        return;
    }

    // Update BPM for the first sequence only
    sequenceBPMs[0] = parsedSettings[0].bpm;

    // Convert and filter valid sequences
    sequences = parsedSettings.map((seqSettings, seqIndex) => {
        if (seqIndex === 0 && seqSettings.bpm !== undefined) {
            sequenceBPMs[seqIndex] = seqSettings.bpm; // Update BPM if defined in JSON
        }
        return convertSequenceSettings(seqSettings);
    }).filter(Boolean);

    // Ensure there are 16 sequences
    while (sequences.length < 16) {
        sequences.push(Array(16).fill(EMPTY_CHANNEL));
    }

    currentSequence = 1;
    setActiveSequence(currentSequence);
    updateSequenceUI(parsedSettings[0], currentSequence);

    console.log("Import settings completed.");
}

function convertSequenceSettings(settings) {
    return Array.from({ length: 16 }, (_, i) => settings.channels[i] || EMPTY_CHANNEL)
                .map(convertChannelToStepSettings);
}

function convertChannelToStepSettings(channel) {
    return [channel.url, ...Array(64).fill(false).map((_, i) => channel.triggers.includes(i))];
}

function updateSequenceUI(seqSettings, sequenceIndex) {
    // Clear current steps in the UI
    clearCurrentStepsUI();

    seqSettings.channels.forEach((channelData, channelIndex) => {
        const channel = document.querySelector(`.channel[data-id="Channel-${channelIndex + 1}"]`);
        if (channelData.mute !== undefined) updateMuteState(channel, channelData.mute);
        if (channelData.volume !== undefined) setChannelVolume(channelIndex, channelData.volume);
    });

    updateUIForSequence(sequenceIndex);
    saveCurrentSequence(sequenceIndex);
    loadAndDisplaySequence(sequenceIndex);
}

function clearCurrentStepsUI() {
    // Assuming you have a way to select all step elements in the UI
    const steps = document.querySelectorAll('.step');
    steps.forEach(step => {
        // Reset the step to its default state
        // This might vary depending on how your steps are implemented
        step.classList.remove('active');
        // Any other reset logic specific to your steps
    });
}
