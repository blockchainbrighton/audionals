// channelsForeach.js

import { setupLoadSampleButton } from './loadSampleModalButton_v2.js';

console.log("channelsForeach.js entered");

channels.forEach((channel, index) => {
    // Assign a unique id to each channel and perform any setup work
    channel.dataset.id = `Channel-${index}`;
    setupLoadSampleButton(channel, index);
  
    // Group button & dropdown logic
    // Use class selectors so that each channel’s elements are targeted
    const groupButton = channel.querySelector('.group-button');
    const groupDropdown = channel.querySelector('.group-dropdown');
  
    // Ensure the dropdown is hidden initially
    groupDropdown.style.display = "none";
  
    if (groupButton && groupDropdown) {
      // When the group button is clicked, always show the dropdown immediately.
      groupButton.addEventListener('click', (event) => {
        event.stopPropagation();
        groupDropdown.style.display = "block";
      });
  
      // When a group is selected, log the selection, update state, and hide the dropdown.
      groupDropdown.addEventListener('change', (event) => {
        const selectedGroup = event.target.value;
        console.log(`Channel ${index} assigned to group: ${selectedGroup}`);
        // Optionally, update the channel’s state (e.g., via a data attribute):
        channel.dataset.group = selectedGroup;
        groupDropdown.style.display = "none";
      });
  
      // Hide the dropdown if the user clicks anywhere outside of the current channel element.
      document.addEventListener('click', (event) => {
        if (!channel.contains(event.target)) {
          groupDropdown.style.display = "none";
        }
      });
    }

  
  
    // Mute button event
    const muteButton = channel.querySelector('.mute-button');
    muteButton.addEventListener('click', () => {
      console.log(`Mute button clicked for Channel-${index}`);
      const isMuted = muteButton.classList.toggle('selected');
      updateMuteState(channel, isMuted);
    });
  
    // Solo button event
    const soloButton = channel.querySelector('.solo-button');
    soloButton.addEventListener('click', () => {
      soloedChannels[index] = !soloedChannels[index];
      soloButton.classList.toggle('selected', soloedChannels[index]);
      channels.forEach((otherChannel, otherIndex) => {
        if (index === otherIndex) {
          updateMuteState(otherChannel, false);
        } else {
          updateMuteState(otherChannel, soloedChannels[index]);
        }
      });
    });
  
    // Clear button event
    const clearButton = channel.querySelector('.clear-button');
    let clearConfirmTimeout;
    clearButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!clearButton.classList.contains('flashing')) {
        clearButton.classList.add('flashing');
        clearConfirmTimeout = setTimeout(() => {
          clearButton.classList.remove('flashing');
        }, 2000);
      } else {
        clearSteps(channel, index);
      }
    });
  
    document.addEventListener('click', (e) => {
      if (!clearButton.contains(e.target) && clearButton.classList.contains('flashing')) {
        clearTimeout(clearConfirmTimeout);
        clearButton.classList.remove('flashing');
      }
    });
  
    function clearSteps(channel, channelIndex) {
      const currentSequence = window.unifiedSequencerSettings.getCurrentSequence();
      const numSteps = window.unifiedSequencerSettings.settings.masterSettings.projectSequences[`Sequence${currentSequence}`][`ch${channelIndex}`].steps.length;
      const newStepStates = Array(numSteps).fill(false);
      for (let i = 0; i < numSteps; i++) {
        window.unifiedSequencerSettings.updateStepStateAndReverse(currentSequence, channelIndex, i, newStepStates[i], false);
      }
      const stepButtons = channel.querySelectorAll('.step-button');
      stepButtons.forEach((button, stepIndex) => {
        updateButtonState(button, currentSequence, channelIndex, stepIndex);
      });
      clearTimeout(clearConfirmTimeout);
      clearButton.classList.remove('flashing');
    }
  
    function updateButtonState(button, sequence, channelIndex, stepIndex) {
      const { isActive, isReverse } = window.unifiedSequencerSettings.getStepStateAndReverse(sequence, channelIndex, stepIndex);
      button.classList.toggle('selected', isActive);
      button.classList.toggle('reverse-playback', isReverse);
      button.style.backgroundColor = '';
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
            
            document.getElementById('group-filter').addEventListener('change', function(event) {
                const selectedGroup = event.target.value; // "all" or a specific group value
              
                // Assume channels is a NodeList or array containing all the channel elements.
                channels.forEach((channel) => {
                  // Get the group from the data attribute (if not set, assume an empty string)
                  const channelGroup = channel.dataset.group || "";
                  if (selectedGroup === "all" || channelGroup === selectedGroup) {
                    // Show the channel (you can also remove a 'hidden' class if you prefer)
                    channel.style.display = ""; // or "flex" if that's your default
                  } else {
                    // Hide the channel
                    channel.style.display = "none";
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