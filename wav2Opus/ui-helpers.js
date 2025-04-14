// ui-helpers.js

/**
 * Updates the status message display.
 * @param {string} msg - The message to display.
 * @param {boolean} [err=false] - Whether the message represents an error.
 */
const updateStatus = (msg, err = false) => {
  // Assumes statusEl is globally available or imported from dom-elements.js
  console.log(`Status Update: ${msg}${err ? ' (Error)' : ''}`);
  if (statusEl) {
    statusEl.textContent = `Status: ${msg}`;
    statusEl.className = err ? 'error' : '';
    // Ensure status is visible and announced
    statusEl.setAttribute('aria-hidden', 'false');
  }
  // Hide progress bar by default when status updates, unless it's a progress message
  if (progressEl && !msg.includes('%')) {
    progressEl.style.display = 'none';
    progressEl.setAttribute('aria-hidden', 'true');
  }
  // Re-enable buttons based on current state if an error occurs, handled by calling function generally
};

/**
 * Updates the FFmpeg conversion progress bar.
 * @param {number} ratio - The progress ratio (0 to 1).
 */
const updateProgress = (ratio) => {
    // Assumes progressEl and statusEl are globally available or imported
    if (progressEl && statusEl) {
        progressEl.style.display = 'block';
        progressEl.setAttribute('aria-hidden', 'false');
        const percent = Math.max(0, Math.min(100, Math.round(ratio * 100)));
        progressEl.value = percent;
        updateStatus(`Converting... (${percent}%)`); // Also update status text
    }
};

/**
 * Enables or disables the Convert and Play Sample buttons based on state.
 * Assumes ffmpeg, selectedFile, convertBtn, playSampleBtn are accessible.
 * @returns {boolean} True if the convert button was disabled, false otherwise.
 */
const enableConvertButtonIfNeeded = () => {
  const ffmpegReady = typeof ffmpeg !== 'undefined' && ffmpeg !== null;
  const fileSelected = selectedFile !== null;

  const convertEnabled = ffmpegReady && fileSelected;
  const playEnabled = fileSelected;

  if (convertBtn) convertBtn.disabled = !convertEnabled;
  if (playSampleBtn) playSampleBtn.disabled = !playEnabled;

  return !convertEnabled; // Return true if convert button is disabled
};

/**
 * Updates the estimated file size display based on current settings and duration.
 * Assumes relevant DOM elements (spans, sliders, radios) and fileDuration are accessible.
 */
const updateEstimatedSize = () => {
  // Ensure necessary elements and data are present
  if (!fileDuration || !selectedFile || !estSizeMp3Span || !estSizeOpusSpan || !estSizeWebmSpan ||
      !formatRadios || !mp3QualitySlider || !opusBitrateSlider ||
      !mp3QualityValueSpan || !opusBitrateValueSpan) {
      // console.warn("Skipping size update - missing elements or data.");
      return;
  }

  const selectedFormatRadio = document.querySelector('input[name="format"]:checked');
  if (!selectedFormatRadio) return;
  const selectedFormat = selectedFormatRadio.value;

  let bitrateKbps = 0;
  let estimatedSizeBytes = 0;

  // Clear all estimates initially
  estSizeMp3Span.textContent = '';
  estSizeOpusSpan.textContent = '';
  estSizeWebmSpan.textContent = '';

  try {
      if (selectedFormat === 'mp3') {
          const visualQuality = parseInt(mp3QualitySlider.value, 10);
          const ffmpegQuality = visualQuality; // Assuming slider 0 = best = -q:a 0
          // Approximate VBR bitrates for -q:a 0-9 (LAME defaults may vary)
          const approxBitrates = [245, 225, 190, 175, 165, 130, 115, 100, 85, 65];
          bitrateKbps = approxBitrates[ffmpegQuality] || 128; // Fallback
          estimatedSizeBytes = (bitrateKbps * 1000 * fileDuration) / 8;
          // Ensure formatBytes function is available (from utils.js)
          estSizeMp3Span.textContent = `~ ${window.formatBytes ? window.formatBytes(estimatedSizeBytes) : `${(estimatedSizeBytes / 1024).toFixed(1)} KB`}`;

      } else if (selectedFormat === 'opus' || selectedFormat === 'webm') { // Combined Opus and WebM(Opus)
          bitrateKbps = parseInt(opusBitrateSlider.value, 10);
          estimatedSizeBytes = (bitrateKbps * 1000 * fileDuration) / 8;
          const formattedSize = window.formatBytes ? window.formatBytes(estimatedSizeBytes) : `${(estimatedSizeBytes / 1024).toFixed(1)} KB`;
          // Display in the correct span based on format
          if (selectedFormat === 'opus') {
              estSizeOpusSpan.textContent = `~ ${formattedSize}`;
          } else { // webm
              estSizeWebmSpan.textContent = `~ ${formattedSize}`;
          }
      }
  } catch (e) {
      console.error("Error calculating estimated size:", e);
      // Clear estimates on error
      estSizeMp3Span.textContent = '';
      estSizeOpusSpan.textContent = '';
      estSizeWebmSpan.textContent = '';
  }
};


/**
 * Shows/hides the relevant quality settings groups based on the selected format.
 * Assumes formatRadios, mp3SettingsDiv, opusSettingsDiv, estSizeOpusSpan, estSizeWebmSpan are accessible.
 */
const updateQualityDisplays = () => {
  if (!formatRadios || !mp3SettingsDiv || !opusSettingsDiv) {
      console.warn("Quality display elements not found, cannot update.");
      return;
  }
  const selectedFormatRadio = document.querySelector('input[name="format"]:checked');
  if (!selectedFormatRadio) return; // No format selected yet

  const fmt = selectedFormatRadio.value;

  // Opus settings div used for both 'opus' and 'webm' formats
  opusSettingsDiv.style.display = (fmt === 'opus' || fmt === 'webm') ? 'block' : 'none';
  // MP3 settings div only shown for 'mp3' format
  mp3SettingsDiv.style.display = fmt === 'mp3' ? 'block' : 'none';

  // Toggle visibility of estimate spans WITHIN the Opus/WebM settings div
  if (estSizeOpusSpan) estSizeOpusSpan.style.display = fmt === 'opus' ? 'inline' : 'none';
  if (estSizeWebmSpan) estSizeWebmSpan.style.display = fmt === 'webm' ? 'inline' : 'none';

  // Recalculate and display estimate for the now-visible format
  updateEstimatedSize();
};


/**
 * Resets UI elements related to conversion results and file selection.
 * Called when a new file is selected or the process needs a hard reset.
 * Assumes all relevant DOM elements are accessible.
 */
const resetUIForNewFile = () => {
    console.log("Resetting UI for new file...");
    // --- Audio Section Resets ---
    if (resultEl) resultEl.innerHTML = '';
    if (base64Container) base64Container.style.display = 'none'; // Hide audio base64 section
    if (base64Result) base64Result.innerHTML = '';
    if (base64Output) base64Output.textContent = ''; // Clear audio base64 output div
    if (copyBase64Btn) copyBase64Btn.disabled = true;
    if (downloadBase64Btn) {
        downloadBase64Btn.disabled = true;
        downloadBase64Btn.textContent = 'Download Audio Base64 as TXT'; // Reset text
    }
    if (originalAudioContainer) {
        originalAudioContainer.style.display = 'none';
        originalAudioContainer.innerHTML = '';
    }
    if (playSampleBtn) {
        playSampleBtn.textContent = 'Play Original';
        playSampleBtn.disabled = true;
    }
    // Clear audio estimate spans
    if (estSizeMp3Span) estSizeMp3Span.textContent = '';
    if (estSizeOpusSpan) estSizeOpusSpan.textContent = '';
    if (estSizeWebmSpan) estSizeWebmSpan.textContent = '';
    if (progressEl) {
         progressEl.style.display = 'none';
         progressEl.value = 0;
         progressEl.removeAttribute('aria-valuenow'); // Clear aria value if set
         progressEl.setAttribute('aria-hidden', 'true');
    }
    if (convertBtn) convertBtn.disabled = true;

    // --- Info Popup Resets ---
    if (audioInfoContainer) audioInfoContainer.style.display = 'none';
    if (audionalInfoContainer) audionalInfoContainer.style.display = 'none';

    // --- Image Section Resets ---
    if (imageFileInput) imageFileInput.value = '';
    if (imagePreview) {
        imagePreview.style.display = 'none';
        imagePreview.src = '#'; // Use '#' or '' to clear source
    }
    if (fileSizeInfo) fileSizeInfo.textContent = '';
    if (convertImageButton) {
        convertImageButton.disabled = true;
        convertImageButton.textContent = 'Convert to Base64';
    }
    if (imageBase64Output) { // Assumes this is the TEXTAREA with the new ID
        const detailsParent = imageBase64Output.closest('details');
        if(detailsParent) detailsParent.open = false;
        imageBase64Output.style.display = 'none';
        imageBase64Output.value = '';
    }
    if (copyImageBase64Button) { // Assumes button with new ID
        copyImageBase64Button.disabled = true;
        copyImageBase64Button.textContent = 'Copy Image Base64';
    }
    if (downloadImageBase64Button) { // Assumes button with new ID
        downloadImageBase64Button.disabled = true;
        downloadImageBase64Button.textContent = 'Download Image Base64 as TXT';
    }

    // --- Reset OB1 Generator State (via global functions if exposed) ---
    if (typeof window.updateAudioBase64 === 'function') window.updateAudioBase64(null);
    if (typeof window.updateImageBase64 === 'function') window.updateImageBase64(null);
    // OB1 Generator's own logic should disable the generate button via checkGenerateButton

    // --- Clean up Blob URLs ---
    // Revoke original audio URL if it exists
    if (originalAudioUrl) {
        URL.revokeObjectURL(originalAudioUrl);
        originalAudioUrl = null; // Reset state variable (assuming defined in config-state.js)
    }
    // Note: URLs for converted audio player/download link are typically revoked
    // automatically when the elements are removed or manually via audio-player logic.
};


/**
 * Resets UI elements specific to the *result* of a conversion (player, download link, base64 output).
 * Called before starting a new conversion.
 */
const resetConversionOutputUI = () => {
    console.log("Resetting conversion output UI...");
    if (resultEl) resultEl.innerHTML = ''; // Clear previous player/link
    if (base64Container) base64Container.style.display = 'none'; // Hide audio base64 section
    if (base64Result) base64Result.innerHTML = ''; // Clear base64 player area
    if (base64Output) base64Output.textContent = ''; // Clear audio base64 text
    if (copyBase64Btn) copyBase64Btn.disabled = true;
    if (downloadBase64Btn) {
        downloadBase64Btn.disabled = true;
        downloadBase64Btn.textContent = 'Download Audio Base64 as TXT'; // Reset text
    }
    if (progressEl) {
        progressEl.style.display = 'none';
        progressEl.value = 0;
        progressEl.setAttribute('aria-hidden', 'true');
    }
    // Reset OB1 generator's audio state
    if (typeof window.updateAudioBase64 === 'function') window.updateAudioBase64(null);
};


// --- Audio Format Info Popup ---

/**
 * Displays the Audio Format Information popup.
 * Assumes audioFormatInfo object, audioInfoContainer, audioInfoContent, audionalInfoContainer are accessible.
 */
const displayAudioFormatInfo = () => {
  // Check if the data object and the container element exist
  if (typeof audioFormatInfo === 'undefined') {
      console.error("Audio format info data (audioFormatInfo) not found.");
      if (audioInfoContent) audioInfoContent.innerHTML = "<p>Error: Could not load format information.</p>";
      if (audioInfoContainer) audioInfoContainer.style.display = 'block'; // Show container with error
      return;
  }
  if (!audioInfoContainer || !audioInfoContent) {
      console.error("Audio info container elements not found in the DOM.");
      return;
  }

  // Build the HTML content from the audioFormatInfo object
  let infoHTML = '';
  infoHTML += audioFormatInfo.conceptsTitle || '';
  infoHTML += audioFormatInfo.losslessVsLossy || '';
  infoHTML += audioFormatInfo.bitrate || '';
  infoHTML += audioFormatInfo.formatsTitle || '';
  infoHTML += audioFormatInfo.wav || '';
  infoHTML += audioFormatInfo.webm || '';
  infoHTML += audioFormatInfo.opus || '';
  infoHTML += audioFormatInfo.mp3 || '';
  infoHTML += audioFormatInfo.opusRecommendationsTitle || '';
  infoHTML += audioFormatInfo.opusDetails || '';

  // Set the inner HTML and scroll to top
  audioInfoContent.innerHTML = infoHTML;
  audioInfoContent.scrollTop = 0;

  // Show this popup and hide the other one
  audioInfoContainer.style.display = 'block';
  if (audionalInfoContainer) {
      audionalInfoContainer.style.display = 'none';
  }
};

/**
 * Hides the Audio Format Information popup.
 * Assumes audioInfoContainer is accessible.
 */
const hideAudioFormatInfo = () => {
  if (audioInfoContainer) {
      audioInfoContainer.style.display = 'none';
  }
};


// --- Audional Instructions Info Popup ---

/**
 * Displays the Audional Instructions popup and injects the content.
 * Assumes audionalInfoContainer, audionalInfoContent, audioInfoContainer, and audioFormatInfo are accessible.
 */
const displayAudionalInfo = () => {
  // Check if the necessary elements and data exist
  if (typeof audioFormatInfo === 'undefined' || typeof audioFormatInfo.audionalInstructions === 'undefined') {
      console.error("Audional instructions data (audioFormatInfo.audionalInstructions) not found.");
      if (audionalInfoContent) audionalInfoContent.innerHTML = "<p>Error: Could not load Audional instructions.</p>";
      if (audionalInfoContainer) audionalInfoContainer.style.display = 'block'; // Show container with error
      return;
  }
  if (!audionalInfoContainer || !audionalInfoContent) {
      console.error("Audional info container elements not found in the DOM.");
      return;
  }

  // --- ADDED THIS LINE ---
  // Inject the content from the audioFormatInfo object
  audionalInfoContent.innerHTML = audioFormatInfo.audionalInstructions;
  // -----------------------

  // Show this popup and hide the other one
  audionalInfoContainer.style.display = 'block';
  if (audioInfoContainer) {
      audioInfoContainer.style.display = 'none';
  }

  // Scroll content to top when opened
  audionalInfoContent.scrollTop = 0;
};

/**
 * Hides the Audional Instructions popup.
 * Assumes audionalInfoContainer is accessible.
 */
const hideAudionalInfo = () => {
    if (audionalInfoContainer) {
        audionalInfoContainer.style.display = 'none';
    }
};

// --- End of file ---