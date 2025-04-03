// conversion-process.js

// Dependencies assumed available globally:
// State: ffmpeg, selectedFile, fileDuration, convertedAudioBlob, base64String
// DOM: convertBtn, playSampleBtn, resultEl, formatRadios
// Ffmpeg: fetchFile, runFFmpegConversion, cleanupFFmpegFS
// Base64: setupBase64DisplayAndActions
// Audio: createAudioPlayer
// UI: updateStatus, resetConversionOutputUI, enableConvertButtonIfNeeded
// Utils: getBaseFilename, window.formatBytes

/**
 * Handles the main audio conversion workflow.
 */
const runConversion = async () => {
  // Prerequisite checks
  const ffmpegIsReady = typeof ffmpeg === 'object' && ffmpeg !== null && typeof ffmpeg.run === 'function';
  if (!ffmpegIsReady) {
      return updateStatus('Error: FFmpeg is not ready.', true);
  }
  if (!selectedFile) {
      return updateStatus('Error: No file selected.', true);
  }
  if (typeof fileDuration !== 'number' || fileDuration <= 0) {
      return updateStatus('Error: File duration not available or invalid. Cannot convert.', true);
  }

  // --- Start Conversion ---
  updateStatus('Starting conversion process...');
  if (convertBtn) convertBtn.disabled = true;
  if (playSampleBtn) playSampleBtn.disabled = true;

  // Reset previous output UI before starting
  resetConversionOutputUI();
  convertedAudioBlob = null; // Clear previous blob state
  // base64String is likely managed internally by base64-handler now, relying on events.

  // Determine formats and names
  const inputFilename = "input.wav"; // FFmpeg virtual FS input name
  const selectedFormatRadio = document.querySelector('input[name="format"]:checked');
  const outputFormat = selectedFormatRadio ? selectedFormatRadio.value : 'mp3'; // Default to mp3
  const outputFilename = `output.${outputFormat}`; // FFmpeg virtual FS output name
  const downloadFilenameBase = getBaseFilename(selectedFile.name);
  const downloadFilename = `${downloadFilenameBase}.${outputFormat}`; // Final download name
  const mimeType = outputFormat === 'mp3' ? 'audio/mpeg' : 'audio/opus';

  // Ensure FFmpeg FS is clean before writing
  cleanupFFmpegFS([inputFilename, outputFilename]);

  try {
      // Write input file to FFmpeg's virtual filesystem
      updateStatus('Loading file into FFmpeg memory...');
      // fetchFile is part of ffmpeg.js/util
      const fileData = await FFmpeg.fetchFile(selectedFile);
      ffmpeg.FS('writeFile', inputFilename, fileData);

      // Run the conversion command
      // runFFmpegConversion handles status updates during conversion via progress callback
      const outputData = await runFFmpegConversion(inputFilename, outputFilename, outputFormat); // Returns Uint8Array

      updateStatus('Conversion complete! Processing output...');

      // Create Blob from output data
      convertedAudioBlob = new Blob([outputData.buffer], { type: mimeType }); // Update state

      // --- Display Results ---
      if (resultEl) {
          resultEl.innerHTML = ''; // Clear previous just in case reset failed

          const resultTitle = document.createElement('h3');
          resultTitle.textContent = 'Conversion Result';
          resultTitle.style.margin = '15px 0 10px 0';

          // Create download link (Visible Link - not using triggerDownload utility here)
          const downloadUrl = URL.createObjectURL(convertedAudioBlob);
          const dlLink = document.createElement('a');
          dlLink.href = downloadUrl;
          dlLink.download = downloadFilename;
          dlLink.textContent = `Download ${downloadFilename} (${window.formatBytes(convertedAudioBlob.size)})`;
          dlLink.style.display = 'block';
          dlLink.style.marginBottom = '10px';
          // Note: We are NOT automatically revoking downloadUrl here, relying on browser or later cleanup.

          // Create audio player for converted file
          const audioPlayerContainer = createAudioPlayer(convertedAudioBlob, mimeType, 'Converted Audio');

          // Append results to the DOM
          resultEl.append(resultTitle, dlLink, audioPlayerContainer);
      } else {
          console.warn("Result element not found, cannot display conversion output.");
      }

      updateStatus('Conversion successful! Output ready.');

      // Start Base64 conversion and display process (runs asynchronously)
      // Let it run without await unless strictly necessary for subsequent steps here.
      setupBase64DisplayAndActions(convertedAudioBlob, outputFormat, downloadFilenameBase)
          .catch(base64Error => {
              console.error("Base64 processing failed after successful conversion:", base64Error);
              updateStatus("Conversion succeeded, but Base64 processing failed.", true); // Update status about the specific failure
          });

  } catch (e) {
      updateStatus(`Conversion failed: ${e.message || 'Unknown error'}`, true);
      console.error("Conversion Error:", e);
      convertedAudioBlob = null; // Ensure state is cleared on error
      // UI should show error status via updateStatus
  } finally {
      // Always try to clean up files from virtual FS
      cleanupFFmpegFS([inputFilename, outputFilename]);

      // Re-enable buttons based on the final state
      enableConvertButtonIfNeeded();
      // Note: playSampleBtn state is handled by enableConvertButtonIfNeeded based on selectedFile
  }
};


/*
<!-- collapsible_note -->
<!--
<details>
<summary>File Summary: conversion-process.js (Refactored)</summary>

**Purpose:** Contains the core logic for handling the audio conversion process initiated by the user.

**Key Functions:**
*   `runConversion()`: Orchestrates the conversion: checks prerequisites, disables UI, resets output, cleans FS, loads file, runs FFmpeg, processes Blob output, displays results (visible download link + player), initiates Base64 process, handles errors, cleans up FS, re-enables UI.

**Dependencies:** (Unchanged)
*   Global State Variables
*   DOM Elements
*   FFmpeg Handler Functions
*   Base64 Handler Function
*   Audio Player Function
*   Utility Functions (`getBaseFilename`, `window.formatBytes`)
*   UI Helper Functions (`updateStatus`, `resetConversionOutputUI`, `enableConvertButtonIfNeeded`)

**Global Variables:**
*   Manages `convertedAudioBlob` state.

**Notes:**
*   Core workflow remains the same.
*   Added slightly more robust prerequisite checks.
*   Clarified filenames (FS vs download).
*   Uses `window.formatBytes` consistently.
*   Error handling for the subsequent Base64 step added.
*   Maintains the creation of a visible download link, thus *not* using the `triggerDownload` utility in this specific case to preserve UI.
*   Relies on `resetConversionOutputUI` for cleaning up before start.
*   Relies on the `finally` block for FS cleanup and button state restoration.
</details>
-->
*/