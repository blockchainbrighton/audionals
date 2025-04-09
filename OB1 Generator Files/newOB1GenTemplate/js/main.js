import { initializeImage } from './uiSetup.js';
// Import specific processor functions + new check
import {
    decodeAudioDataForProcessing,
    startTempoLoop,
    stopTempoLoop,
    setTempo,
    setPitchRate,
    setVolume,
    playOnce,
    isLooping,
    isAudioReady // Import the new readiness checker
} from './audioProcessor.js';
import { base64ToArrayBuffer } from './dataUtils.js';

// --- Get DOM Elements (Grouped) ---
const uiElements = {
    image: document.getElementById('clickableImage'),
    // audioElement: REMOVED
    playOnceButton: document.getElementById('playOnceButton'),
    loopToggleButton: document.getElementById('loopToggle'),
    reverseButton: document.getElementById('reverseButton'),
    tempoSlider: document.getElementById('tempoSlider'),
    bpmValueSpan: document.getElementById('bpmValue'),
    pitchSlider: document.getElementById('pitchSlider'),
    pitchValueSpan: document.getElementById('pitchValue'),
    volumeSlider: document.getElementById('volumeSlider'),
    volumeValueSpan: document.getElementById('volumeValue'),
    controlsContainer: document.querySelector('.controls') // For error messages
};

// --- List of interactive controls for enable/disable ---
const interactiveControls = [
    uiElements.image,
    uiElements.playOnceButton,
    uiElements.loopToggleButton,
    uiElements.reverseButton,
    uiElements.tempoSlider,
    uiElements.pitchSlider,
    uiElements.volumeSlider
];

// --- State ---
// isAudioDecoded is implicitly handled by isAudioReady() from processor now
let rawAudioBuffer = null; // Still useful to hold the buffer before decoding attempt

// --- Initialization ---
async function initializeApp() {
    console.log("DOM loaded. Initializing app...");

    // Check required elements early
    if (!uiElements.image || !uiElements.controlsContainer) {
        console.error("Essential UI elements (image or controls container) are missing. Cannot initialize.");
        alert("Error: Page structure incomplete. Cannot load application.");
        return; // Hard stop
    }

    // Disable controls initially
    setControlsEnabled(false);

    const imgData = typeof imageBase64 !== 'undefined' ? imageBase64 : null;
    const audioData = typeof audioBase64_Opus !== 'undefined' ? audioBase64_Opus : null;

    // Initialize image (pass the error display function)
    initializeImage(uiElements.image, imgData, displayError);

    // --- Process Audio ---
    if (!audioData) {
        console.error("Audio Base64 data missing.");
        displayError("Error: Audio data is missing. Playback disabled.");
        return; // Stop initialization if no audio data
    }

    rawAudioBuffer = base64ToArrayBuffer(audioData);
    if (!rawAudioBuffer) {
        console.error("Failed to convert Base64 to ArrayBuffer.");
        // displayError is likely called by base64ToArrayBuffer already via alert
        return; // Stop if conversion fails
    }

    console.log("Attempting to decode audio for Web Audio API...");
    const decodingSuccess = await decodeAudioDataForProcessing(rawAudioBuffer);

    if (decodingSuccess) {
        console.log("Web Audio decoding successful. Enabling controls.");

        // Set initial states from sliders AFTER ensuring processor is ready
        const initialTempo = parseFloat(uiElements.tempoSlider.value);
        const initialPitch = parseFloat(uiElements.pitchSlider.value);
        const initialVolume = parseFloat(uiElements.volumeSlider.value);

        // Update processor state
        setTempo(initialTempo);
        setPitchRate(initialPitch);
        setVolume(initialVolume);

        // Update UI display
        updateTempoDisplay(initialTempo);
        updatePitchDisplay(initialPitch);
        updateVolumeDisplay(initialVolume);
        updateLoopButtonState(); // Set initial button state

        setupEventListeners();
        setControlsEnabled(true); // Enable controls now
    } else {
        console.error("Web Audio decoding failed. Controls remain disabled.");
        displayError("Error: Failed to decode audio for playback. Controls disabled.");
        // Controls are already disabled from the start
    }
}

// --- Control Updates ---

function updateTempoDisplay(bpm) {
    if (uiElements.bpmValueSpan) {
        uiElements.bpmValueSpan.textContent = `${Math.round(bpm)} BPM`;
    }
}

function updatePitchDisplay(rate) {
    if (uiElements.pitchValueSpan) {
        uiElements.pitchValueSpan.textContent = `${(rate * 100).toFixed(0)}%`;
    }
}

function updateVolumeDisplay(level) {
     if (uiElements.volumeValueSpan) {
        uiElements.volumeValueSpan.textContent = `${(level * 100).toFixed(0)}%`;
    }
}

// Update Loop Toggle Button Appearance/Text
function updateLoopButtonState() {
    const button = uiElements.loopToggleButton;
    if (!button) return;
    const looping = isLooping(); // Check state from processor
    button.textContent = `Play Loop: ${looping ? 'On' : 'Off'}`;
    button.classList.toggle('active', looping); // For potential styling
}

// Toggle Tempo Loop and Update Button
function toggleTempoLoopAndUpdateButton() {
    if (!isAudioReady()) { // Use the readiness checker
        console.warn("Cannot toggle loop: Audio not decoded/ready.");
        // Optionally provide user feedback (e.g., alert or brief message)
        // displayError("Audio not ready for looping.", true); // Example temporary message
        return;
    }
    if (isLooping()) {
        stopTempoLoop();
    } else {
        startTempoLoop();
    }
    updateLoopButtonState(); // Update button after toggling
}

// Helper function for Play Once action
function handlePlayOnce(reverse = false) {
    if (!isAudioReady()) {
         console.warn("Cannot play once: Audio not decoded/ready.");
         alert("Audio not ready. Please wait or check for errors.");
         return;
    }
    playOnce(reverse);
}

// --- Event Listeners ---
function setupEventListeners() {
    // Check if essential elements for listeners exist
     const requiredListenerElements = [
        uiElements.image, uiElements.playOnceButton, uiElements.loopToggleButton,
        uiElements.reverseButton, uiElements.tempoSlider, uiElements.pitchSlider, uiElements.volumeSlider
    ];
    if (requiredListenerElements.some(el => !el)) {
        console.error("Cannot setup listeners: One or more required UI elements are missing.");
        return;
    }

    // Image Click Toggles Tempo Loop
    uiElements.image.addEventListener('click', toggleTempoLoopAndUpdateButton);
    console.log("Click listener added to image (toggles loop).");

    // Play Once Button
    uiElements.playOnceButton.addEventListener('click', () => handlePlayOnce(false));

    // Loop Toggle Button
    uiElements.loopToggleButton.addEventListener('click', toggleTempoLoopAndUpdateButton);

    // Tempo Slider Input
    uiElements.tempoSlider.addEventListener('input', () => {
        const bpm = parseFloat(uiElements.tempoSlider.value);
        const actualBpm = setTempo(bpm); // Update processor
        updateTempoDisplay(actualBpm); // Update display
    });

    // Pitch Slider Input
    uiElements.pitchSlider.addEventListener('input', () => {
        const rate = parseFloat(uiElements.pitchSlider.value);
        const actualRate = setPitchRate(rate); // Update processor
        updatePitchDisplay(actualRate); // Update display
    });

     // Volume Slider Listener
     uiElements.volumeSlider.addEventListener('input', () => {
        const level = parseFloat(uiElements.volumeSlider.value);
        const actualLevel = setVolume(level); // Update processor
        updateVolumeDisplay(actualLevel); // Update display
     });

    // Reverse Button
    uiElements.reverseButton.addEventListener('click', () => {
        if (isLooping()) {
            stopTempoLoop(); // Stop the loop if playing reversed
            updateLoopButtonState(); // Update button state
        }
        handlePlayOnce(true); // Play once, reversed
    });

    // Spacebar Listener for Play Once
    window.addEventListener('keydown', (event) => {
        // Ignore if audio isn't ready or if typing in an input/textarea
        if (!isAudioReady() || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            return;
        }

        if (event.code === 'Space' && !event.repeat) { // Check event.code and avoid repeats
            event.preventDefault(); // Prevent default spacebar action (e.g., scrolling, button press)
            console.log("Spacebar pressed: Playing once.");
            handlePlayOnce(false); // Trigger the "Play Once" action
        }
    });
    console.log("Spacebar listener added for 'Play Once'.");

    // Optional: Stop loop on page unload (no Blob URL cleanup needed)
    window.addEventListener('pagehide', () => {
       stopTempoLoop();
       console.log("Page hidden, stopping tempo loop.");
    });
}

// --- UI State Functions ---

/**
 * Enables or disables interactive controls.
 * @param {boolean} enabled True to enable, false to disable.
 */
function setControlsEnabled(enabled) {
    interactiveControls.forEach(el => {
        if (el) {
            el.disabled = !enabled;
            el.style.cursor = enabled ? '' : 'not-allowed';
            // Adjust opacity for visual feedback, especially for form elements/buttons
            if (el.tagName === 'INPUT' || el.tagName === 'BUTTON' || el.tagName === 'IMG') {
                 el.style.opacity = enabled ? '1.0' : '0.5';
            }
             // Special handling for the image to prevent click listener when disabled
             if (el === uiElements.image) {
                 el.style.pointerEvents = enabled ? 'auto' : 'none';
             }
        }
    });
     console.log(`Controls ${enabled ? 'enabled' : 'disabled'}.`);

     // Optionally remove the generic "disabled" error message when enabling
     if (enabled) {
        const errorDiv = uiElements.controlsContainer?.querySelector('.error-message[data-message-type="disabled-state"]');
        if (errorDiv) errorDiv.remove();
     } else {
        // Add a generic disabled message if not already present
        // displayError("Controls disabled.", false, "disabled-state");
     }
}


/**
 * Displays an error message in the controls container.
 * @param {string} message The error message text.
 * @param {boolean} temporary If true, message might self-destruct (optional feature, not implemented here).
 * @param {string} messageType A data attribute type for targeting specific messages.
 */
function displayError(message, temporary = false, messageType = "general-error") {
    if (!uiElements.controlsContainer) {
        console.error("Cannot display error, controls container not found:", message);
        alert(message); // Fallback to alert
        return;
    }

    // Avoid duplicating the exact same message type
    const existingError = uiElements.controlsContainer.querySelector(`.error-message[data-message-type="${messageType}"]`);
    if (existingError && existingError.textContent === message) return; // Already showing this exact message

    // If a message of this type exists, update it, otherwise create new
    let errorDiv = existingError;
    if (!errorDiv) {
         errorDiv = document.createElement('div');
         errorDiv.className = 'error-message'; // For styling
         errorDiv.dataset.messageType = messageType;
         // Basic styles (consider moving to CSS)
         errorDiv.style.color = 'red';
         errorDiv.style.padding = '8px';
         errorDiv.style.margin = '5px 0';
         errorDiv.style.backgroundColor = '#fee';
         errorDiv.style.border = '1px solid red';
         errorDiv.style.borderRadius = '4px';
         errorDiv.style.width = 'calc(100% - 16px)'; // Account for padding
         errorDiv.style.boxSizing = 'border-box';
         errorDiv.style.textAlign = 'center';
         errorDiv.style.fontSize = '0.9em';
         uiElements.controlsContainer.appendChild(errorDiv); // Append new message
    }

    errorDiv.textContent = message; // Set/update text content
    console.error("UI Error Displayed:", message); // Log it too

    // Placeholder for potential temporary message removal
    // if (temporary) { setTimeout(() => errorDiv.remove(), 5000); }
}


// --- Run Initialization ---
// Use standard DOMContentLoaded listener
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOMContentLoaded has already fired
    initializeApp();
}