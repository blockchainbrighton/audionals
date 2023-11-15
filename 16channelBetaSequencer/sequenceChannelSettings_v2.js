// sequenceChannelSettings_v2.js

function updateChannelSettingsForSequence() {
    console.log(`Updating Channel Settings for Sequence`);
    const currentSequenceIndex = getCurrentSequence() - 1;
    const sequence = sequencerMaster.sequences[currentSequenceIndex];
    
    sequence.channels.forEach((channel, channelIndex) => {
        channel.triggers.forEach((trigger, triggerIndex) => {
            if (trigger) {    
                console.log(`Getting Channel Trigger Settings for channel ${channelIndex + 1} and trigger ${triggerIndex + 1}`);
                console.log(`Channel Index before calling getChannelTriggers: ${channelIndex}`);
                let updatedTriggers = getChannelTriggers(currentSequenceIndex, channelIndex);
                updatedTriggers[triggerIndex] = true;
                updateChannelTriggers(currentSequenceIndex, channelIndex, updatedTriggers);
            }
        });
    });
}


function updateChannelURLsForSequence(sequenceIndex) {
    const sequence = sequencerMaster.sequences[sequenceIndex];
    sequence.channels.forEach((channel, channelIndex) => {
        updateChannelURL(channelIndex, sequencerMaster.audioURLs[channelIndex]);
    });
    console.log(`URLs for Sequence ${sequenceIndex + 1} updated.`);
}

// A function to be called whenever the sequence changes or JSON data is loaded
function onSequenceOrDataChange() {
    console.log('Sequence or Data Change Detected');
    resetChannelSettings(); // Reset channel settings using a helper function
    saveCurrentSequence(getCurrentSequence());
    updateChannelSettingsForSequence();
    updateChannelURLsForSequence(getCurrentSequence() - 1);
    console.log(`Data updated for current sequence: ${getCurrentSequence()}`);
}

// Function to add URLs to our structure
function addURLsToSequenceArrays(urls) {
    console.log("Adding URLs to Sequence Arrays:", urls);
    urls.forEach((url, index) => {
        updateChannelURL(index, url);
    });
    console.log("URLs updated for current sequence.");
}

console.log("Initial channel settings:", getChannelSettings());


// Assuming your load button calls the loadJson function, make sure to also call onSequenceOrDataChange after loading new JSON data

// Log initial channel settings
console.log("Initial channel settings:", channelSettings);

/**
 * Gets the current settings for a specific channel.
 * @param {number} channelIndex - The index of the channel (0 to 15).
 * @returns {Array} An array of 64 boolean values representing the step button states for the given channel.
 */
function getChannelSettings(channelIndex) {
    return getChannelTriggers(getCurrentSequence() - 1, channelIndex); // Updated to use helper function
}

/**
 * Sets the settings for a specific channel.
 * @param {number} channelIndex - The index of the channel (0 to 15).
 * @param {Array} settings - An array of 64 boolean values representing the step button states.
 */
function setChannelSettings(channelIndex, settings) {
    updateChannelTriggers(getCurrentSequence() - 1, channelIndex, settings);
    console.log(`Settings set for Channel-${channelIndex + 1}:`, settings);
}