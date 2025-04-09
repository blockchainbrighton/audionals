// ui-helpers.js

// Dependencies assumed available globally:
// DOM Elements (statusEl, progressEl, etc.)
// Global State (ffmpeg, selectedFile, fileDuration, originalAudioUrl)
// Utilities (window.formatBytes)
// Data (audioFormatInfo)

/**
 * Updates the status message display.
 * @param {string} msg - The message to display.
 * @param {boolean} [err=false] - Whether the message represents an error.
 */
const updateStatus = (msg, err = false) => {
  // console.log(`Status Update: ${msg} ${err ? '(ERROR)' : ''}`); // Keep console log concise maybe
  if (statusEl) {
    statusEl.textContent = `Status: ${msg}`;
    statusEl.className = err ? 'error' : 'status'; // Use explicit class names
  }
  // Hide progress only if it's NOT an error message (errors might happen during progress)
  // Let updateProgress handle showing/hiding progress during conversion.
  // Resetting progress should happen elsewhere (e.g., resetUIForNewFile, resetConversionOutputUI)
  // if (progressEl && !err) {
  //    progressEl.style.display = 'none';
  // }

  // Re-enable buttons only if it's an error AND conversion isn't actively running
  // The finally block in runConversion is a better place to manage button state after attempts.
  // Removing button logic from here to avoid conflicts.
  // if (err && convertBtn) {
  //    enableConvertButtonIfNeeded(); // Let finally block handle this
  // }
};

/**
 * Updates the FFmpeg conversion progress bar.
 * @param {number} ratio - The progress ratio (0 to 1).
 */
const updateProgress = (ratio) => {
  if (progressEl && statusEl) {
    const percent = Math.max(0, Math.min(100, Math.round(ratio * 100)));
    // Only show progress bar if conversion is actually happening (ratio > 0)
    // or explicitly being reset (handle reset elsewhere). Assume ratio > 0 means show.
    if (ratio > 0 && ratio <= 1) {
        progressEl.style.display = 'block';
        progressEl.value = percent;
        // Update status only during progress, don't overwrite final messages
        // Use a specific check or flag if needed, otherwise let status be set by main process.
        // updateStatus(`Converting... (${percent}%)`); // This can overwrite "Conversion Complete" etc.
        statusEl.textContent = `Status: Converting... (${percent}%)`; // Update status directly
        statusEl.className = 'status'; // Ensure status isn't stuck on error class
    } else if (ratio <= 0) {
        // Potentially hide progress if ratio is 0 (e.g., start or reset)
        // Let reset functions handle hiding explicitly.
    }
  }
};

/**
 * Enables or disables the Convert and Play Sample buttons based on state.
 */
const enableConvertButtonIfNeeded = () => {
  // Ensure state variables are accessed safely
  const ffmpegIsReady = typeof ffmpeg === 'object' && ffmpeg !== null && typeof ffmpeg.run === 'function'; // More robust check
  const fileIsSelected = selectedFile instanceof File;
  const convertEnabled = ffmpegIsReady && fileIsSelected;

  if (convertBtn) convertBtn.disabled = !convertEnabled;
  if (playSampleBtn) playSampleBtn.disabled = !fileIsSelected;
  // Removed return value as it wasn't used based on provided code.
};

/**
 * Updates the estimated file size display based on current settings and file duration.
 */
const updateEstimatedSize = () => {
  // Check core dependencies first
  if (!fileDuration || !selectedFile) {
      // Clear estimates if prerequisites are missing
      if (estSizeMp3Span) estSizeMp3Span.textContent = '';
      if (estSizeOpusSpan) estSizeOpusSpan.textContent = '';
      return;
  }
  // Check all required elements exist
  const elementsExist = estSizeMp3Span && estSizeOpusSpan && formatRadios &&
                        mp3QualitySlider && opusBitrateSlider &&
                        mp3QualityValueSpan && opusBitrateValueSpan;
  if (!elementsExist) {
      console.warn("Missing elements required for estimated size calculation.");
      return;
  }


  const selectedFormatRadio = document.querySelector('input[name="format"]:checked');
  if (!selectedFormatRadio) return; // No format selected

  const selectedFormat = selectedFormatRadio.value;
  let bitrateKbps = 0;
  let estimatedSizeBytes = 0;

  // Clear previous estimates before setting new one
  estSizeMp3Span.textContent = '';
  estSizeOpusSpan.textContent = '';

  try { // Wrap calculations in try-catch for safety
      if (selectedFormat === 'mp3') {
          const visualQuality = parseInt(mp3QualitySlider.value, 10);
          // Ensure mapping is safe
          const approxBitrates = [245, 225, 190, 175, 165, 130, 115, 100, 85, 65];
          if (visualQuality >= 0 && visualQuality < approxBitrates.length) {
              bitrateKbps = approxBitrates[visualQuality];
          } else {
              bitrateKbps = 128; // Default fallback
              console.warn("Invalid MP3 quality value, using default bitrate.");
          }
          estimatedSizeBytes = (bitrateKbps * 1000 * fileDuration) / 8;
          // Use window.formatBytes consistently
          estSizeMp3Span.textContent = `~ ${window.formatBytes(estimatedSizeBytes)}`;
      } else if (selectedFormat === 'opus') {
          bitrateKbps = parseInt(opusBitrateSlider.value, 10);
          if (!isFinite(bitrateKbps) || bitrateKbps <= 0) {
               console.warn("Invalid Opus bitrate value.");
               return; // Don't estimate if bitrate is invalid
          }
          estimatedSizeBytes = (bitrateKbps * 1000 * fileDuration) / 8;
          estSizeOpusSpan.textContent = `~ ${window.formatBytes(estimatedSizeBytes)}`;
      }
  } catch (e) {
      console.error("Error calculating estimated size:", e);
      // Clear estimates on error
      if (estSizeMp3Span) estSizeMp3Span.textContent = '';
      if (estSizeOpusSpan) estSizeOpusSpan.textContent = '';
  }
};

/**
 * Shows/hides the relevant quality settings (MP3/Opus) based on the selected format.
 */
const updateQualityDisplays = () => {
  if (!formatRadios || !mp3SettingsDiv || !opusSettingsDiv) return;
  const selectedFormatRadio = document.querySelector('input[name="format"]:checked');
  // Default to the first radio if none is checked somehow
  const fmt = selectedFormatRadio ? selectedFormatRadio.value : (formatRadios[0] ? formatRadios[0].value : null);

  if (fmt === 'mp3') {
      mp3SettingsDiv.style.display = 'block';
      opusSettingsDiv.style.display = 'none';
  } else if (fmt === 'opus') {
      mp3SettingsDiv.style.display = 'none';
      opusSettingsDiv.style.display = 'block';
  } else {
       mp3SettingsDiv.style.display = 'none';
       opusSettingsDiv.style.display = 'none';
  }
  updateEstimatedSize(); // Update size estimate whenever format changes
};

/**
 * Resets UI elements related to file selection and ALL results (conversion + base64).
 */
const resetUIForNewFile = () => {
  console.log("Resetting UI for new file selection...");
  // Reset Conversion Results Area
  if (resultEl) resultEl.innerHTML = '';

  // Reset Base64 Area
  if (base64Container) base64Container.style.display = 'none';
  if (base64Output) base64Output.textContent = ''; // Use textContent for <pre> or similar
  if (base64Output && base64Output.tagName === 'TEXTAREA') base64Output.value = ''; // Handle textarea
  if (base64Result) base64Result.innerHTML = '';
  if (copyBase64Btn) copyBase64Btn.disabled = true;
  if (downloadBase64Btn) {
      downloadBase64Btn.textContent = 'Download as TXT';
      downloadBase64Btn.disabled = true;
  }

  // Reset Original Audio Player Area
  if (originalAudioContainer) {
    originalAudioContainer.innerHTML = ''; // Clear content
    originalAudioContainer.style.display = 'none'; // Hide container
  }
  if (playSampleBtn) {
      playSampleBtn.textContent = 'Play Original';
      playSampleBtn.disabled = true; // Should be disabled if no file selected
  }

  // Revoke Original Audio URL if it exists
  if (originalAudioUrl) {
    try {
        URL.revokeObjectURL(originalAudioUrl);
        console.log("Revoked previous original audio URL.");
    } catch(e) {
        console.warn("Could not revoke original audio URL:", e);
    }
    originalAudioUrl = null; // Clear the reference
  }
  // Ensure the audio element reference itself is cleared (if managed globally)
  if (typeof originalAudioElement !== 'undefined') {
      originalAudioElement = null;
  }


  // Reset Estimates
  if (estSizeMp3Span) estSizeMp3Span.textContent = '';
  if (estSizeOpusSpan) estSizeOpusSpan.textContent = '';

  // Reset Progress Bar
  if (progressEl) {
    progressEl.style.display = 'none';
    progressEl.value = 0;
  }

  // Hide Info Modal
  if (audioInfoContainer) audioInfoContainer.style.display = 'none';

  // Reset status message (optional, might be set immediately after by file handler)
  // updateStatus("Ready. Select a WAV file.");
};

/**
 * Resets UI elements specific to the conversion output (Result + Base64 sections + Progress).
 * Called before starting a new conversion.
 */
const resetConversionOutputUI = () => {
  console.log("Resetting conversion output UI...");
  if (resultEl) resultEl.innerHTML = '';

  if (base64Container) base64Container.style.display = 'none';
   if (base64Output) base64Output.textContent = ''; // Use textContent for <pre> or similar
   if (base64Output && base64Output.tagName === 'TEXTAREA') base64Output.value = ''; // Handle textarea
  if (base64Result) base64Result.innerHTML = '';
   if (copyBase64Btn) copyBase64Btn.disabled = true;
   if (downloadBase64Btn) {
       downloadBase64Btn.textContent = 'Download as TXT';
       downloadBase64Btn.disabled = true;
   }

  if (progressEl) {
    progressEl.style.display = 'none';
    progressEl.value = 0;
  }
  // Typically don't hide the info container here, only reset results.
  // if (audioInfoContainer) audioInfoContainer.style.display = 'none';
};

/**
 * Displays the audio format information in the designated container.
 * Uses the globally available `audioFormatInfo` object.
 * @param {string} [htmlContent] - Optional explicit HTML content to display instead of default assembly.
 */
const displayAudioFormatInfo = (htmlContent) => {
  if (!audioInfoContainer || !audioInfoContent) {
    console.error("Audio info container elements not found in the DOM.");
    return;
  }

  // Use provided HTML if available, otherwise assemble from audioFormatInfo
  if (typeof htmlContent === 'string') {
     audioInfoContent.innerHTML = htmlContent;
  } else if (typeof audioFormatInfo === 'object' && audioFormatInfo !== null) {
      // Assemble default content carefully, checking each property exists
      audioInfoContent.innerHTML = `
        ${audioFormatInfo.usageInstructions || ''}
        ${audioFormatInfo.conceptsTitle || ''}
        ${audioFormatInfo.losslessVsLossy || ''}
        ${audioFormatInfo.bitrate || ''}
        ${audioFormatInfo.formatsTitle || ''}
        ${audioFormatInfo.wav || ''}
        ${audioFormatInfo.mp3 || ''}
        ${audioFormatInfo.opus || ''}
        ${audioFormatInfo.opusRecommendationsTitle || ''}
        ${audioFormatInfo.opusDetails || ''}
      `;
  } else {
      console.error("audioFormatInfo object not found or invalid.");
      audioInfoContent.innerHTML = '<p>Error: Information content is unavailable.</p>';
  }

  audioInfoContainer.style.display = 'block';
};

/**
 * Hides the audio format information container.
 */
const hideAudioFormatInfo = () => {
  if (audioInfoContainer) {
    audioInfoContainer.style.display = 'none';
  }
};


/*
<!-- collapsible_note -->
<!--
<details>
<summary>File Summary: ui-helpers.js (Refactored)</summary>

**Purpose:** Provides a collection of functions dedicated to manipulating the user interface: status, progress, button states, size estimates, settings visibility, UI resets, and info display.

**Key Functions:** (Signatures unchanged, implementation slightly improved)
*   `updateStatus(msg, err)`: Updates status text/class.
*   `updateProgress(ratio)`: Updates progress bar value and visibility.
*   `enableConvertButtonIfNeeded()`: Manages convert/play button states based on ffmpeg/file state. (More robust ffmpeg check).
*   `updateEstimatedSize()`: Calculates and displays estimated sizes. (Safer checks, uses window.formatBytes).
*   `updateQualityDisplays()`: Toggles MP3/Opus settings visibility.
*   `resetUIForNewFile()`: Resets ALL result areas (conversion, base64, original player) and estimates for new file selection. (More thorough reset).
*   `resetConversionOutputUI()`: Resets only conversion/base64 results and progress, before a new conversion starts. (More focused reset).
*   `displayAudioFormatInfo(htmlContent)`: Shows info modal with provided or default content. (Safer assembly).
*   `hideAudioFormatInfo()`: Hides info modal.

**Dependencies:** (Unchanged)
*   DOM Elements (Implicitly Global)
*   Global State Variables
*   Global Utility Functions (`window.formatBytes`)
*   Global Data Objects (`audioFormatInfo`)

**Global Variables:**
*   All functions are implicitly global.

**Notes:**
*   Minor improvements in robustness (e.g., checks for elements/state, safer calculations).
*   Clarified difference between `resetUIForNewFile` (total reset) and `resetConversionOutputUI` (pre-conversion reset).
*   Ensures consistent use of `window.formatBytes`.
*   Progress bar logic slightly refined. Status updates during progress handled more carefully.
</details>
-->
*/