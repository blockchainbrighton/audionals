// sequenceChannelSettings_v2.js








function updateChannelSettingsForSequence() {
    console.log(`Updating Channel Settings for Sequence`);
    updateSequenceData((sequenceData) => {
        sequenceData.channels.forEach((channel, index) => {
            channel.triggers.forEach(trigger => {
                channelSettings[index][trigger] = true; // set the trigger step to 'on'
            });
        });
    });
}

function updateChannelURLsForSequence(sequenceIndex) {
    let sequence = sequences[sequenceIndex];
    sequence.channels.forEach((channel, index) => {
        channel.url = channelURLs[sequenceIndex][index];
    });
}


// A function to be called whenever the sequence changes or JSON data is loaded
function onSequenceOrDataChange() {
  // reset channelSettings to initial state
  channelSettings = Array(16).fill().map(() => [null].concat(Array(64).fill(false)));
  saveCurrentSequence(currentSequence);
  // update the settings and URLs for the current sequence
  updateChannelSettingsForSequence();
  updateChannelURLsForSequence();
  const currentUrls = channelURLs;
  console.log(`URLs for Current Sequence (${currentSequence}) after data change:`, currentUrls);

}

// Function to add URLs to our structure
function addURLsToSequenceArrays(urls) {
    // console.log("Received URLs to add:", urls);
    urls.forEach((url, index) => {
        channelURLs[currentSequence - 1][index] = url;
    });
    // console.log("Updated channelURLs:", channelURLs);
}



// Assuming your load button calls the loadJson function, make sure to also call onSequenceOrDataChange after loading new JSON data

// Log initial channel settings
console.log("Initial channel settings:", channelSettings);

/**
 * Gets the current settings for a specific channel.
 * @param {number} channelIndex - The index of the channel (0 to 15).
 * @returns {Array} An array of 64 boolean values representing the step button states for the given channel.
 */
function getChannelSettings(channelIndex) {
    return channelSettings[channelIndex];
}

/**
 * Sets the settings for a specific channel.
 * @param {number} channelIndex - The index of the channel (0 to 15).
 * @param {Array} settings - An array of 64 boolean values representing the step button states.
 */
function setChannelSettings(channelIndex, settings) {
    channelSettings[channelIndex] = settings;
    
    // Log the settings for the specific channel after they are set
    console.log(`Settings set for Channel-${channelIndex + 1}:`, channelSettings[channelIndex]);
}