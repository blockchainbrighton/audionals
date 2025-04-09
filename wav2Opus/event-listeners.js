/**
 * Helper function to add an event listener if the element exists.
 * @param {HTMLElement} element - The DOM element.
 * @param {string} event - The event type.
 * @param {Function} callback - The callback function.
 * @param {string} errorMsg - The error message to log if the element is missing.
 */
const safeAddListener = (element, event, callback, errorMsg) => {
    if (element) {
        element.addEventListener(event, callback);
    } else {
        console.error(errorMsg);
    }
};

/**
 * Sets up all event listeners for the application.
 */
const setupEventListeners = () => {
    console.log("Setting up event listeners...");

    safeAddListener(fileInput, 'change', handleFileChange, "File input element not found.");
    safeAddListener(playSampleBtn, 'click', handlePlayOriginalClick, "Play sample button not found.");

    if (formatRadios && formatRadios.length > 0) {
        formatRadios.forEach(radio =>
            safeAddListener(radio, 'change', updateQualityDisplays, "Format radio button not found.")
        );
    } else {
        console.error("Format radio buttons not found.");
    }

    safeAddListener(mp3QualitySlider, 'input', (e) => {
        mp3QualityValueSpan.textContent = e.target.value;
        updateEstimatedSize();
    }, "MP3 quality slider or value span not found.");

    safeAddListener(opusBitrateSlider, 'input', (e) => {
        opusBitrateValueSpan.textContent = `${e.target.value} kbps`;
        updateEstimatedSize();
    }, "Opus bitrate slider or value span not found.");

    safeAddListener(convertBtn, 'click', runConversion, "Convert button not found.");

    // --- LISTENERS for Audio Format Info ---
    safeAddListener(showInfoBtn, 'click', () => {
        console.log("Info button toggled");
        if (audioInfoContainer && audioInfoContainer.style.display === 'block') {
            // If info is already visible, hide it
            hideAudioFormatInfo();
        } else {
            // Combine usage instructions and audio format details into one HTML string.
            const combinedInfo =
                audioFormatInfo.usageInstructions +
                audioFormatInfo.conceptsTitle +
                audioFormatInfo.losslessVsLossy +
                audioFormatInfo.bitrate +
                audioFormatInfo.formatsTitle +
                audioFormatInfo.wav +
                audioFormatInfo.mp3 +
                audioFormatInfo.opus +
                audioFormatInfo.opusRecommendationsTitle +
                audioFormatInfo.opusDetails;
            displayAudioFormatInfo(combinedInfo);
        }
    }, "Show Info button not found.");

    safeAddListener(closeInfoBtn, 'click', () => {
        console.log("Close Info button clicked");
        hideAudioFormatInfo();
    }, "Close Info button not found.");

    console.log("Event listeners setup complete.");
};

/**
 * Sets the initial state of UI elements like sliders and displays.
 */
const initializeUIState = () => {
    if (mp3QualitySlider && mp3QualityValueSpan) {
        mp3QualityValueSpan.textContent = mp3QualitySlider.value;
    }
    if (opusBitrateSlider && opusBitrateValueSpan) {
        opusBitrateValueSpan.textContent = `${opusBitrateSlider.value} kbps`;
    }
    if (formatRadios) {
        const checked = document.querySelector('input[name="format"]:checked');
        if (!checked && formatRadios.length > 0) {
            formatRadios[0].checked = true;
        }
    }
    updateQualityDisplays();
    enableConvertButtonIfNeeded();
    if (audioInfoContainer) audioInfoContainer.style.display = 'none';
    if (progressEl) progressEl.style.display = 'none';
};


/*
<!-- collapsible_note -->
<!--
<details>
<summary>File Summary: event-listeners.js</summary>

**Purpose:** Sets up all the necessary event listeners for user interactions with the UI elements and initializes the default UI state.

**Key Functions:**
*   `safeAddListener(element, event, callback, errorMsg)`: A helper function to add event listeners robustly, checking if the element exists first.
*   `setupEventListeners()`: Attaches event listeners to various DOM elements (file input, buttons, sliders, radio buttons, info button) and maps them to handler functions defined in other modules.
*   `initializeUIState()`: Sets the initial state of UI elements on page load (e.g., slider values, default format selection, visibility of sections).

**Dependencies:**
*   **DOM Elements (implicitly global):** Many elements accessed via variables defined in `dom-elements.js` (e.g., `fileInput`, `playSampleBtn`, `formatRadios`, `mp3QualitySlider`, `opusBitrateSlider`, `convertBtn`, `showInfoBtn`, `closeInfoBtn`).
*   **Handler Functions (implicitly global):** `handleFileChange`, `handlePlayOriginalClick`, `updateQualityDisplays`, `updateEstimatedSize`, `runConversion`, `displayAudioFormatInfo`, `hideAudioFormatInfo`. (These functions are defined in other files like `file-handler.js`, `ui-helpers.js`, `conversion-process.js`, etc.).
*   **Static Data (implicitly global):** `audioFormatInfo` (from `audio-formats-explained.js`).

**Global Variables:**
*   None created, but attaches functions (potentially global) to DOM events.

**Notes:**
*   Acts as the central hub connecting user interface actions to the application's logic.
*   Includes initialization logic to ensure the UI starts in a predictable state.
*   Uses the `safeAddListener` helper to prevent errors if DOM elements are missing.
*   Handles the logic for displaying/hiding the audio format information modal.
</details>
-->
*/
