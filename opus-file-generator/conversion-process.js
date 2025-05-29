// conversion-process.js

/**
 * Handles the main audio conversion workflow.
 */
const runConversion = async () => {
    // --- Initial Checks ---
    if (!ffmpeg || !selectedFile) {
      return updateStatus('Error: FFmpeg not loaded or no file selected.', true);
    }
    if (!fileDuration) {
        return updateStatus('Error: File duration not available. Cannot estimate or convert.', true);
    }
  
    // --- UI Setup ---
    if (convertBtn) convertBtn.disabled = true;
    if (playSampleBtn) playSampleBtn.disabled = true;
    resetConversionOutputUI();
    convertedAudioBlob = null;
    base64String = null;
  
    updateStatus('Preparing file for FFmpeg...');
  
    // --- Determine Output Format and Filenames ---
    const inputFilename = "input_audio_file"; // More generic
    const selectedFormatRadio = document.querySelector('input[name="format"]:checked');
    // Default to mp3, handle mp3, opus, and webm
    const outputFormat = selectedFormatRadio ? selectedFormatRadio.value : 'mp3';
    const outputFilename = `output.${outputFormat}`; // e.g., output.mp3, output.opus, output.webm
    const originalNameBase = getBaseFilename(selectedFile.name);
  
    // --- Filesystem Cleanup ---
    cleanupFFmpegFS([inputFilename, outputFilename]);
  
    try {
        // --- Load Input File ---
        updateStatus('Loading file into FFmpeg memory...');
        const fileData = await fetchFile(selectedFile);
        ffmpeg.FS('writeFile', inputFilename, fileData);
  
        // --- Run FFmpeg Conversion ---
        // This function now handles mp3, opus, and webm
        const outputData = await runFFmpegConversion(inputFilename, outputFilename, outputFormat);
  
        updateStatus('Conversion complete! Processing output...');
  
        // --- Process Output Data ---
        // Determine MIME Type based on the selected output format
        let mimeType;
        if (outputFormat === 'mp3') {
            mimeType = 'audio/mpeg';
        } else if (outputFormat === 'opus') {
            mimeType = 'audio/opus';
        } else if (outputFormat === 'webm') { // Changed from 'caf'
            mimeType = 'audio/webm'; // Standard MIME type for WebM audio
        } else {
            mimeType = 'application/octet-stream'; // Fallback
            console.warn(`Unknown output format for MIME type: ${outputFormat}`);
        }
  
        // Create Blob from the converted data
        convertedAudioBlob = new Blob([outputData.buffer], { type: mimeType });
  
        // --- Display Results ---
  
        // 1. Create Download Link
        const downloadUrl = URL.createObjectURL(convertedAudioBlob);
        const dlLink = Object.assign(document.createElement('a'), {
            href: downloadUrl,
            download: `${originalNameBase}.${outputFormat}`, // e.g., myaudio.webm
            textContent: `Download ${originalNameBase}.${outputFormat} (${formatBytes(convertedAudioBlob.size)})`,
            style: 'display: block; margin-bottom: 10px;'
        });
  
        // 2. Create Audio Player
        // WebM audio playback is widely supported in modern browsers
        const audioPlayerContainer = createAudioPlayer(
            convertedAudioBlob,
            mimeType,
            `Converted Audio (${outputFormat.toUpperCase()})` // Label like "Converted Audio (WEBM)"
        );
  
        // 3. Append results to the DOM
        if (resultEl) {
            resultEl.innerHTML = '';
            const resultTitle = document.createElement('h3');
            resultTitle.textContent = 'Conversion Result';
            resultTitle.style.margin = '15px 0 10px 0';
            resultEl.append(resultTitle, dlLink, audioPlayerContainer);
  
            dlLink.addEventListener('click', () => {
                // Optional: setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);
            });
            // Relies on audio-player cleanup logic or resetUI functions
        }
  
        // --- A/B Comparison Player (NEW) ---
        if (selectedFile && convertedAudioBlob) {
            try {
                const abPlayerTitle = document.createElement('h3');
                abPlayerTitle.textContent = 'A/B Quality Comparison';
                abPlayerTitle.style.margin = '25px 0 10px 0';
                abPlayerTitle.style.borderTop = '1px dashed #555';
                abPlayerTitle.style.paddingTop = '15px';

                const abPlayerElement = createABPlayerUI(
                    selectedFile,          // Original blob
                    selectedFile.type,     // Original MIME type
                    convertedAudioBlob,    // Converted blob
                    mimeType               // Converted MIME type (already determined)
                );
                resultEl.append(abPlayerTitle, abPlayerElement);

                // If using observer-based cleanup for A/B player:
                // abPlayerElement.startObserving(resultEl);
            } catch (abError) {
                console.error("Error creating A/B player:", abError);
                // Optionally display a message to the user
            }
        }
        // --- END A/B Comparison Player ---


        updateStatus('Conversion successful! Output ready.');

        // --- Base64 Handling ---
        await setupBase64DisplayAndActions(convertedAudioBlob, outputFormat, originalNameBase);


  
    } catch (e) {
        // Error handling updated in runFFmpegConversion, but keep this generic catch
        updateStatus(`Conversion process failed: ${e.message || 'Unknown error'}`, true);
        console.error("Conversion Process Error:", e);
        convertedAudioBlob = null;
        base64String = null;
    } finally {
        // --- Final Cleanup ---
        cleanupFFmpegFS([inputFilename, outputFilename]);
        enableConvertButtonIfNeeded();
        if (playSampleBtn) playSampleBtn.disabled = !selectedFile;
    }
  };