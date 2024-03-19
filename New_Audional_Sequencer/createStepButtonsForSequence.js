// createStepButtonsForSequence.js

// Function to create step buttons for a given sequence
function createStepButtonsForSequence() {
    console.log("[createStepButtonsForSequence] entered");
    channels.forEach((channel, channelIndex) => {
        const stepsContainer = channel.querySelector('.steps-container');
        stepsContainer.innerHTML = '';

        let currentSequence = window.unifiedSequencerSettings.settings.masterSettings.currentSequence;

        for (let i = 0; i < 64; i++) {
            const button = document.createElement('button');
            button.className = 'step-button';
            button.id = `Sequence${currentSequence}-ch${channelIndex}-step-${i}`;

            button.onclick = () => handleStepButtonClick(currentSequence, channelIndex, i, button);
            button.oncontextmenu = (event) => handleStepButtonRightClick(event, channelIndex, i);

            stepsContainer.appendChild(button);
        }
    });
    console.log("[createStepButtonsForSequence] Completed creating step buttons.");
}

function handleStepButtonClick(currentSequence, channelIndex, stepIndex, button) {
    let currentStepState = window.unifiedSequencerSettings.getStepState(currentSequence, channelIndex, stepIndex);
    window.unifiedSequencerSettings.updateStepState(currentSequence, channelIndex, stepIndex, !currentStepState);
    toggleButtonSelectedState(button, channelIndex);
    updateSpecificStepUI(currentSequence, channelIndex, stepIndex);
}

function toggleButtonSelectedState(button, channelIndex) {
    const selected = button.classList.toggle('selected');
    const loadSampleButton = channels[channelIndex].querySelector('.load-sample-button');
    const colorClass = selected ? loadSampleButton.className.match(/\bcolor-[^ ]+/) : null;
    button.className = 'step-button'; // Reset classes
    if (colorClass) button.classList.add(...colorClass, 'selected');
}

function handleStepButtonRightClick(event, channelIndex, stepIndex) {
    event.preventDefault();
    showStepButtonSettingsMenu(event.pageX, event.pageY, channelIndex, stepIndex);
}

function showStepButtonSettingsMenu(x, y, channelIndex, stepIndex) {
    const menu = createContextMenu(x, y);
    appendMenuItem(menu, 'Pitch Shifter', () => showPitchShifterUI(x, y, channelIndex + 1, stepIndex + 1));
    appendMenuItem(menu, 'Step Button Settings', () => console.log('Step Button Settings clicked'));
    document.body.appendChild(menu);
    setupMenuCloseLogic(menu);
}

function createContextMenu(x, y) {
    const existingMenu = document.querySelector('.custom-context-menu');
    existingMenu?.remove();

    const menu = document.createElement('div');
    menu.className = 'custom-context-menu';
    menu.style.top = `${y}px`;
    menu.style.left = `${x}px`;
    return menu;
}

function appendMenuItem(menu, text, onClick) {
    const item = document.createElement('div');
    item.innerText = text;
    item.onclick = () => {
        onClick();
        menu.remove();
    };
    menu.appendChild(item);
}

function setupMenuCloseLogic(menu) {
    const handleClickOutside = (event) => {
        if (!menu.contains(event.target)) {
            menu.remove();
            document.removeEventListener('click', handleClickOutside);
        }
    };
   document.addEventListener('click', handleClickOutside);
}

document.addEventListener('DOMContentLoaded', createStepButtonsForSequence);
