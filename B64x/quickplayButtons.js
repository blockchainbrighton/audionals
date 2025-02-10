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
quickPlayContainer.style.marginBottom = '20px';  // Add some margin for spacing

console.log("[quickplayButtons] Quickplay container created and ready.");

// Set the active sequence and log details
function setActiveSequence(index) {
    if (currentActiveIndex !== null && currentActiveIndex !== index) {
        console.log(`[quickplayButtons] Deactivating previously active sequence ${currentActiveIndex}`);
        quickPlayButtons[currentActiveIndex].classList.add('inactive');
    }
    quickPlayButtons[index].classList.remove('inactive');
    console.log(`[quickplayButtons] Activating sequence ${index}.`);
    
    // Darken other buttons  
    quickPlayButtons.forEach((button, btnIndex) => {
        if (btnIndex !== index) {
            button.classList.add('inactive');
        }
    });
    console.log("[quickplayButtons] Current quickplay button states:", quickPlayButtons.map((btn, i) => ({
        index: i,
        inactive: btn.classList.contains('inactive')
    })));
    currentActiveIndex = index;
}

function updateActiveQuickPlayButton() {
    quickPlayButtons.forEach(btn => btn.classList.remove('active'));
    const activeBtn = quickPlayButtons[currentSequence];
    activeBtn.classList.add('active');
    console.log(`[quickplayButtons] Updated active quickplay button to sequence ${currentSequence}.`);
}

function insertQuickPlayButtons() {
    const checkBox = document.getElementById('continuous-play');
    const quickPlayButton = document.getElementById('quick-play-button');

    if (checkBox && quickPlayButton) {
        console.log(`[quickplayButtons] Inserting quickplay buttons using numChannels = ${window.unifiedSequencerSettings.numChannels}`);
        for (let j = 0; j < 32; j++) {
            const quickBtn = createQuickPlayButton(j);
            checkBox.parentNode.insertBefore(quickBtn, quickPlayButton);
            console.log(`[quickplayButtons] Inserted Quick Play Button for Sequence_${j + 1}`);
        }
        console.log(`[quickplayButtons] Total quickplay buttons inserted: ${quickPlayButtons.length}`);
    } else {
        console.log("QUICKPLAY BUTTONS TEMPORARILY REMOVED UNTIL THEY CAN BE FIXED");
    }
}

insertQuickPlayButtons();

// Now that the quickplay buttons have been inserted, we can set up their event listeners.
quickPlayButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const sequenceIndex = parseInt(button.dataset.sequenceIndex, 10);
        console.log(`[quickplayButtons] Quickplay button clicked: sequence index ${sequenceIndex}`);
        loadAndDisplaySequence(sequenceIndex);
    });
});

function loadAndDisplaySequence(sequenceIndex) {
    currentSequence = sequenceIndex;
    console.log(`[loadAndDisplaySequence] currentSequence updated to: ${sequenceIndex}`);
    loadSequence(sequenceIndex);

    const currentSequenceDisplay = document.getElementById('current-sequence-display');
    if (currentSequenceDisplay) {
        currentSequenceDisplay.textContent = `Sequence ${currentSequence + 1}`;    }
    updateActiveQuickPlayButton();
}

// Function to create the quick-play-button with detailed logging
function createQuickPlayButton(index) {
    const button = document.createElement('div');
    button.classList.add('quick-play-button', 'tooltip');
    button.dataset.sequenceIndex = index;
    button.innerHTML = index; // Add the number inside the button

    const tooltipText = document.createElement('span');
    tooltipText.classList.add('tooltiptext');
    tooltipText.innerHTML = `Quick Load Sequence ${index}<br><br>Right click to change button colour.`;
    button.appendChild(tooltipText);

    quickPlayButtons.push(button);
    console.log(`[quickplayButtons] Created quickplay button for sequence ${index}`);

    // Add click event for setting the active sequence
    button.addEventListener('click', function() {
        console.log(`[quickplayButtons] Button for sequence ${index} clicked (via createQuickPlayButton event).`);
        setActiveSequence(index);
    });

    // Add right-click event listener
    button.addEventListener('contextmenu', function(event) {
        event.preventDefault();
        console.log(`[quickplayButtons] Right-click on quickplay button for sequence ${index}`);
        showColorPicker(event, button);
    });

    return button;
}

// Mark all quickplay buttons as inactive initially
quickPlayButtons.forEach(button => button.classList.add('inactive'));

// Create channels dynamically and log details
const numChannels = window.NUM_CHANNELS;
console.log(`[quickplayButtons] Cloning channels using numChannels = ${numChannels}`);
for (let i = 0; i < numChannels; i++) {
    let clonedChannel = channelTemplate.cloneNode(true);
    clonedChannel.id = `channel-${i}`;
    mainContainer.appendChild(clonedChannel);
    console.log(`[quickplayButtons] Created channel element with id: channel-${i}`);
}

channelTemplateContainer.remove();
console.log("[quickplayButtons] Removed the channel template container from DOM.");

// Dispatch a custom event indicating that the setup is complete
const setupCompleteEvent = new Event('setupComplete');
window.dispatchEvent(setupCompleteEvent);
console.log("[quickplayButtons] Setup complete event dispatched.");