// importRegularAudioFiles.js

// Function to fetch MP3 and WAV audio data
const fetchAudioMp3AndWav = async (url, channelIndex, loadSampleButtonElement = null) => {
  try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer(); // Fetch the audio file as an array buffer

      const audioBuffer = await decodeAudioData(arrayBuffer);
      audioBuffers.set(url, audioBuffer);

      const channel = document.querySelector(`.channel[data-id="Channel-${channelIndex + 1}"]`);
      channel.dataset.originalUrl = url;
      channel.dataset.audioDataLoaded = 'true';
      channelSettings[channelIndex][0] = url;
      saveCurrentSequence(currentSequence);

      if (loadSampleButtonElement) {
          loadSampleButtonElement.textContent = 'Sample Loaded';
          activeChannels.add(channelIndex);
      }

      // Update AudioTrimmer instance
      const audioTrimmer = getAudioTrimmerInstanceForChannel(channelIndex);
      if (audioTrimmer) {
          audioTrimmer.audioBuffer = audioBuffer;
          audioTrimmer.totalSampleDuration = audioBuffer.duration;
          audioTrimmer.drawWaveform(); // Redraw the waveform with the new audio buffer
      }
  } catch (error) {
      console.error('Error fetching MP3/WAV audio:', error);
  }
};

  
  // Function to play auditioned MP3 and WAV samples
const playAuditionedSampleMp3AndWav = async (url) => {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer(); // Fetch the audio file as an array buffer
  
      if (!audioContext) {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
      }
  
      const audioBuffer = await decodeAudioData(arrayBuffer);
  
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (error) {
      console.error('Error playing auditioned MP3/WAV sample:', error);
    }
  };
  