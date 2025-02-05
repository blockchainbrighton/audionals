// channelsForeach.js

import { setupLoadSampleButton } from './loadSampleModalButton_v2.js';

console.log("channelsForeach.js entered");
    channels.forEach((channel, index) => {
        channel.dataset.id = `Channel-${index}`;
        setupLoadSampleButton(channel, index);


        // Directly use the gainNode from UnifiedSequencerSettings
        const gainNode = window.unifiedSequencerSettings.gainNodes[index];
        if (!gainNode) {
            console.error("GainNode not found for channel:", index);
            return;
        }

        // const volumeButton = channel.querySelector('.volume-button');
        // if (volumeButton) {
        //     volumeButton.addEventListener('click', () => {
        //         openVolumeModal(volumeButton, index);
        //     });
        // }




        const muteButton = channel.querySelector('.mute-button');
        muteButton.addEventListener('click', () => {
            console.log(`Mute button clicked for Channel-${index}`);
            const isMuted = muteButton.classList.toggle('selected');
            updateMuteState(channel, isMuted);
        });
    
        const soloButton = channel.querySelector('.solo-button');
            soloButton.addEventListener('click', () => {
                soloedChannels[index] = !soloedChannels[index];
                soloButton.classList.toggle('selected', soloedChannels[index]);

                // Update mute state for all channels based on solo state
                channels.forEach((otherChannel, otherIndex) => {
                    if (index === otherIndex) {
                        // If this is the soloed channel, ensure it's not muted
                        updateMuteState(otherChannel, false);
                    } else {
                        // Mute all other channels if this channel is soloed
                        updateMuteState(otherChannel, soloedChannels[index]);
                    }
                });
            });


            const clearButton = channel.querySelector('.clear-button');
            let clearConfirmTimeout;
            
            clearButton.addEventListener('click', (e) => {
                e.stopPropagation();
            
                if (!clearButton.classList.contains('flashing')) {
                    // Start the flashing effect
                    clearButton.classList.add('flashing');
            
                    // Set a timer to reset the button after 2 seconds
                    clearConfirmTimeout = setTimeout(() => {
                        clearButton.classList.remove('flashing');
                    }, 2000);
                } else {
                    // Clear the steps if the button is clicked again while flashing
                    clearSteps(channel, index);
                }
            });
            
            // Handle clicks outside the clear button
            document.addEventListener('click', (e) => {
                if (!clearButton.contains(e.target) && clearButton.classList.contains('flashing')) {
                    // Reset the button if clicked outside while flashing
                    clearTimeout(clearConfirmTimeout);
                    clearButton.classList.remove('flashing');
                }
            });
            
            // Function to clear steps and update UI
            function clearSteps(channel, channelIndex) {
                const currentSequence = window.unifiedSequencerSettings.getCurrentSequence();
                const numSteps = window.unifiedSequencerSettings.settings.masterSettings.projectSequences[`Sequence${currentSequence}`][`ch${channelIndex}`].steps.length;
            
                const newStepStates = Array(numSteps).fill(false); // Reset all steps to false
            
                // Update steps with the new states, ensuring wrapping without affecting other sequences
                for (let i = 0; i < numSteps; i++) {
                    window.unifiedSequencerSettings.updateStepStateAndReverse(currentSequence, channelIndex, i, newStepStates[i], false);
                }
            
                // Update the UI for all step buttons in the current channel
                const stepButtons = channel.querySelectorAll('.step-button');
                stepButtons.forEach((button, stepIndex) => {
                    updateButtonState(button, currentSequence, channelIndex, stepIndex);
                });
            
                // Immediately stop the flashing effect and reset the button
                clearTimeout(clearConfirmTimeout);
                clearButton.classList.remove('flashing');
            }
            
            function updateButtonState(button, sequence, channelIndex, stepIndex) {
                const { isActive, isReverse } = window.unifiedSequencerSettings.getStepStateAndReverse(sequence, channelIndex, stepIndex);
                button.classList.toggle('selected', isActive);
                button.classList.toggle('reverse-playback', isReverse);
                button.style.backgroundColor = ''; // Reset background color
                if (isActive) button.style.backgroundColor = 'red';
                if (isReverse) button.style.backgroundColor = 'green';
            }
            
            // Global document click listener for clear buttons
            document.addEventListener('click', () => {
                channels.forEach((channel, channelIndex) => {
                    if (clearClickedOnce[channelIndex]) {
                        const clearConfirm = channel.querySelector('.clear-confirm');
                        clearConfirm.style.display = "none";
                        clearTimeout(clearConfirmTimeout[channelIndex]);
                        clearClickedOnce[channelIndex] = false;
                    }
                });
            });
            
    


    // Function to copy the full URL instead of just the Ordinal ID
    function copyOrdinalId(channelIndex) {
        const url = window.unifiedSequencerSettings.channelURLs(channelIndex);
        if (!url) {
            console.log('No URL found for channel:', channelIndex);
            return;
        }

        // Copying the full URL to the clipboard
        navigator.clipboard.writeText(url)
            .then(() => console.log('Full URL copied:', url))
            .catch(err => console.error('Error copying URL:', err));
    }


    // Function to extract the Ordinal ID from a URL
    function extractOrdinalIdFromUrl(url) {
        const match = url.match(/([^\/]+)$/);
        return match ? match[1] : null;
    }

    // Function to paste the full URL
    function pasteOrdinalId(channelIndex) {
        navigator.clipboard.readText()
            .then(fullUrl => {
                // Ensure only one URL is added and updated by the user
                if (isValidURL(fullUrl)) {
                    // Retrieve the current URLs
                    let currentURLs = [...window.unifiedSequencerSettings.settings.masterSettings.channelURLs];

                    // Update the URL for the specific channel
                    currentURLs[channelIndex] = fullUrl;

                    // Set the updated URLs using the new method
                    window.unifiedSequencerSettings.setChannelURLs(currentURLs);
                    console.log('Pasted full URL:', fullUrl);
                } else {
                    console.error('Invalid URL format.');
                }
            })
            .catch(err => console.error('Error pasting URL:', err));
    }



    // Function to paste the Channel Settings
    function pasteChannelSettings(channelIndex) {
        navigator.clipboard.readText()
            .then(text => {
                // Assuming the text is JSON-formatted settings
                let settings = JSON.parse(text);

                // Set the channel settings
                // Replace 'setChannelSettings' with your actual method
                window.unifiedSequencerSettings.setChannelSettings(channelIndex, settings);
                console.log('Pasted Channel Settings:', settings);
            })
            .catch(err => console.error('Error pasting Channel Settings:', err));
        }
    });