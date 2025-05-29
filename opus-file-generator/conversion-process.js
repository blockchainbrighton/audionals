// conversion-process.js

/**
 * Handles the main audio conversion workflow, ensuring robust A/B UI display.
 */
const runConversion = async () => {
    // --- Initial Checks ---
    if (!ffmpeg || !selectedFile) {
        updateStatus('Error: FFmpeg not loaded or no file selected.', true);
        // Still display A/B UI with only the original file (disabled B)
        showABComparisonPlayer(selectedFile, selectedFile.type, null, null, false, "No file or FFmpeg not loaded.");
        return;
    }
    if (!fileDuration) {
        updateStatus('Error: File duration not available. Cannot estimate or convert.', true);
        showABComparisonPlayer(selectedFile, selectedFile.type, null, null, false, "File duration not available.");
        return;
    }

    // --- UI Setup ---
    if (convertBtn) convertBtn.disabled = true;
    if (playSampleBtn) playSampleBtn.disabled = true;
    resetConversionOutputUI();
    convertedAudioBlob = null;
    base64String = null;

    updateStatus('Preparing file for FFmpeg...');

    // --- Determine Output Format and Filenames ---
    const inputFilename = "input_audio_file";
    const selectedFormatRadio = document.querySelector('input[name="format"]:checked');
    const outputFormat = selectedFormatRadio ? selectedFormatRadio.value : 'mp3';
    const outputFilename = `output.${outputFormat}`;
    const originalNameBase = getBaseFilename(selectedFile.name);

    // --- Filesystem Cleanup ---
    cleanupFFmpegFS([inputFilename, outputFilename]);

    let conversionSucceeded = false;
    let conversionError = null;

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
        if (outputFormat === 'mp3') mimeType = 'audio/mpeg';
        else if (outputFormat === 'opus') mimeType = 'audio/opus';
        else if (outputFormat === 'webm') mimeType = 'audio/webm';
        else {
            mimeType = 'application/octet-stream';
            console.warn(`Unknown output format for MIME type: ${outputFormat}`);
        }

        // Create Blob from the converted data
        convertedAudioBlob = new Blob([outputData.buffer], { type: mimeType });

        // Defensive: ensure blob is non-empty
        if (!convertedAudioBlob || convertedAudioBlob.size === 0) {
            throw new Error("Converted audio file is empty or invalid.");
        }

        // --- Display Results (Standard Audio Player + Download Link) ---
        if (resultEl) {
            resultEl.innerHTML = '';
            const resultTitle = document.createElement('h3');
            resultTitle.textContent = 'Conversion Result';
            resultTitle.style.margin = '15px 0 10px 0';
            const downloadUrl = URL.createObjectURL(convertedAudioBlob);
            const dlLink = Object.assign(document.createElement('a'), {
                href: downloadUrl,
                download: `${originalNameBase}.${outputFormat}`,
                textContent: `Download ${originalNameBase}.${outputFormat} (${formatBytes(convertedAudioBlob.size)})`,
                style: 'display: block; margin-bottom: 10px;'
            });

            const audioPlayerContainer = createAudioPlayer(
                convertedAudioBlob,
                mimeType,
                `Converted Audio (${outputFormat.toUpperCase()})`
            );

            resultEl.append(resultTitle, dlLink, audioPlayerContainer);

            dlLink.addEventListener('click', () => {
                // Optional: setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);
            });
        }

        conversionSucceeded = true;
        updateStatus('Conversion successful! Output ready.');
    } catch (e) {
        updateStatus(`Conversion process failed: ${e.message || 'Unknown error'}`, true);
        console.error("Conversion Process Error:", e);
        conversionError = e;
        convertedAudioBlob = null;
        base64String = null;
    } finally {
        // --- Final Cleanup ---
        cleanupFFmpegFS([inputFilename, outputFilename]);
        enableConvertButtonIfNeeded();
        if (playSampleBtn) playSampleBtn.disabled = !selectedFile;
    }

    // --- ALWAYS Display A/B Player (Original vs. Converted or fallback) ---
    // Use a helper for clarity
    showABComparisonPlayer(
        selectedFile,
        selectedFile.type,
        convertedAudioBlob,
        convertedAudioBlob ? convertedAudioBlob.type : null,
        conversionSucceeded,
        conversionError
    );

    // --- Base64 Handling (after UI/players are built) ---
    if (convertedAudioBlob) {
        await setupBase64DisplayAndActions(convertedAudioBlob, outputFormat, originalNameBase);
    }
};

/**
 * Shows the A/B Quality Comparison player robustly. Handles async or sync A/B modules.
 * If conversion failed, disables B or shows error message in UI.
 */
function showABComparisonPlayer(originalBlob, originalMimeType, convertedBlob, convertedMimeType, conversionSucceeded, conversionError) {
    if (!resultEl) return;
    // Remove previous A/B player if present
    const prevAB = resultEl.querySelector('.ab-player-container');
    if (prevAB && typeof prevAB.revokeUrls === 'function') prevAB.revokeUrls();

    const abPlayerTitle = document.createElement('h3');
    abPlayerTitle.textContent = 'A/B Quality Comparison';
    abPlayerTitle.style.margin = '25px 0 10px 0';
    abPlayerTitle.style.borderTop = '1px dashed var(--border-color)';
    abPlayerTitle.style.paddingTop = '15px';

    // Remove old AB player(s) before appending
    // (Some browsers won't garbage collect otherwise.)
    const oldAB = resultEl.querySelector('.ab-player-container');
    if (oldAB) oldAB.remove();

    // Defensive: never append null or Promise
    let abPlayerElement;
    try {
        // If using a sync ab-player.js (returns HTMLElement)
        abPlayerElement = createABPlayerUI(
            originalBlob,
            originalMimeType,
            convertedBlob,
            convertedMimeType,
            conversionSucceeded,
            conversionError
        );

        // If it's a Promise (async Web Audio version), handle as Promise
        if (abPlayerElement && typeof abPlayerElement.then === 'function') {
            abPlayerElement.then(element => {
                insertABSection(resultEl, abPlayerTitle, element, conversionSucceeded, conversionError);
            }).catch(e => {
                // fallback UI
                const fallback = document.createElement('div');
                fallback.textContent = "Failed to load A/B player.";
                resultEl.append(abPlayerTitle, fallback);
            });
        } else {
            insertABSection(resultEl, abPlayerTitle, abPlayerElement, conversionSucceeded, conversionError);
        }
    } catch (err) {
        const fallback = document.createElement('div');
        fallback.textContent = "Could not display A/B player.";
        resultEl.append(abPlayerTitle, fallback);
    }
}

/**
 * Actually insert the AB player and display error if B is missing.
 */
function insertABSection(container, titleNode, abPlayerElement, conversionSucceeded, conversionError) {
    if (!abPlayerElement) {
        const fallback = document.createElement('div');
        fallback.textContent = "Failed to create A/B comparison UI.";
        container.append(titleNode, fallback);
        return;
    }
    container.append(titleNode, abPlayerElement);
    // If B (converted) is missing, visually indicate
    if (!conversionSucceeded) {
        // If your ab-player.js supports disabling B, do it here
        const warning = document.createElement('div');
        warning.textContent = "Note: Only the original audio is available for A/B comparison. (Conversion failed or output missing.)";
        warning.style.color = 'orange';
        warning.style.fontSize = '1em';
        warning.style.margin = '10px 0 0 0';
        abPlayerElement.appendChild(warning);
        // Optionally, if using custom ab-player.js, call abPlayerElement.disableB();
    }
}
