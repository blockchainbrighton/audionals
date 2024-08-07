// audioUtils.js

const audioBuffers = new Map();
const activeAudioSources = new Set();

// Using sample URLs as keys in the audioBuffers map instead of channel numbers 
// for greater flexibility, scalability, and reusability of audio data. 


// Function to get the ID from a URL
function getIDFromURL(url) {
  // console.log('[HTML Debugging] getIDFromURL entered');
  const parts = url.split('/');
  return parts[parts.length - 1];
}

// Logging function to reduce redundancy
function logConversion(conversionType, details, length) {
  // console.log(`[HTML Debugging] [${conversionType}] Entered function. ${details} length: ${length}`);
}

// Function to convert base64 to an array buffer
function base64ToArrayBuffer(base64) {
  logConversion('base64ToArrayBuffer', 'Base64 sample', base64.substring(0, 100).length);
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  logConversion('base64ToArrayBuffer', 'Generated Uint8Array', bytes.length);
  return bytes.buffer;
}

// Helper function to convert an ArrayBuffer to a Base64 string
function bufferToBase64(buffer) {
  logConversion('bufferToBase64', 'Buffer', buffer.byteLength);
  const bytes = new Uint8Array(buffer);
  let binary = String.fromCharCode.apply(null, bytes);
  const base64 = window.btoa(binary);
  logConversion('bufferToBase64', 'Converted to base64', base64.length);
  return base64;
}



async function processJSONResponse(response, channelIndex) {
  console.log("[processJSONResponse] Processing JSON response");
  const jsonResponse = await response.json();
  console.log("[processJSONResponse] JSON response parsed");

  const sampleName = jsonResponse.filename || '';
  console.log(`[processJSONResponse] sampleName determined from JSON: ${sampleName}`);

  const audioData = jsonResponse.audioData ? base64ToArrayBuffer(jsonResponse.audioData.split(',')[1]) : null;
  console.log("[processJSONResponse] audioData set from JSON");

  return { audioData, sampleName };
}



async function processHTMLResponse(htmlText) {
  console.log("[processHTMLResponse] Processing HTML content");
  const doc = new DOMParser().parseFromString(htmlText, 'text/html');
  const audioSourceElement = doc.querySelector('audio[data-audionalSampleName] source');
  const sampleNameElement = doc.getElementById('sampleName');

  let sampleName = sampleNameElement ? sampleNameElement.textContent.trim() : null;
  console.log(`[processHTMLResponse] Sample name determined from HTML: ${sampleName}`);

  let audioData = null;
  if (audioSourceElement) {
      const base64AudioData = audioSourceElement.getAttribute('src');
      console.log("[processHTMLResponse] Audio source element found");

      if (/^data:audio\/(wav|mp3|flac);base64,/.test(base64AudioData.toLowerCase())) {
          audioData = base64ToArrayBuffer(base64AudioData.split(',')[1]);
          console.log("[processHTMLResponse] Audio data set from HTML");
      } else {
          console.error("[processHTMLResponse] Audio data does not have expected base64 prefix.");
      }
  } else {
      console.error("[processHTMLResponse] No audio source element found.");
  }

  return { audioData, sampleName };
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Import Audio buffers from jiMS10 Synthesizer

// Message handler for receiving ArrayBuffer formatted audio data from synth
window.addEventListener('message', async (event) => {
  if (event.data.type === 'audioData') {
      const channelIndex = event.data.channelIndex;
      console.log(`Received audio data message with channel index: ${channelIndex}`);
      if (event.data.data instanceof ArrayBuffer) {
          console.log(`Processing ArrayBuffer audio data for channel ${channelIndex}`);
          
          // Create a persistent URL for the blob, including the channel index in the URL
          const blob = new Blob([event.data.data], {type: event.data.mimeType});
          const persistentUrl = URL.createObjectURL(blob);
          const uniquePersistentUrl = `${persistentUrl}?channel=${channelIndex}`;
          console.log(`Persistent URL created for logging and use: ${uniquePersistentUrl}`);

          // Pass this unique URL to decodeAndStoreAudio for processing and storage
          try {
              await decodeAndStoreAudio(event.data.data, event.data.filename, uniquePersistentUrl, channelIndex);
              console.log(`Audio data processed and stored for channel ${channelIndex}`);

              // Store the unique URL for later access by other modules such as audio trimming
              window.unifiedSequencerSettings.settings.masterSettings.channelURLs[channelIndex] = uniquePersistentUrl;
          } catch (error) {
              console.error('Error processing audio data:', error);
          }
      } else {
          console.error('Received data is not an ArrayBuffer as expected');
      }
  }
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Function to decode audio data
const decodeAudioData = (audioData) => {
  const audioContext = window.unifiedSequencerSettings.audioContext;
  return new Promise((resolve, reject) => {
      audioContext.decodeAudioData(audioData, decodedData => {
          console.log('[HTML Debugging] [decodeAudioData] Audio data decoded successfully.');
          resolve(decodedData);
      }, error => {
          console.error('[HTML Debugging] [decodeAudioData] Detailed Error:', { message: error.message, code: error.code });
          reject(error);
      });
  });
};

async function decodeAndStoreAudio(audioData, sampleName, fullUrl, channelIndex) {
  console.log("[decodeAndStoreAudio] Attempting to decode audio data");
  try {
      const audioBuffer = await decodeAudioData(audioData);
      console.log("[decodeAndStoreAudio] Audio data decoded");

      // Create a reverse buffer by copying and reversing the audioBuffer
      const reverseBuffer = await createReverseBuffer(audioBuffer);

      // Store buffers using both channel-specific keys and URL-based keys
      const forwardKey = `channel_${channelIndex}_forward`;
      const reverseKey = `channel_${channelIndex}_reverse`;

      // Use a global buffer storage
      audioBuffers.set(forwardKey, audioBuffer);
      audioBuffers.set(reverseKey, reverseBuffer);

      // Associate URLs with the buffers
      audioBuffers.set(`${fullUrl}`, audioBuffer);
      audioBuffers.set(`${fullUrl}_reverse`, reverseBuffer);

      console.log(`[decodeAndStoreAudio] Forward and reverse audio buffers stored for channel ${channelIndex} and URL ${fullUrl}: ${sampleName}`);
      
      // Mark this channel as an audio channel
      channelIsSynth[channelIndex] = false;
      console.log(`Channel ${channelIndex} is set as an audio channel`);


      // Disconnect existing connections if the source node is already created
      if (window.unifiedSequencerSettings.sourceNodes[channelIndex]) {
          window.unifiedSequencerSettings.sourceNodes[channelIndex].disconnect();
          window.unifiedSequencerSettings.sourceNodes[channelIndex] = null;  // Clear the existing source node if needed
      }

      // Check if the source node already exists and reassign the buffer
      if (!window.unifiedSequencerSettings.sourceNodes[channelIndex]) {
          window.unifiedSequencerSettings.sourceNodes[channelIndex] = window.unifiedSequencerSettings.audioContext.createBufferSource();
      }

      if (!window.unifiedSequencerSettings.sourceNodes[channelIndex].buffer) {
          window.unifiedSequencerSettings.sourceNodes[channelIndex].buffer = audioBuffer;
          console.log(`[decodeAndStoreAudio] Buffer assigned to source node for channel ${channelIndex}`);
      }

      // Update UI or other components that depend on these buffers
      window.unifiedSequencerSettings.updateProjectChannelNamesUI(channelIndex, sampleName);
      console.log(`[decodeAndStoreAudio] UI updated with new sample name for channel ${channelIndex}`);

      // Optionally, trigger any UI updates or callbacks that need these buffers
      if (typeof updateWaveformDisplay === "function") {
          updateWaveformDisplay(channelIndex, audioBuffer);
          console.log("[decodeAndStoreAudio] Waveform display updated.");
      }

  } catch (error) {
      console.error('[decodeAndStoreAudio] Error decoding and storing audio:', error);
  }
}

// Function to create a reverse buffer from an existing AudioBuffer
// Accessibility: Both buffers can be accessed using their keys. 
// For example, if you need the reverse buffer for https://example.com/audio.mp3, 
// you would look for https://example.com/audio.mp3_reverse in the audioBuffers map.
async function createReverseBuffer(audioBuffer) {
  const audioContext = window.unifiedSequencerSettings.audioContext;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;

  const reverseBuffer = audioContext.createBuffer(numberOfChannels, length, sampleRate);
  for (let channel = 0; channel < numberOfChannels; channel++) {
      const forwardData = audioBuffer.getChannelData(channel);
      const reverseData = reverseBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
          reverseData[i] = forwardData[length - 1 - i];
      }
  }
  return reverseBuffer;
}

async function fetchAudio(url, channelIndex, sampleNameGiven = null, callback = null) {
  try {
      const fullUrl = formatURL(url);
      const response = await fetch(fullUrl);

      if (!response.ok) {
          console.error(`[fetchAndProcessAudio] Fetch request failed for URL: ${fullUrl}, Status: ${response.status}`);
          return;
      }

      const contentType = response.headers.get('Content-Type');
      let audioData;
      // Initially, do not change the sample name if it already exists.
      let sampleName = window.unifiedSequencerSettings.settings.masterSettings.projectChannelNames[channelIndex];

      // Determine the content type and process accordingly
      if (contentType.includes('application/json')) {
          const { audioData: processedAudioData, sampleName: processedSampleName } = await processJSONResponse(response, channelIndex);
          audioData = processedAudioData;
          // Only update the sampleName if it hasn't been set by the user.
          if (!sampleName) {
              sampleName = processedSampleName || sampleNameGiven || fullUrl.split('/').pop();
          }
      } else if (contentType.includes('text/html')) {
          const htmlText = await response.text();
          const { audioData: processedAudioData, sampleName: processedSampleName } = await processHTMLResponse(htmlText);
          audioData = processedAudioData;
          // Only update the sampleName if it hasn't been set by the user.
          if (!sampleName) {
              sampleName = processedSampleName || sampleNameGiven || fullUrl.split('/').pop();
          }
      } else if (contentType.includes('audio/flac')) { // Recognize FLAC content type
          audioData = await response.arrayBuffer();
          // Only update the sampleName if it hasn't been set by the user.
          if (!sampleName) {
              sampleName = sampleNameGiven || fullUrl.split('/').pop().split('#')[0].split('?')[0] || 'Unnamed Sample';
          }
      } else {
          audioData = await response.arrayBuffer();
          // Only update the sampleName if it hasn't been set by the user.
          if (!sampleName) {
              // Use the filename from the URL as a fallback if the sampleName is empty or undefined
              sampleName = sampleNameGiven || fullUrl.split('/').pop().split('#')[0].split('?')[0] || 'Unnamed Sample';
          }
      }

      if (audioData) {
          await decodeAndStoreAudio(audioData, sampleName, fullUrl, channelIndex);

          // The name will only be updated in the UI and settings if it wasn't previously set by the user
          if (!window.unifiedSequencerSettings.settings.masterSettings.projectChannelNames[channelIndex]) {
              window.unifiedSequencerSettings.updateProjectChannelNamesUI(channelIndex, sampleName);
              window.unifiedSequencerSettings.settings.masterSettings.projectChannelNames[channelIndex] = sampleName;
          }
          window.unifiedSequencerSettings.settings.masterSettings.channelURLs[channelIndex] = fullUrl;

          if (callback) callback(channelIndex, sampleName);
      } else {
          console.error("[fetchAndProcessAudio] No audio data to process.");
      }
  } catch (error) {
      console.error(`[fetchAndProcessAudio] Error fetching audio from URL: ${url}`, error);
  }
}

function getIframeIdByChannelIndex(channelIndex) {
  const mappings = JSON.parse(localStorage.getItem('channelIframeMappings')) || {};
  return mappings[channelIndex];
}

function playSound(currentSequence, channel, currentStep) {
  console.log(`[slave] [playSound] Active audio sources: ${activeAudioSources.size} for sequence ${currentSequence}`);
  const channelIndex = getChannelIndex(channel);
  const { isActive, isReverse } = window.unifiedSequencerSettings.getStepStateAndReverse(currentSequence, channelIndex, currentStep);

  // Original BroadcastChannel for the current channel index
  const sequencerChannel = new BroadcastChannel(`synth_channel_${channelIndex}`);

  // Retrieve the iframe ID using the channel index mapping
  const iframeId = getIframeIdByChannelIndex(channelIndex);
  let iframeSequencerChannel = null;

  if (iframeId) {
      // Initialize an additional BroadcastChannel for the iframe-specific channel
      iframeSequencerChannel = new BroadcastChannel(`synth_channel_${iframeId}`);
  }

  if (isActive) {
      sequencerChannel.postMessage({ type: 'startArpeggiator', channelIndex: channelIndex });

      if (iframeSequencerChannel) {
          iframeSequencerChannel.postMessage({ type: 'startArpeggiator', channelIndex: channelIndex });
      }
  } else if (isReverse) {
      sequencerChannel.postMessage({ type: 'stopArpeggiator', channelIndex: channelIndex });

      if (iframeSequencerChannel) {
          iframeSequencerChannel.postMessage({ type: 'stopArpeggiator', channelIndex: channelIndex });
      }
  }

  sequencerChannel.close(); // Close the original channel after sending the message

  if (iframeSequencerChannel) {
      iframeSequencerChannel.close(); // Close the iframe-specific channel after sending the message
  }

  // Manage audio playback
  if (!isActive && !isReverse) {
      // Skip playback if the current step is not active and not marked for reverse playback.
      return;
  }

  const bufferKey = `channel_${channelIndex}_${isReverse ? 'reverse' : 'forward'}`;
  const audioBuffer = audioBuffers.get(bufferKey);
  if (!audioBuffer) {
      console.error(`[slave] [playSound] No audio buffer found for ${bufferKey}`);
      return;
  }

  const audioContext = window.unifiedSequencerSettings.audioContext;
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  const gainNode = window.unifiedSequencerSettings.gainNodes[channelIndex];
  if (!gainNode) {
      console.error("[slave] [playSound] No gain node found for channel", channelIndex);
      return;
  }

  source.playbackRate.setValueAtTime(window.unifiedSequencerSettings.channelPlaybackSpeed[channelIndex], audioContext.currentTime);
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);

  const { trimStart, duration } = calculateTrimValues(channelIndex, audioBuffer, isReverse);
  source.start(0, trimStart, duration);

  // Track active source for stopping
  activeAudioSources.add(source);

  source.onended = () => {
      source.disconnect();
      activeAudioSources.delete(source); // Remove source from active set when it ends
      window.unifiedSequencerSettings.sourceNodes[channelIndex] = null;
  };

  window.unifiedSequencerSettings.sourceNodes[channelIndex] = source;
}

function stopAllAudio() {
  console.log("[slave] [stopAllAudio] Active audio sources before stopping:", activeAudioSources.size);

  activeAudioSources.forEach(source => {
      try {
          source.stop(0); // Use 0 as the argument to stop immediately
          source.disconnect();
      } catch (error) {
          console.error('[slave] [stopAllAudio] Error stopping audio source:', error);
      }
  });
  activeAudioSources.clear(); // Clear the set after stopping all sources
}


function calculateTrimValues(channelIndex, audioBuffer, isReversePlayback) {
  // console.log(`[calculateTrimValues] Called for channelIndex: ${channelIndex}, isReversePlayback: ${isReversePlayback}`);

  const trimSettings = window.unifiedSequencerSettings.getTrimSettings(channelIndex);
  let trimStartPercentage = trimSettings.startSliderValue !== undefined ? trimSettings.startSliderValue : 0;
  let trimEndPercentage = trimSettings.endSliderValue !== undefined ? trimSettings.endSliderValue : 100;

  // console.log(`[calculateTrimValues] Trim Settings: Start = ${trimStartPercentage}%, End = ${trimEndPercentage}%`);

  let trimStart = (trimStartPercentage / 100) * audioBuffer.duration;
  let trimEnd = (trimEndPercentage / 100) * audioBuffer.duration;

  // console.log(`[calculateTrimValues] Calculated Times (before mirroring): Start = ${trimStart}s, End = ${trimEnd}s, Buffer Duration = ${audioBuffer.duration}s`);

  if (isReversePlayback) {
    // Reverse the calculation for mirrored start and end times
    let totalDuration = audioBuffer.duration;
    trimStart = totalDuration - ((trimEndPercentage / 100) * totalDuration);
    trimEnd = totalDuration - ((trimStartPercentage / 100) * totalDuration);
  }

  // Ensure the calculated values are within the bounds of the audio buffer's duration
  trimStart = Math.max(0, Math.min(trimStart, audioBuffer.duration));
  trimEnd = Math.max(trimStart, Math.min(trimEnd, audioBuffer.duration));

  // console.log(`[calculateTrimValues] Final Calculated Values: Trim Start = ${trimStart}s, Trim End = ${trimEnd}s, Duration = ${trimEnd - trimStart}s`);

  return {
    trimStart: trimStart,
    duration: trimEnd - trimStart
  };
}


function getChannelIndex(channel) {
  return parseInt(channel.dataset.id.split('-')[1]);
}

function getAudioUrl(channelIndex) {
  // Example check to ensure URL exists for the given channel index
  if (typeof window.unifiedSequencerSettings.getprojectUrlforChannel(channelIndex) === 'undefined') {
    // console.error(`[getAudioUrl] [ playSound ] URL not found for channel index: ${channelIndex}`);
    return 'defaultURL'; // Provide a default URL or handle the error appropriately
  }
  return window.unifiedSequencerSettings.getprojectUrlforChannel(channelIndex);
}

function getAudioBuffer(url) {
  return audioBuffers.get(url);
}

// Function to toggle the play state
function togglePlayState(isPlaying, startStopFunction, firstButton, secondButton) {
  // console.log('togglePlayState entered');
  if (!isPlaying) {
    isPlaying = true;
    startStopFunction();
    firstButton.classList.add('selected');
    secondButton.classList.remove('selected');
  }
}

// Function to update the mute state with volume memory
function updateMuteState(channel, isMuted) {
  const channelIndex = parseInt(channel.dataset.id.split('-')[1]);
  channel.dataset.muted = isMuted ? 'true' : 'false';
  const muteButton = channel.querySelector('.mute-button');
  muteButton.classList.toggle('selected', isMuted);

  const gainNode = window.unifiedSequencerSettings.gainNodes[channelIndex];
  if (gainNode) {
    if (isMuted) {
      // Store the current volume before muting
      window.unifiedSequencerSettings.settings.masterSettings.channelVolume[channelIndex] = gainNode.gain.value;
      gainNode.gain.value = 0; // Mute the channel
    } else {
      // Restore the volume to the previously stored state
      const previousVolume = window.unifiedSequencerSettings.settings.masterSettings.channelVolume[channelIndex];
      gainNode.gain.value = previousVolume;
    }
  } else {
    console.error("GainNode not found for channel:", channelIndex);
  }
}

// Function to handle manual toggle of the mute button
function toggleMute(channelElement) {
  const isMuted = channelElement.dataset.muted === 'true';
  updateMuteState(channelElement, !isMuted);
}

// // Example usage in an event listener for the mute button
// const muteButton = channel.querySelector('.mute-button');
// muteButton.addEventListener('click', () => {
//   const isMuted = muteButton.classList.contains('selected');
//   toggleMute(channel); // Pass the channel element to the toggle function
// });

// ...rest of your code...




// async function decodeAndStoreAudio(audioData, sampleName, fullUrl, channelIndex) {
//   console.log("[decodeAndStoreAudio] Attempting to decode audio data");
//   try {
//       const audioBuffer = await decodeAudioData(audioData);
//       console.log("[decodeAndStoreAudio] Audio data decoded");

//       // Create a reverse buffer by copying and reversing the audioBuffer
//       const reverseBuffer = await createReverseBuffer(audioBuffer);

//       // Use channel-specific keys for storing buffers
//       const forwardKey = `channel_${channelIndex}_forward`;
//       const reverseKey = `channel_${channelIndex}_reverse`;

//       // Store both buffers using the new keys
//       audioBuffers.set(forwardKey, audioBuffer);
//       audioBuffers.set(reverseKey, reverseBuffer);
//       console.log(`[decodeAndStoreAudio] Forward and reverse audio buffers stored for channel ${channelIndex}: ${sampleName}`);

//       // Update the channel name in the UI
//       window.unifiedSequencerSettings.updateProjectChannelNamesUI(channelIndex, sampleName);

//   } catch (error) {
//       console.error('[decodeAndStoreAudio] Error decoding and storing audio:', error);
//   }
// }

// async function decodeAndStoreAudio(audioData, sampleName, fullUrl, channelIndex) {
//   console.log("[decodeAndStoreAudio] Attempting to decode audio data");
//   try {
//       const audioBuffer = await decodeAudioData(audioData);
//       console.log("[decodeAndStoreAudio] Audio data decoded");

//       // Create a reverse buffer by copying and reversing the audioBuffer
//       const reverseBuffer = await createReverseBuffer(audioBuffer);

//       // Store both buffers using distinct keys
//       audioBuffers.set(fullUrl, audioBuffer);
//       audioBuffers.set(fullUrl + "_reverse", reverseBuffer);
//       console.log(`[decodeAndStoreAudio] Forward and reverse audio buffers stored for ${sampleName}`);

//   } catch (error) {
//       console.error('[decodeAndStoreAudio] Error decoding and storing audio:', error);
//   }
// }




// async function decodeAndStoreAudio(audioData, sampleName, fullUrl, channelIndex) {
//   console.log("[decodeAndStoreAudio] Attempting to decode audio data");
//   try {
//       // Decode the audio data into a buffer
//       const audioBuffer = await decodeAudioData(audioData);
//       console.log("[decodeAndStoreAudio] Audio data decoded");

//       // Create a reverse buffer by copying and reversing the audioBuffer
//       const reverseBuffer = await createReverseBuffer(audioBuffer);

//       // Store buffers using both channel-specific keys and URL-based keys
//       const forwardKey = `channel_${channelIndex}_forward`;
//       const reverseKey = `channel_${channelIndex}_reverse`;
//       const forwardUrlKey = `${fullUrl}`;
//       const reverseUrlKey = `${fullUrl}_reverse`;

//       // Use a global buffer storage (adjust according to your actual storage method)
//       audioBuffers.set(forwardKey, audioBuffer);
//       audioBuffers.set(reverseKey, reverseBuffer);
//       audioBuffers.set(forwardUrlKey, audioBuffer);
//       audioBuffers.set(reverseUrlKey, reverseBuffer);

//       console.log(`[decodeAndStoreAudio] Forward and reverse audio buffers stored for channel ${channelIndex} and URL ${fullUrl}: ${sampleName}`);







// // Message handler for receiving audio buffer from synth
// window.addEventListener('message', async (event) => {
//   if (event.data.type === 'audioData' && event.data.data instanceof ArrayBuffer) {
//       console.log(`Received audio data message with channel index: ${event.data.channelIndex}`); // Log when the data is received
//       try {
//           // Correctly pass the ArrayBuffer and channel index to the handling function
//           await handleIncomingAudioData(event.data.data, event.data.channelIndex);
//       } catch (error) {
//           console.error('Failed to process audio from synth:', error);
//       }
//   } else {
//       console.error('Received data is not of type ArrayBuffer');
//   }
// });

// // Function to handle incoming audio data for both forward and reverse playback
// async function handleIncomingAudioData(arrayBuffer, channelIndex) {
//   console.log(`Handling incoming synth audio data for channel index: ${channelIndex}`);
//   const sampleName = `SynthSample_${channelIndex}`;  // Example of assigning a sample name, adjust as needed
//   const fullUrl = `synth://${channelIndex}`;  // Simulating a URL structure for synth sources
  
//   // Use the existing function to decode and store audio which handles forward and reverse buffers
//   await decodeAndStoreAudio(arrayBuffer, sampleName, fullUrl, channelIndex);
// }


// async function integrateAudioBuffer(audioBuffer, sampleName, fullUrl, channelIndex) {
//   // Create reverse buffer
//   const reverseBuffer = await createReverseBuffer(audioBuffer);

//   // Store and manage the buffer similar to other sequence audio
//   decodeAndStoreAudio(audioBuffer, sampleName, fullUrl, channelIndex);
// }

