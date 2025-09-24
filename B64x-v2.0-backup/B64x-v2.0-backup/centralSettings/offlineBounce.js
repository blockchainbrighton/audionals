// offlineBounce.js
(function (window) {
    "use strict";
  
    /**
     * OfflineBounce is responsible for rendering the current sequence
     * into an offline audio buffer. It accesses the global sequencer settings
     * (BPM, channel trim settings, playback speeds, sequence steps, etc.)
     * as well as the already–decoded audio buffers.
     */
    class OfflineBounce {
      constructor(sequencerSettings) {
        // Expecting window.unifiedSequencerSettings (or similar) to be passed in.
        this.sequencerSettings = sequencerSettings;
      }
  
      /**
       * Renders the currently loaded sequence offline.
       * @returns {Promise<AudioBuffer>} A promise that resolves with the rendered AudioBuffer.
       */
      async bounceCurrentSequence() {
        // Retrieve master settings.
        const master = this.sequencerSettings.settings.masterSettings;
        const bpm = master.projectBPM;
        const currentSequence = master.currentSequence;
        const sequence = master.projectSequences[`Sequence${currentSequence}`];
  
        // Calculate loop duration.
        // Here we assume a 4‑bar loop in 4/4 time (4 beats per bar).
        const beatsPerBar = 4;
        const totalBeats = 4 * beatsPerBar;
        const secondsPerBeat = 60 / bpm;
        const loopDuration = totalBeats * secondsPerBeat;
  
        // Create an OfflineAudioContext.
        // For stereo output (2 channels) at 44100Hz:
        const sampleRate = 44100;
        const offlineCtx = new OfflineAudioContext(2, sampleRate * loopDuration, sampleRate);
  
        // Define the number of steps (64) and compute the step duration.
        const numSteps = 64;
        const stepDuration = loopDuration / numSteps;
  
        // Iterate over each channel in the current sequence.
        Object.keys(sequence).forEach((chKey) => {
          const channelData = sequence[chKey];
          // Extract the numeric channel index (e.g. "ch3" → 3)
          const channelIndex = parseInt(chKey.replace("ch", ""), 10);
  
          // Retrieve the forward (normal) audio buffer for this channel.
          const audioBuffer = window.AudioUtilsPart1._audioBuffers.get(
            `channel_${channelIndex}_forward`
          );
          if (!audioBuffer) return; // Skip channels without an audio sample
  
          // Retrieve channel trim settings.
          const trimSettings = master.trimSettings[channelIndex] || {};
          // Assume the trim settings object contains values in percentages.
          const startSliderValue =
            typeof trimSettings.startSliderValue === "number" ? trimSettings.startSliderValue : 0;
          const endSliderValue =
            typeof trimSettings.endSliderValue === "number" ? trimSettings.endSliderValue : 100;
          const trimStart = (startSliderValue / 100) * audioBuffer.duration;
          const trimEnd = (endSliderValue / 100) * audioBuffer.duration;
          const playDuration = trimEnd - trimStart;
  
          // Get the playback speed for this channel.
          const playbackSpeed = this.sequencerSettings.channelPlaybackSpeed[channelIndex] || 1;
  
          // Schedule each active step within the channel.
          channelData.steps.forEach((step, index) => {
            if (step.isActive) {
              // Calculate when this step should occur.
              const when = index * stepDuration;
              // Create a new buffer source for this step.
              const source = offlineCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.playbackRate.value = playbackSpeed;
              source.connect(offlineCtx.destination);
              // Start playback at "when" seconds, using the trimmed portion.
              source.start(when, trimStart, playDuration);
            }
          });
        });
  
        // Render the offline context and return the resulting AudioBuffer.
        const renderedBuffer = await offlineCtx.startRendering();
        return renderedBuffer;
      }
    }
  
    // Expose the OfflineBounce class to the global scope.
    window.OfflineBounce = OfflineBounce;
  })(window);