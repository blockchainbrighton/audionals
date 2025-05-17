// file-handler.js

/**
 * Gets the duration of an audio file using the Web Audio API.
 * @param {File} file - The audio file object.
 * @returns {Promise<number>} A promise that resolves with the duration in seconds.
 */
const getAudioDuration = file => new Promise((resolve, reject) => { // Renamed from getWavDuration
  if (!file || !file.type.startsWith('audio/')) {
      return reject("Invalid file type provided for duration check.");
  }
  
    const reader = new FileReader();
  
    reader.onload = e => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      // Use decodeAudioData for better compatibility and error handling
      audioContext.decodeAudioData(e.target.result)
        .then(buffer => {
            resolve(buffer.duration);
        })
        .catch(err => {
            console.error("Error decoding audio data:", err);
            let userMessage = "Could not decode audio data. The file might be corrupt or in an unsupported format.";
            if (err.name === 'EncodingError') {
                userMessage = "Audio encoding format not supported by browser.";
            }
            reject(userMessage);
        })
        .finally(() => {
            // Close the context to release resources, especially important on mobile
            if (audioContext.state !== 'closed') {
                audioContext.close().catch(e => console.warn("Error closing AudioContext:", e));
            }
        });
    };
  
    reader.onerror = (e) => {
        console.error("File reading error:", e);
        reject("Error reading the file.");
    };
  
    reader.onabort = () => {
        reject("File reading was aborted.");
    }
  
    try {
        reader.readAsArrayBuffer(file);
    } catch(err) {
        console.error("Error calling readAsArrayBuffer:", err);
        reject("Failed to initiate file reading.");
    }
  });
  
  
  /**
   * Handles the file input change event.
   * @param {Event} e - The change event object.
   */
  const handleFileChange = async (e) => {
    const file = e.target.files ? e.target.files[0] : null;
  
    // Reset everything related to the previous file/conversion
    resetUIForNewFile();
  
    // Clear state variables
    selectedFile = null;
    fileDuration = null;
    convertedAudioBlob = null;
    base64String = null;
    originalAudioElement = null; // Clear reference
  
    if (file) {
      // Make the check more general for any audio type
      if (!file.type || !file.type.startsWith('audio/')) {
          updateStatus(`Error: Please select a valid audio file. Selected type: ${file.type || 'unknown'}`, true);
          fileInput.value = ''; // Clear the input
          enableConvertButtonIfNeeded(); // Ensure this is called
          return;
      }
  
      selectedFile = file; // Update state
      updateStatus(`File selected: ${selectedFile.name}. Reading duration...`);
      enableConvertButtonIfNeeded(); // Might enable convert if FFmpeg is ready
  
      try {
        fileDuration = await getAudioDuration(selectedFile); // Update state
        updateStatus(`File ready: ${selectedFile.name} (${fileDuration.toFixed(1)}s)`);
        updateEstimatedSize(); // Update size estimate now we have duration
        setupOriginalAudioPlayer(); // Prepare the original audio player now
      } catch (err) {
        updateStatus(`Error reading file: ${err}`, true);
        fileDuration = null; // Reset duration on error
        selectedFile = null; // Deselect file if essential info fails
        fileInput.value = ''; // Clear the input
      }
    } else {
      updateStatus('No file selected.');
    }
  
    // Final check on button states after processing
    enableConvertButtonIfNeeded();
  };