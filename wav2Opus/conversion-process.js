// conversion-process.js

/**
 * Handles the main audio conversion workflow.
 */
const runConversion = async () => {
    if (!ffmpeg || !selectedFile) {
      return updateStatus('Error: FFmpeg not loaded or no file selected.', true);
    }
    if (!fileDuration) {
        return updateStatus('Error: File duration not available. Cannot estimate or convert.', true);
    }
  
    // Disable buttons during conversion
    if (convertBtn) convertBtn.disabled = true;
    if (playSampleBtn) playSampleBtn.disabled = true; // Disable original play during conversion
  
    // Reset previous results UI
    resetConversionOutputUI();
    convertedAudioBlob = null; // Clear state
    base64String = null; // Clear state
  
    updateStatus('Preparing file for FFmpeg...');
    const inputFilename = "input.wav"; // Consistent input name in virtual FS
    const selectedFormatRadio = document.querySelector('input[name="format"]:checked');
    const outputFormat = selectedFormatRadio ? selectedFormatRadio.value : 'mp3'; // Default to mp3 if somehow none checked
    const outputFilename = `output.${outputFormat}`;
    const originalNameBase = getBaseFilename(selectedFile.name);
  
    // Ensure potential old files are cleaned from virtual FS first
    cleanupFFmpegFS([inputFilename, outputFilename]);
  
    try {
      // Write input file to FFmpeg's virtual filesystem
      updateStatus('Loading file into FFmpeg memory...');
      const fileData = await fetchFile(selectedFile); // Use FFmpeg's fetchFile helper
      ffmpeg.FS('writeFile', inputFilename, fileData);
  
      // Run the conversion command
      const outputData = await runFFmpegConversion(inputFilename, outputFilename, outputFormat); // Returns Uint8Array
  
      updateStatus('Conversion complete! Processing output...');
  
      // Create Blob from output data
      const mimeType = outputFormat === 'mp3' ? 'audio/mpeg' : 'audio/opus';
      convertedAudioBlob = new Blob([outputData.buffer], { type: mimeType }); // Update state
  
      // --- Display Results ---
  
      // Create download link
      const downloadUrl = URL.createObjectURL(convertedAudioBlob);
      const dlLink = Object.assign(document.createElement('a'), {
          href: downloadUrl,
          download: `${originalNameBase}.${outputFormat}`, // e.g., myaudio.mp3
          textContent: `Download ${originalNameBase}.${outputFormat} (${formatBytes(convertedAudioBlob.size)})`,
          style: 'display: block; margin-bottom: 10px;' // Basic styling
      });
  
      // Create audio player for converted file
      const audioPlayerContainer = createAudioPlayer(convertedAudioBlob, mimeType, 'Converted Audio');
  
      // Append results to the DOM
      if (resultEl) {
          resultEl.innerHTML = ''; // Clear previous before appending new
          const resultTitle = document.createElement('h3');
          resultTitle.textContent = 'Conversion Result';
          resultTitle.style.margin = '15px 0 10px 0';
          resultEl.append(resultTitle, dlLink, audioPlayerContainer);
          // If using observer in createAudioPlayer: audioPlayerContainer.startObserving(resultEl);
  
          // Add manual cleanup for download link URL when results are replaced/cleared
          dlLink.addEventListener('click', () => {
              // Optional: Revoke URL after a short delay to allow download to start
              // setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
          });
           // We rely on resetUIForNewFile or resetConversionOutputUI clearing innerHTML,
           // which should trigger the player's observer if used, or we manually revoke here if needed.
           // For simplicity, let's assume clearing innerHTML is enough, or rely on browser GC for blob URLs eventually.
      }
  
      updateStatus('Conversion successful! Output ready.');
  
      // Start Base64 conversion and display process (runs asynchronously)
      // Use await here if subsequent steps depend on base64 completing, otherwise let it run.
      await setupBase64DisplayAndActions(convertedAudioBlob, outputFormat, originalNameBase);
  
    } catch (e) {
      updateStatus(`Conversion failed: ${e.message || 'Unknown error'}`, true);
      console.error("Conversion Error:", e);
      // convertedAudioBlob might be null or invalid here
      convertedAudioBlob = null; // Ensure state is cleared on error
      // UI should already be reset or show error status
    } finally {
      // Always try to clean up files from virtual FS
      cleanupFFmpegFS([inputFilename, outputFilename]);
  
      // Re-enable buttons based on the current state AFTER conversion attempt
      enableConvertButtonIfNeeded();
      // Play original button should be enabled if a file is still selected
      if (playSampleBtn) playSampleBtn.disabled = !selectedFile;
    }
  };