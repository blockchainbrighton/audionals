// --- START OF FILE main.js ---

// --- Module Imports ---
import * as audio from './audioProcessor.js';
import * as ui from './uiUpdater.js';
import { clamp } from './utils.js'; // Assuming utils.js exists and exports clamp
import * as keyboardShortcuts from './keyboardShortcuts.js';
import { initReferencePanel, toggleReferencePanel } from './referenceDisplay.js'; // Import reference panel functions

// --- DOM Element References ---
const mainImage = document.getElementById('main-image');
const playOnceBtn = document.getElementById('play-once-btn');
const loopToggleBtn = document.getElementById('loop-toggle-btn');
const reverseToggleBtn = document.getElementById('reverse-toggle-btn');
const tempoSlider = document.getElementById('tempo-slider');
const pitchSlider = document.getElementById('pitch-slider');
const volumeSlider = document.getElementById('volume-slider');
const controlsContainer = document.getElementById('controls-container'); // Container for enabling/disabling
const infoToggleBtn = document.getElementById('info-toggle-btn');       // Button to show reference
const referencePanel = document.getElementById('reference-panel');     // Panel to display reference

// --- Global Variables / State (if any, though most state is in modules) ---
// Example: let appInitialized = false; // If needed elsewhere

// --- Initialization ---
async function initializeApp() {
    console.log("Initializing application...");
    // Ensure UI module knows about the controls container if needed for disable/enable logic
    if (ui.setControlsContainer) {
         ui.setControlsContainer(controlsContainer);
    } else {
        console.warn("ui.setControlsContainer function not found in uiUpdater.js");
    }
    ui.clearError(); // Clear any previous errors

    // 1. Validate Input Data (Image and Audio)
    let imageSrc;
    let audioSource;

    try {
        if (typeof imageBase64 === 'undefined' || !imageBase64 || imageBase64.startsWith("/*")) {
            throw new Error("Image data is missing or invalid.");
        }
        // Attempt to handle raw base64 or data URLs
        imageSrc = (typeof imageBase64 === 'string' && imageBase64.startsWith('data:image'))
                   ? imageBase64
                   : `data:image/jpeg;base64,${imageBase64}`; // Assume JPEG if no prefix
        ui.setImageSource(imageSrc);

    } catch (e) {
        ui.showError(`Failed to load image: ${e.message}`);
        console.error("Image loading error:", e);
        ui.disableControls();
        return; // Stop initialization
    }

    try {
        if (typeof audioBase64_Opus === 'undefined' || !audioBase64_Opus || audioBase64_Opus.startsWith("/*")) {
            throw new Error("Audio data is missing or invalid.");
        }
         // Attempt to handle raw base64 or data URLs
        audioSource = (typeof audioBase64_Opus === 'string' && audioBase64_Opus.startsWith('data:audio'))
                      ? audioBase64_Opus
                      : `data:audio/opus;base64,${audioBase64_Opus}`; // Assume Opus if no prefix

    } catch (e) {
         ui.showError(`Invalid audio data provided: ${e.message}`);
         console.error("Audio data error:", e);
         ui.disableControls();
         return; // Stop initialization
    }


    // 3. Initialize Audio Processor
    console.log("Initializing audio...");
    const audioReady = await audio.init(audioSource);

    if (!audioReady) {
        // ui.showError should be called within audio.init() on failure
        console.error("Audio initialization failed. Controls remain disabled.");
        ui.disableControls(); // Ensure controls are disabled
        return; // Stop initialization
    }

    // 4. Setup Post-Audio Initialization
    console.log("Audio ready. Setting up UI and listeners.");
    ui.enableControls(); // Enable UI elements
    setupEventListeners(); // Attach event listeners to controls

    // Initialize Keyboard Shortcuts module, passing necessary elements/modules
    keyboardShortcuts.init({
        audioModule: audio, // Pass modules for potential direct calls
        uiModule: ui,
        tempoSlider: tempoSlider,
        pitchSlider: pitchSlider,
        volumeSlider: volumeSlider,
        // Add other elements if keyboardShortcuts needs them (e.g., mainImage, buttons)
    });

    // Set initial display values based on default slider values and audio state
    // Ensure sliders exist before accessing their value property
    if (tempoSlider) ui.updateTempoDisplay(tempoSlider.value);
    if (pitchSlider) ui.updatePitchDisplay(pitchSlider.value);
    if (volumeSlider) ui.updateVolumeDisplay(volumeSlider.value);
    ui.updateLoopButton(audio.getLoopingState());
    ui.updateReverseButton(audio.getReverseState());

    // appInitialized = true; // Set flag if needed
    console.log("Application initialized successfully.");
}

// --- Helper Function ---
/**
 * Checks if the event target is an input element where typing occurs.
 * Used to prevent general shortcuts from firing during text input.
 * @param {EventTarget | null} target - The target element of the event.
 * @returns {boolean} True if the target is an input/textarea/select or contentEditable.
 */
function isTextInputFocused(target) {
    if (!target) return false;
    const tagName = target.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
}

// --- Event Listener Setup ---
function setupEventListeners() {
    console.log("Setting up event listeners...");

    // Image Click -> Toggle Loop Playback
    if (mainImage) {
        mainImage.addEventListener('click', () => {
            console.log("Main image clicked");
            audio.resumeContext() // Ensure context is running
                 .then(() => {
                     if (audio.getLoopingState()) {
                         audio.stopLoop();
                     } else {
                         audio.startLoop();
                     }
                     ui.updateLoopButton(audio.getLoopingState()); // Update button text/state
                 })
                 .catch(err => ui.showError(`Could not toggle loop: ${err.message}`));
        });
    } else { console.warn("Main image element not found."); }


    // Play Once Button
    if (playOnceBtn) {
        playOnceBtn.addEventListener('click', () => {
            console.log("Play Once button clicked");
            // playOnce should handle resumeContext internally if needed
            audio.playOnce();
        });
    } else { console.warn("Play Once button not found."); }

    // Loop Toggle Button
    if (loopToggleBtn) {
        loopToggleBtn.addEventListener('click', () => {
            console.log("Loop Toggle button clicked");
             // Loop control functions should handle resumeContext internally
            if (audio.getLoopingState()) {
                audio.stopLoop();
            } else {
                audio.startLoop();
            }
            ui.updateLoopButton(audio.getLoopingState());
        });
    } else { console.warn("Loop Toggle button not found."); }


    // Reverse Toggle Button
    if (reverseToggleBtn) {
        reverseToggleBtn.addEventListener('click', () => {
            console.log("Reverse Toggle button clicked");
            // Resume context first as toggling might restart playback implicitly
            audio.resumeContext()
                 .then(() => {
                    const newState = audio.toggleReverse();
                    ui.updateReverseButton(newState);
                 })
                 .catch(err => ui.showError(`Could not toggle reverse: ${err.message}`));
        });
     } else { console.warn("Reverse Toggle button not found."); }


    // Tempo Slider Input
    if (tempoSlider) {
        tempoSlider.addEventListener('input', (e) => {
            const bpm = parseInt(e.target.value, 10);
            // Use clamp from utils.js if available, otherwise basic Math.min/max
            const min = parseInt(tempoSlider.min, 10) || 30; // Default fallback
            const max = parseInt(tempoSlider.max, 10) || 240;
            const clampedBpm = typeof clamp === 'function' ? clamp(bpm, min, max) : Math.max(min, Math.min(bpm, max));

            audio.setTempo(clampedBpm);
            ui.updateTempoDisplay(clampedBpm);
        });
     } else { console.warn("Tempo slider not found."); }


    // Pitch Slider Input
    if (pitchSlider) {
        pitchSlider.addEventListener('input', (e) => {
            const rate = parseFloat(e.target.value);
             const min = parseFloat(pitchSlider.min) || 0.1;
             const max = parseFloat(pitchSlider.max) || 4.0;
             const clampedRate = typeof clamp === 'function' ? clamp(rate, min, max) : Math.max(min, Math.min(rate, max));

            audio.setPitch(clampedRate);
            ui.updatePitchDisplay(clampedRate); // UI might format this (e.g., to percentage)
        });
     } else { console.warn("Pitch slider not found."); }


    // Volume Slider Input
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const level = parseFloat(e.target.value);
             const min = parseFloat(volumeSlider.min) || 0.0;
             const max = parseFloat(volumeSlider.max) || 1.0;
             const clampedLevel = typeof clamp === 'function' ? clamp(level, min, max) : Math.max(min, Math.min(level, max));

            audio.setVolume(clampedLevel);
            ui.updateVolumeDisplay(clampedLevel); // UI might format this (e.g., to percentage)
        });
     } else { console.warn("Volume slider not found."); }


    // --- Global Keydown Listener (for specific actions like Spacebar) ---
    // Note: General shortcuts are handled within keyboardShortcuts.js
    window.addEventListener('keydown', (e) => {
        // Spacebar for Play Once - Only if NOT focused on text input OR a button
        const targetTagName = e.target?.tagName?.toLowerCase();
        const blockSpace = targetTagName === 'input'
                           || targetTagName === 'textarea'
                           || targetTagName === 'select'
                           || targetTagName === 'button' // Prevent space activating button AND playing sample
                           || e.target?.isContentEditable;

        if (e.code === 'Space' && !blockSpace && !e.repeat) {
            // Ensure no modifier keys are pressed for this specific action
            if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                e.preventDefault(); // Prevent default space action (scroll, button click)
                console.log("Spacebar pressed for playOnce");
                audio.playOnce(); // Assumes playOnce handles context internally
            }
        }

        // Add other global keydowns here if necessary, but prefer keyboardShortcuts.js
    });

    // --- Info Button Listener (for Reference Panel) ---
     if (infoToggleBtn && referencePanel) {
        infoToggleBtn.addEventListener('click', () => {
            console.log("Info button clicked");
            // Ensure content is injected (runs only once if panel is empty)
            initReferencePanel(referencePanel);
            // Toggle visibility class
            toggleReferencePanel(referencePanel);
        });
    } else {
         console.warn("Info button or reference panel element not found. Reference cannot be toggled.");
     }

    console.log("Event listeners set up.");
}


// --- Start the Application ---
// Wait for the DOM to be fully loaded before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOMContentLoaded has already fired
    initializeApp();
}

// --- END OF FILE main.js ---