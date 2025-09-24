// audioUtils.js

// Global buffer and active source storage
const audioBuffers = new Map();
const activeAudioSources = new Set();

// Debug flag (set to true to enable detailed logging)
const DEBUG = false;

// Helper logging function (only logs when DEBUG is true)
const log = (msg, ...args) => { if (DEBUG) console.log(msg, ...args); };

/**
 * Returns the last part of a URL.
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
  log('[base64ToArrayBuffer]', 'Converting base64. Length:', base64.substring(0, 100).length);
  // Use Uint8Array.from for brevity
  const binaryString = window.atob(base64);
  const buffer = Uint8Array.from(binaryString, char => char.charCodeAt(0)).buffer;
  log('[base64ToArrayBuffer]', 'Converted buffer length:', buffer.byteLength);
  return buffer;
};

/**
 * Converts an ArrayBuffer to a base64 string.
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
const bufferToBase64 = buffer => {
  log('[bufferToBase64]', 'Buffer byteLength:', buffer.byteLength);
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  const base64 = window.btoa(binary);
  log('[bufferToBase64]', 'Converted base64 length:', base64.length);
  return base64;
};

/**
 * Processes a JSON response containing audio data.
 * @param {Response} response
 * @returns {Promise<{audioData: ArrayBuffer|null, sampleName: string}>}
 */
async function processJSONResponse(response) {
  log('[processJSONResponse]', 'Parsing JSON response');
  const jsonResponse = await response.json();
  const sampleName = jsonResponse.filename || '';
  const audioData = jsonResponse.audioData
    ? base64ToArrayBuffer(jsonResponse.audioData.split(',')[1])
    : null;
  log('[processJSONResponse]', 'Sample name:', sampleName);
  return { audioData, sampleName };
}

/**
 * Processes an HTML response to extract audio data.
 * @param {string} htmlText
 * @returns {Promise<{audioData: ArrayBuffer|null, sampleName: string|null}>}
 */
async function processHTMLResponse(htmlText) {
  log('[processHTMLResponse]', 'Parsing HTML response');
  const doc = new DOMParser().parseFromString(htmlText, 'text/html');
  const audioSource = doc.querySelector('audio[data-audionalSampleName] source');
  const sampleName = doc.getElementById('sampleName')?.textContent.trim() || null;
  log('[processHTMLResponse]', 'Sample name:', sampleName);

  let audioData = null;
  if (audioSource) {
    const src = audioSource.getAttribute('src');
    if (/^data:audio\/(wav|mp3|flac);base64,/.test(src.toLowerCase())) {
      audioData = base64ToArrayBuffer(src.split(',')[1]);
      log('[processHTMLResponse]', 'Audio data extracted from HTML.');
    } else {
      console.error('[processHTMLResponse] Unexpected data format.');
    }
  } else {
    console.error('[processHTMLResponse] No audio source element found.');
  }
  return { audioData, sampleName };
}

// Listen for messages carrying ArrayBuffer audio data (e.g. from the jiMS10 Synthesizer)
window.addEventListener('message', async event => {
  if (event.data.type === 'audioData') {
    const { channelIndex, data, mimeType, filename } = event.data;
    log(`[Message] Received audio data for channel ${channelIndex}`);
    if (data instanceof ArrayBuffer) {
      const blob = new Blob([data], { type: mimeType });
      const persistentUrl = URL.createObjectURL(blob) + `?channel=${channelIndex}`;
      try {
        await decodeAndStoreAudio(data, filename, persistentUrl, channelIndex);
        log(`[Message] Audio stored for channel ${channelIndex}`);
        window.unifiedSequencerSettings.settings.masterSettings.channelURLs[channelIndex] = persistentUrl;
      } catch (error) {
        console.error('Error processing audio data:', error);
      }
    } else {
      console.error('Expected ArrayBuffer but received:', typeof data);
    }
  }
});

/**
 * Decodes audio data using the AudioContext.
 * @param {ArrayBuffer} audioData
 * @returns {Promise<AudioBuffer>}
 */
const decodeAudioData = audioData => {
  const audioContext = window.unifiedSequencerSettings.audioContext;
  return new Promise((resolve, reject) => {
    audioContext.decodeAudioData(
      audioData,
      decoded => { log('[decodeAudioData]', 'Decoded successfully.'); resolve(decoded); },
      error => {
        console.error('[decodeAudioData] Error:', error);
        reject(error);
      }
    );
  });
};

/**
 * Decodes and stores audio (and its reverse) in global buffers,
 * and assigns the audio buffer to the corresponding source node.
 * @param {ArrayBuffer} audioData
 * @param {string} sampleName
 * @param {string} fullUrl
 * @param {number} channelIndex
 */
async function decodeAndStoreAudio(audioData, sampleName, fullUrl, channelIndex) {
  log('[decodeAndStoreAudio]', 'Decoding audio for channel', channelIndex);
  try {
    const audioBuffer = await decodeAudioData(audioData);
    const reverseBuffer = await createReverseBuffer(audioBuffer);
    const forwardKey = `channel_${channelIndex}_forward`;
    const reverseKey = `channel_${channelIndex}_reverse`;
    audioBuffers.set(forwardKey, audioBuffer);
    audioBuffers.set(reverseKey, reverseBuffer);
    audioBuffers.set(fullUrl, audioBuffer);
    audioBuffers.set(fullUrl + '_reverse', reverseBuffer);
    log('[decodeAndStoreAudio]', `Stored buffers for channel ${channelIndex}, URL: ${fullUrl}`);

    // Reset and (re)create the source node if needed
    const settings = window.unifiedSequencerSettings;
    if (settings.sourceNodes[channelIndex]) {
      settings.sourceNodes[channelIndex].disconnect();
      settings.sourceNodes[channelIndex] = null;
    }
    if (!settings.sourceNodes[channelIndex]) {
      settings.sourceNodes[channelIndex] = settings.audioContext.createBufferSource();
    }
    if (!settings.sourceNodes[channelIndex].buffer) {
      settings.sourceNodes[channelIndex].buffer = audioBuffer;
      log('[decodeAndStoreAudio]', `Assigned buffer to source node for channel ${channelIndex}`);
    }
    settings.updateProjectChannelNamesUI(channelIndex, sampleName);
    if (typeof updateWaveformDisplay === 'function') {
      updateWaveformDisplay(channelIndex, audioBuffer);
      log('[decodeAndStoreAudio]', 'Waveform display updated.');
    }
  } catch (error) {
    console.error('[decodeAndStoreAudio] Error:', error);
  }
}

/**
 * Creates a reversed copy of the provided AudioBuffer.
 * @param {AudioBuffer} audioBuffer
 * @returns {Promise<AudioBuffer>}
 */
async function createReverseBuffer(audioBuffer) {
  const ctx = window.unifiedSequencerSettings.audioContext;
  const { numberOfChannels, length, sampleRate } = audioBuffer;
  const reverseBuffer = ctx.createBuffer(numberOfChannels, length, sampleRate);
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const forwardData = audioBuffer.getChannelData(ch);
    const reverseData = reverseBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      reverseData[i] = forwardData[length - 1 - i];
    }
  }
  return reverseBuffer;
}

/**
 * Fetches audio from a URL and processes it based on its content type.
 * @param {string} url
 * @param {number} channelIndex
 * @param {string|null} sampleNameGiven
 * @param {Function|null} callback
 */
async function fetchAudio(url, channelIndex, sampleNameGiven = null, callback = null) {
  try {
    const fullUrl = formatURL(url);
    const response = await fetch(fullUrl);
    if (!response.ok) {
      console.error(`[fetchAudio] Failed to fetch ${fullUrl} (Status: ${response.status})`);
      return;
    }

    const contentType = response.headers.get('Content-Type') || '';
    let audioData, sampleName = window.unifiedSequencerSettings.settings.masterSettings.projectChannelNames[channelIndex];

    if (contentType.includes('application/json')) {
      ({ audioData, sampleName } = await processJSONResponse(response));
      sampleName = sampleName || sampleNameGiven || fullUrl.split('/').pop();
    } else if (contentType.includes('text/html')) {
      const htmlText = await response.text();
      ({ audioData, sampleName } = await processHTMLResponse(htmlText));
      sampleName = sampleName || sampleNameGiven || fullUrl.split('/').pop();
    } else {
      audioData = await response.arrayBuffer();
      sampleName = sampleName || sampleNameGiven || fullUrl.split('/').pop().split(/[?#]/)[0] || 'Unnamed Sample';
    }

    if (audioData) {
      await decodeAndStoreAudio(audioData, sampleName, fullUrl, channelIndex);
      const settings = window.unifiedSequencerSettings;
      if (!settings.settings.masterSettings.projectChannelNames[channelIndex]) {
        settings.updateProjectChannelNamesUI(channelIndex, sampleName);
        settings.settings.masterSettings.projectChannelNames[channelIndex] = sampleName;
      }
      settings.settings.masterSettings.channelURLs[channelIndex] = fullUrl;
      if (callback) callback(channelIndex, sampleName);
    } else {
      console.error('[fetchAudio] No audio data received.');
    }
  } catch (error) {
    console.error(`[fetchAudio] Error fetching audio from ${url}:`, error);
  }
}

/**
 * Returns an iframe ID mapped to a given channel index.
 * @param {number} channelIndex
 * @returns {string|undefined}
 */
const getIframeIdByChannelIndex = channelIndex =>
  (JSON.parse(localStorage.getItem('channelIframeMappings')) || {})[channelIndex];

/** Constant: channels where fade effects are applied */
const fadeChannels = [6, 7, 11, 12, 13, 15];

/**
 * Plays sound for a given channel and step.
 * @param {number} currentSequence
 * @param {HTMLElement} channel
 * @param {number} currentStep
 */
function playSound(currentSequence, channel, currentStep) {
  // Immediately determine the channel index
  const channelIndex = getChannelIndex(channel);
  console.log(`[playSound] For channel ${channelIndex}: currentSequence=${currentSequence}, currentStep=${currentStep}`);
  
  const { isActive, isReverse } = window.unifiedSequencerSettings.getStepStateAndReverse(currentSequence, channelIndex, currentStep);
  const channelLabel = `synth_channel_${channelIndex}`;
  const bc = new BroadcastChannel(channelLabel);
  const iframeId = getIframeIdByChannelIndex(channelIndex);
  const iframeBC = iframeId ? new BroadcastChannel(`synth_channel_${iframeId}`) : null;

  if (isActive) {
    bc.postMessage({ type: 'startArpeggiator', channelIndex });
    if (iframeBC) {
      iframeBC.postMessage({ type: 'startArpeggiator', channelIndex });
    }
  } else if (isReverse) {
    bc.postMessage({ type: 'stopArpeggiator', channelIndex });
    if (iframeBC) {
      iframeBC.postMessage({ type: 'stopArpeggiator', channelIndex });
    }
  }
  bc.close();
  if (iframeBC) {
    iframeBC.close();
  }

  if (!isActive && !isReverse) {
    console.log(`[playSound] Channel ${channelIndex} is neither active nor reverse. Exiting playSound.`);
    return;
  }

  const bufferKey = `channel_${channelIndex}_${isReverse ? 'reverse' : 'forward'}`;
  const audioBuffer = audioBuffers.get(bufferKey);
  if (!audioBuffer) {
    console.error(`[playSound] No audio buffer found for key: ${bufferKey}`);
    return;
  }

  const audioCtx = window.unifiedSequencerSettings.audioContext;
  // Always create a new source node for each playback
  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;

  const userGainNode = window.unifiedSequencerSettings.gainNodes[channelIndex];
  if (!userGainNode) {
    console.error(`[playSound] No gain node found for channel ${channelIndex}`);
    return;
  }
  
  // Retrieve and verify playback speed
  let playbackSpeed = window.unifiedSequencerSettings.channelPlaybackSpeed[channelIndex];
  if (!isFinite(playbackSpeed)) {
    console.error(`[playSound] Non-finite playbackSpeed for channel ${channelIndex}:`, playbackSpeed);
    playbackSpeed = 1; // Default to 1 if necessary
  }
  source.playbackRate.setValueAtTime(playbackSpeed, audioCtx.currentTime);
  
  // Create a dedicated gain node for fades
  const fadeGain = audioCtx.createGain();
  fadeGain.connect(userGainNode);
  source.connect(fadeGain);
  
  const { trimStart, duration } = calculateTrimValues(channelIndex, audioBuffer, isReverse);
  const fadeDuration = 0.0025 / playbackSpeed;
  const adjustedDuration = duration / playbackSpeed;
  const userVolume = window.unifiedSequencerSettings.settings.masterSettings.channelVolume[channelIndex];
  
  console.log(`[playSound] Channel ${channelIndex}: trimStart=${trimStart}, duration=${duration}, fadeDuration=${fadeDuration}, adjustedDuration=${adjustedDuration}, userVolume=${userVolume}`);
  
  const trimSettings = window.unifiedSequencerSettings.getTrimSettings(channelIndex);
  const isTrimmed = trimSettings.startSliderValue !== 0 || trimSettings.endSliderValue !== 100;
  const applyFades = fadeChannels.includes(channelIndex) && isTrimmed;

  activeAudioSources.add(source);
  if (applyFades) {
    fadeGain.gain.setValueAtTime(0, audioCtx.currentTime);
    fadeGain.gain.linearRampToValueAtTime(userVolume, audioCtx.currentTime + fadeDuration);
    source.start(0, trimStart, duration);
    fadeGain.gain.setValueAtTime(userVolume, audioCtx.currentTime + adjustedDuration - fadeDuration);
    fadeGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + adjustedDuration);
  } else {
    source.start(0, trimStart, duration);
  }
  fadeGain.gain.setValueAtTime(userVolume, audioCtx.currentTime);

  source.onended = () => {
    fadeGain.disconnect();
    source.disconnect();
    activeAudioSources.delete(source);
    window.unifiedSequencerSettings.sourceNodes[channelIndex] = null;
    console.log(`[playSound] Source for channel ${channelIndex} ended and cleaned up.`);
  };

  window.unifiedSequencerSettings.sourceNodes[channelIndex] = source;
  console.log(`[playSound] New source node created and started for channel ${channelIndex}.`);
}

/**
 * Creates an offline audio buffer rendered at a given playback rate.
 * @param {AudioBuffer} originalBuffer
 * @param {number} playbackRate
 * @returns {Promise<AudioBuffer>}
 */
const createOfflineAudioBuffer = (originalBuffer, playbackRate) => {
  const offlineCtx = new OfflineAudioContext(
    originalBuffer.numberOfChannels,
    originalBuffer.length / playbackRate,
    originalBuffer.sampleRate
  );
  const source = offlineCtx.createBufferSource();
  source.buffer = originalBuffer;
  source.playbackRate.value = playbackRate;
  source.connect(offlineCtx.destination);
  source.start();
  return offlineCtx.startRendering();
};

/**
 * Stops all currently active audio sources.
 */
function stopAllAudio() {
  log('[stopAllAudio]', 'Stopping all audio');
  activeAudioSources.forEach(source => {
    try {
      source.stop(0);
      source.disconnect();
    } catch (error) {
      console.error('[stopAllAudio] Error stopping source:', error);
    }
  });
  activeAudioSources.clear();
}

/**
 * Calculates trim start and duration based on channel settings.
 * @param {number} channelIndex
 * @param {AudioBuffer} audioBuffer
 * @param {boolean} isReversePlayback
 * @returns {{trimStart: number, duration: number, trimEnd: number}}
 */
function calculateTrimValues(channelIndex, audioBuffer, isReversePlayback) {
  const { startSliderValue = 0, endSliderValue = 100 } = window.unifiedSequencerSettings.getTrimSettings(channelIndex);
  console.log(`[calculateTrimValues] Channel ${channelIndex}: startSliderValue = ${startSliderValue}, endSliderValue = ${endSliderValue}, audioBuffer.duration = ${audioBuffer.duration}`);
  
  let trimStart = (startSliderValue / 100) * audioBuffer.duration;
  let trimEnd = (endSliderValue / 100) * audioBuffer.duration;
  if (isReversePlayback) {
    const total = audioBuffer.duration;
    trimStart = total - (endSliderValue / 100) * total;
    trimEnd = total - (startSliderValue / 100) * total;
    console.log(`[calculateTrimValues] Channel ${channelIndex} (Reverse): trimStart recalculated = ${trimStart}, trimEnd recalculated = ${trimEnd}`);
  }
  trimStart = Math.max(0, Math.min(trimStart, audioBuffer.duration));
  trimEnd = Math.max(trimStart, Math.min(trimEnd, audioBuffer.duration));
  
  const duration = trimEnd - trimStart;
  console.log(`[calculateTrimValues] Channel ${channelIndex}: final trimStart = ${trimStart}, trimEnd = ${trimEnd}, duration = ${duration}`);
  return { trimStart, duration, trimEnd };
}

/**
 * Returns a channel index parsed from the channel element's dataset ID.
 * @param {HTMLElement} channel
 * @returns {number}
 */
const getChannelIndex = channel => {
  const parts = channel.dataset.id.split('-');
  const index = parseInt(parts[1]);
  console.log(`[getChannelIndex] Parsed channel index ${index} from dataset.id: ${channel.dataset.id}`);
  return index;
};

/**
 * Retrieves an audio URL for a channel from unified settings.
 * @param {number} channelIndex
 * @returns {string}
 */
function getAudioUrl(channelIndex) {
  const url = window.unifiedSequencerSettings.getprojectUrlforChannel(channelIndex);
  console.log(`[getAudioUrl] Channel ${channelIndex}: Retrieved URL: ${url}`);
  return typeof url === 'undefined' ? 'defaultURL' : url;
}

/**
 * Retrieves an audio buffer from the global map.
 * @param {string} url
 * @returns {AudioBuffer|undefined}
 */
const getAudioBuffer = url => {
  const buffer = audioBuffers.get(url);
  console.log(`[getAudioBuffer] Retrieved buffer for URL ${url}:`, buffer);
  return buffer;
};

/**
 * Toggles play state for UI buttons.
 * @param {boolean} isPlaying
 * @param {Function} startStopFunction
 * @param {HTMLElement} firstButton
 * @param {HTMLElement} secondButton
 */
function togglePlayState(isPlaying, startStopFunction, firstButton, secondButton) {
  console.log(`[togglePlayState] isPlaying: ${isPlaying}`);
  if (!isPlaying) {
    isPlaying = true;
    startStopFunction();
    firstButton.classList.add('selected');
    secondButton.classList.remove('selected');
    console.log(`[togglePlayState] Toggled play state: firstButton selected, secondButton deselected.`);
  }
}

/**
 * Updates the mute state of a channel and stores/restores its volume.
 * @param {HTMLElement} channel
 * @param {boolean} isMuted
 */
function updateMuteState(channel, isMuted) {
  const channelIndex = parseInt(channel.dataset.id.split('-')[1]);
  console.log(`[updateMuteState] Channel ${channelIndex}: isMuted set to ${isMuted}`);
  channel.dataset.muted = isMuted ? 'true' : 'false';
  const muteButton = channel.querySelector('.mute-button');
  if (muteButton) {
    muteButton.classList.toggle('selected', isMuted);
    console.log(`[updateMuteState] Mute button for channel ${channelIndex} updated to ${isMuted ? 'selected' : 'deselected'}`);
  } else {
    console.warn(`[updateMuteState] No mute button found on channel ${channelIndex}`);
  }
  const gainNode = window.unifiedSequencerSettings.gainNodes[channelIndex];
  if (gainNode) {
    if (isMuted) {
      // Store current volume before muting
      window.unifiedSequencerSettings.settings.masterSettings.channelVolume[channelIndex] = gainNode.gain.value;
      gainNode.gain.value = 0;
      console.log(`[updateMuteState] Channel ${channelIndex}: Gain set to 0.`);
    } else {
      const storedVolume = window.unifiedSequencerSettings.settings.masterSettings.channelVolume[channelIndex];
      gainNode.gain.value = storedVolume;
      console.log(`[updateMuteState] Channel ${channelIndex}: Gain restored to stored volume: ${storedVolume}`);
    }
  } else {
    console.error(`[updateMuteState] No gain node found for channel ${channelIndex}`);
  }
}

/**
 * Manually toggles mute on a channel element.
 * @param {HTMLElement} channelElement
 */
function toggleMute(channelElement) {
  const isMuted = channelElement.dataset.muted === 'true';
  console.log(`[toggleMute] Channel ${channelElement.dataset.id}: Current mute state: ${isMuted}`);
  updateMuteState(channelElement, !isMuted);
  console.log(`[toggleMute] Channel ${channelElement.dataset.id}: Toggled mute state to: ${!isMuted}`);
}