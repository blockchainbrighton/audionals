// event-listeners.js

/**
 * Sets up all event listeners for the application.
 */
const setupEventListeners = () => {
    console.log("Setting up event listeners..."); // Debug log

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

    // --- NEW LISTENERS for Audio Format Info ---

    // Show Info Button
    if (showInfoBtn) {
        showInfoBtn.addEventListener('click', () => {
            console.log("Show Info button clicked");
            displayAudioFormatInfo(); // Calls function in ui-helpers.js
        });
    } else {
        console.error("Show Info button not found.");
    }

    // Close Info Button
    if (closeInfoBtn) {
        closeInfoBtn.addEventListener('click', () => {
            console.log("Close Info button clicked");
            hideAudioFormatInfo(); // Calls function in ui-helpers.js
        });
    } else {
        console.error("Close Info button not found.");
    }

    console.log("Event listeners setup complete.");
};

/**
 * Sets the initial state of UI elements like sliders and displays.
 */
const initializeUIState = () => {
    if (mp3QualitySlider && mp3QualityValueSpan) {
        // Use the default value set in HTML
        mp3QualityValueSpan.textContent = mp3QualitySlider.value;
    }
    if (opusBitrateSlider && opusBitrateValueSpan) {
         // Use the default value set in HTML
        opusBitrateValueSpan.textContent = `${opusBitrateSlider.value} kbps`;
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
    if (audioInfoContainer) audioInfoContainer.style.display = 'none'; // Hide info initially
    if (progressEl) progressEl.style.display = 'none'; // Hide progress initially
}
