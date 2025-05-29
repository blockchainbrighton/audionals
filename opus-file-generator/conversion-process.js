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
    resetConversionOutputUI(); // This function is responsible for clearing resultEl.innerHTML
    convertedAudioBlob = null;
    base64String = null;

    updateStatus('Preparing file for FFmpeg...');

    // --- Determine Output Format and Filenames ---
    const inputFilename = "input_audio_file"; // More generic
    const selectedFormatRadio = document.querySelector('input[name="format"]:checked');
    const outputFormat = selectedFormatRadio ? selectedFormatRadio.value : 'mp3'; // Default to mp3 if nothing selected (though UI should prevent this)
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
        const outputData = await runFFmpegConversion(inputFilename, outputFilename, outputFormat);

        updateStatus('Conversion complete! Processing output...');

        // --- Process Output Data ---
        let mimeType;
        if (outputFormat === 'mp3') {
            mimeType = 'audio/mpeg';
        } else if (outputFormat === 'opus') {
            mimeType = 'audio/opus'; // Primarily for .opus files if you were to output them directly
        } else if (outputFormat === 'webm') {
            mimeType = 'audio/webm'; // WebM container, typically with Opus audio
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
            download: `${originalNameBase}.${outputFormat}`,
            textContent: `Download ${originalNameBase}.${outputFormat} (${formatBytes(convertedAudioBlob.size)})`,
            style: 'display: block; margin-bottom: 10px;'
        });

        // 2. Create Standard Audio Player for Converted File
        const audioPlayerContainer = createAudioPlayer(
            convertedAudioBlob,
            mimeType,
            `Converted Audio (${outputFormat.toUpperCase()})`
        );

        // 3. Append Standard Results to the DOM
        // resultEl.innerHTML should have been cleared by resetConversionOutputUI() already
        if (resultEl) {
            const resultTitle = document.createElement('h3');
            resultTitle.textContent = 'Conversion Result';
            resultTitle.style.margin = '15px 0 10px 0';
            resultEl.append(resultTitle, dlLink, audioPlayerContainer);

            dlLink.addEventListener('click', () => {
                // Optional: Add a slight delay before revoking if direct download sometimes fails
                // setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
            });
            // Note: The createAudioPlayer itself has cleanup for its blob URL
        } else {
            console.warn("resultEl not found. Cannot display conversion results.");
        }

        // --- A/B Comparison Player (NEW) ---
        if (selectedFile && convertedAudioBlob && resultEl) { // Ensure resultEl exists before appending
            try {
                const abPlayerTitle = document.createElement('h3');
                abPlayerTitle.textContent = 'A/B Quality Comparison';
                abPlayerTitle.style.margin = '25px 0 10px 0';
                abPlayerTitle.style.borderTop = '1px dashed var(--border-color)'; // Use CSS variable for consistency
                abPlayerTitle.style.paddingTop = '15px';

                const abPlayerElement = await createABPlayerUI(
                    selectedFile,
                    selectedFile.type,
                    convertedAudioBlob,
                    mimeType
                );
                if (abPlayerElement) {
                    resultEl.append(abPlayerTitle, abPlayerElement);
                }
                 else {
                    console.error("Failed to create the A/B player UI element.");
                }

            } catch (abError) {
                console.error("Error during A/B player creation or appending:", abError);
                if (typeof updateStatus === 'function') {
                    updateStatus("Could not create A/B comparison player.", true);
                }
            }
        } else {
            if (!resultEl) console.warn("A/B Player: resultEl is missing, cannot append.");
            else if (!selectedFile) console.warn("A/B Player: selectedFile is missing.");
            else if (!convertedAudioBlob) console.warn("A/B Player: convertedAudioBlob is missing.");
        }
        // --- END A/B Comparison Player ---

        updateStatus('Conversion successful! Output ready.');

        // --- Base64 Handling ---
        // This should happen after all players are set up so it doesn't interfere with DOM manipulation.
        await setupBase64DisplayAndActions(convertedAudioBlob, outputFormat, originalNameBase);

    } catch (e) {
        updateStatus(`Conversion process failed: ${e.message || 'Unknown error'}`, true);
        console.error("Conversion Process Error:", e);
        convertedAudioBlob = null; // Ensure state is reset on error
        base64String = null;
        // resultEl might still have partial content; resetConversionOutputUI handled initial clear
    } finally {
        // --- Final Cleanup ---
        cleanupFFmpegFS([inputFilename, outputFilename]);
        enableConvertButtonIfNeeded(); // Re-enable convert button if appropriate
        if (playSampleBtn) playSampleBtn.disabled = !selectedFile; // Re-enable play original if a file is still selected
    }
};