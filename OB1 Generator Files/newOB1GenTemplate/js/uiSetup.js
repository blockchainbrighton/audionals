// Removed base64ToArrayBuffer and createBlobUrl imports as they are handled elsewhere or removed.

/**
 * Initializes the image element with Base64 data.
 * @param {HTMLImageElement} imageElement The <img> element.
 * @param {string} imageBase64 The Base64 encoded image data.
 * @param {function(string): void} displayErrorCallback Callback to display errors in the UI.
 */
export function initializeImage(imageElement, imageBase64, displayErrorCallback) {
    if (!imageElement) {
        console.error("Image element not provided for initialization.");
        return;
    }
    // Use optional chaining and nullish coalescing for slightly cleaner check
    const imageData = imageBase64?.trim();
    if (imageData) {
        // Assuming JPEG, adjust mime type if necessary (e.g., image/png)
        imageElement.src = `data:image/jpeg;base64,${imageData}`;
        console.log("Image source set from Base64 data.");
    } else {
        console.warn("Image Base64 data missing or empty.");
        imageElement.alt = "Image data unavailable";
        imageElement.src = ''; // Clear potentially broken src
        // Use the provided callback to display the error in the main UI context
        if (displayErrorCallback) {
             displayErrorCallback("Warning: Image data is missing or invalid.");
        }
    }
}

// --- REMOVED ---
// initializeAudio - No longer needed, Web Audio API handles decoding directly.
// setupAudioErrorHandling - Tied to the removed HTML audio element.
// cleanupAudioUrl - Tied to the removed Blob URL for HTML audio.
// displayError - Centralized in main.js

// No exports needed from this file anymore except initializeImage