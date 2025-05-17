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
        updateStatus('Ready. Select an audio file.'); // Or wait for FFmpeg load confirmation
    };

    // --- Initial Setup on Page Load ---
    // Use DOMContentLoaded for faster perceived load, but 'load' ensures images/other resources are ready if needed.
    // 'load' is generally safer if unsure.
    window.addEventListener('load', initializeApp);

    // Could also use:
    // document.addEventListener('DOMContentLoaded', initializeApp);
    // If using DOMContentLoaded, ensure all required DOM elements exist at that point.

} // End of FFmpeg check block