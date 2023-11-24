// sequenceChannelSettings.js


// Create an initial state for all 16 channels, with 64 steps each set to 'off' (false)

// Utility function to create an array with a default value
function createArray(length, defaultValue) {
    return Array(length).fill(defaultValue);
}

function setChannelVolume(channelIndex, volume) {
    const channel = document.querySelector(`.channel[data-id="Channel-${channelIndex + 1}"]`);
    channel.dataset.volume = volume;
    updateChannelVolume(channel);
  
    // Update sequence data
    updateSequenceData({
        channelIndex: channelIndex,
        volume: volume
    });
  
    saveCurrentSequence(currentSequence);
  }
  
    function updateChannelVolume(channel) {
      const volume = parseFloat(channel.dataset.volume);
      const gainNode = gainNodes[parseInt(channel.dataset.id.split('-')[1]) - 1];
      gainNode.gain.value = volume;
      }
