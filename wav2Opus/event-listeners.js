// event-listeners.js

/**
 * Sets up all event listeners for the application.
 */
const setupEventListeners = () => {
    console.log("Setting up event listeners..."); // Debug log

    // --- Audio Converter Listeners ---

    // File Input
    if (fileInput) {
        fileInput.addEventListener('change', handleFileChange);
    } else {
        console.error("Audio File input element not found.");
    }

    // Play Original Sample Button
    if (playSampleBtn) {
        playSampleBtn.addEventListener('click', handlePlayOriginalClick);
    } else {
        console.error("Play sample button not found.");
    }

    // Format Radio Buttons
    if (formatRadios && formatRadios.length > 0) {
        formatRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                updateQualityDisplays(); // Update visibility of settings sections
                updateEstimatedSize();   // Update size estimate for the selected format
                // Update convert button text based on selected format
                const selectedFormatRadio = document.querySelector('input[name="format"]:checked');
                if (selectedFormatRadio && convertBtn) {
                     convertBtn.textContent = `3. Convert to ${selectedFormatRadio.value.toUpperCase()}`;
                }
            });
        });
    } else {
        console.error("Format radio buttons not found.");
    }

    // MP3 Quality Slider (If still potentially used)
    if (mp3QualitySlider && mp3QualityValueSpan) {
        mp3QualitySlider.addEventListener('input', (e) => {
            mp3QualityValueSpan.textContent = e.target.value;
            updateEstimatedSize();
        });
    } else {
        // console.warn("MP3 quality slider or value span not found or hidden.");
    }

    // Opus Bitrate Slider (Used for WebM and Opus)
    if (opusBitrateSlider && opusBitrateValueSpan) {
        opusBitrateSlider.addEventListener('input', (e) => {
            opusBitrateValueSpan.textContent = `${e.target.value} kbps`;
            updateEstimatedSize();
        });
    } else {
        console.error("Opus/WebM bitrate slider or value span not found.");
    }

    // --- NEW Opus Advanced Controls Listeners ---
    // (Assuming opusVbrModeSelect, opusCompressionLevelSlider, opusCompressionLevelValueSpan, opusApplicationSelect are globally available or selected from dom-elements.js)

    // Opus VBR Mode Select
    if (window.opusVbrModeSelect) { 
        opusVbrModeSelect.addEventListener('change', () => {
            // console.log("Opus VBR Mode changed to:", opusVbrModeSelect.value);
        });
    } else {
        console.warn("Opus VBR Mode select element (opusVbrMode) not found.");
    }

    // Opus Compression Level Slider
    if (window.opusCompressionLevelSlider && window.opusCompressionLevelValueSpan) {
        opusCompressionLevelSlider.addEventListener('input', (e) => {
            opusCompressionLevelValueSpan.textContent = e.target.value;
            // console.log("Opus Compression Level changed to:", e.target.value);
        });
    } else {
        console.warn("Opus Compression Level slider (opusCompressionLevel) or its value span not found.");
    }

    // Opus Application Select
    if (window.opusApplicationSelect) {
        opusApplicationSelect.addEventListener('change', () => {
            // console.log("Opus Application changed to:", opusApplicationSelect.value);
        });
    } else {
        console.warn("Opus Application select element (opusApplication) not found.");
    }
    // --- END NEW Opus Advanced Controls Listeners ---


    // Convert Button
    if (convertBtn) {
        convertBtn.addEventListener('click', runConversion);
    } else {
        console.error("Convert button not found.");
    }

    // --- Base64 Button Listeners ---
    // The actual functionality for copyBase64Btn and downloadBase64Btn
    // is set up within setupBase64DisplayAndActions in base64-handler.js
    // No need to add listeners for them here. The buttons will be enabled/disabled
    // and their onclick handlers assigned dynamically by that function.
    // if (copyBase64Btn) copyBase64Btn.addEventListener('click', handleCopyBase64); // REMOVE THIS LINE
    // if (downloadBase64Btn) downloadBase64Btn.addEventListener('click', handleDownloadBase64); // REMOVE THIS LINE


    // --- Info Popups Listeners ---
    if (showAudioInfoBtn) {
        showAudioInfoBtn.addEventListener('click', () => {
            // console.log("Show Audio Info button clicked");
            displayAudioFormatInfo();
        });
    } else {
        console.error("Show Audio Info button (showAudioInfoBtn) not found.");
    }

    if (closeAudioInfoBtn) {
        closeAudioInfoBtn.addEventListener('click', () => {
            // console.log("Close Audio Info button clicked");
            hideAudioFormatInfo();
        });
    } else {
        console.error("Close Audio Info button (closeAudioInfoBtn) not found.");
    }

    if (showAudionalInfoBtn) {
        showAudionalInfoBtn.addEventListener('click', () => {
            // console.log("Show Audional Info button clicked");
            displayAudionalInfo();
        });
    } else {
        console.error("Show Audional Info button (showAudionalInfoBtn) not found.");
    }

    if (closeAudionalInfoBtn) {
        closeAudionalInfoBtn.addEventListener('click', () => {
            // console.log("Close Audional Info button clicked");
            hideAudionalInfo();
        });
    } else {
        console.error("Close Audional Info button (closeAudionalInfoBtn) not found.");
    }

    // Metadata Modal and OB1 Generator button listeners are assumed to be set up
    // in their respective handler files (metadata-modal-handler.js, ob1-generator.js)
    // or in image-to-base64.js for image related buttons.

    console.log("Event listeners setup complete.");
};

/**
 * Sets the initial state of UI elements like sliders and displays.
 * (Assuming config-state.js constants: initialMp3Quality, initialOpusBitrate,
 * initialOpusVbrMode, initialOpusCompressionLevel, initialOpusApplication are available)
 * (Assuming DOM elements are globally available, e.g. from dom-elements.js)
 */
const initializeUIState = () => {
    // Initialize MP3 display (if applicable)
    if (mp3QualitySlider && mp3QualityValueSpan) {
        mp3QualitySlider.value = initialMp3Quality; // Set from config
        mp3QualityValueSpan.textContent = mp3QualitySlider.value;
    }
    // Initialize Opus/WebM Bitrate
    if (opusBitrateSlider && opusBitrateValueSpan) {
         opusBitrateSlider.value = initialOpusBitrate; // Set from config
         opusBitrateValueSpan.textContent = `${opusBitrateSlider.value} kbps`;
    }

    // --- Initialize NEW Opus Advanced Controls ---
    if (window.opusVbrModeSelect) { 
        opusVbrModeSelect.value = initialOpusVbrMode; // Set from config
    }
    if (window.opusCompressionLevelSlider && window.opusCompressionLevelValueSpan) {
        opusCompressionLevelSlider.value = initialOpusCompressionLevel; // Set from config
        opusCompressionLevelValueSpan.textContent = opusCompressionLevelSlider.value;
    }
    if (window.opusApplicationSelect) {
        opusApplicationSelect.value = initialOpusApplication; // Set from config
    }
    // --- END Initialize NEW Opus Advanced Controls ---


    // Ensure default format radio is checked (should be WebM)
    if (formatRadios) {
        const webmRadio = document.querySelector('input[name="format"][value="webm"]');
        const checkedRadio = document.querySelector('input[name="format"]:checked');

        if (webmRadio && !checkedRadio) { // If WebM exists and nothing is checked, check WebM
             webmRadio.checked = true;
        } else if (!checkedRadio && formatRadios.length > 0) { // Fallback if no WebM and nothing checked
             formatRadios[0].checked = true;
        }
        // Update convert button text based on the initially checked format
        const currentChecked = document.querySelector('input[name="format"]:checked');
        if (currentChecked && convertBtn) {
            convertBtn.textContent = `3. Convert to ${currentChecked.value.toUpperCase()}`;
        }
    }


    // Update visibility and estimates based on the initially checked format
    updateQualityDisplays();
    updateEstimatedSize(); // Call this after setting initial slider values

    // Set initial button states (likely disabled)
    enableConvertButtonIfNeeded(); // Handles convertBtn and playSampleBtn

    // --- Hide ALL popups initially ---
    if (audioInfoContainer) audioInfoContainer.style.display = 'none';
    if (audionalInfoContainer) audionalInfoContainer.style.display = 'none';
    if (metadataModal) metadataModal.classList.add('hidden');

    // Hide progress bar initially
    if (progressEl) progressEl.style.display = 'none';

    // Disable Audio Base64 buttons initially
    if (copyBase64Btn) copyBase64Btn.disabled = true;
    if (downloadBase64Btn) downloadBase64Btn.disabled = true;

    // Disable Image converter buttons initially
    // (These might also be handled within image-to-base64.js initializeImageConverter)
    const convertImageBtn = document.getElementById('convert-image-button');
    const copyImageBtn = document.getElementById('copy-image-base64-button');
    const downloadImageBtn = document.getElementById('download-image-base64-button');
    if (convertImageBtn) convertImageBtn.disabled = true;
    if (copyImageBtn) copyImageBtn.disabled = true;
    if (downloadImageBtn) downloadImageBtn.disabled = true;

    // Disable Generate OB1 button initially
    // (This might also be handled within ob1-generator.js checkGenerateButton)
    const generateOb1Btn = document.getElementById('generateOB1Button');
    if(generateOb1Btn) generateOb1Btn.disabled = false;

    console.log("UI state initialized.");
};