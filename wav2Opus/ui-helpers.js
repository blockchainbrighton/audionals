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
    progressEl.style.display = 'none';
  }
  if (err && convertBtn) {
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
    updateStatus(`Converting... (${percent}%)`);
  }
};

/**
 * Enables or disables the Convert and Play Sample buttons based on state.
 * @returns {boolean} True if the convert button was disabled, false otherwise.
 */
const enableConvertButtonIfNeeded = () => {
  const ffmpegReady = typeof ffmpeg !== 'undefined' && ffmpeg !== null;
  const fileSelected = selectedFile !== null;
  const convertEnabled = ffmpegReady && fileSelected;
  if (convertBtn) convertBtn.disabled = !convertEnabled;
  if (playSampleBtn) playSampleBtn.disabled = !fileSelected;
  return !convertEnabled;
};

/**
 * Updates the estimated file size display based on current settings and file duration.
 */
const updateEstimatedSize = () => {
  if (!fileDuration || !selectedFile || !estSizeMp3Span || !estSizeOpusSpan ||
      !formatRadios || !mp3QualitySlider || !opusBitrateSlider ||
      !mp3QualityValueSpan || !opusBitrateValueSpan) {
    return;
  }

  const selectedFormatRadio = document.querySelector('input[name="format"]:checked');
  if (!selectedFormatRadio) return;
  const selectedFormat = selectedFormatRadio.value;

  let bitrateKbps = 0;
  let estimatedSizeBytes = 0;
  estSizeMp3Span.textContent = '';
  estSizeOpusSpan.textContent = '';

  if (selectedFormat === 'mp3') {
    const visualQuality = parseInt(mp3QualitySlider.value, 10);
    const approxBitrates = [245, 225, 190, 175, 165, 130, 115, 100, 85, 65];
    bitrateKbps = approxBitrates[visualQuality] || 128;
    estimatedSizeBytes = (bitrateKbps * 1000 * fileDuration) / 8;
    estSizeMp3Span.textContent = `~ ${formatBytes(estimatedSizeBytes)}`;
  } else if (selectedFormat === 'opus') {
    bitrateKbps = parseInt(opusBitrateSlider.value, 10);
    estimatedSizeBytes = (bitrateKbps * 1000 * fileDuration) / 8;
    estSizeOpusSpan.textContent = `~ ${formatBytes(estimatedSizeBytes)}`;
  }
};

/**
 * Shows/hides the relevant quality settings (MP3/Opus) based on the selected format.
 */
const updateQualityDisplays = () => {
  if (!formatRadios || !mp3SettingsDiv || !opusSettingsDiv) return;
  const selectedFormatRadio = document.querySelector('input[name="format"]:checked');
  if (!selectedFormatRadio) return;
  const fmt = selectedFormatRadio.value;
  mp3SettingsDiv.style.display = fmt === 'mp3' ? 'block' : 'none';
  opusSettingsDiv.style.display = fmt === 'opus' ? 'block' : 'none';
  updateEstimatedSize();
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
  if (audioInfoContainer) audioInfoContainer.style.display = 'none';

  if (originalAudioUrl) {
    URL.revokeObjectURL(originalAudioUrl);
    originalAudioUrl = null;
  }
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
  if (audioInfoContainer) audioInfoContainer.style.display = 'none';
};

/**
 * Displays the audio format information in the designated container.
 * If htmlContent is provided, it uses that; otherwise, it assembles default info.
 * @param {string} [htmlContent] - Optional HTML content to display.
 */
const displayAudioFormatInfo = (htmlContent) => {
  if (!audioInfoContainer || !audioInfoContent) {
    console.error("Audio info container elements not found in the DOM.");
    return;
  }

  if (typeof htmlContent === 'undefined') {
    let infoHTML = '';
    infoHTML += audioFormatInfo.conceptsTitle || '';
    infoHTML += audioFormatInfo.losslessVsLossy || '';
    infoHTML += audioFormatInfo.bitrate || '';
    infoHTML += '<hr>';
    infoHTML += audioFormatInfo.formatsTitle || '';
    infoHTML += audioFormatInfo.wav || '';
    infoHTML += audioFormatInfo.mp3 || '';
    infoHTML += audioFormatInfo.opus || '';
    infoHTML += '<hr>';
    infoHTML += audioFormatInfo.opusRecommendationsTitle || '';
    infoHTML += audioFormatInfo.opusDetails || '';
    audioInfoContent.innerHTML = infoHTML;
  } else {
    audioInfoContent.innerHTML = htmlContent;
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
