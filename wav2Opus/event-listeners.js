// event-listeners.js

/**
 * Sets up all event listeners for the application.
 */
const setupEventListeners = () => {
    // File Input
    if (fileInput) {
        fileInput.addEventListener('change', handleFileChange);
    } else {
        console.error("File input element not found.");
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

    // MP3 Quality Slider
    if (mp3QualitySlider && mp3QualityValueSpan) {
        mp3QualitySlider.addEventListener('input', (e) => {
            mp3QualityValueSpan.textContent = e.target.value;
            updateEstimatedSize(); // Update estimate on slider change
        });
    } else {
        console.error("MP3 quality slider or value span not found.");
    }

    // Opus Bitrate Slider
    if (opusBitrateSlider && opusBitrateValueSpan) {
        opusBitrateSlider.addEventListener('input', (e) => {
            opusBitrateValueSpan.textContent = `${e.target.value} kbps`;
            updateEstimatedSize(); // Update estimate on slider change
        });
    } else {
        console.error("Opus bitrate slider or value span not found.");
    }

    // Convert Button
    if (convertBtn) {
        convertBtn.addEventListener('click', runConversion);
    } else {
        console.error("Convert button not found.");
    }

    // Base64 Buttons (Listeners are set up dynamically in base64-handler.js when content is generated)
    // We don't need static listeners here for copy/download base64.

    console.log("Event listeners set up.");
};

/**
 * Sets the initial state of UI elements like sliders and displays.
 */
const initializeUIState = () => {
    if (mp3QualitySlider && mp3QualityValueSpan) {
        mp3QualitySlider.value = initialMp3Quality;
        mp3QualityValueSpan.textContent = initialMp3Quality;
    }
    if (opusBitrateSlider && opusBitrateValueSpan) {
        opusBitrateSlider.value = initialOpusBitrate;
        opusBitrateValueSpan.textContent = `${initialOpusBitrate} kbps`;
    }
    if (formatRadios) {
        // Ensure one format is checked by default if not set in HTML
        const checked = document.querySelector('input[name="format"]:checked');
        if (!checked && formatRadios.length > 0) {
            formatRadios[0].checked = true;
        }
    }
    updateQualityDisplays(); // Show the correct settings group based on the default checked format
    enableConvertButtonIfNeeded(); // Set initial button states (should be disabled)
}