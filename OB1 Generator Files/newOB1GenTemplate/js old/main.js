// --- START OF FILE main.js ---

import { initializeImage } from './uiSetup.js';
// Import specific processor functions + new check + reverse functions
import {
    decodeAudioDataForProcessing,
    startTempoLoop,
    stopTempoLoop,
    setTempo,
    setPitchRate,
    setVolume,
    playOnce,
    isLooping,
    isAudioReady, // Keep this
    toggleReverseMode, // <<<<<<<< ADDED
    isReverseEnabled   // <<<<<<<< ADDED
} from './audioProcessor.js';
import { base64ToArrayBuffer } from './dataUtils.js';

// --- Get DOM Elements (Grouped) ---
const uiElements = {
    image: document.getElementById('clickableImage'),
    playOnceButton: document.getElementById('playOnceButton'),
    loopToggleButton: document.getElementById('loopToggle'),
    reverseButton: document.getElementById('reverseButton'), // <<< Keep this
    tempoSlider: document.getElementById('tempoSlider'),
    bpmValueSpan: document.getElementById('bpmValue'),
    pitchSlider: document.getElementById('pitchSlider'),
    pitchValueSpan: document.getElementById('pitchValue'),
    volumeSlider: document.getElementById('volumeSlider'),
    volumeValueSpan: document.getElementById('volumeValue'),
    controlsContainer: document.querySelector('.controls')
};

// --- List of interactive controls for enable/disable ---
const interactiveControls = [
    uiElements.image,
    uiElements.playOnceButton,
    uiElements.loopToggleButton,
    uiElements.reverseButton, // <<< Ensure reverseButton is here
    uiElements.tempoSlider,
    uiElements.pitchSlider,
    uiElements.volumeSlider
];

// --- State ---
let rawAudioBuffer = null;

// --- Initialization ---
async function initializeApp() {
    console.log("DOM loaded. Initializing app...");

    // Check required elements early
    if (!uiElements.image || !uiElements.controlsContainer) {
        console.error("Essential UI elements (image or controls container) are missing. Cannot initialize.");
        alert("Error: Page structure incomplete. Cannot load application.");
        return;
    }

    // Disable controls initially
    setControlsEnabled(false);

    const imgData = typeof imageBase64 !== 'undefined' ? imageBase64 : null;
    const audioData = typeof audioBase64_Opus !== 'undefined' ? audioBase64_Opus : null;

    initializeImage(uiElements.image, imgData, displayError);

    if (!audioData) {
        console.error("Audio Base64 data missing.");
        displayError("Error: Audio data is missing. Playback disabled.");
        return;
    }

    rawAudioBuffer = base64ToArrayBuffer(audioData);
    if (!rawAudioBuffer) {
        console.error("Failed to convert Base64 to ArrayBuffer.");
        return;
    }

    console.log("Attempting to decode audio for Web Audio API...");
    const decodingSuccess = await decodeAudioDataForProcessing(rawAudioBuffer);

    if (decodingSuccess) {
        console.log("Web Audio decoding successful. Enabling controls.");

        const initialTempo = parseFloat(uiElements.tempoSlider.value);
        const initialPitch = parseFloat(uiElements.pitchSlider.value);
        const initialVolume = parseFloat(uiElements.volumeSlider.value);

        setTempo(initialTempo);
        setPitchRate(initialPitch);
        setVolume(initialVolume);

        updateTempoDisplay(initialTempo);
        updatePitchDisplay(initialPitch);
        updateVolumeDisplay(initialVolume);
        updateLoopButtonState(); // Set initial loop button state
        updateReverseButtonState(); // <<<<<<<< ADDED: Set initial reverse button state

        setupEventListeners();
        setControlsEnabled(true);
    } else {
        console.error("Web Audio decoding failed. Controls remain disabled.");
        displayError("Error: Failed to decode audio for playback. Controls disabled.");
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

function updateLoopButtonState() {
    const button = uiElements.loopToggleButton;
    if (!button) return;
    const looping = isLooping();
    button.textContent = `Play Loop: ${looping ? 'On' : 'Off'}`;
    button.classList.toggle('active', looping);
}

// <<<<<<<< ADDED: Function to update the Reverse button state >>>>>>>>
function updateReverseButtonState() {
    const button = uiElements.reverseButton;
    if (!button) return;
    const reversed = isReverseEnabled(); // Check state from processor
    button.textContent = `Reverse: ${reversed ? 'On' : 'Off'}`;
    button.classList.toggle('active', reversed); // Use 'active' class for styling
}

function toggleTempoLoopAndUpdateButton() {
    if (!isAudioReady()) {
        console.warn("Cannot toggle loop: Audio not ready.");
        // displayError("Audio not ready for looping.", true);
        return;
    }
    if (isLooping()) {
        stopTempoLoop();
    } else {
        startTempoLoop();
    }
    updateLoopButtonState();
}

// <<<<<<<< MODIFIED: Removed unused 'reverse' parameter >>>>>>>>
function handlePlayOnce() {
    if (!isAudioReady()) {
         console.warn("Cannot play once: Audio not ready.");
         alert("Audio not ready. Please wait or check for errors.");
         return;
    }
    // playOnce() now correctly uses the global isReverseModeEnabled state internally
    playOnce();
}

// --- Event Listeners ---
function setupEventListeners() {
     const requiredListenerElements = [
        uiElements.image, uiElements.playOnceButton, uiElements.loopToggleButton,
        uiElements.reverseButton, uiElements.tempoSlider, uiElements.pitchSlider, uiElements.volumeSlider
    ];
    if (requiredListenerElements.some(el => !el)) {
        console.error("Cannot setup listeners: One or more required UI elements are missing.");
        return;
    }

    uiElements.image.addEventListener('click', toggleTempoLoopAndUpdateButton);
    console.log("Click listener added to image (toggles loop).");

    // <<<<<<<< MODIFIED: Removed 'false' argument >>>>>>>>
    uiElements.playOnceButton.addEventListener('click', handlePlayOnce);

    uiElements.loopToggleButton.addEventListener('click', toggleTempoLoopAndUpdateButton);

    uiElements.tempoSlider.addEventListener('input', () => {
        const bpm = parseFloat(uiElements.tempoSlider.value);
        const actualBpm = setTempo(bpm);
        updateTempoDisplay(actualBpm);
    });

    uiElements.pitchSlider.addEventListener('input', () => {
        const rate = parseFloat(uiElements.pitchSlider.value);
        const actualRate = setPitchRate(rate);
        updatePitchDisplay(actualRate);
    });

     uiElements.volumeSlider.addEventListener('input', () => {
        const level = parseFloat(uiElements.volumeSlider.value);
        const actualLevel = setVolume(level);
        updateVolumeDisplay(actualLevel);
     });

    // <<<<<<<< MODIFIED: Reverse Button Listener >>>>>>>>
    uiElements.reverseButton.addEventListener('click', () => {
        // Toggle the global reverse mode in the audio processor
        toggleReverseMode();
        // Update the button's appearance
        updateReverseButtonState();
        // Note: toggleReverseMode in audioProcessor handles restarting the loop if needed
    });

    window.addEventListener('keydown', (event) => {
        if (!isAudioReady() || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            return;
        }
        if (event.code === 'Space' && !event.repeat) {
            event.preventDefault();
            console.log("Spacebar pressed: Playing once.");
            // <<<<<<<< MODIFIED: Removed 'false' argument >>>>>>>>
            handlePlayOnce();
        }
    });
    console.log("Spacebar listener added for 'Play Once'.");

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
            if (el.tagName === 'INPUT' || el.tagName === 'BUTTON' || el.tagName === 'IMG') {
                 el.style.opacity = enabled ? '1.0' : '0.5';
            }
             if (el === uiElements.image) {
                 el.style.pointerEvents = enabled ? 'auto' : 'none';
             }
        }
    });
     console.log(`Controls ${enabled ? 'enabled' : 'disabled'}.`);

     if (enabled) {
        const errorDiv = uiElements.controlsContainer?.querySelector('.error-message[data-message-type="disabled-state"]');
        if (errorDiv) errorDiv.remove();
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

    const existingError = uiElements.controlsContainer.querySelector(`.error-message[data-message-type="${messageType}"]`);
    if (existingError && existingError.textContent === message) return;

    let errorDiv = existingError;
    if (!errorDiv) {
         errorDiv = document.createElement('div');
         errorDiv.className = 'error-message';
         errorDiv.dataset.messageType = messageType;
         // Basic styles... (keep as is)
         errorDiv.style.color = 'red';
         errorDiv.style.padding = '8px';
         errorDiv.style.margin = '5px 0';
         errorDiv.style.backgroundColor = '#fee';
         errorDiv.style.border = '1px solid red';
         errorDiv.style.borderRadius = '4px';
         errorDiv.style.width = 'calc(100% - 16px)';
         errorDiv.style.boxSizing = 'border-box';
         errorDiv.style.textAlign = 'center';
         errorDiv.style.fontSize = '0.9em';
         uiElements.controlsContainer.appendChild(errorDiv);
    }

    errorDiv.textContent = message;
    console.error("UI Error Displayed:", message);
}


// --- Run Initialization ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// --- END OF FILE main.js ---