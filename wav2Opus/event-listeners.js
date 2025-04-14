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
        formatRadios.forEach(radio => radio.addEventListener('change', updateQualityDisplays));
    } else {
        console.error("Format radio buttons not found.");
    }

    // MP3 Quality Slider (If still potentially used, keep, otherwise remove if only WebM)
    if (mp3QualitySlider && mp3QualityValueSpan) {
        mp3QualitySlider.addEventListener('input', (e) => {
            mp3QualityValueSpan.textContent = e.target.value;
            updateEstimatedSize();
        });
    } else {
        // This might log if the MP3 section is permanently hidden, which is fine.
        // console.warn("MP3 quality slider or value span not found or hidden.");
    }

    // Opus Bitrate Slider (Used for WebM)
    if (opusBitrateSlider && opusBitrateValueSpan) {
        opusBitrateSlider.addEventListener('input', (e) => {
            opusBitrateValueSpan.textContent = `${e.target.value} kbps`;
            updateEstimatedSize();
        });
    } else {
        console.error("Opus/WebM bitrate slider or value span not found.");
    }

    // Convert Button
    if (convertBtn) {
        convertBtn.addEventListener('click', runConversion);
    } else {
        console.error("Convert button not found.");
    }

    // --- Base64 Button Listeners (Assuming base64-handler.js sets these up) ---
    // Note: Ensure base64-handler.js uses the correct IDs:
    // copyBase64Btn (for audio)
    // downloadBase64Btn (for audio)
    // copy-image-base64-button (for image - likely handled in image-to-base64.js)
    // download-image-base64-button (for image - likely handled in image-to-base64.js)


    // --- Info Popups Listeners ---

    // Show Audio Format Info Button (Uses new ID)
    if (showAudioInfoBtn) { // <-- UPDATED ID
        showAudioInfoBtn.addEventListener('click', () => {
            console.log("Show Audio Info button clicked");
            displayAudioFormatInfo(); // Calls function in ui-helpers.js
        });
    } else {
        console.error("Show Audio Info button (showAudioInfoBtn) not found."); // Updated error message
    }

    // Close Audio Format Info Button (Uses new ID)
    if (closeAudioInfoBtn) { // <-- UPDATED ID
        closeAudioInfoBtn.addEventListener('click', () => {
            console.log("Close Audio Info button clicked");
            hideAudioFormatInfo(); // Calls function in ui-helpers.js
        });
    } else {
        console.error("Close Audio Info button (closeAudioInfoBtn) not found."); // Updated error message
    }

    // --- ADDED Listeners for Audional Instructions ---

    // Show Audional Instructions Button
    if (showAudionalInfoBtn) { // <-- NEW ID
        showAudionalInfoBtn.addEventListener('click', () => {
            console.log("Show Audional Info button clicked");
            displayAudionalInfo(); // Calls NEW function in ui-helpers.js
        });
    } else {
        console.error("Show Audional Info button (showAudionalInfoBtn) not found.");
    }

    // Close Audional Instructions Button
    if (closeAudionalInfoBtn) { // <-- NEW ID
        closeAudionalInfoBtn.addEventListener('click', () => {
            console.log("Close Audional Info button clicked");
            hideAudionalInfo(); // Calls NEW function in ui-helpers.js
        });
    } else {
        console.error("Close Audional Info button (closeAudionalInfoBtn) not found.");
    }

    // --- Metadata Modal Listeners (Assuming these are handled elsewhere or need adding) ---
    // e.g., cancelMetadataBtn, metadataForm submission

    // --- Generate OB1 Button Listener (Assuming handled in ob1-generator.js) ---
    // Ensure ob1-generator.js adds the listener for generateOB1Button

    console.log("Event listeners setup complete.");
};

/**
 * Sets the initial state of UI elements like sliders and displays.
 */
const initializeUIState = () => {
    // Initialize MP3 display (if applicable)
    if (mp3QualitySlider && mp3QualityValueSpan) {
        mp3QualityValueSpan.textContent = mp3QualitySlider.value;
    }
    // Initialize Opus/WebM display
    if (opusBitrateSlider && opusBitrateValueSpan) {
         opusBitrateValueSpan.textContent = `${opusBitrateSlider.value} kbps`;
    }

    // Ensure default format radio is checked (should be WebM)
    if (formatRadios) {
        const webmRadio = document.querySelector('input[name="format"][value="webm"]');
        if (webmRadio && !document.querySelector('input[name="format"]:checked')) {
             webmRadio.checked = true;
        } else if (!document.querySelector('input[name="format"]:checked') && formatRadios.length > 0) {
             formatRadios[0].checked = true; // Fallback if webm not found
        }
    }

    // Update visibility and estimates based on the initially checked format
    updateQualityDisplays();
    // Set initial button states (likely disabled)
    enableConvertButtonIfNeeded(); // Handles convertBtn and playSampleBtn

    // --- Hide ALL popups initially ---
    if (audioInfoContainer) audioInfoContainer.style.display = 'none';
    if (audionalInfoContainer) audionalInfoContainer.style.display = 'none'; // <-- Hide Audional popup
    if (metadataModal) metadataModal.classList.add('hidden'); // Assuming 'hidden' class controls modal

    // Hide progress bar initially
    if (progressEl) progressEl.style.display = 'none';

    // Disable Base64 buttons initially (Audio - handled by base64-handler.js?)
    if (copyBase64Btn) copyBase64Btn.disabled = true;
    if (downloadBase64Btn) downloadBase64Btn.disabled = true;

    // Disable Image converter buttons initially (Handled by image-to-base64.js?)
    // You might need to explicitly disable them here if not handled elsewhere
    const convertImageBtn = document.getElementById('convert-image-button');
    const copyImageBtn = document.getElementById('copy-image-base64-button');
    const downloadImageBtn = document.getElementById('download-image-base64-button');
    if (convertImageBtn) convertImageBtn.disabled = true;
    if (copyImageBtn) copyImageBtn.disabled = true;
    if (downloadImageBtn) downloadImageBtn.disabled = true;

    // Disable Generate OB1 button initially (Handled by ob1-generator.js?)
    const generateOb1Btn = document.getElementById('generateOB1Button');
    if(generateOb1Btn) generateOb1Btn.disabled = true;

};