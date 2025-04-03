// file-handler.js

/**
 * Gets the duration of a WAV file using the Web Audio API.
 * @param {File} file - The WAV file object.
 * @returns {Promise<number>} A promise that resolves with the duration in seconds.
 */
const getWavDuration = file => new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('audio/')) {
        return reject("Invalid file type provided.");
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
      if (!file.type || (!file.type.startsWith('audio/wav') && !file.type.startsWith('audio/x-wav'))) {
          updateStatus(`Error: Please select a WAV file. Selected type: ${file.type || 'unknown'}`, true);
          fileInput.value = ''; // Clear the input
          enableConvertButtonIfNeeded();
          return;
      }
  
      selectedFile = file; // Update state
      updateStatus(`File selected: ${selectedFile.name}. Reading duration...`);
      enableConvertButtonIfNeeded(); // Might enable convert if FFmpeg is ready
  
      try {
        fileDuration = await getWavDuration(selectedFile); // Update state
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


  /*
<!-- collapsible_note -->
<!--
<details>
<summary>File Summary: file-handler.js</summary>

**Purpose:** Handles user file selection, validates the file type (ensuring it's WAV), and extracts the audio duration using the Web Audio API. Manages state related to the selected file.

**Key Functions:**
*   `getWavDuration(file)`: Asynchronously reads a WAV file and uses the Web Audio API (`AudioContext`, `decodeAudioData`) to determine its duration in seconds. Returns a Promise. Includes error handling for decoding issues.
*   `handleFileChange(e)`: The event handler for the file input's 'change' event. It retrieves the selected file, validates its type, calls `getWavDuration`, updates the UI status, resets relevant state/UI for a new file, and prepares the original audio player.

**Dependencies:**
*   **DOM Elements (implicitly global):** `fileInput`, `originalAudioContainer` (used indirectly via `setupOriginalAudioPlayer`).
*   **Utility Functions (implicitly global):** `updateStatus`, `enableConvertButtonIfNeeded`, `resetUIForNewFile`, `updateEstimatedSize`.
*   **Audio Player Function (implicitly global):** `setupOriginalAudioPlayer`.
*   **Web Platform APIs:** `FileReader`, `AudioContext`/`webkitAudioContext`, `URL.createObjectURL`.

**Global Variables:**
*   Manages `selectedFile` and `fileDuration`. Also clears/resets `convertedAudioBlob`, `base64String`, `originalAudioElement`.

**Notes:**
*   Crucially uses the Web Audio API for duration calculation, which might fail for malformed files or unsupported WAV encodings within the browser's `decodeAudioData`.
*   Performs essential input validation (WAV file type check).
*   Responsible for resetting the application state when a new file is selected or the selection is cleared.
*   Manages the core `selectedFile` and `fileDuration` state variables, essential for conversion and estimations.
</details>
-->
*/