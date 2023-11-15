// quickplayButtons.js

// quickplayButtons.js

const mainContainer = document.getElementById('app');
const channelTemplateContainer = document.querySelector('.channel-template');
const channelTemplate = channelTemplateContainer.querySelector('.channel');
const quickPlayButtons = [];

let currentActiveIndex = null; // To track which button is currently active

// Create a new container for the quickplay buttons
const quickPlayContainer = document.createElement('div');
quickPlayContainer.id = 'quickplay-container';
quickPlayContainer.style.display = 'flex';
quickPlayContainer.style.justifyContent = 'center';
quickPlayContainer.style.marginBottom = '20px';

function setActiveSequence(index) {
    if (currentActiveIndex !== null && currentActiveIndex !== index) {
        quickPlayButtons[currentActiveIndex - 1].classList.add('inactive');
    }

    quickPlayButtons[index-1].classList.remove('inactive');

    quickPlayButtons.forEach(button => {
        if(button !== quickPlayButtons[index-1]) {
            button.classList.add('inactive'); 
        }
    });

    currentActiveIndex = index;
}

function updateActiveQuickPlayButton() {
    quickPlayButtons.forEach(btn => {
        btn.classList.remove('active');
    });

    const activeBtn = quickPlayButtons[getCurrentSequence() - 1];
    activeBtn.classList.add('active');
}

function insertQuickPlayButtons() {
    const checkBox = document.getElementById('continuous-play');
    const quickPlayButton = document.getElementById('quick-play-button');

    if (checkBox && quickPlayButton) {
        for (let j = 0; j < 16; j++) {
            const quickBtn = createQuickPlayButton(j + 1);
            checkBox.parentNode.insertBefore(quickBtn, quickPlayButton);
        }
    } else {
        console.error("Either checkBox or quickPlayButton is missing!");
    }
}

insertQuickPlayButtons();

quickPlayButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const sequenceIndex = parseInt(button.dataset.sequenceIndex, 10);
        loadAndDisplaySequence(sequenceIndex);
    });
});

function loadAndDisplaySequence(sequenceIndex) {
    setCurrentSequence(sequenceIndex);
    loadSequence(sequenceIndex);

    document.getElementById('current-sequence-display').textContent = `Sequence ${getCurrentSequence()}`;
    updateActiveQuickPlayButton();
}

function createQuickPlayButton(index) {
    const button = document.createElement('div');
    button.classList.add('quick-play-button', 'tooltip');
    button.dataset.sequenceIndex = index;
    button.style.textAlign = "center";
    button.style.fontWeight = "bold";
    button.innerHTML = index;

    const tooltipText = document.createElement('span');
    tooltipText.classList.add('tooltiptext');
    tooltipText.innerHTML = `Quick Load Sequence ${index}<br><br>Right click to change button colour.`;
    button.appendChild(tooltipText);

    quickPlayButtons.push(button);

    button.addEventListener('click', function() {
        setActiveSequence(index);
    });

    button.addEventListener('contextmenu', function(event) {
        event.preventDefault();
        showColorPicker(event, button);
    });

    return button;
}

quickPlayButtons.forEach(button => button.classList.add('inactive'));

for (let i = 1; i <= 16; i++) {
    let clonedChannel = channelTemplate.cloneNode(true);
    clonedChannel.id = `channel-${i}`;
    mainContainer.appendChild(clonedChannel);
}

channelTemplateContainer.remove();

const setupCompleteEvent = new Event('setupComplete');
window.dispatchEvent(setupCompleteEvent);

// Helper functions to interact with the master file
function getCurrentSequence() {
    // This function should retrieve the current sequence from the master file
    // Replace with the appropriate method to access the currentSequence from updateSequenceDataMaster_v2.js
    return currentSequence; // Placeholder
}

function setCurrentSequence(index) {
    // This function should set the current sequence in the master file
    // Replace with the appropriate method to update the currentSequence in updateSequenceDataMaster_v2.js
    currentSequence = index; // Placeholder
}
