// sequenceChannelSettings.js
// --------------------------------------------------
// Functions for managing channel step settings and sequence data
// --------------------------------------------------

const totalSequenceCount = 64;

/**
 * Utility function to create an array with a default value.
 * @param {number} length 
 * @param {*} defaultValue 
 * @returns {Array}
 */
const createArray = (length, defaultValue) => Array(length).fill(defaultValue);

// Initialize channelSettings (16 channels, each with 65 entries; index 0 is a placeholder)
let channelSettings = createArray(16, [null].concat(createArray(64, false)));

// Initialize sequences (64 sequences, each with 16 channels; each channel has 65 entries)
let sequences = createArray(totalSequenceCount, createArray(16, [null].concat(createArray(64, false))));

/**
 * Updates channel settings for the current sequence using updateSequenceData callback.
 */
function updateChannelSettingsForSequence() {
  updateSequenceData(sequenceData => {
    sequenceData.channels.forEach((channel, index) => {
      channel.triggers.forEach(trigger => {
        channelSettings[index][trigger] = true;
      });
    });
  });
}

/**
 * Updates channel URLs for the current sequence.
 */
function updateChannelURLsForSequence() {
  updateSequenceData(sequenceData => {
    sequenceData.channels.forEach((channel, index) => {
      channelURLs[currentSequence - 1][index] = channel.url;
    });
  });
}

// Create a 2D array for URLs (one row per sequence, one column per channel)
const channelURLs = Array.from({ length: totalSequenceCount }, () => Array(16).fill(''));

/**
 * Called when the sequence changes or new JSON data is loaded.
 */
function onSequenceOrDataChange() {
  channelSettings = Array.from({ length: 16 }, () => [null].concat(Array(64).fill(false)));
  saveCurrentSequence(currentSequence);
  updateChannelSettingsForSequence();
  updateChannelURLsForSequence();
  console.log(`URLs for Current Sequence (${currentSequence}) after data change:`, channelURLs);
}

/**
 * Adds an array of URLs to the current sequence.
 * @param {Array} urls 
 */
function addURLsToSequenceArrays(urls) {
  urls.forEach((url, index) => {
    channelURLs[currentSequence - 1][index] = url;
  });
}

console.log("Initial channel settings:", channelSettings);

/**
 * Returns the current settings for a given channel.
 * @param {number} channelIndex (0–15)
 * @returns {Array} 64 boolean values (step states)
 */
function getChannelSettings(channelIndex) {
  return channelSettings[channelIndex];
}

/**
 * Sets the settings for a specific channel.
 * @param {number} channelIndex (0–15)
 * @param {Array} settings (64 boolean values)
 */
function setChannelSettings(channelIndex, settings) {
  channelSettings[channelIndex] = settings;
  console.log(`Settings set for Channel-${channelIndex + 1}:`, channelSettings[channelIndex]);
}

// --------------------------------------------------
// Sequence Loading and UI Updating Functions
// --------------------------------------------------

/**
 * Loads a sequence by its number.
 * Initializes a sequence if it does not exist, sets the BPM,
 * updates the UI, and fetches new audio if the URL has changed.
 * @param {number} sequenceNumber 
 */
function loadSequence(sequenceNumber) {
  if (!sequences[sequenceNumber - 1]) {
    sequences[sequenceNumber - 1] = Array.from({ length: 16 }, () => [null].concat(Array(64).fill(false)));
  }
  if (sequenceNumber - 1 < 0 || sequenceNumber - 1 >= sequenceBPMs.length) {
    console.error(`Invalid sequenceNumber: ${sequenceNumber}`);
    return;
  }
  const bpm = sequenceBPMs[sequenceNumber - 1];
  const bpmSlider = document.getElementById('bpm-slider');
  const bpmDisplay = document.getElementById('bpm-display');
  bpmSlider.value = bpm;
  bpmDisplay.innerText = bpm;
  bpmSlider.addEventListener('input', function() {
    const newBpm = parseInt(bpmSlider.value);
    updateSequenceData({ sequenceIndex: currentSequence - 1, bpm: newBpm });
  });
  bpmSlider.dispatchEvent(new Event('input'));

  const sequenceChannels = sequences[sequenceNumber - 1];
  if (!sequenceChannels || !Array.isArray(sequenceChannels)) {
    console.error(`Sequence ${sequenceNumber} is invalid:`, sequenceChannels);
    return;
  }
  updateUIForSequence(sequenceNumber);
  currentSequence = sequenceNumber;

  sequenceChannels.forEach((channelData, channelIndex) => {
    const currentUrl = channelData[0];
    const channelElement = document.querySelector(`.channel[data-id="Channel-${channelIndex + 1}"]`);
    const previousUrl = channelElement?.dataset.originalUrl;
    if (currentUrl && currentUrl !== previousUrl) {
      const loadSampleButton = channelElement.querySelector('.load-sample-button');
      fetchAudio(currentUrl, channelIndex, loadSampleButton);
    }
  });
}

/**
 * Saves the current channelSettings to the current sequence.
 * @param {number} sequenceNumber 
 */
function saveCurrentSequence(sequenceNumber) {
  sequences[sequenceNumber - 1] = [...channelSettings];
}

/**
 * Loads the next sequence (if available) and updates the UI.
 */
function loadNextSequence() {
  if (currentSequence < totalSequenceCount) {
    saveCurrentSequence(currentSequence);
    currentSequence++;
    loadSequence(currentSequence);
    const sequenceDisplayElement = document.getElementById('current-sequence-display');
    if (sequenceDisplayElement) {
      sequenceDisplayElement.textContent = 'Sequence ' + currentSequence;
    }
    updateActiveQuickPlayButton();
  } else {
    console.warn("You've reached the last sequence.");
  }
}

/**
 * Updates the UI to reflect the step states in a given sequence.
 * Also calls markSequenceAsLive to highlight the current sequence.
 * @param {number} sequenceNumber 
 */
function updateUIForSequence(sequenceNumber) {
  if (sequenceNumber > 0 && sequenceNumber <= sequences.length) {
    channelSettings = sequences[sequenceNumber - 1];
    saveCurrentSequence(currentSequence);
    markSequenceAsLive(sequenceNumber - 1);
  } else {
    console.error("Invalid sequence number:", sequenceNumber);
  }
  const sequenceSettings = sequences[sequenceNumber - 1];
  channels.forEach((channel, index) => {
    const stepButtons = channel.querySelectorAll('.step-button');
    const toggleMuteButtons = channel.querySelectorAll('.toggle-mute');
    stepButtons.forEach(button => button.classList.remove('selected'));
    toggleMuteButtons.forEach(button => button.classList.remove('toggle-mute'));
    sequenceSettings[index].forEach((stepState, pos) => {
      if (pos === 0) return; // Skip placeholder
      if (stepState) {
        stepButtons[pos - 1].classList.add('selected');
      }
    });
  });
}

/**
 * Changes the current sequence.
 * @param {number} seq 
 */
function changeSequence(seq) {
  currentSequence = seq;
  onSequenceOrDataChange();
}

/**
 * Loads channel settings from a preset object.
 * @param {Object} preset 
 */
function loadChannelSettingsFromPreset(preset) {
  preset.channels.forEach((channelData, channelIndex) => {
    const stepSettings = [null].concat(Array(64).fill(false));
    channelData.triggers.forEach(trigger => {
      stepSettings[trigger] = true;
    });
    channelSettings[channelIndex] = stepSettings;
    if (channelData.url) {
      const loadSampleButton = document.querySelector(`.channel[data-id="Channel-${channelIndex + 1}"] .load-sample-button`);
      fetchAudio(channelData.url, channelIndex, loadSampleButton);
    }
  });
  saveCurrentSequence(currentSequence);
}

/**
 * Updates a specific step’s state for a channel.
 * @param {number} channelIndex (0–15)
 * @param {number} stepIndex (0–63)
 * @param {boolean} state 
 */
function updateStep(channelIndex, stepIndex, state) {
  channelSettings[channelIndex][stepIndex + 1] = state;
  updateSequenceData({ channelIndex: channelIndex, stepSettings: channelSettings[channelIndex] });
}

// --------------------------------------------------
// Event Listeners for Sequence Navigation
// --------------------------------------------------
window.addEventListener('setupComplete', () => {
  loadAndDisplaySequence(1);
});

document.getElementById('next-sequence').addEventListener('click', loadNextSequence);

document.getElementById('prev-sequence').addEventListener('click', () => {
  if (currentSequence > 1) {
    saveCurrentSequence(currentSequence);
    currentSequence--;
    loadSequence(currentSequence);
    document.getElementById('current-sequence-display').textContent = `Sequence ${currentSequence}`;
    updateActiveQuickPlayButton();
  } else {
    console.warn("You're already on the first sequence.");
  }
});
