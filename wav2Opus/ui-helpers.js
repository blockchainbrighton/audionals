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
    const enabled = ffmpeg && selectedFile;
    if (convertBtn) convertBtn.disabled = !enabled;
    if (playSampleBtn) playSampleBtn.disabled = !selectedFile;
    return !enabled; // Return true if disabled
  };
  
  /**
   * Updates the estimated file size display based on current settings and duration.
   */
  const updateEstimatedSize = () => {
    if (!fileDuration || !selectedFile || !estSizeMp3Span || !estSizeOpusSpan || !formatRadios || !mp3QualitySlider || !opusBitrateSlider) return;
  
    const selectedFormatRadio = document.querySelector('input[name="format"]:checked');
    if (!selectedFormatRadio) return; // No format selected
    const selectedFormat = selectedFormatRadio.value;
  
    let bitrateKbps = 0;
    let estimatedSizeBytes = 0;
  
    estSizeMp3Span.textContent = ''; // Clear both initially
    estSizeOpusSpan.textContent = '';
  
    if (selectedFormat === 'mp3') {
      const visualQuality = parseInt(mp3QualitySlider.value, 10);
      const ffmpegQuality = 9 - visualQuality; // VBR quality setting (approx)
      // Very rough approximation of typical VBR bitrates for -q:a settings
      const approxBitrates = [245, 225, 190, 175, 165, 130, 115, 100, 85, 65]; // Corresponds to 0-9
      bitrateKbps = approxBitrates[ffmpegQuality] || 128; // Fallback
      estimatedSizeBytes = (bitrateKbps * 1000 * fileDuration) / 8 / 2; // bits to bytes divided by 2 for small sample accuracy
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
  };