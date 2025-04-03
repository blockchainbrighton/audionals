/**
 * Handles the conversion of image files to base64 strings and related UI.
 */

// Dependencies assumed available globally:
// Utils: window.fileOrBlobToPureBase64, window.triggerDownload, window.formatBytes
// OB1 Integration: window.updateImageBase64, window.checkGenerateButton (optional check)
// DOM Elements by ID (image-file-input, etc.)

/**
 * Converts an image File object to Base64.
 * Returns a Promise resolving with the FULL data URI string (for compatibility with preview logic).
 * Internally, it gets the PURE base64 and sends it to the OB1 generator.
 * @param {File} imageFile - The image file to convert.
 * @returns {Promise<string>} A promise resolving with the FULL Base64 data URI string (e.g., "data:image/jpeg;base64,...").
 */
export async function imageToBase64(imageFile) {
  // Use the utility to get the pure base64 data first
  const base64Data = await window.fileOrBlobToPureBase64(imageFile);

  // Update OB1 generator state with the PURE base64 data
  if (typeof window.updateImageBase64 === 'function') {
      window.updateImageBase64(base64Data);
      console.log('Image base64 data sent to OB1 generator');
  } else {
      console.warn('updateImageBase64 function not found on window object');
  }

  // Construct the full data URI for the promise resolution (maintaining original behavior for preview etc.)
  // We need the file type for the prefix.
  const mimeType = imageFile.type || 'image/jpeg'; // Default if type is missing
  const fullDataURI = `data:${mimeType};base64,${base64Data}`;

  return fullDataURI; // Resolve with the full Data URI
}

// Removed createDownloadableTextFile function as the download is now handled directly in the event listener using triggerDownload utility.

/**
* Initialize the image converter UI and logic.
*/
export function initializeImageConverter() {
  const fileInput = document.getElementById('image-file-input');
  const convertButton = document.getElementById('convert-image-button');
  const imagePreview = document.getElementById('image-preview');
  const base64Output = document.getElementById('base64-output'); // Textarea/Pre for pure base64
  const downloadButton = document.getElementById('download-base64-button'); // Button to download the pure base64 as TXT
  const fileSizeInfo = document.getElementById('file-size-info');

  let selectedFile = null;
  let currentPureBase64 = null; // Store the pure base64 locally for download

  // Event listeners
  if (fileInput) {
      fileInput.addEventListener('change', async (event) => {
          selectedFile = event.target.files[0];
          currentPureBase64 = null; // Reset on new file selection
          if (convertButton) convertButton.disabled = true; // Disable until file is processed
          if (downloadButton) downloadButton.disabled = true;
          if (base64Output) {
              base64Output.value = '';
              base64Output.style.display = 'none';
          }
          if (imagePreview) {
              imagePreview.src = '#'; // Clear preview
              imagePreview.style.display = 'none';
          }

          if (selectedFile && selectedFile.type.startsWith('image/')) {
              // Display file info
              if (fileSizeInfo) {
                  fileSizeInfo.textContent = `File: ${selectedFile.name} (${window.formatBytes(selectedFile.size)})`;
              }

              // Preview image using FileReader directly for immediate feedback
              const reader = new FileReader();
              reader.onload = (e) => {
                  if (imagePreview) {
                      imagePreview.src = e.target.result; // e.target.result is the full Data URI here
                      imagePreview.style.display = 'block';
                  }
                   // Enable convert button only after preview is loaded
                  if (convertButton) {
                      convertButton.disabled = false;
                  }
              };
              reader.onerror = () => {
                   if (fileSizeInfo) fileSizeInfo.textContent = `Error reading file ${selectedFile.name}`;
                   if (convertButton) convertButton.disabled = true;
              }
              reader.readAsDataURL(selectedFile);

          } else if (selectedFile) {
               if (fileSizeInfo) fileSizeInfo.textContent = `Selected file (${selectedFile.name}) is not a recognized image type.`;
          } else {
               if (fileSizeInfo) fileSizeInfo.textContent = `No file selected.`;
          }
      });
  }

  if (convertButton) {
      convertButton.addEventListener('click', async () => {
          if (selectedFile) {
              convertButton.disabled = true; // Disable during conversion
              if (downloadButton) downloadButton.disabled = true;
              try {
                  // imageToBase64 internally gets pure base64, calls updateImageBase64,
                  // and resolves with the full Data URI (which we don't strictly need here anymore
                  // but await its completion).
                  await imageToBase64(selectedFile);

                  // Re-get the pure base64 data (since updateImageBase64 might be async or complex)
                  // Or, ideally, imageToBase64 should return both pure and full URI if needed.
                  // For simplicity here, let's reconvert *if* needed for display/download
                  // A better approach would be for imageToBase64 to return an object { pure, full }
                  // Let's assume updateImageBase64 correctly sets the state needed by OB1 generator.
                  // We need pure base64 for the textarea and download. Get it again.
                  currentPureBase64 = await window.fileOrBlobToPureBase64(selectedFile);

                  // Display pure base64 output
                  if (base64Output) {
                      base64Output.value = currentPureBase64;
                      base64Output.style.display = 'block';
                  }

                  // Enable download button
                  if (downloadButton) {
                      downloadButton.disabled = false;
                  }

              } catch (error) {
                  console.error('Error converting image:', error);
                  alert('Failed to convert image to base64.');
                   if (base64Output) base64Output.style.display = 'none'; // Hide on error
              } finally {
                  // Re-enable convert button if a file is still selected
                   if (convertButton && selectedFile) {
                     convertButton.disabled = false;
                   }
              }
          }
      });
  }

  if (downloadButton) {
      downloadButton.addEventListener('click', () => {
          // Use the locally stored pure base64 data
          if (currentPureBase64 && selectedFile) {
               // Generate filename for the text file
              const baseFileName = window.getBaseFilename(selectedFile.name);
              const txtFilename = `${baseFileName}_base64.txt`;

              // Use the triggerDownload utility
              window.triggerDownload(currentPureBase64, txtFilename, 'text/plain;charset=utf-8');
          } else {
              alert("No Base64 data available to download.");
              console.warn("Download button clicked but currentPureBase64 or selectedFile is missing.");
          }
      });
  }

  // Optional: Check if OB1 generator integration points exist
  if (typeof window.updateImageBase64 !== 'function') {
    console.warn('window.updateImageBase64 function not found. OB1 integration might fail.');
  }
  // Check if OB1 generator is initialized on the window
  // if (typeof window.checkGenerateButton !== 'function') {
  //   console.warn('OB1 generator functions not found. Make sure ob1-generator.js is loaded.');
  // }
}

/*
<!-- collapsible_note -->
<!--
<details>
<summary>File Summary: image-to-base64.js (Refactored)</summary>

**Purpose:** Handles the user interface and logic for selecting an image file, converting it to a Base64 string, displaying a preview, providing download options, and integrating with the OB1 generator by sending the PURE Base64 data.

**Key Functions:**
*   `imageToBase64(imageFile)`: Converts image File to Base64. Calls `window.fileOrBlobToPureBase64` internally, calls `window.updateImageBase64` with the *pure* data, but returns a Promise resolving with the *full data URI* string for compatibility.
*   `initializeImageConverter()`: Sets up event listeners and manages the UI flow for image selection, preview, conversion, and download.

**Dependencies:**
*   **DOM Elements (by ID):** `image-file-input`, `convert-image-button`, `image-preview`, `base64-output`, `download-base64-button`, `file-size-info`.
*   **Global Functions (on `window`):** `window.formatBytes`, `window.fileOrBlobToPureBase64`, `window.triggerDownload`, `window.updateImageBase64`, `window.getBaseFilename`.
*   **Web APIs:** `FileReader`, `Promise`.
*   **ES Module Syntax:** Uses `export` for functions.

**Global Variables:**
*   Exports functions via ES Modules.
*   Relies on and calls global functions attached to the `window` object.

**Notes:**
*   This is now the sole handler for the image-to-base64 feature.
*   `image-base64-handler.js` is removed/deprecated.
*   Uses `fileOrBlobToPureBase64` utility for conversion logic.
*   Uses `triggerDownload` utility for the Base64 text file download.
*   Maintains the behavior of sending PURE base64 to `window.updateImageBase64`.
*   The `imageToBase64` function still resolves with the FULL data URI to potentially avoid breaking code that uses it for previews directly.
*   Download button now uses locally stored pure base64 generated during the conversion step.
</details>
-->
*/