// utils.js - Make utilities available globally

/**
 * Formats bytes into a human-readable string (KB, MB, etc.).
 * @param {number} bytes - The number of bytes.
 * @param {number} [dec=2] - The number of decimal places.
 * @returns {string} The formatted string.
 */
function formatBytes(bytes, dec = 2) {
  // Added explicit check for non-numeric or negative input
  if (typeof bytes !== 'number' || !isFinite(bytes) || bytes < 0) {
      return 'Invalid size';
  }
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']; // Added more sizes
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Ensure index is within bounds
  const index = Math.min(i, sizes.length - 1);

  return parseFloat((bytes / Math.pow(k, index)).toFixed(dec)) + ' ' + sizes[index];
}

/**
* Extracts the filename without the extension.
* @param {string} fullFilename - The full filename (e.g., "audio.wav").
* @returns {string} The base name (e.g., "audio").
*/
function getBaseFilename(fullFilename) {
// Added check for non-string input
if (typeof fullFilename !== 'string') return '';
const lastDotIndex = fullFilename.lastIndexOf('.');
// If no dot or dot is the first character, return original
if (lastDotIndex < 1) return fullFilename;
return fullFilename.substring(0, lastDotIndex);
}

/**
* Converts a File or Blob object to a PURE Base64 string (no data URI prefix).
* @param {File|Blob} fileOrBlob - The File or Blob to convert.
* @returns {Promise<string>} A promise resolving with the PURE Base64 string.
*/
function fileOrBlobToPureBase64(fileOrBlob) {
return new Promise((resolve, reject) => {
  if (!(fileOrBlob instanceof Blob)) { // Check if input is Blob or File (which inherits from Blob)
      return reject(new Error('Input must be a File or Blob.'));
  }
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex !== -1 && commaIndex < dataUrl.length - 1) {
      resolve(dataUrl.substring(commaIndex + 1)); // Return only Base64 part
    } else {
      // Handle cases where it might already be base64 or invalid format
      console.warn('Could not find data URI prefix during Base64 conversion.');
      reject(new Error('Invalid Data URL format encountered during Base64 conversion.'));
    }
  };
  reader.onerror = (e) => reject(new Error(`Error reading file/blob as Data URL: ${e.message || 'Unknown error'}`));
  reader.onabort = () => reject(new Error('File/blob reading for Base64 conversion was aborted.'));

  try {
    reader.readAsDataURL(fileOrBlob);
  } catch (err) {
    reject(new Error(`Failed to initiate file/blob reading: ${err.message}`));
  }
});
}

/**
* Creates a Blob from the given content and triggers a browser download.
* @param {BlobPart} content - The content for the Blob (e.g., string, ArrayBuffer).
* @param {string} filename - The desired name for the downloaded file.
* @param {string} [mimeType='application/octet-stream'] - The MIME type for the Blob.
*/
function triggerDownload(content, filename, mimeType = 'application/octet-stream') {
  try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = filename;
      // No need to assign textContent or style if it's not added to DOM visibly

      document.body.appendChild(a); // Required for Firefox compatibility
      a.click();
      document.body.removeChild(a); // Clean up the element

      URL.revokeObjectURL(url); // Clean up the Object URL
  } catch (error) {
      console.error(`Error triggering download for ${filename}:`, error);
      // Optionally alert the user
      // alert(`Failed to prepare file "${filename}" for download.`);
  }
}


// Attach to window to make globally available
// Note: Only attach functions intended to be globally accessible utilities.
window.formatBytes = formatBytes;
// window.formatFileSize removed - use formatBytes
window.getBaseFilename = getBaseFilename;
window.fileOrBlobToPureBase64 = fileOrBlobToPureBase64; // Add the new utility
window.triggerDownload = triggerDownload; // Add the new utility
// window.calculateBase64Size is removed as Blob size calculation within triggerDownload is sufficient.

/*
<!-- collapsible_note -->
<!--
<details>
<summary>File Summary: utils.js (Refactored)</summary>

**Purpose:** Provides common utility functions needed across different parts of the application and explicitly attaches them to the global `window` object for easy access.

**Key Functions:**
*   `formatBytes(bytes, dec)`: Formats bytes into a human-readable string (KB, MB, etc.). (Improved validation).
*   `getBaseFilename(fullFilename)`: Extracts the filename without the extension. (Improved validation).
*   `fileOrBlobToPureBase64(fileOrBlob)`: **(New Utility)** Converts a File or Blob to a PURE Base64 string using `FileReader`. Returns a Promise.
*   `triggerDownload(content, filename, mimeType)`: **(New Utility)** Creates a Blob from content and triggers a browser download using a temporary link.

**Dependencies:**
*   **Web APIs:** `Math`, `Blob`, `FileReader`, `URL`, `document`.

**Global Variables:**
*   Explicitly makes `formatBytes`, `getBaseFilename`, `fileOrBlobToPureBase64`, `triggerDownload` global via `window`.
*   `formatFileSize` and `calculateBase64Size` have been removed.

**Notes:**
*   Consolidated Base64 conversion logic (returning *pure* base64).
*   Consolidated download triggering logic for non-visible links.
*   Removed redundant `formatFileSize`.
*   Improved input validation slightly in `formatBytes` and `getBaseFilename`.
</details>
-->
*/