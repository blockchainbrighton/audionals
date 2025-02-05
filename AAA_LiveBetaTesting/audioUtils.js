// audioUtils.js
// --------------------------------------------------
// Utility functions for audio processing and playback
// --------------------------------------------------

/**
 * Returns the last segment (ID) of a URL.
 * @param {string} url 
 * @returns {string}
 */
const getIDFromURL = url => url.split('/').pop();

/**
 * Converts a base64 string to an ArrayBuffer.
 * @param {string} base64 
 * @returns {ArrayBuffer}
 */
const base64ToArrayBuffer = base64 => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Wraps audioContext.decodeAudioData in a Promise.
 * @param {ArrayBuffer} audioData 
 * @returns {Promise<AudioBuffer>}
 */
const decodeAudioData = audioData =>
  new Promise((resolve, reject) => {
    audioContext.decodeAudioData(audioData, resolve, reject);
  });

/**
 * Fetches a URL’s HTML and parses it to find the “content type.”
 * (Since the CSS :contains pseudo-class is nonstandard, we loop over all dt elements.)
 * @param {string} url 
 * @returns {Promise<string|undefined>}
 */
async function fetchAndParseContentType(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const dtElements = doc.querySelectorAll('dt');
    let contentType = null;
    dtElements.forEach(dt => {
      if (dt.textContent.trim().toLowerCase() === 'content type') {
        const dd = dt.nextElementSibling;
        if (dd) contentType = dd.textContent.trim();
      }
    });
    if (contentType) return contentType;
    throw new Error('Content type not found');
  } catch (error) {
    console.error('Error fetching or parsing HTML:', error);
  }
}

/**
 * Fetches audio data from a URL. It first tries to parse JSON
 * (to extract a base64-encoded audioData property) and, if that fails,
 * falls back to reading the response as an ArrayBuffer.
 * Then decodes the audio data, saves it in audioBuffers, and updates
 * the corresponding channel element.
 * 
 * @param {string} url 
 * @param {number} channelIndex 
 * @param {HTMLElement|null} loadSampleButtonElement 
 */
const fetchAudio = async (url, channelIndex, loadSampleButtonElement = null) => {
  try {
    const response = await fetch(url);
    let data, audioData, filename;
    let isBinaryData = false;
    // Clone response for a second attempt if needed.
    const clonedResponse = response.clone();

    try {
      // Attempt to parse JSON
      data = await response.json();
      // Assume audioData is a data URL (e.g. "data:audio/mpeg;base64,....")
      audioData = base64ToArrayBuffer(data.audioData.split(',')[1]);
      filename = data.filename || data.fileName;
    } catch (e) {
      console.log("Response is not JSON, trying to read as arrayBuffer");
      try {
        audioData = await clonedResponse.arrayBuffer();
        isBinaryData = true;
        filename = url.split('/').pop();
      } catch (e) {
        console.error("Response could not be processed as JSON or as an ArrayBuffer.", e);
        return;
      }
    }

    // Decode audio data and store in the global audioBuffers map
    const audioBuffer = await decodeAudioData(audioData);
    audioBuffers.set(url, audioBuffer);

    // Update the channel element’s dataset and settings
    const channel = document.querySelector(`.channel[data-id="Channel-${channelIndex + 1}"]`);
    if (channel) {
      channel.dataset.originalUrl = url;
      channel.dataset.audioDataLoaded = 'true';
    }
    channelSettings[channelIndex][0] = url;
    saveCurrentSequence(currentSequence);

    if (loadSampleButtonElement) {
      loadSampleButtonElement.classList.add('button-fixed-width');
      loadSampleButtonElement.style.width = '200px';
      loadSampleButtonElement.textContent = filename ? filename.substring(0, 20) : 'Loaded Sample';
      loadSampleButtonElement.title = filename ? filename : 'Loaded Sample';
      activeChannels.add(channelIndex);
    }
  } catch (error) {
    console.error('Error fetching audio:', error);
  }
};

/**
 * Converts an ArrayBuffer to a Base64-encoded string.
 * @param {ArrayBuffer} buffer 
 * @returns {string}
 */
function bufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Plays a sound on a given channel if the current step is selected.
 * Retrieves the audioBuffer by URL, applies trim settings, and starts playback.
 * 
 * @param {HTMLElement} channel 
 * @param {number} currentStep 
 */
function playSound(channel, currentStep) {
  const stepButtons = channel.querySelectorAll('.step-button');
  if (stepButtons[currentStep] && stepButtons[currentStep].classList.contains('selected')) {
    const url = channel.dataset.originalUrl;
    console.log("[playSound] URL of the audio:", url);
    const audioBuffer = audioBuffers.get(url);
    if (audioBuffer) {
      console.log("[playSound] Audio buffer found for URL:", url);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      const channelIndex = parseInt(channel.dataset.id.split('-')[1]);
      console.log("[playSound] Channel index:", channelIndex);

      // Retrieve trim settings (using a helper, e.g. from LocalStorageUtils)
      const trimSettings = getTrimSettings(`channel-${channelIndex}`);
      let trimStart = trimSettings ? trimSettings.start : 0;
      let trimEnd = trimSettings ? trimSettings.end : audioBuffer.duration;
      console.log("[playSound] Retrieved trimStart and trimEnd:", trimStart, trimEnd);

      trimStart = Math.max(0, Math.min(trimStart, audioBuffer.duration));
      trimEnd = Math.max(trimStart, Math.min(trimEnd, audioBuffer.duration));
      console.log("[playSound] Validated and applied trimStart and trimEnd:", trimStart, trimEnd);

      const duration = trimEnd - trimStart;
      console.log("[playSound] Duration to play:", duration);

      source.connect(gainNodes[channelIndex - 1]);
      gainNodes[channelIndex - 1].connect(audioContext.destination);

      console.log("[playSound] Starting playback from:", trimStart, "for duration:", duration);
      source.start(0, trimStart, duration);
    } else {
      console.log("[playSound] No audio buffer found for URL:", url);
    }
  } else {
    console.log("[playSound] Current step is not selected. Skipping playback.");
  }
}

/**
 * Fetches an auditioned sample from a URL and plays it.
 * If the JSON response contains audioData, it is decoded and played;
 * otherwise, the content type is fetched and logged.
 * 
 * @param {string} url 
 */
async function playAuditionedSample(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.audioData) {
      const audioData = base64ToArrayBuffer(data.audioData.split(',')[1]);
      if (!audioContext) {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
      }
      const audioBuffer = await decodeAudioData(audioData);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    } else {
      console.log("Audional data not found in response, attempting to fetch and parse content type.");
      const contentType = await fetchAndParseContentType(url);
      console.log(`Content type found: ${contentType}`);
      // Additional logic to handle the content type can be added here.
    }
  } catch (error) {
    console.error('Error playing auditioned sample:', error);
  }
}

/**
 * Toggles the play state by calling a start/stop function and updating button classes.
 * @param {boolean} isPlaying 
 * @param {Function} startStopFunction 
 * @param {HTMLElement} firstButton 
 * @param {HTMLElement} secondButton 
 */
function togglePlayState(isPlaying, startStopFunction, firstButton, secondButton) {
  if (!isPlaying) {
    isPlaying = true;
    startStopFunction();
    firstButton.classList.add('selected');
    secondButton.classList.remove('selected');
  }
}

/**
 * Updates the mute state for a channel: sets dataset, toggles button class,
 * updates the corresponding gain node value, and saves the sequence.
 * @param {HTMLElement} channel 
 * @param {boolean} shouldMute 
 */
function updateMuteState(channel, shouldMute) {
  const channelIndex = parseInt(channel.dataset.id.split('-')[1]) - 1;
  channel.dataset.muted = shouldMute ? 'true' : 'false';
  const muteButton = channel.querySelector('.mute-button');
  muteButton.classList.toggle('selected', shouldMute);
  channelMutes[channelIndex] = shouldMute;
  if (shouldMute) {
    gainNodes[channelIndex].gain.value = 0;
  } else {
    gainNodes[channelIndex].gain.value = 1;
  }
  updateDimState(channel, channelIndex);
  saveCurrentSequence(currentSequence);
}

/**
 * Handles a manual toggle of the mute state.
 * @param {HTMLElement} channelElement 
 */
function toggleMute(channelElement) {
  const channelIndex = parseInt(channelElement.dataset.id.split('-')[1]) - 1;
  const isMuted = channelMutes[channelIndex];
  updateMuteState(channelElement, !isMuted);
  console.log('Mute has been toggled by the toggleMute function');
}
