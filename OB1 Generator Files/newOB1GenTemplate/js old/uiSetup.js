import { base64ToArrayBuffer, createBlobUrl } from './dataUtils.js';

let currentAudioObjectUrl = null; // Keep track of the URL for cleanup

/**
 * Initializes the image element with Base64 data.
 * @param {HTMLImageElement} imageElement The <img> element.
 * @param {string} imageBase64 The Base64 encoded image data.
 */
export function initializeImage(imageElement, imageBase64) {
    if (!imageElement) {
        console.error("Image element not provided for initialization.");
        return;
    }
    if (imageBase64 && imageBase64.trim() !== '') {
        // Use direct data URI for the image
        imageElement.src = `data:image/jpeg;base64,${imageBase64}`; // Assuming JPEG, adjust if needed
        console.log("Image source set.");
    } else {
        console.error("Image Base64 data missing or empty.");
        imageElement.alt = "Error loading image data.";
        // Optionally display an error message to the user
        displayError("Error: Image data is missing or invalid.");
    }
}

/**
 * Initializes the audio element with Base64 data using a Blob URL.
 * @param {HTMLAudioElement} audioElement The <audio> element.
 * @param {string} audioBase64 The Base64 encoded audio data (Opus assumed).
 */
export function initializeAudio(audioElement, audioBase64) {
     if (!audioElement) {
        console.error("Audio element not provided for initialization.");
        return false; // Indicate failure
    }
    if (audioBase64 && audioBase64.trim() !== '') {
        console.log("Attempting to process audio Base64 data...");
        const audioBuffer = base64ToArrayBuffer(audioBase64);

        if (audioBuffer) {
            currentAudioObjectUrl = createBlobUrl(audioBuffer, 'audio/opus', currentAudioObjectUrl);

            if (currentAudioObjectUrl) {
                audioElement.src = currentAudioObjectUrl;
                console.log("Audio src set to Object URL.");
                setupAudioErrorHandling(audioElement);
                return true; // Indicate success
            } else {
                 console.error("Audio setup failed: Could not create Blob URL.");
                 displayError("Error: Failed to create audio source.");
                 return false; // Indicate failure
            }
        } else {
            console.error("Audio setup failed due to Base64 decoding error.");
            displayError("Error: Audio data is invalid or corrupted.");
            return false; // Indicate failure
        }
    } else {
        console.error("Audio Base64 data missing or empty.");
        displayError("Error: Audio data is missing.");
        return false; // Indicate failure
    }
}

/**
 * Sets up detailed error handling for the audio element.
 * @param {HTMLAudioElement} audioElement
 */
function setupAudioErrorHandling(audioElement) {
     audioElement.onloadedmetadata = () => {
           console.log("Audio metadata loaded. Duration:", audioElement.duration);
      };
      audioElement.onerror = (e) => {
          console.error("Audio Element Error:", audioElement.error);
          let errorMsg = "Unknown audio error.";
          if (window.MediaError && audioElement.error) {
              switch (audioElement.error.code) {
                  case MediaError.MEDIA_ERR_ABORTED: errorMsg = "Playback aborted."; break;
                  case MediaError.MEDIA_ERR_NETWORK: errorMsg = "Network error."; break;
                  case MediaError.MEDIA_ERR_DECODE: errorMsg = "Audio decoding error (corrupt/unsupported format?)."; break;
                  case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMsg = "Audio source format not supported (check Opus support)."; break;
                  default: errorMsg = `Unknown error (Code: ${audioElement.error.code})`;
              }
          }
           console.error("Detailed Audio Error Message:", errorMsg);
           alert(`Error loading audio: ${errorMsg}`);
      };
}

/**
 * Cleans up the created Blob URL. Should be called on page unload.
 */
export function cleanupAudioUrl() {
    if (currentAudioObjectUrl) {
        URL.revokeObjectURL(currentAudioObjectUrl);
        console.log("Revoked audio Object URL on cleanup.");
        currentAudioObjectUrl = null;
    }
}

/**
 * Helper to display errors to the user.
 * @param {string} message
 */
function displayError(message) {
    // Avoid creating multiple error messages for the same thing
    if (document.querySelector(`.error-message[data-message="${message}"]`)) return;

    const errorDiv = document.createElement('div');
    errorDiv.textContent = message;
    errorDiv.dataset.message = message; // Add data attribute to track
    errorDiv.className = 'error-message'; // Add class for potential styling/selection
    errorDiv.style.color = 'red';
    errorDiv.style.padding = '5px';
    errorDiv.style.backgroundColor = '#fee';
    errorDiv.style.border = '1px solid red';
    errorDiv.style.marginTop = '5px';
    // Prepend within the controls div or append to body if controls don't exist
    const controlsDiv = document.querySelector('.controls');
     if (controlsDiv) {
         controlsDiv.prepend(errorDiv);
     } else {
        document.body.appendChild(errorDiv); // Fallback
     }
}