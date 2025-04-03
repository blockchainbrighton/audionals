// base64-handler.js

// Dependencies assumed available globally:
// DOM: base64Container, base64Output, base64Result, copyBase64Btn, downloadBase64Btn
// Utils: updateStatus, formatBytes, fileOrBlobToPureBase64, triggerDownload
// Audio: createAudioPlayer

/**
 * Converts a Blob to a Base64 encoded string (without the data URI prefix).
 * This function now acts primarily as a wrapper for the utility function
 * to maintain potential external dependencies on this specific function name.
 * @param {Blob} blob - The blob to convert.
 * @returns {Promise<string>} A promise resolving with the PURE Base64 string.
 */
const convertBlobToBase64 = blob => {
  // Delegate to the global utility function
  return window.fileOrBlobToPureBase64(blob);
};

/**
 * Sets up the Base64 output section with the converted audio and dispatches the event.
 * @param {Blob} audioBlob - The converted audio blob.
 * @param {string} outputFormat - 'mp3' or 'opus'.
 * @param {string} originalNameBase - The base filename of the original input.
 */
const setupBase64DisplayAndActions = async (audioBlob, outputFormat, originalNameBase) => {
  const elementsExist = base64Container && base64Output && base64Result && copyBase64Btn && downloadBase64Btn;
  if (!elementsExist) {
      console.error("Base64 UI elements not found. Cannot proceed.");
      updateStatus("Error: Base64 UI components missing.", true);
      return;
  }

  let generatedBase64String = null;

  try {
    updateStatus('Converting audio to Base64...');
    // Use the local (or potentially global if not modular) wrapper which calls the utility
    generatedBase64String = await convertBlobToBase64(audioBlob);

    // Dispatch event
    console.log("Dispatching audioBase64Generated event...");
    document.dispatchEvent(new CustomEvent('audioBase64Generated', {
        detail: { base64Data: generatedBase64String } // Send the pure base64 string
    }));

    // Setup UI
    base64Container.style.display = 'block';
    if (base64Output.tagName === 'TEXTAREA') {
       base64Output.value = generatedBase64String;
    } else {
       base64Output.textContent = generatedBase64String;
    }

    // Setup Player
    base64Result.innerHTML = ''; // Clear previous results
    const mimeType = outputFormat === 'mp3' ? 'audio/mpeg' : 'audio/opus';
    const base64PlayerContainer = createAudioPlayer(audioBlob, mimeType, 'Converted Audio (Preview)');
    base64Result.appendChild(base64PlayerContainer);

    // Setup Copy Button
    copyBase64Btn.onclick = () => {
      if (!navigator.clipboard) {
          alert('Clipboard API not available. Try copying manually.');
          return;
      }
      navigator.clipboard.writeText(generatedBase64String)
        .then(() => {
          const origText = copyBase64Btn.textContent;
          copyBase64Btn.textContent = 'Copied!';
          copyBase64Btn.disabled = true;
          setTimeout(() => {
              copyBase64Btn.textContent = origText;
              copyBase64Btn.disabled = false;
          }, 2000);
        })
        .catch(err => {
          console.error('Failed to copy base64:', err);
          alert('Failed to copy to clipboard. Check browser permissions (requires HTTPS or localhost).');
        });
    };
    copyBase64Btn.disabled = false;

    // Setup Download Button using the new utility
    const downloadFilename = `${originalNameBase}.${outputFormat}.base64.txt`;
    downloadBase64Btn.onclick = () => {
        // Use the triggerDownload utility
        window.triggerDownload(generatedBase64String, downloadFilename, 'text/plain;charset=utf-8');
    };
    downloadBase64Btn.disabled = false;

    // Update download button text with size (using simple length as approximation)
    const base64TextSizeBytes = generatedBase64String.length;
    downloadBase64Btn.textContent = `Download as TXT (${formatBytes(base64TextSizeBytes)})`;

    updateStatus('Base64 conversion complete!');

  } catch (e) {
    updateStatus(`Base64 processing failed: ${e.message || 'Unknown error'}`, true);
    console.error("Base64 Processing Error:", e);
    base64Container.style.display = 'none';
    base64Result.innerHTML = '';
    copyBase64Btn.disabled = true;
    downloadBase64Btn.disabled = true;
  }
};


/*
<!-- collapsible_note -->
<!--
<details>
<summary>File Summary: base64-handler.js (Refactored)</summary>

**Purpose:** Handles the conversion of audio Blobs into Base64 encoded strings and manages the UI section for displaying, copying, and downloading this Base64 data.

**Key Functions:**
*   `convertBlobToBase64(blob)`: Now primarily calls `window.fileOrBlobToPureBase64` utility, returning a Promise with the PURE Base64 string.
*   `setupBase64DisplayAndActions(audioBlob, outputFormat, originalNameBase)`: Orchestrates the Base64 handling process: calls `convertBlobToBase64`, updates UI, sets up copy button, uses `window.triggerDownload` for download button, creates preview player, and dispatches the `audioBase64Generated` event.

**Dependencies:**
*   **DOM Elements (implicitly global):** `base64Container`, `base64Output`, `base64Result`, `copyBase64Btn`, `downloadBase64Btn`.
*   **Utility Functions (implicitly global):** `updateStatus`, `formatBytes`, `fileOrBlobToPureBase64`, `triggerDownload`.
*   **Audio Player Function (implicitly global):** `createAudioPlayer`.

**Global Variables:**
*   Dispatches an event instead of setting a global `base64String`.

**Notes:**
*   Core Base64 conversion logic delegated to `utils.js`.
*   Download logic for the text file uses the `triggerDownload` utility from `utils.js`.
*   Still relies heavily on globally available functions and DOM elements.
</details>
-->
*/