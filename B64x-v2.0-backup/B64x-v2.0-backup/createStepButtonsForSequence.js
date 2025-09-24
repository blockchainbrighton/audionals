function getChannelElements() {
    return window.channelsStore && window.channelsStore.length
        ? window.channelsStore
        : Array.from(document.querySelectorAll('.channel[id^="channel-"]'));
}

function ensureStepButton(channel, channelIndex, stepIndex, currentSequence) {
    const stepsContainer = channel.querySelector('.steps-container');
    if (!stepsContainer) return null;

    let button = stepsContainer.children[stepIndex];
    if (!button) {
        button = document.createElement('button');
        button.classList.add('step-button');
        button.dataset.initialized = 'true';
        button.dataset.channelIndex = String(channelIndex);
        button.dataset.stepIndex = String(stepIndex);

        button.addEventListener('click', (event) => {
            const seq = window.unifiedSequencerSettings.getCurrentSequence();
            const chIdx = Number(button.dataset.channelIndex);
            const stIdx = Number(button.dataset.stepIndex);
            if (event.shiftKey) {
                openStepSettingsMenu(button, seq, chIdx, stIdx);
            } else {
                toggleStepActivation(button, chIdx, stIdx);
            }
        });

        button.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            const seq = window.unifiedSequencerSettings.getCurrentSequence();
            const chIdx = Number(button.dataset.channelIndex);
            const stIdx = Number(button.dataset.stepIndex);
            toggleStepReverse(button, chIdx, stIdx, seq);
        });

        stepsContainer.appendChild(button);
    } else {
        button.dataset.channelIndex = String(channelIndex);
        button.dataset.stepIndex = String(stepIndex);
    }

    button.id = `Sequence${currentSequence}-ch${channelIndex}-step-${stepIndex}`;
    return button;
}

function createStepButtonsForSequence() {
    console.log("[createStepButtonsForSequence] [SeqDebug] entered");
    const currentSequence = window.unifiedSequencerSettings.getCurrentSequence();
    getChannelElements().forEach((channel, channelIndex) => {
        for (let stepIndex = 0; stepIndex < 64; stepIndex++) {
            const button = ensureStepButton(channel, channelIndex, stepIndex, currentSequence);
            if (button) {
                updateButtonState(button, currentSequence, channelIndex, stepIndex);
            }
        }
    });
}

function toggleStepActivation(button, channelIndex, stepIndex) {
    const sequence = window.unifiedSequencerSettings.getCurrentSequence();
    const { isActive, isReverse } = window.unifiedSequencerSettings.getStepStateAndReverse(sequence, channelIndex, stepIndex);
    window.unifiedSequencerSettings.updateStepStateAndReverse(sequence, channelIndex, stepIndex, !isActive, isActive ? isReverse : false);
    updateButtonState(button, sequence, channelIndex, stepIndex);
}

function toggleStepReverse(button, channelIndex, stepIndex, sequenceOverride) {
    const sequence = sequenceOverride !== undefined ? sequenceOverride : window.unifiedSequencerSettings.getCurrentSequence();
    const { isActive, isReverse } = window.unifiedSequencerSettings.getStepStateAndReverse(sequence, channelIndex, stepIndex);
    window.unifiedSequencerSettings.updateStepStateAndReverse(sequence, channelIndex, stepIndex, isReverse ? isActive : false, !isReverse);
    updateButtonState(button, sequence, channelIndex, stepIndex);
}

function updateButtonState(button, sequence, channelIndex, stepIndex) {
    const { isActive, isReverse } = window.unifiedSequencerSettings.getStepStateAndReverse(sequence, channelIndex, stepIndex);
    button.classList.toggle('selected', isActive);
    button.classList.toggle('reverse-playback', isReverse);
    button.style.backgroundColor = '';
    if (isActive) button.style.backgroundColor = 'red';
    if (isReverse) button.style.backgroundColor = 'green';
}

document.addEventListener('DOMContentLoaded', createStepButtonsForSequence);
