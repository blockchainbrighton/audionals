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

            // Left-click to toggle activation and deactivation
            button.addEventListener('click', () => {
                let currentStepState = window.unifiedSequencerSettings.getStepState(currentSequence, channelIndex, i);
                // Toggle the step state
                let newState = !currentStepState;
                // Update step state and rely on the observer to update UI
                window.unifiedSequencerSettings.updateStepState(currentSequence, channelIndex, i, newState);

                // Immediate UI feedback
                if (newState) {
                    button.classList.add('selected');
                    button.style.backgroundColor = 'red'; // Make it red if activated
                } else {
                    button.classList.remove('selected', 'reverse-playback');
                    button.style.backgroundColor = ''; // Reset color if deactivated
                }
            });

            // Right-click to set the trigger green for reverse playback
            button.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // Prevent the context menu from showing
                console.log("Right-click detected on button:", e.target.id);

                // Assuming right-click always activates the step and sets reverse
                let isActive = true;
                let isReverse = !button.classList.contains('reverse-playback');

                // Update step state with the new active and reverse playback states
                window.unifiedSequencerSettings.updateStepStateAndReverse(currentSequence, channelIndex, i, isActive, isReverse);

                // Immediate UI feedback for reverse playback
                if (isReverse) {
                    button.classList.add('selected', 'reverse-playback');
                    button.style.backgroundColor = 'green'; // Make it green for reverse playback
                } else {
                    // If toggling off reverse, keep it red for active state
                    button.classList.remove('reverse-playback');
                    button.style.backgroundColor = 'red';
                }
            });

            stepsContainer.appendChild(button);
        }

        console.log(`[createStepButtonsForSequence] Completed creating step buttons for Channel ${channelIndex} in Sequence ${currentSequence}.`);
    });
}

document.addEventListener('DOMContentLoaded', createStepButtonsForSequence);
