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
                        button.classList.add(colorClass[0]);
                    } else {
                        // If no color class, ensure default color is used
                        button.style.backgroundColor = 'var(--accent-color)';
                    }
                } else {
                    button.classList.remove(...button.classList);
                    button.classList.add('step-button'); // Re-add the default class
                    button.style.backgroundColor = ''; // Remove inline style if any
                }

                updateSpecificStepUI(currentSequence, channelIndex, i);
            });

            button.addEventListener('contextmenu', (e) => {
                console.log("Right-click detected on button:", e.target.id); // Debugging line
                e.preventDefault(); // Prevent the context menu from showing
            
                // Retrieve the current step state and reverse flag
                let { isActive, isReverse } = window.unifiedSequencerSettings.getStepStateAndReverse(currentSequence, channelIndex, i);
            
                // Toggle reverse playback state
                isReverse = !isReverse;
            
                // Update step state with the new reverse playback state
                window.unifiedSequencerSettings.updateStepStateAndReverse(currentSequence, channelIndex, i, isActive, isReverse);
            
                // Update UI based on the new state
                if (isReverse) {
                    button.classList.add('reverse-playback');
                    button.style.backgroundColor = 'green'; // Consider using a CSS class instead
                } else {
                    button.classList.remove('reverse-playback');
                    // Reset to default or selected color if not in reverse mode
                    button.style.backgroundColor = ''; // Consider using a CSS class instead
                }
            });
            

            stepsContainer.appendChild(button);
        }

        console.log(`[createStepButtonsForSequence] Completed creating step buttons for Channel ${channelIndex} in Sequence ${currentSequence}.`);
    });
}

document.addEventListener('DOMContentLoaded', createStepButtonsForSequence);
