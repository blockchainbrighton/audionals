// audioUtils_P2.js
(function (window) {
  "use strict";

  // Get references to shared state from Part 1.
  const audioBuffers = window.AudioUtilsPart1._audioBuffers;
  const activeAudioSources = window.AudioUtilsPart1._activeAudioSources;
  const log = window.AudioUtilsPart1.log;

  /**
   * Plays sound for a given channel and step.
   * @param {number} currentSequence
   * @param {HTMLElement} channel
   * @param {number} currentStep
   */
  function playSound(currentSequence, channel, currentStep) {
    // Immediately determine the channel index
    const channelIndex = getChannelIndex(channel);
    log(`[playSound] For channel ${channelIndex}: currentSequence=${currentSequence}, currentStep=${currentStep}`);

    const { isActive, isReverse } =
      window.unifiedSequencerSettings.getStepStateAndReverse(currentSequence, channelIndex, currentStep);
    const channelLabel = `synth_channel_${channelIndex}`;
    const bc = new BroadcastChannel(channelLabel);
    const iframeId = getIframeIdByChannelIndex(channelIndex);
    const iframeBC = iframeId ? new BroadcastChannel(`synth_channel_${iframeId}`) : null;

    if (isActive) {
      bc.postMessage({ type: "startArpeggiator", channelIndex });
      if (iframeBC) {
        iframeBC.postMessage({ type: "startArpeggiator", channelIndex });
      }
    } else if (isReverse) {
      bc.postMessage({ type: "stopArpeggiator", channelIndex });
      if (iframeBC) {
        iframeBC.postMessage({ type: "stopArpeggiator", channelIndex });
      }
    }
    bc.close();
    if (iframeBC) {
      iframeBC.close();
    }

    if (!isActive && !isReverse) {
      log(`[playSound] Channel ${channelIndex} is neither active nor reverse. Exiting playSound.`);
      return;
    }

    const bufferKey = `channel_${channelIndex}_${isReverse ? "reverse" : "forward"}`;
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

    log(
      `[playSound] Channel ${channelIndex}: trimStart=${trimStart}, duration=${duration}, fadeDuration=${fadeDuration}, adjustedDuration=${adjustedDuration}, userVolume=${userVolume}`
    );

    const trimSettings = window.unifiedSequencerSettings.getTrimSettings(channelIndex);
    const isTrimmed = trimSettings.startSliderValue !== 0 || trimSettings.endSliderValue !== 100;
    const fadeChannels = window.AudioUtilsPart1.fadeChannels;
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
      log(`[playSound] Source for channel ${channelIndex} ended and cleaned up.`);
    };

    window.unifiedSequencerSettings.sourceNodes[channelIndex] = source;
    log(`[playSound] New source node created and started for channel ${channelIndex}.`);
  }

  /**
   * Creates an offline audio buffer rendered at a given playback rate.
   * @param {AudioBuffer} originalBuffer
   * @param {number} playbackRate
   * @returns {Promise<AudioBuffer>}
   */
  function createOfflineAudioBuffer(originalBuffer, playbackRate) {
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
  }

  /**
   * Stops all currently active audio sources.
   */
  function stopAllAudio() {
    log("[stopAllAudio]", "Stopping all audio");
    activeAudioSources.forEach((source) => {
      try {
        source.stop(0);
        source.disconnect();
      } catch (error) {
        console.error("[stopAllAudio] Error stopping source:", error);
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
    const { startSliderValue = 0, endSliderValue = 100 } =
      window.unifiedSequencerSettings.getTrimSettings(channelIndex);
    log(
      `[calculateTrimValues] Channel ${channelIndex}: startSliderValue = ${startSliderValue}, endSliderValue = ${endSliderValue}, audioBuffer.duration = ${audioBuffer.duration}`
    );

    let trimStart = (startSliderValue / 100) * audioBuffer.duration;
    let trimEnd = (endSliderValue / 100) * audioBuffer.duration;
    if (isReversePlayback) {
      const total = audioBuffer.duration;
      trimStart = total - (endSliderValue / 100) * total;
      trimEnd = total - (startSliderValue / 100) * total;
      log(
        `[calculateTrimValues] Channel ${channelIndex} (Reverse): trimStart recalculated = ${trimStart}, trimEnd recalculated = ${trimEnd}`
      );
    }
    trimStart = Math.max(0, Math.min(trimStart, audioBuffer.duration));
    trimEnd = Math.max(trimStart, Math.min(trimEnd, audioBuffer.duration));

    const duration = trimEnd - trimStart;
    log(
      `[calculateTrimValues] Channel ${channelIndex}: final trimStart = ${trimStart}, trimEnd = ${trimEnd}, duration = ${duration}`
    );
    return { trimStart, duration, trimEnd };
  }

  /**
   * Returns a channel index parsed from the channel element's dataset ID.
   * @param {HTMLElement} channel
   * @returns {number}
   */
  function getChannelIndex(channel) {
    const parts = channel.dataset.id.split("-");
    const index = parseInt(parts[1]);
    log(`[getChannelIndex] Parsed channel index ${index} from dataset.id: ${channel.dataset.id}`);
    return index;
  }

  /**
   * Retrieves an audio URL for a channel from unified settings.
   * @param {number} channelIndex
   * @returns {string}
   */
  function getAudioUrl(channelIndex) {
    const url = window.unifiedSequencerSettings.getprojectUrlforChannel(channelIndex);
    log(`[getAudioUrl] Channel ${channelIndex}: Retrieved URL: ${url}`);
    return typeof url === "undefined" ? "defaultURL" : url;
  }

  /**
   * Retrieves an audio buffer from the global map.
   * @param {string} url
   * @returns {AudioBuffer|undefined}
   */
  function getAudioBuffer(url) {
    const buffer = audioBuffers.get(url);
    log(`[getAudioBuffer] Retrieved buffer for URL ${url}:`, buffer);
    return buffer;
  }

  /**
   * Toggles play state for UI buttons.
   * @param {boolean} isPlaying
   * @param {Function} startStopFunction
   * @param {HTMLElement} firstButton
   * @param {HTMLElement} secondButton
   */
  function togglePlayState(isPlaying, startStopFunction, firstButton, secondButton) {
    log(`[togglePlayState] isPlaying: ${isPlaying}`);
    if (!isPlaying) {
      isPlaying = true;
      startStopFunction();
      firstButton.classList.add("selected");
      secondButton.classList.remove("selected");
      log(`[togglePlayState] Toggled play state: firstButton selected, secondButton deselected.`);
    }
  }

  /**
 * Updates the mute state of a channel.
 * @param {HTMLElement} channel - The channel element.
 * @param {boolean} isMuted - True if the channel should be muted.
 * @param {boolean} [storeVolume=true] - Whether to store the current gain before muting.
 */
function updateMuteState(channel, isMuted, storeVolume = true) {
  const channelIndex = parseInt(channel.dataset.id.split("-")[1]);
  log(`[updateMuteState] Channel ${channelIndex}: isMuted set to ${isMuted}`);
  channel.dataset.muted = isMuted ? "true" : "false";
  const muteButton = channel.querySelector(".mute-button");
  if (muteButton) {
    muteButton.classList.toggle("selected", isMuted);
    log(
      `[updateMuteState] Mute button for channel ${channelIndex} updated to ${isMuted ? "selected" : "deselected"}`
    );
  } else {
    console.warn(`[updateMuteState] No mute button found on channel ${channelIndex}`);
  }
  const gainNode = window.unifiedSequencerSettings.gainNodes[channelIndex];
  if (gainNode) {
    if (isMuted) {
      // Only store the volume if we want to (manual mute)
      if (storeVolume && gainNode.gain.value > 0) {
        window.unifiedSequencerSettings.settings.masterSettings.channelVolume[channelIndex] = gainNode.gain.value;
      }
      gainNode.gain.value = 0;
      log(`[updateMuteState] Channel ${channelIndex}: Gain set to 0.`);
    } else {
      const storedVolume = window.unifiedSequencerSettings.settings.masterSettings.channelVolume[channelIndex];
      gainNode.gain.value = storedVolume;
      log(`[updateMuteState] Channel ${channelIndex}: Gain restored to stored volume: ${storedVolume}`);
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
    const isMuted = channelElement.dataset.muted === "true";
    log(`[toggleMute] Channel ${channelElement.dataset.id}: Current mute state: ${isMuted}`);
    updateMuteState(channelElement, !isMuted);
    log(`[toggleMute] Channel ${channelElement.dataset.id}: Toggled mute state to: ${!isMuted}`);
  }

  /**
   * Helper: Retrieves the iframe ID mapping via Part 1’s helper.
   * @param {number} channelIndex
   * @returns {string|undefined}
   */
  function getIframeIdByChannelIndex(channelIndex) {
    return window.AudioUtilsPart1.getIframeIdByChannelIndex(channelIndex);
  }

  // Expose the Part 2 API for use by other code
  window.AudioUtilsPart2 = {
    playSound,
    createOfflineAudioBuffer,
    stopAllAudio,
    calculateTrimValues,
    getChannelIndex,
    getAudioUrl,
    getAudioBuffer,
    togglePlayState,
    updateMuteState,
    toggleMute,
  };
})(window);