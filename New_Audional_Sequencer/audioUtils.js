// audioUtils.js

const audioBuffers = new Map();
// Using sample URLs as keys in the audioBuffers map instead of channel numbers 
// for greater flexibility, scalability, and reusability of audio data. 


// Function to get the ID from a URL
function getIDFromURL(url) {
  console.log('[HTML Debugging] getIDFromURL entered');
  const parts = url.split('/');
  return parts[parts.length - 1];
}

// Logging function to reduce redundancy
function logConversion(conversionType, details, length) {
  console.log(`[HTML Debugging] [${conversionType}] Entered function. ${details} length: ${length}`);
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



async function processJSONResponse(response) {
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

      if (/^data:audio\/(wav|mp3);base64,/.test(base64AudioData.toLowerCase())) {
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

async function decodeAndStoreAudio(audioData, sampleName, fullUrl, channelIndex) {
  console.log("[decodeAndStoreAudio] Attempting to decode audio data");
  try {
      const audioBuffer = await decodeAudioData(audioData);
      console.log("[decodeAndStoreAudio] Audio data decoded");

      // Create a reverse buffer by copying and reversing the audioBuffer
      const reverseBuffer = await createReverseBuffer(audioBuffer);

      // Store both buffers using distinct keys
      audioBuffers.set(fullUrl, audioBuffer);
      audioBuffers.set(fullUrl + "_reverse", reverseBuffer);

      console.log(`[decodeAndStoreAudio] Forward and reverse audio buffers stored for ${sampleName}`);

      // Update project channel name in global settings
      window.unifiedSequencerSettings.setProjectChannelName(channelIndex, sampleName);
      console.log(`[decodeAndStoreAudio] Project channel name updated for channel index: ${channelIndex}, sampleName: ${sampleName}`);
  } catch (error) {
      console.error('[decodeAndStoreAudio] Error decoding and storing audio:', error);
  }
}


// Function to create a reverse buffer from an existing AudioBuffer

// Accessibility: Both buffers can be accessed using their keys. 
// For example, if you need the reverse buffer for https://example.com/audio.mp3, 
// you would look for https://example.com/audio.mp3_reverse in the audioBuffers map.
async function createReverseBuffer(audioBuffer) {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;

  // Create an empty AudioBuffer for the reversed audio
  const reverseBuffer = audioContext.createBuffer(numberOfChannels, length, sampleRate);

  // Copy and reverse each channel's data
  for (let channel = 0; channel < numberOfChannels; channel++) {
      const forwardData = audioBuffer.getChannelData(channel);
      const reverseData = reverseBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
          reverseData[i] = forwardData[length - 1 - i];
      }
  }

  return reverseBuffer;
}


function calculateTrimValues(channelIndex, audioBuffer, isReversePlayback) {
  const trimSettings = window.unifiedSequencerSettings.getTrimSettings(channelIndex);

  let trimStartPercentage = trimSettings.startSliderValue !== undefined ? trimSettings.startSliderValue : trimSettings.start;
  let trimEndPercentage = trimSettings.endSliderValue !== undefined ? trimSettings.endSliderValue : trimSettings.end;

  let trimStart = (trimStartPercentage / 100) * audioBuffer.duration;
  let trimEnd = (trimEndPercentage / 100) * audioBuffer.duration;

  if (isReversePlayback) {
      // For reverse playback, calculate the mirrored trim positions
      const mirroredTrimStart = audioBuffer.duration - ((trimEndPercentage / 100) * audioBuffer.duration);
      const mirroredTrimEnd = audioBuffer.duration - ((trimStartPercentage / 100) * audioBuffer.duration);
      trimStart = Math.max(0, Math.min(mirroredTrimStart, audioBuffer.duration));
      trimEnd = Math.max(trimStart, Math.min(mirroredTrimEnd, audioBuffer.duration));
  } else {
      // For normal playback, ensure the calculated values are within the bounds of the audio buffer's duration
      trimStart = Math.max(0, Math.min(trimStart, audioBuffer.duration));
      trimEnd = Math.max(trimStart, Math.min(trimEnd, audioBuffer.duration));
  }

  return {
      trimStart: trimStart,
      duration: trimEnd - trimStart
  };
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
        console.error('[HTML Debugging] [decodeAudioData] Detailed Error:', { message: error.message, code: error.code });

        reject(error);
      });
  });
};


async function fetchAudio(url, channelIndex) {
  console.log(`[fetchAndProcessAudio] Entered function. URL: ${url}, Channel Index: ${channelIndex}`);
  try {
      const fullUrl = formatURL(url);
      console.log(`[fetchAndProcessAudio] Formatted URL: ${fullUrl}`);

      const response = await fetch(fullUrl);
      console.log(`[fetchAndProcessAudio] Fetch response received for URL: ${fullUrl}`);

      if (!response.ok) {
          console.error(`[fetchAndProcessAudio] Fetch request failed for URL: ${fullUrl}, Status: ${response.status}`);
          return;
      }

      const contentType = response.headers.get('Content-Type');
      console.log(`[fetchAndProcessAudio] Content-Type of response: ${contentType}`);

      let audioData;
      let sampleName = fullUrl.split('/').pop(); // Fallback sample name from URL
      console.log(`[fetchAndProcessAudio] Initial sampleName set to: ${sampleName}`);

      if (contentType.includes('application/json')) {
          console.log("[fetchAndProcessAudio] Processing as JSON");
          const { audioData: processedAudioData, sampleName: processedSampleName } = await processJSONResponse(response);
          audioData = processedAudioData;
          sampleName = processedSampleName || sampleName;
          console.log(`[fetchAndProcessAudio] Processed sampleName from JSON: ${sampleName}`);
      } else if (contentType.includes('text/html')) {
          console.log("[fetchAndProcessAudio] Processing as HTML");
          const htmlText = await response.text();
          const { audioData: processedAudioData, sampleName: processedSampleName } = await processHTMLResponse(htmlText);
          audioData = processedAudioData;
          sampleName = processedSampleName || sampleName;
          console.log(`[fetchAndProcessAudio] Processed sampleName from HTML: ${sampleName}`);
      } else {
          console.log("[fetchAndProcessAudio] Processing as direct audio file");
          audioData = await response.arrayBuffer();
          console.log("[fetchAndProcessAudio] Audio data set from direct audio file");
      }

      // Now, use decodeAndStoreAudio to handle decoding and storage
      if (audioData) {
          await decodeAndStoreAudio(audioData, sampleName, fullUrl, channelIndex);
      } else {
          console.error("[fetchAndProcessAudio] No audio data to process.");
      }
  } catch (error) {
      console.error('[fetchAndProcessAudio] Error:', error);
  }
}



function playSound(currentSequence, channel, currentStep) {
  console.log('playSound entered');
  const channelIndex = getChannelIndex(channel);
  console.log(`[playSound Debugging] [playSound] Processing channel index: ${channelIndex}`);

  const stepState = window.unifiedSequencerSettings.getStepState(currentSequence, channelIndex, currentStep);
  console.log(`[playSound Debugging] [playSound] setting stepState using direct call to: ${stepState}`);
  
  if (!stepState) {
    console.log("[playSound Debugging] [playSound] Current step is not selected. Skipping playback.");
    return;
  }

  // Check if the current step is marked for reverse playback
  const stepButtonId = `Sequence${currentSequence}-ch${channelIndex}-step-${currentStep}`;
  const stepButton = document.getElementById(stepButtonId);
  const isReversePlayback = stepButton && stepButton.classList.contains('reverse-playback');

  const url = getAudioUrl(channelIndex) + (isReversePlayback ? "_reverse" : "");
  console.log("[playSound Debugging] [playSound] Audio URL:", url);

  const audioBuffer = audioBuffers.get(url);
  if (!audioBuffer) {
      console.log("[playSound Debugging] [playSound] No audio buffer found for URL:", url);
      return;
  }
  
  console.log("[playSound Debugging] [playSound] Audio buffer:", audioBuffer);

  playTrimmedAudio(channelIndex, audioBuffer, url, currentStep); // Add currentStep as an argument
}


// Example modification in playTrimmedAudio function
function playTrimmedAudio(channelIndex, audioBuffer, url, currentStep) {
  console.log('[playTrimmedAudio] Audio buffer found for URL:', url);

  // Find the corresponding step button to check for reverse playback
  const stepButtonId = `Sequence${window.unifiedSequencerSettings.settings.masterSettings.currentSequence}-ch${channelIndex}-step-${currentStep}`;
  const stepButton = document.getElementById(stepButtonId);
  const isReversePlayback = stepButton.classList.contains('reverse-playback');


  // Adjust the calculation of trim values based on the reverse playback state
  const { trimStart, duration } = calculateTrimValues(channelIndex, audioBuffer, isReversePlayback);

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  // applyPitchControl(source, pitch);
  source.connect(gainNodes[channelIndex]);
  gainNodes[channelIndex].connect(audioContext.destination);

  console.log(`[playTrimmedAudio] Playing audio for channel index: ${channelIndex}, step: ${currentStep}, from ${trimStart} for duration: ${duration}`);
  source.start(0, trimStart, duration);
}

function calculateTrimValues(channelIndex, audioBuffer, isReversePlayback) {
  console.log(`[calculateTrimValues] Called for channelIndex: ${channelIndex}, isReversePlayback: ${isReversePlayback}`);

  const trimSettings = window.unifiedSequencerSettings.getTrimSettings(channelIndex);
  let trimStartPercentage = trimSettings.startSliderValue !== undefined ? trimSettings.startSliderValue : 0;
  let trimEndPercentage = trimSettings.endSliderValue !== undefined ? trimSettings.endSliderValue : 100;

  console.log(`[calculateTrimValues] Trim Settings: Start = ${trimStartPercentage}%, End = ${trimEndPercentage}%`);

  let trimStart = (trimStartPercentage / 100) * audioBuffer.duration;
  let trimEnd = (trimEndPercentage / 100) * audioBuffer.duration;

  console.log(`[calculateTrimValues] Calculated Times (before mirroring): Start = ${trimStart}s, End = ${trimEnd}s, Buffer Duration = ${audioBuffer.duration}s`);

  if (isReversePlayback) {
    // Reverse the calculation for mirrored start and end times
    let totalDuration = audioBuffer.duration;
    trimStart = totalDuration - ((trimEndPercentage / 100) * totalDuration);
    trimEnd = totalDuration - ((trimStartPercentage / 100) * totalDuration);
  }

  // Ensure the calculated values are within the bounds of the audio buffer's duration
  trimStart = Math.max(0, Math.min(trimStart, audioBuffer.duration));
  trimEnd = Math.max(trimStart, Math.min(trimEnd, audioBuffer.duration));

  console.log(`[calculateTrimValues] Final Calculated Values: Trim Start = ${trimStart}s, Trim End = ${trimEnd}s, Duration = ${trimEnd - trimStart}s`);

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
    console.error(`[getAudioUrl] [ playSound ] URL not found for channel index: ${channelIndex}`);
    return 'defaultURL'; // Provide a default URL or handle the error appropriately
  }
  return window.unifiedSequencerSettings.getprojectUrlforChannel(channelIndex);
}

function getAudioBuffer(url) {
  return audioBuffers.get(url);
}


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




// async function importHTMLAudioData(htmlContent, index) {
//   console.log("[importHTMLSampleData] Entered function with index: ", index);
//   try {
//       const parser = new DOMParser();
//       const doc = parser.parseFromString(htmlContent, 'text/html');
//       const sourceElement = doc.querySelector('audio[data-audionalSampleName] source');

//       if (sourceElement) {
//           const base64AudioData = sourceElement.getAttribute('src');
//           // Convert the prefix to lowercase before checking
//           if (base64AudioData.toLowerCase().startsWith('data:audio/wav;base64,') || base64AudioData.toLowerCase().startsWith('data:audio/mp3;base64,')) {
//               console.log("[importHTMLSampleData] Extracted base64 audio data.");
//               // Directly return the base64 audio data URL
//               return base64AudioData;
//           } else {
//               console.error("[importHTMLSampleData] Audio data does not start with expected base64 prefix.");
//           }
//       } else {
//           console.error("[importHTMLSampleData] Could not find the audio source element in the HTML content.");
//       }
//   } catch (error) {
//       console.error("[importHTMLSampleData] Error parsing HTML content: ", error);
//   }
//   // Return null in case of errors or if audio data is not found
//   return null;
// }

// // Function to fetch and process audio data

// const fetchAudio = async (url, channelIndex) => {
//   const fullUrl = formatURL(url);
//   console.log('[HTML Debugging] [fetchAudio] Entered function. URL:', fullUrl, 'Channel Index:', channelIndex);

//   try {
//     const response = await fetch(fullUrl);
//     const contentType = response.headers.get('Content-Type');
//     let audioData, sampleName;

//     // Attempt to extract the sample name from the URL as a fallback
//     sampleName = fullUrl.split('/').pop(); // Extracts the last part of the URL, often the filename

//     if (contentType && contentType.includes('application/json')) {
//       // Handle JSON content
//       const jsonResponse = await response.json();
//       // Use filename from JSON if available, fallback to URL-derived name
//       sampleName = jsonResponse.filename || sampleName;
//       const base64AudioData = jsonResponse.audioData;
//       if (!base64AudioData) {
//         console.error('[HTML Debugging] [fetchAudio] No audioData found in JSON response');
//         return;
//       }
//       audioData = base64ToArrayBuffer(base64AudioData.split(',')[1]);
//     } else if (contentType && contentType.includes('text/html')) {
//       // Handle HTML content
//       const htmlText = await response.text();
//       const parser = new DOMParser();
//       const doc = parser.parseFromString(htmlText, 'text/html');
//       const sampleNameElement = doc.getElementById('sampleName');
//       if (sampleNameElement) {
//         // Use the content of the div if available, fallback to URL-derived name
//         sampleName = sampleNameElement.textContent.trim() || sampleName;
//       }
//       const extractedAudioData = await importHTMLAudioData(htmlText, channelIndex);
//       if (!extractedAudioData) return;

//       audioData = extractedAudioData.startsWith('data:') ?
//         base64ToArrayBuffer(extractedAudioData.split(',')[1]) :
//         await fetch(extractedAudioData).then(res => res.arrayBuffer());
//     } else {
//       // Handle direct audio file
//       audioData = await response.arrayBuffer();
//     }

//     // Decode and process the audio data
//     const audioBuffer = await decodeAudioData(audioData);
//     audioBuffers.set(fullUrl, audioBuffer);
//     console.log(`[HTML Debugging] [fetchAudio] Audio buffer stored.`);

//     // Update the project channel name in global settings
//     window.unifiedSequencerSettings.setProjectChannelName(channelIndex, sampleName);

//   } catch (error) {
//     console.error('[HTML Debugging] [fetchAudio] Error:', error);
//   }
// };


// async function playAuditionedSample(url) {
//   console.log('playAuditionedSample entered');
//   try {
//    // Ensure the URL is correctly formatted
//     const correctlyFormattedURL = formatURL(url);
//     const response = await fetch(correctlyFormattedURL);
//     const data = await response.json();

//     // Check if the expected audioData field is present
//     if (data.audioData) {
//       const audioData = base64ToArrayBuffer(data.audioData.split(',')[1]);

//       if (!audioContext) {
//         window.AudioContext = window.AudioContext || window.webkitAudioContext;
//         audioContext = new AudioContext();
//       }

//       const audioBuffer = await decodeAudioData(audioData);
//       const source = audioContext.createBufferSource();
//       source.buffer = audioBuffer;
//       source.connect(audioContext.destination);
//       source.start();
//     } else {
//       console.log("Audional data not found in response, attempting to fetch and parse content type.");
//       const contentType = await fetchAndParseContentType(url);
//       console.log(`Content type found: ${contentType}`);
//       // Additional logic to handle the content type will be added here
//     }
//   } catch (error) {
//     console.error('Error playing auditioned sample:', error);
//   }
// };


