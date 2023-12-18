// createStepButtonsforSequence.js

// Function to create step buttons for a given sequence
function createStepButtonsForSequence() {
    console.log("[createStepButtonsForSequence] [SeqDebug] entered");
    channels.forEach((channel, channelIndex) => {
        const stepsContainer = channel.querySelector('.steps-container');
        const loadSampleButton = channel.querySelector('.load-sample-button');
        const colorClass = loadSampleButton.className.match(/\bcolor-[^ ]+/) || ''; // Extract color class
        stepsContainer.innerHTML = '';

        let currentSequence = window.unifiedSequencerSettings.settings.masterSettings.currentSequence;

        for (let i = 0; i < 64; i++) {
            const button = document.createElement('button');
            button.classList.add('step-button');
            if (colorClass) {
                button.classList.add(colorClass[0]); // Apply color class
            }
            button.id = `Sequence${currentSequence}-ch${channelIndex}-step-${i}`;

            button.addEventListener('click', () => {
                let currentStepState = window.unifiedSequencerSettings.getStepState(currentSequence, channelIndex, i);
                window.unifiedSequencerSettings.updateStepState(currentSequence, channelIndex, i, !currentStepState);
                button.classList.toggle('dynamic-color');
 
                // Update the UI for the specific step
                updateSpecificStepUI(currentSequence, channelIndex, i);
            });
            stepsContainer.appendChild(button);
        }

        console.log(`[createStepButtonsForSequence] Completed creating step buttons for Channel ${channelIndex} in Sequence ${currentSequence}.`);
    });
}

document.addEventListener('DOMContentLoaded', createStepButtonsForSequence);

function updateSelectedStepButtonColor() {
    const styleSheet = document.styleSheets[0]; // Reference to the first stylesheet
    const loadSampleButton = document.querySelector('.load-sample-button');
    const loadSampleButtonColor = getComputedStyle(loadSampleButton).backgroundColor;
    const className = '.step-button.selected.dynamic-color';

    // Remove existing rule if it exists
    Array.from(styleSheet.cssRules).forEach((rule, index) => {
        if (rule.selectorText === className) {
            styleSheet.deleteRule(index);
        }
    });

    // Add new rule
    if (loadSampleButtonColor) {
        const newRule = `${className} { background-color: ${loadSampleButtonColor}; }`;
        styleSheet.insertRule(newRule, styleSheet.cssRules.length);
    }
}