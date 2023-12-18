// createStepButtonsforSequence.js

// Function to create step buttons for a given sequence
function createStepButtonsForSequence() {
    console.log("[createStepButtonsForSequence] [SeqDebug] entered");
    channels.forEach((channel, channelIndex) => {
        const stepsContainer = channel.querySelector('.steps-container');
        stepsContainer.innerHTML = '';
    
        let currentSequence = window.unifiedSequencerSettings.settings.masterSettings.currentSequence;
    
        for (let i = 0; i < 64; i++) {
            const button = document.createElement('button');
            button.classList.add('step-button');
            button.id = `Sequence${currentSequence}-ch${channelIndex}-step-${i}`;

            button.addEventListener('click', () => {
                let currentStepState = window.unifiedSequencerSettings.getStepState(currentSequence, channelIndex, i);
                window.unifiedSequencerSettings.updateStepState(currentSequence, channelIndex, i, !currentStepState);
            
                // Toggle the 'selected' class and update color based on the loadSampleButton's color
                if (button.classList.toggle('selected')) {
                    const loadSampleButton = channel.querySelector('.load-sample-button');
                    const colorClass = loadSampleButton.className.match(/\bcolor-[^ ]+/);
            
                    if (colorClass) {
                        console.log("Applied color class:", colorClass[0]); // Log the applied color class
                        button.classList.add(colorClass[0]);
                    } else {
                        console.log("No color class found, applying default color."); // Log when default color is used
                        button.style.backgroundColor = 'var(--accent-color)';
                    }
                } else {
                    button.classList.remove(...button.classList);
                    button.classList.add('step-button'); // Re-add the default class
                    button.style.backgroundColor = ''; // Remove inline style if any
                }
            
                updateSpecificStepUI(currentSequence, channelIndex, i);
            });
            
            stepsContainer.appendChild(button);
            
        }

        console.log(`[createStepButtonsForSequence] Completed creating step buttons for Channel ${channelIndex} in Sequence ${currentSequence}.`);
    });
}

document.addEventListener('DOMContentLoaded', createStepButtonsForSequence);
