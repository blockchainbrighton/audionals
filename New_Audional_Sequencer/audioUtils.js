// audioUtils.js


// Function to get the ID from a URL
function getIDFromURL(url) {
  console.log('[HTML Debugging] getIDFromURL entered');
  const parts = url.split('/');
  return parts[parts.length - 1];
}

// Function to convert base64 to an array buffer
function base64ToArrayBuffer(base64) {
  console.log('[HTML Debugging] [base64ToArrayBuffer] Entered function. Base64 sample:', base64.substring(0, 100));
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
  }
  console.log(`[HTML Debugging] [base64ToArrayBuffer] Generated Uint8Array length: ${bytes.length}`);
  return bytes.buffer;
}

// Function to decode audio data
const decodeAudioData = (audioData) => {
  
  let byteArray = new Uint8Array(audioData.slice(0, 20));
  console.log('[HTML Debugging] [decodeAudioData] ArrayBuffer first 20 bytes:', byteArray.join(', '));
    return new Promise((resolve, reject) => {
      audioContext.decodeAudioData(audioData, (decodedData) => {
          console.log('[HTML Debugging] [decodeAudioData] Audio data decoded successfully.');
          resolve(decodedData);
      }, (error) => {
          console.error('[HTML Debugging] [decodeAudioData] Error decoding audio data:', error);
          reject(error);
      });
  });
};

// Function to fetch and parse the HTML to find the content type
async function fetchAndParseContentType(url) {
  console.log('[HTML Debugging] fetchAndParseContentType entered');
  try {
      const response = await fetch(url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const contentTypeElement = doc.querySelector('dt:contains("content type") + dd');
      if (contentTypeElement) {
        console.log('[HTML Debugging] [fetchAndParseContentType] Found content type:', contentTypeElement.textContent);
          return contentTypeElement.textContent;
      } else {
        console.log('[HTML Debugging] [fetchAndParseContentType] Content type not found.');
          throw new Error('Content type not found');
      }
  } catch (error) {
    console.error('[HTML Debugging] [fetchAndParseContentType] Error fetching or parsing HTML:', error);
  }
}

// Function to fetch audio data
const fetchAudio = async (url, channelIndex,) => {
  console.log('[HTML Debugging] [fetchAudio] Entered function. URL:', url, 'Channel Index:', channelIndex);
  try {
      const response = await fetch(url);
      console.log('[HTML Debugging] [fetchAudio] Response Content-Type:', response.headers.get('Content-Type'));

      let audioData;
      let filename;

      console.log('[HTML Debugging] [fetchAudio] Response received from URL.');


      // Clone the response for a second read attempt if the first one fails
      const clonedResponse = response.clone();

      try {
          // Try to read the response as JSON
          const data = await response.json();
          console.log('[HTML Debugging] [fetchAudio] Response successfully read as JSON.');
          audioData = base64ToArrayBuffer(data.audioData.split(',')[1]);
          filename = data.filename || data.fileName;
      } catch (e) {
        console.log("[fetchAudio] Response is not JSON, trying to read as arrayBuffer");
        try {
              audioData = await clonedResponse.arrayBuffer();
              filename = url.split('/').pop();
              console.log('[HTML Debugging] [fetchAudio] Fallback to arrayBuffer successful. Filename:', filename);
          } catch (e) {
              console.error("Response could not be processed as JSON or as an ArrayBuffer.", e);
              return;
          }
      }

      // Proceed with audio data processing
      console.log('[HTML Debugging] [fetchAudio] Proceeding with audio data processing.');
      const audioBuffer = await decodeAudioData(audioData);
      console.log('[HTML Debugging] [fetchAudio] Audio data decoded.');
      // Assuming audioBuffers is a Map to store audio buffers
      audioBuffers.set(url, audioBuffer);

      // Update the global object with the new URL and audio data
      window.unifiedSequencerSettings.updateSetting('projectURLs', url, channelIndex);
      window.unifiedSequencerSettings.updateSampleDuration(audioBuffer.duration, channelIndex);
      window.unifiedSequencerSettings.updateAllLoadSampleButtonTexts();
      console.log(`[HTML Debugging] [fetchAudio] Updated global object with URL: ${url} and duration: ${audioBuffer.duration} for channel index: ${channelIndex}`);

      console.log(`[HTML Debugging] [fetchAudio] Audio buffer duration: ${audioBuffer.duration} seconds.`);
    } catch (error) {
        console.error('[HTML Debugging] [fetchAudio] Error fetching audio:', error);
    }
  };

// Helper function to convert an ArrayBuffer to a Base64 string
function bufferToBase64(buffer) {
  console.log('bufferToBase64 entered');
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  console.log(`[HTML Debugging] [bufferToBase64] Buffer length: ${len}`);
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = window.btoa(binary);
  console.log(`[HTML Debugging] [bufferToBase64] Converted to base64, length: ${base64.length}`);
  return base64;
}
// Function to play sound
function playSound(currentSequence, channel, currentStep) {
  console.log('playSound entered');
  const channelIndex = getChannelIndex(channel);
  console.log(`[HTML Debugging] [playSound] Processing channel index: ${channelIndex}`);

  const stepState = getStepState(currentSequence, channelIndex, currentStep);
  console.log(`[HTML Debugging] [playSound] setting stepState using getStepState to: ${stepState}`);
  if (!stepState) {
      console.log("[HTML Debugging] [playSound] Current step is not selected. Skipping playback.");
      return;
  }

  const url = getAudioUrl(channelIndex);
  const audioBuffer = getAudioBuffer(url);
  if (!audioBuffer) {
      console.log("[HTML Debugging] [playSound] No audio buffer found for URL:", url);
      return;
  }

  playTrimmedAudio(channelIndex, audioBuffer, url);
}

function getChannelIndex(channel) {
  return parseInt(channel.dataset.id.split('-')[1]);
}

function getStepState(currentSequence, channelIndex, currentStep) {
  console.log(`[HTML Debugging] [getStepState called] currentSequence: ${currentSequence}, channelIndex: ${channelIndex}, currentStep: ${currentStep}`);
  return window.unifiedSequencerSettings.getStepState(currentSequence, channelIndex, currentStep);
}

function getAudioUrl(channelIndex) {
  return window.unifiedSequencerSettings.getprojectUrlforChannel(channelIndex);
}

function getAudioBuffer(url) {
  return audioBuffers.get(url);
}

function playTrimmedAudio(channelIndex, audioBuffer, url) {
  console.log('playTrimmedAudio entered');
  console.log("[playTrimmedAudio] Audio buffer found for URL:", url);

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  const { trimStart, duration } = calculateTrimValues(channelIndex, audioBuffer);
  source.connect(gainNodes[channelIndex]);
  gainNodes[channelIndex].connect(audioContext.destination);

  
  console.log(`[debug - playSound] Playing audio from URL: ${url} for channel index: ${channelIndex} at trimStart: ${trimStart} and duration: ${duration}`);

  source.start(0, trimStart, duration);
}

function calculateTrimValues(channelIndex, audioBuffer) {
  const trimSettings = window.unifiedSequencerSettings.getTrimSettings(channelIndex);
  let trimStart = (trimSettings.startSliderValue / 100) * audioBuffer.duration;
  let trimEnd = (trimSettings.endSliderValue / 100) * audioBuffer.duration;

  trimStart = Math.max(0, Math.min(trimStart, audioBuffer.duration));
  trimEnd = Math.max(trimStart, Math.min(trimEnd, audioBuffer.duration));

  return {
      trimStart: trimStart,
      duration: trimEnd - trimStart
  };
}




async function playAuditionedSample(url) {
  console.log('playAuditionedSample entered');
  try {
    const response = await fetch(url);
    const data = await response.json();

    // Check if the expected audioData field is present
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
      // Additional logic to handle the content type will be added here
    }
  } catch (error) {
    console.error('Error playing auditioned sample:', error);
  }
};



// Function to toggle the play state
function togglePlayState(isPlaying, startStopFunction, firstButton, secondButton) {
  console.log('togglePlayState entered');
  if (!isPlaying) {
    isPlaying = true;
    startStopFunction();
    firstButton.classList.add('selected');
    secondButton.classList.remove('selected');
  }
}

// Function to update the mute state in a single function
function updateMuteState(channel, isMuted) {
  console.log('updateMuteState entered');
  console.log("updateMuteState - isMuted: " + isMuted);
  const channelIndex = parseInt(channel.dataset.id.split('-')[1]);
  channel.dataset.muted = isMuted ? 'true' : 'false';
  const muteButton = channel.querySelector('.mute-button');

  muteButton.classList.toggle('selected', isMuted);
  channelMutes[channelIndex] = isMuted;

  // Mute or unmute using gain node
  if (isMuted) {
      gainNodes[channelIndex].gain.value = 0; // Mute the channel
      // console.log("updateMuteState - Channel-" + channel.dataset.id.replace("Channel-", "") + " Muted");
  } else {
      gainNodes[channelIndex].gain.value = 1; // Unmute the channel (set to original volume)
      // console.log("updateMuteState - Channel-" + channel.dataset.id.replace("Channel-", "") + " Unmuted");
  }

  // Update the dim state of the channel
  updateDimState(channel, channelIndex);

  // console.log(`Channel-${channel.dataset.id.replace("Channel-", "")} Muted: ${isMuted}`);
}


  

// Function to handle manual toggle of the mute button
function toggleMute(channelElement) {
  console.log('toggleMute entered');
  const channelIndex = parseInt(channelElement.dataset.id.split('-')[1]);
  const isMuted = channelMutes[channelIndex];
  updateMuteState(channelElement, !isMuted, channelIndex);
  console.log('Mute has been toggled by the toggleMute function');
}
