// ui-helpers.js
/**
 * Updates the status message display.
 * @param {string} msg - The message to display.
 * @param {boolean} [err=false] - Whether the message represents an error.
 */
const updateStatus = (msg, err = false) => {
  console.log(msg);
  if (statusEl) {
    statusEl.textContent = `Status: ${msg}`;
    statusEl.className = err ? 'error' : '';
  }
  if (progressEl) {
    progressEl.style.display = 'none'; // Hide progress by default when status updates
  }
  if (err && convertBtn) {
    // Re-enable buttons based on current state if an error occurs
    enableConvertButtonIfNeeded();
  }
};

/**
 * Updates the FFmpeg conversion progress bar.
 * @param {number} ratio - The progress ratio (0 to 1).
 */
const updateProgress = (ratio) => {
    if (progressEl && statusEl) {
        progressEl.style.display = 'block';
        const percent = Math.max(0, Math.min(100, Math.round(ratio * 100)));
        progressEl.value = percent;
        updateStatus(`Converting... (${percent}%)`); // Also update status text
    }
}

/**
 * Enables or disables the Convert and Play Sample buttons based on state.
 * @returns {boolean} True if the convert button was disabled, false otherwise.
 */
const enableConvertButtonIfNeeded = () => {
  // Ensure elements exist before accessing properties
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
 */
const updateEstimatedSize = () => {
  // Add checks for element existence
  if (!fileDuration || !selectedFile || !estSizeMp3Span || !estSizeOpusSpan || !formatRadios || !mp3QualitySlider || !opusBitrateSlider || !mp3QualityValueSpan || !opusBitrateValueSpan) {
      // console.warn("Skipping size update - missing elements or data.");
      return;
  }

  const selectedFormatRadio = document.querySelector('input[name="format"]:checked');
  if (!selectedFormatRadio) return; // No format selected
  const selectedFormat = selectedFormatRadio.value;

  let bitrateKbps = 0;
  let estimatedSizeBytes = 0;

  estSizeMp3Span.textContent = ''; // Clear both initially
  estSizeOpusSpan.textContent = '';

  if (selectedFormat === 'mp3') {
    const visualQuality = parseInt(mp3QualitySlider.value, 10);
    // Ensure mapping is correct: -q:a 0 (best) to 9 (worst)
    const ffmpegQuality = visualQuality; // Assuming slider value 0-9 maps directly to -q:a 0-9

    // Very rough approximation of typical VBR bitrates for -q:a settings
    // Values roughly correspond to LAME presets (higher index = lower quality/bitrate)
    const approxBitrates = [245, 225, 190, 175, 165, 130, 115, 100, 85, 65]; // Index 0 to 9
    bitrateKbps = approxBitrates[ffmpegQuality] || 128; // Fallback if index out of bounds

    // Original calculation from prompt: estimatedSizeBytes = (bitrateKbps * 1000 * fileDuration) / 8 / 2;
    // Revised standard calculation:
    estimatedSizeBytes = (bitrateKbps * 1000 * fileDuration) / 8; // bits to bytes

    estSizeMp3Span.textContent = `~ ${formatBytes(estimatedSizeBytes)}`;
  } else if (selectedFormat === 'opus') {
    bitrateKbps = parseInt(opusBitrateSlider.value, 10);
    estimatedSizeBytes = (bitrateKbps * 1000 * fileDuration) / 8; // bits to bytes
    estSizeOpusSpan.textContent = `~ ${formatBytes(estimatedSizeBytes)}`;
  }
};


/**
 * Shows/hides the relevant quality settings (MP3/Opus) based on the selected format.
 */
const updateQualityDisplays = () => {
  if (!formatRadios || !mp3SettingsDiv || !opusSettingsDiv) return;
  const selectedFormatRadio = document.querySelector('input[name="format"]:checked');
  if (!selectedFormatRadio) return; // Should not happen if one is checked by default

  const fmt = selectedFormatRadio.value;
  mp3SettingsDiv.style.display = fmt === 'mp3' ? 'block' : 'none';
  opusSettingsDiv.style.display = fmt === 'opus' ? 'block' : 'none';
  updateEstimatedSize(); // Update size estimate whenever format changes
};

/**
 * Resets UI elements related to conversion results and file selection.
 */
const resetUIForNewFile = () => {
    if (resultEl) resultEl.innerHTML = '';
    if (base64Container) base64Container.style.display = 'none';
    if (base64Result) base64Result.innerHTML = '';
    if (downloadBase64Btn) downloadBase64Btn.textContent = 'Download as TXT';
    if (originalAudioContainer) {
        originalAudioContainer.style.display = 'none';
        originalAudioContainer.innerHTML = '';
    }
    if (playSampleBtn) playSampleBtn.textContent = 'Play Original';
    if (estSizeMp3Span) estSizeMp3Span.textContent = '';
    if (estSizeOpusSpan) estSizeOpusSpan.textContent = '';
    if (progressEl) progressEl.style.display = 'none';
    if (audioInfoContainer) audioInfoContainer.style.display = 'none'; // Hide info box too

    // Clean up any existing blob URLs
    if (originalAudioUrl) {
        URL.revokeObjectURL(originalAudioUrl);
        originalAudioUrl = null;
    }
    // Note: Converted audio blob URL is revoked within createAudioPlayer's observer or needs manual cleanup if that fails.
};

/**
 * Resets UI elements specific to the conversion output.
 */
const resetConversionOutputUI = () => {
    if (resultEl) resultEl.innerHTML = '';
    if (base64Container) base64Container.style.display = 'none';
    if (base64Result) base64Result.innerHTML = '';
    if (progressEl) {
        progressEl.style.display = 'none';
        progressEl.value = 0;
    }
    if (audioInfoContainer) audioInfoContainer.style.display = 'none'; // Hide info box if open
};


// --- NEW FUNCTION ---
/**
* Displays the audio format information in the designated container.
*/
const displayAudioFormatInfo = () => {
  // Check if the data object and the container element exist
  if (typeof audioFormatInfo === 'undefined') {
      console.error("Audio format information data (audioFormatInfo) not found. Was audio-formats-explained.js loaded?");
      if (audioInfoContent) audioInfoContent.innerHTML = "<p>Error: Could not load format information.</p>";
       if (audioInfoContainer) audioInfoContainer.style.display = 'block'; // Show container even on error
      return;
  }
  if (!audioInfoContainer || !audioInfoContent) {
      console.error("Audio info container elements not found in the DOM.");
      return;
  }

  // Build the HTML content from the imported object
  let infoHTML = '';
  infoHTML += audioFormatInfo.conceptsTitle || '';
  infoHTML += audioFormatInfo.losslessVsLossy || '';
  infoHTML += audioFormatInfo.bitrate || '';
  infoHTML += '<hr>'; // Separator
  infoHTML += audioFormatInfo.formatsTitle || '';
  infoHTML += audioFormatInfo.wav || '';
  infoHTML += audioFormatInfo.mp3 || '';
  infoHTML += audioFormatInfo.opus || '';
  infoHTML += '<hr>'; // Separator
  infoHTML += audioFormatInfo.opusRecommendationsTitle || '';
  infoHTML += audioFormatInfo.opusDetails || '';

  // Set the inner HTML of the content area
  audioInfoContent.innerHTML = infoHTML;

  // Make the main container visible
  audioInfoContainer.style.display = 'block';
};

// --- Optional: Function to hide the info ---
const hideAudioFormatInfo = () => {
  if (audioInfoContainer) {
      audioInfoContainer.style.display = 'none';
  }
};
