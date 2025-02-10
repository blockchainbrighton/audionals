// -------------------------------
// Global state --
let currentTrimmerInstance = null;
let currentTrimmerChannelIndex = null;
let cachedAudioTrimModuleHTML = null; // NEW: cache for the remote HTML

// -------------------------------
// Helper to load (and cache) the audio trim module HTML.
function loadAudioTrimModuleHTML() {
  // If already loaded, return a resolved Promise.
  if (cachedAudioTrimModuleHTML) {
    return Promise.resolve(cachedAudioTrimModuleHTML);
  }
  return fetch('AudioTrimModule/audioTrimModule.html')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load audio trim module: ${response.statusText}`);
      }
      return response.text();
    })
    .then(html => {
      cachedAudioTrimModuleHTML = html;
      return html;
    });
}

// -------------------------------
// Update the trimmer with a new audio buffer.
function updateAudioTrimmerWithBuffer(audioBuffer) {
  if (currentTrimmerInstance) {
    currentTrimmerInstance.setAudioBuffer(audioBuffer);
    currentTrimmerInstance.drawWaveform();
    currentTrimmerInstance.updateSliderValues();
    currentTrimmerInstance.updateDimmedAreas();
  }
}

// -------------------------------
// Updated helper that uses the blob URL keys.
// It retrieves the audio buffer from AudioUtilsPart1 using the blob URL.
function updateAudioTrimmerWithBufferHelper(url, channelIndex) {
  // Use the shared AudioUtilsPart1 state to retrieve the buffer via the blob URL.
  const audioBuffer = window.AudioUtilsPart1._audioBuffers.get(url);
  if (audioBuffer) {
    updateAudioTrimmerWithBuffer(audioBuffer);
  } else {
    console.error(`Audio buffer not found for blob URL: ${url}`);
  }
}

function playTrimmedAudioForChannel(channelIndex) {
  if (currentTrimmerInstance && currentTrimmerChannelIndex === channelIndex) {
    currentTrimmerInstance.playTrimmedAudio();
  } else {
    console.error('No active trimmer instance or channel index mismatch');
  }
}

function stopAudioForChannel(channelIndex) {
  if (currentTrimmerInstance && currentTrimmerInstance.channelIndex === channelIndex) {
    currentTrimmerInstance.stopAudio();
  } else {
    console.error('No active trimmer instance or channel index mismatch');
  }
}

// -------------------------------
// Initialize the audio trimmer modal for the given channel.
function initializeAudioTrimmer(channelIndex) {
  currentTrimmerChannelIndex = channelIndex;

  loadAudioTrimModuleHTML()
    .then(html => {
      // Place the (cached) HTML into the container.
      const container = document.getElementById('audio-trimmer-container');
      if (!container) throw new Error('Audio trimmer container not found in the DOM.');

      // Clear any previous content and set the new HTML.
      container.innerHTML = html;

      // Update the new header with project and channel information.
      const projectName = window.unifiedSequencerSettings.settings.masterSettings.projectName || "Project";
      const channelName = window.unifiedSequencerSettings.settings.masterSettings.projectChannelNames[channelIndex] || `Channel ${channelIndex + 1}`;
      const headerEl = document.getElementById("audio-trimmer-header");
      if (headerEl) {
        headerEl.textContent = `${projectName} - ${channelName} Audio Trim`;
      }

      // Use requestAnimationFrame so that the DOM is updated.
      requestAnimationFrame(() => {
        try {
          // Create a new AudioTrimmer instance.
          currentTrimmerInstance = new AudioTrimmer(channelIndex);
          currentTrimmerInstance.initialize();

          applyTrimSettings(channelIndex);

          const url = getChannelUrl(channelIndex);
          if (url) {
            updateAudioTrimmerWithBufferHelper(url, channelIndex);
          } else {
            console.error(`No URL found for channel index: ${channelIndex}`);
          }
        } catch (error) {
          console.error('Error during audio trimmer initialization:', error);
        }
      });

      // Show the modal.
      const modal = document.getElementById('audio-trimmer-modal');
      modal.style.display = 'block';
    })
    .catch(error => console.error('Error loading audio trimmer module:', error));
}

// -------------------------------
// Apply stored trim settings to the trimmer.
function applyTrimSettings(channelIndex) {
  const waveformCanvas = document.getElementById('waveformCanvas');
  if (!waveformCanvas) {
    console.error('Waveform canvas not found in the DOM.');
    return;
  }
  const trimSettings = getTrimSettings(channelIndex);
  if (trimSettings && currentTrimmerInstance) {
    currentTrimmerInstance.startSlider.value = trimSettings.startSliderValue;
    currentTrimmerInstance.endSlider.value = trimSettings.endSliderValue;
    currentTrimmerInstance.setIsLooping(trimSettings.isLooping);
    currentTrimmerInstance.updateSliderValues();
  }
}

// -------------------------------
// Retrieves the blob URL for a channel from unified settings.
function getChannelUrl(channelIndex) {
  return window.unifiedSequencerSettings.settings.masterSettings.channelURLs[channelIndex];
}

// -------------------------------
// Global event listeners for opening/closing the modal.
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.open-audio-trimmer').forEach((button, channelIndex) => {
    button.addEventListener('click', () => {
      const url = getChannelUrl(channelIndex);
      if (!url) {
        console.error(`No URL found for channel index: ${channelIndex}`);
        return;
      }
      // Update the trimmer with the audio buffer using the blob URL.
      updateAudioTrimmerWithBufferHelper(url, channelIndex);
      initializeAudioTrimmer(channelIndex);
    });
  });

  document.querySelector('.close-button').addEventListener('click', () => {
    if (currentTrimmerInstance) {
      const settings = {
        startSliderValue: currentTrimmerInstance.getStartSliderValue(),
        endSliderValue: currentTrimmerInstance.getEndSliderValue(),
        isLooping: currentTrimmerInstance.getIsLooping()
      };
      setTrimSettings(currentTrimmerChannelIndex, settings.startSliderValue, settings.endSliderValue, settings.isLooping);
    }
    const modal = document.getElementById('audio-trimmer-modal');
    if (modal) modal.style.display = 'none';
    // Reset our state.
    currentTrimmerInstance = null;
    currentTrimmerChannelIndex = null;
  });
});
