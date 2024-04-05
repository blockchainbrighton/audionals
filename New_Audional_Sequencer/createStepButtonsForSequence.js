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
            
                // Toggle a class to indicate reverse playback
                button.classList.toggle('reverse-playback');
            
                // Debugging: Log the current class list
                console.log("Button class list after toggle:", button.classList.toString());
            
                // Change the button color to green to indicate reverse playback
                if (button.classList.contains('reverse-playback')) {
                    button.style.backgroundColor = 'green';
                } else {
                    // Reset to default or selected color if not in reverse mode
                    button.style.backgroundColor = ''; // Consider a better way to manage color
                }
            });

            stepsContainer.appendChild(button);
        }

        console.log(`[createStepButtonsForSequence] Completed creating step buttons for Channel ${channelIndex} in Sequence ${currentSequence}.`);
    });
}

document.addEventListener('DOMContentLoaded', createStepButtonsForSequence);
