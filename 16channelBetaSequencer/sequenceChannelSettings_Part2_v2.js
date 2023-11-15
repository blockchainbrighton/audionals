// sequenceChannelSettings_Part2_v2.js

function loadSequence(sequenceNumber) {
    // Check if the sequence exists and initialize if not
    if (!sequences[sequenceNumber - 1]) {
        sequences[sequenceNumber - 1] = Array(16).fill().map(() => [null].concat(Array(64).fill(false)));
    }

    if (sequenceNumber - 1 < 0 || sequenceNumber - 1 >= sequenceBPMs.length) {
        console.error(`Invalid sequenceNumber: ${sequenceNumber}`);
        return;
    }   

    let bpmSlider = document.getElementById('bpm-slider');
    let bpmDisplay = document.getElementById('bpm-display');
    bpmSlider.value = sequenceBPMs[sequenceNumber - 1];
    bpmDisplay.innerText = sequenceBPMs[sequenceNumber - 1];

    updateUIForSequence(sequenceNumber);
    currentSequence = sequenceNumber;
}

function saveCurrentSequence(sequenceNumber) {
    sequences[sequenceNumber - 1] = [...channelSettings];
}

function loadNextSequence() {
    if (currentSequence < totalSequenceCount) {
        saveCurrentSequence(currentSequence);
        currentSequence++;
        loadSequence(currentSequence);
        updateSequenceDisplay();
    } else {
        console.warn("You've reached the last sequence.");
    }
}

function updateUIForSequence(sequenceNumber) {
    if (sequenceNumber > 0 && sequenceNumber <= sequences.length) {
        channelSettings = sequences[sequenceNumber - 1];
        updateSequenceDisplay();
        updateChannelUI(sequenceNumber - 1);
    } else {
        console.error("Invalid sequence number:", sequenceNumber);
    }
}

function updateChannelUI(sequenceIndex) {
    const sequenceSettings = sequences[sequenceIndex];
    channels.forEach((channel, index) => {
        const stepButtons = channel.querySelectorAll('.step-button');
        stepButtons.forEach((button, pos) => {
            button.classList.toggle('selected', sequenceSettings[index][pos + 1]);
        });
    });
}

function changeSequence(seq) {
    if (seq < 1 || seq > totalSequenceCount) {
        console.error("Invalid sequence number:", seq);
        return;
    }
    saveCurrentSequence(currentSequence);
    loadSequence(seq);
}

function loadChannelSettingsFromPreset(preset) {
    preset.channels.forEach((channelData, channelIndex) => {
        let stepSettings = [null].concat(Array(64).fill(false));
        channelData.triggers.forEach(trigger => {
            stepSettings[trigger] = true;
        });
        channelSettings[channelIndex] = stepSettings;

        if (channelData.url) {
            const loadSampleButton = document.querySelector(`.channel[data-id="Channel-${channelIndex + 1}"] .load-sample-button`);
            fetchAudio(channelData.url, channelIndex, loadSampleButton);
        }
    });
    saveCurrentSequence(currentSequence);
}

function updateStep(channelIndex, stepIndex, state) {
    channelSettings[channelIndex][stepIndex + 1] = state;
    console.log(`Updating Step: channelIndex=${channelIndex}, stepIndex=${stepIndex}, state=${state}`);
    updateSequenceData({
        channelIndex: channelIndex,
        stepSettings: channelSettings[channelIndex]
    });
}

window.addEventListener('setupComplete', function() {
    loadAndDisplaySequence(1);
});

document.getElementById('next-sequence').addEventListener('click', loadNextSequence);

document.getElementById('prev-sequence').addEventListener('click', function() {
    if (currentSequence > 1) {
        saveCurrentSequence(currentSequence);
        currentSequence--;
        loadSequence(currentSequence);
        updateSequenceDisplay();
    } else {
        console.warn("You're already on the first sequence.");
    }
});

function updateSequenceDisplay() {
    const sequenceDisplayElement = document.getElementById('current-sequence-display');
    if (sequenceDisplayElement) {
        sequenceDisplayElement.textContent = 'Sequence ' + currentSequence;
    }
}
