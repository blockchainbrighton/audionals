// main.js - Application Entry Point

// Check if the core FFmpeg library object exists (loaded from CDN)
if (typeof FFmpeg === 'undefined' || typeof FFmpeg.createFFmpeg === 'undefined') {
    console.error("FFmpeg library (FFmpeg.js) not loaded correctly. Check the script tag in the HTML.");
    // Display error to the user
    const statusElement = document.getElementById('status'); // Need to get it directly here
    if (statusElement) {
        statusElement.textContent = 'Error: Could not load required FFmpeg library. Please refresh.';
        statusElement.className = 'error';
    }
    // Optionally disable the whole interface
    const mainInterface = document.querySelector('main'); // Adjust selector if needed
    if (mainInterface) {
       mainInterface.style.opacity = '0.5';
       mainInterface.style.pointerEvents = 'none';
    }

} else {
    // FFmpeg object exists, proceed with application setup

    /**
     * Initializes the application:
     * 1. Sets initial UI states (sliders, default format).
     * 2. Starts loading FFmpeg core in the background.
     * 3. Sets up all event listeners.
     */
    const initializeApp = () => {
        updateStatus('Initializing application...');
        initializeUIState(); // Set default slider values, visibility etc.
        loadFFmpeg(); // Start loading FFmpeg core (async)
        setupEventListeners(); // Setup UI interactions
        // Initial status message might be quickly overwritten by loadFFmpeg()
        updateStatus('Ready. Select a WAV file.'); // Or wait for FFmpeg load confirmation
    };

    // --- Initial Setup on Page Load ---
    // Use DOMContentLoaded for faster perceived load, but 'load' ensures images/other resources are ready if needed.
    // 'load' is generally safer if unsure.
    window.addEventListener('load', initializeApp);

    // Could also use:
    // document.addEventListener('DOMContentLoaded', initializeApp);
    // If using DOMContentLoaded, ensure all required DOM elements exist at that point.

} // End of FFmpeg check block


/*
<!-- collapsible_note -->
<!--
<details>
<summary>File Summary: main.js</summary>

**Purpose:** Acts as the main entry point for the JavaScript application. It checks for the presence of the core FFmpeg library and then orchestrates the initialization sequence.

**Key Functions:**
*   `initializeApp()`: Coordinates the application startup process by calling initialization functions from other modules (`initializeUIState`, `loadFFmpeg`, `setupEventListeners`).

**Dependencies:**
*   **External Library:** Checks for the global `FFmpeg` object (expected to be loaded from `ffmpeg.js` via CDN/script tag).
*   **DOM Elements (implicitly global):** `statusEl`, `main` (or equivalent top-level container).
*   **Initialization/Setup Functions (implicitly global):** `initializeUIState`, `loadFFmpeg`, `setupEventListeners`, `updateStatus`.

**Global Variables:**
*   None created directly, but initiates processes that manage global state (like the `ffmpeg` instance).

**Notes:**
*   Performs a critical check to ensure the external `ffmpeg.js` library is loaded before proceeding. Displays an error and potentially disables the UI if the library is missing.
*   Uses a `window.load` event listener to ensure all resources (including potentially the FFmpeg script) are loaded before initialization begins.
*   Orchestrates the startup sequence, ensuring UI is set up, FFmpeg starts loading, and event listeners are attached.
</details>
-->
*/