// audioUtils_P1.js
(function (window) {
    "use strict";
  
    // Shared state for audio data and sources
    const audioBuffers = new Map();
    const activeAudioSources = new Set();
  
    // Debug flag (set to true to enable detailed logging)
    const DEBUG = false;
  
    // Helper logging function (only logs when DEBUG is true)
    const log = (msg, ...args) => {
      if (DEBUG) console.log(msg, ...args);
    };
  
    /**
     * Returns the last part of a URL.
     * @param {string} url
     * @returns {string}
     */
    function getIDFromURL(url) {
      return url.split("/").pop();
    }
  
    /**
     * Converts a base64 string to an ArrayBuffer.
     * @param {string} base64
     * @returns {ArrayBuffer}
     */
    function base64ToArrayBuffer(base64) {
      log("[base64ToArrayBuffer]", "Converting base64. Length:", base64.substring(0, 100).length);
      const binaryString = window.atob(base64);
      const buffer = Uint8Array.from(binaryString, (char) => char.charCodeAt(0)).buffer;
      log("[base64ToArrayBuffer]", "Converted buffer length:", buffer.byteLength);
      return buffer;
    }
  
    /**
     * Converts an ArrayBuffer to a base64 string.
     * @param {ArrayBuffer} buffer
     * @returns {string}
     */
    function bufferToBase64(buffer) {
      log("[bufferToBase64]", "Buffer byteLength:", buffer.byteLength);
      const binary = String.fromCharCode(...new Uint8Array(buffer));
      const base64 = window.btoa(binary);
      log("[bufferToBase64]", "Converted base64 length:", base64.length);
      return base64;
    }
  
    /**
     * Processes a JSON response containing audio data.
     * @param {Response} response
     * @returns {Promise<{audioData: ArrayBuffer|null, sampleName: string}>}
     */
    async function processJSONResponse(response) {
      log("[processJSONResponse]", "Parsing JSON response");
      const jsonResponse = await response.json();
      const sampleName = jsonResponse.filename || "";
      const audioData = jsonResponse.audioData
        ? base64ToArrayBuffer(jsonResponse.audioData.split(",")[1])
        : null;
      log("[processJSONResponse]", "Sample name:", sampleName);
      return { audioData, sampleName };
    }
  
    /**
     * Processes an HTML response to extract audio data.
     * @param {string} htmlText
     * @returns {Promise<{audioData: ArrayBuffer|null, sampleName: string|null}>}
     */
    async function processHTMLResponse(htmlText) {
      log("[processHTMLResponse]", "Parsing HTML response");
      const doc = new DOMParser().parseFromString(htmlText, "text/html");
      const audioSource = doc.querySelector("audio[data-audionalSampleName] source");
      const sampleName = doc.getElementById("sampleName")?.textContent.trim() || null;
      log("[processHTMLResponse]", "Sample name:", sampleName);
  
      let audioData = null;
      if (audioSource) {
        const src = audioSource.getAttribute("src");
        if (/^data:audio\/(wav|mp3|flac);base64,/.test(src.toLowerCase())) {
          audioData = base64ToArrayBuffer(src.split(",")[1]);
          log("[processHTMLResponse]", "Audio data extracted from HTML.");
        } else {
          console.error("[processHTMLResponse] Unexpected data format.");
        }
      } else {
        console.error("[processHTMLResponse] No audio source element found.");
      }
      return { audioData, sampleName };
    }
  
    // Listen for messages carrying ArrayBuffer audio data (e.g. from the jiMS10 Synthesizer)
    window.addEventListener("message", async (event) => {
      if (event.data.type === "audioData") {
        const { channelIndex, data, mimeType, filename } = event.data;
        log(`[Message] Received audio data for channel ${channelIndex}`);
        if (data instanceof ArrayBuffer) {
          const blob = new Blob([data], { type: mimeType });
          const persistentUrl = URL.createObjectURL(blob) + `?channel=${channelIndex}`;
          try {
            await decodeAndStoreAudio(data, filename, persistentUrl, channelIndex);
            log(`[Message] Audio stored for channel ${channelIndex}`);
            // This line is expected to interact with external settings:
            window.unifiedSequencerSettings.settings.masterSettings.channelURLs[channelIndex] = persistentUrl;
          } catch (error) {
            console.error("Error processing audio data:", error);
          }
        } else {
          console.error("Expected ArrayBuffer but received:", typeof data);
        }
      }
    });
  
    /**
     * Decodes audio data using the AudioContext.
     * @param {ArrayBuffer} audioData
     * @returns {Promise<AudioBuffer>}
     */
    function decodeAudioData(audioData) {
      const audioContext = window.unifiedSequencerSettings.audioContext;
      return new Promise((resolve, reject) => {
        audioContext.decodeAudioData(
          audioData,
          (decoded) => {
            log("[decodeAudioData]", "Decoded successfully.");
            resolve(decoded);
          },
          (error) => {
            console.error("[decodeAudioData] Error:", error);
            reject(error);
          }
        );
      });
    }
  
    /**
     * Decodes and stores audio (and its reverse) in global buffers,
     * and assigns the audio buffer to the corresponding source node.
     * @param {ArrayBuffer} audioData
     * @param {string} sampleName
     * @param {string} fullUrl
     * @param {number} channelIndex
     */
    async function decodeAndStoreAudio(audioData, sampleName, fullUrl, channelIndex) {
      log("[decodeAndStoreAudio]", "Decoding audio for channel", channelIndex);
      try {
        const audioBuffer = await decodeAudioData(audioData);
        const reverseBuffer = await createReverseBuffer(audioBuffer);
        const forwardKey = `channel_${channelIndex}_forward`;
        const reverseKey = `channel_${channelIndex}_reverse`;
        audioBuffers.set(forwardKey, audioBuffer);
        audioBuffers.set(reverseKey, reverseBuffer);
        audioBuffers.set(fullUrl, audioBuffer);
        audioBuffers.set(fullUrl + "_reverse", reverseBuffer);
        log("[decodeAndStoreAudio]", `Stored buffers for channel ${channelIndex}, URL: ${fullUrl}`);
  
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
          log("[decodeAndStoreAudio]", `Assigned buffer to source node for channel ${channelIndex}`);
        }
        settings.updateProjectChannelNamesUI(channelIndex, sampleName);
        if (typeof updateWaveformDisplay === "function") {
          updateWaveformDisplay(channelIndex, audioBuffer);
          log("[decodeAndStoreAudio]", "Waveform display updated.");
        }
      } catch (error) {
        console.error("[decodeAndStoreAudio] Error:", error);
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
  
        const contentType = response.headers.get("Content-Type") || "";
        let audioData,
          sampleName = window.unifiedSequencerSettings.settings.masterSettings.projectChannelNames[channelIndex];
  
        if (contentType.includes("application/json")) {
          ({ audioData, sampleName } = await processJSONResponse(response));
          sampleName = sampleName || sampleNameGiven || fullUrl.split("/").pop();
        } else if (contentType.includes("text/html")) {
          const htmlText = await response.text();
          ({ audioData, sampleName } = await processHTMLResponse(htmlText));
          sampleName = sampleName || sampleNameGiven || fullUrl.split("/").pop();
        } else {
          audioData = await response.arrayBuffer();
          sampleName = sampleName || sampleNameGiven || fullUrl.split("/").pop().split(/[?#]/)[0] || "Unnamed Sample";
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
          console.error("[fetchAudio] No audio data received.");
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
    function getIframeIdByChannelIndex(channelIndex) {
      return (JSON.parse(localStorage.getItem("channelIframeMappings")) || {})[channelIndex];
    }
  
    /** Constant: channels where fade effects are applied */
    const fadeChannels = [6, 7, 11, 12, 13, 15];
  
    // Expose the Part 1 API for use by other code
    window.AudioUtilsPart1 = {
      getIDFromURL,
      base64ToArrayBuffer,
      bufferToBase64,
      processJSONResponse,
      processHTMLResponse,
      decodeAudioData,
      decodeAndStoreAudio,
      createReverseBuffer,
      fetchAudio,
      getIframeIdByChannelIndex,
      fadeChannels,
      // Expose state for reading by Part 2 (read‑only)
      _audioBuffers: audioBuffers,
      _activeAudioSources: activeAudioSources,
      log,
    };
  
    /**
     * Helper: Formats the URL.
     * (A stub here – replace with actual URL formatting if needed.)
     * @param {string} url
     * @returns {string}
     */
    function formatURL(url) {
      // For demonstration, we return the URL unchanged.
      return url;
    }
  })(window);