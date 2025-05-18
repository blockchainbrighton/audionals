// file-handler.js

/**
 * Gets the duration of an audio file using the Web Audio API.
 * @param {File} file - The audio file object.
 * @returns {Promise<number>} A promise that resolves with the duration in seconds.
 */
const getAudioDuration = file => new Promise((resolve, reject) => {
  if (!file || !(file instanceof File) || !file.type.startsWith('audio/')) { // Added instanceof File check
      return reject("Invalid file object or type provided for duration check.");
  }
  
    const reader = new FileReader();
  
    reader.onload = e => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
    // This will also call updateOriginalFileInfoDisplay(null) and updateEstimatedSize()
    if (typeof resetUIForNewFile === 'function') {
        resetUIForNewFile();
    } else {
        console.warn("resetUIForNewFile function not found.");
    }

    // Clear state variables (some might be redundant if resetUIForNewFile handles them too)
    selectedFile = null;
    fileDuration = null;
    convertedAudioBlob = null;
    base64String = null;
    // originalAudioElement is cleared by resetUIForNewFile calling originalAudioContainer.innerHTML = ''

    if (file) {
        if (!file.type || !file.type.startsWith('audio/')) {
            updateStatus(`Error: Please select a valid audio file. Selected type: ${file.type || 'unknown'}`, true);
            if (fileInput) fileInput.value = '';
            // updateOriginalFileInfoDisplay(null); // Already called by resetUIForNewFile
            // updateEstimatedSize(); // Already called by resetUIForNewFile
            enableConvertButtonIfNeeded();
            return;
        }

        selectedFile = file;
        updateStatus(`File selected: ${selectedFile.name}. Reading duration...`);
        
        // Update original file info display immediately
        if (typeof updateOriginalFileInfoDisplay === 'function') {
            updateOriginalFileInfoDisplay(selectedFile);
        }

        enableConvertButtonIfNeeded();

        try {
            fileDuration = await getAudioDuration(selectedFile);
            updateStatus(`File ready: ${selectedFile.name} (${fileDuration.toFixed(1)}s)`);
            
            if (typeof updateEstimatedSize === 'function') {
                updateEstimatedSize(); // Update size estimate now we have duration
            }
            if (typeof setupOriginalAudioPlayer === 'function') {
                setupOriginalAudioPlayer();
            } else {
                console.warn("setupOriginalAudioPlayer function not found.");
            }
        } catch (err) {
            updateStatus(`Error reading file: ${err}`, true);
            fileDuration = null;
            selectedFile = null;
            if (fileInput) fileInput.value = '';
            if (typeof updateOriginalFileInfoDisplay === 'function') {
                updateOriginalFileInfoDisplay(null); // Clear original info on error
            }
            if (typeof updateEstimatedSize === 'function') {
                updateEstimatedSize(); // Reset estimate on error
            }
        }
    } else {
        updateStatus('No file selected.');
        // updateOriginalFileInfoDisplay(null); // Handled by resetUIForNewFile if called initially
        // updateEstimatedSize(); // Handled by resetUIForNewFile
    }

    enableConvertButtonIfNeeded();
};