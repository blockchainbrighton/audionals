// createStepButtonsforSequence.js

// Function to create step buttons for a given sequence
function createStepButtonsForSequence() {
    console.log("[createStepButtonsForSequence] [SeqDebug] entered");
    channels.forEach((channel, channelIndex) => {
        const stepsContainer = channel.querySelector('.steps-container');
        stepsContainer.innerHTML = '';

        let currentSequence = window.unifiedSequencerSettings.getCurrentSequence();

        for (let i = 0; i < 64; i++) {
            const button = document.createElement('button');
            button.classList.add('step-button');
            button.id = `Sequence${currentSequence}-ch${channelIndex}-step-${i}`;

            const { isActive, isReverse } = window.unifiedSequencerSettings.getStepStateAndReverse(currentSequence, channelIndex, i);

            // Apply 'selected' and 'reverse-playback' classes based on step state
            if (isActive) {
                button.classList.add('selected');
                button.style.backgroundColor = 'red'; // Active step
            }
            if (isReverse) {
                button.classList.add('reverse-playback');
                // Ensure that the reverse state has a distinct visual cue even if not active
                if (!isActive) {
                    button.style.backgroundColor = 'green'; // Reverse but not active step
                }
            }


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
                let currentSequence = window.unifiedSequencerSettings.getCurrentSequence();
                let stepInfo = window.unifiedSequencerSettings.getStepStateAndReverse(currentSequence, channelIndex, i);
                let isReverse = !stepInfo.isReverse; // Toggle reverse state
                window.unifiedSequencerSettings.updateStepStateAndReverse(currentSequence, channelIndex, i, stepInfo.isActive, isReverse);
            
                // Direct UI Update for Reverse Playback
                if (isReverse) {
                    button.classList.add('selected', 'reverse-playback');
                    button.style.backgroundColor = 'green'; // Active step

                } else {
                    button.classList.remove('selected', 'reverse-playback');
                }
            });
            

            stepsContainer.appendChild(button);
        }
    });
}

document.addEventListener('DOMContentLoaded', createStepButtonsForSequence);
