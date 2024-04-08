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

            // Left-click Listener: Toggle Step Activation
            button.addEventListener('click', () => {
                let currentStepState = window.unifiedSequencerSettings.getStepState(currentSequence, channelIndex, i);
                let newState = !currentStepState; // Toggle state
                window.unifiedSequencerSettings.updateStepState(currentSequence, channelIndex, i, newState);

                // Direct UI Update
                if (newState) {
                    button.classList.add('selected');
                    button.style.backgroundColor = 'red'; // Active step
                } else {
                    button.classList.remove('selected', 'reverse-playback');
                    button.style.backgroundColor = ''; // Inactive step
                }
            });

            // Right-click Listener: Set Step for Reverse Playback
            button.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                let {isActive, isReverse} = window.unifiedSequencerSettings.getStepStateAndReverse(currentSequence, channelIndex, i);
                let newReverseState = !isReverse;
                window.unifiedSequencerSettings.updateStepStateAndReverse(currentSequence, channelIndex, i, true, newReverseState);

                // Direct UI Update for Reverse Playback
                if (newReverseState) {
                    button.classList.add('selected', 'reverse-playback');
                    button.style.backgroundColor = 'green'; // Reverse playback
                } else {
                    button.classList.remove('reverse-playback');
                    button.style.backgroundColor = 'red'; // Still active but not reverse
                }
            });

            stepsContainer.appendChild(button);
        }
    });
}

document.addEventListener('DOMContentLoaded', createStepButtonsForSequence);
