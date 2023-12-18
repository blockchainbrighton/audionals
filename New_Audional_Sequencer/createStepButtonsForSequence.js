// createStepButtonsforSequence.js

// Function to create step buttons for a given sequence
function createStepButtonsForSequence() {
    try {
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
                    try {
                        let currentStepState = window.unifiedSequencerSettings.getStepState(currentSequence, channelIndex, i);
                        window.unifiedSequencerSettings.updateStepState(currentSequence, channelIndex, i, !currentStepState);
                        button.classList.toggle('dynamic-color');

                        // Update the color of the step button to match the loadSampleButton
                        updateStepButtonColor(button, loadSampleButton);

                        // Update the UI for the specific step
                        updateSpecificStepUI(currentSequence, channelIndex, i);
                    } catch (error) {
                        console.error(`Error in step button click handler: ${error}`);
                    }
                });
                stepsContainer.appendChild(button);
            }

            console.log(`[createStepButtonsForSequence] Completed creating step buttons for Channel ${channelIndex} in Sequence ${currentSequence}.`);
        });
    } catch (error) {
        console.error(`Error in createStepButtonsForSequence: ${error}`);
    }
}

document.addEventListener('DOMContentLoaded', createStepButtonsForSequence);

function updateStepButtonColor(stepButton, loadSampleButton) {
    console.log("[updateStepButtonColor] entered with ", stepButton, loadSampleButton);
    try {
        // Check if the step button is active (selected)
        if (stepButton.classList.contains('selected')) {
            const colorClass = loadSampleButton.className.match(/\bcolor-[^ ]+/) || '';
            if (colorClass) {
                stepButton.classList.add(colorClass[0]);
                console.log(`[updateStepButtonColor] Applied color class ${colorClass[0]} to active step button`);
            } else {
                // Apply default color (red) if no color class is found
                stepButton.style.backgroundColor = 'red';
                console.log('[updateStepButtonColor] Applied default color (red) to active step button');
            }
        } else {
            console.log('[updateStepButtonColor] Step button is not active (selected), no color update applied');
        }
    } catch (error) {
        console.error(`Error in updateStepButtonColor: ${error}`);
    }
}




function updateSelectedStepButtonColor() {
    console.log("[updateSelectedStepButtonColor] entered");
    const styleSheet = document.styleSheets[0]; // Reference to the first stylesheet
    const loadSampleButton = document.querySelector('.load-sample-button');
    const loadSampleButtonColor = getComputedStyle(loadSampleButton).backgroundColor;
    const className = '.step-button.selected.dynamic-color';

    // Remove existing rule if it exists
    Array.from(styleSheet.cssRules).forEach((rule, index) => {
        if (rule.selectorText === className) {
            console.log("[updateSelectedStepButtonColor] Removing existing rule:", rule.cssText);
            styleSheet.deleteRule(index);
        }
    });

    // Add new rule
    if (loadSampleButtonColor) {
        const newRule = `${className} { background-color: ${loadSampleButtonColor}; }`;
        console.log("[updateSelectedStepButtonColor] Adding new rule:", newRule);
        styleSheet.insertRule(newRule, styleSheet.cssRules.length);
        console.log("[updateSelectedStepButtonColor] New rule added to stylesheet");
    } else {
        console.log("[updateSelectedStepButtonColor] No color found for loadSampleButton");
    }
}
function updateChannelStepButtonColors(channelIndex, loadSampleButton) {
    const channel = document.querySelector(`.channel[data-id="Channel-${channelIndex}"]`);
    const stepButtons = channel.querySelectorAll('.step-button.selected'); // Select only active (selected) step buttons

    stepButtons.forEach(button => {
        const colorClass = loadSampleButton.className.match(/\bcolor-[^ ]+/) || '';
        button.classList.forEach(cls => {
            if (cls.startsWith('color-')) {
                button.classList.remove(cls);
            }
        });

        if (colorClass) {
            button.classList.add(colorClass[0]);
        } else {
            button.style.backgroundColor = 'red'; // Default color if no color class is found
        }
    });
}
