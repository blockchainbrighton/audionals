// --- START OF FILE main.js ---

// --- Module Imports ---
import * as audio from './audioProcessor.js';
import * as ui from './uiUpdater.js';
// Import clamp for slider logic and _isInputFocused for keydown checks
import { clamp, _isInputFocused } from './utils.js';
import * as keyboardShortcuts from './keyboardShortcuts.js';
import { initReferencePanel, toggleReferencePanel } from './referenceDisplay.js';

// --- DOM Element References ---
const mainImage = document.getElementById('main-image');
const playOnceBtn = document.getElementById('play-once-btn');
const loopToggleBtn = document.getElementById('loop-toggle-btn');
const reverseToggleBtn = document.getElementById('reverse-toggle-btn');
const tempoSlider = document.getElementById('tempo-slider');
const pitchSlider = document.getElementById('pitch-slider');
const volumeSlider = document.getElementById('volume-slider');
const controlsContainer = document.getElementById('controls-container');
const infoToggleBtn = document.getElementById('info-toggle-btn');
const referencePanel = document.getElementById('reference-panel');
// Get references needed for UI initialization (if uiUpdater is refactored later)
const tempoValueSpan = document.getElementById('tempo-value');
const pitchValueSpan = document.getElementById('pitch-value');
const volumeValueSpan = document.getElementById('volume-value');
const errorMessageDiv = document.getElementById('error-message');


// --- Helper Function for Data Validation/Formatting ---
/**
 * Validates base64 data and ensures it's a proper data URL.
 * @param {string | undefined} base64Data - The input base64 data or data URL.
 * @param {string} dataUrlPrefix - The expected data URL prefix (e.g., 'data:image/jpeg;base64,').
 * @param {string} variableName - The name of the data source for error messages (e.g., 'Image').
 * @returns {string} The validated and formatted data URL.
 * @throws {Error} If the data is missing or invalid.
 */
function validateAndFormatDataSource(base64Data, dataUrlPrefix, variableName) {
    if (typeof base64Data === 'undefined' || !base64Data || (typeof base64Data === 'string' && base64Data.startsWith("/*"))) {
        throw new Error(`${variableName} data is missing or invalid.`);
    }
    return (typeof base64Data === 'string' && base64Data.startsWith('data:'))
           ? base64Data
           : `${dataUrlPrefix}${base64Data}`;
}

// --- Helper Function for Slider Input ---
/**
 * Generic handler for slider input events.
 * Reads the slider value, clamps it, calls the audio setter, and updates the UI display.
 * @param {Event} event - The input event object.
 * @param {Function} audioSetter - The function from audioProcessor.js to call (e.g., audio.setTempo).
 * @param {Function} uiUpdater - The function from uiUpdater.js to call (e.g., ui.updateTempoDisplay).
 * @param {Function} [parser=parseFloat] - The function to parse the slider value (parseInt or parseFloat).
 */
function handleSliderInput(event, audioSetter, uiUpdater, parser = parseFloat) {
    const slider = event.target;
    if (!slider || typeof slider.value === 'undefined' || typeof slider.min === 'undefined' || typeof slider.max === 'undefined') {
        console.error(`Slider element or its properties (value, min, max) missing for ${slider?.id || 'unknown slider'}.`);
        return;
    }
    const rawValue = parser(slider.value);
    const min = parser(slider.min);
    const max = parser(slider.max);
    const clampedValue = clamp(rawValue, min, max); // Use imported clamp

    if (typeof audioSetter === 'function') {
        audioSetter(clampedValue);
    } else {
        console.error(`Invalid audioSetter provided for ${slider.id}`);
    }

    if (typeof uiUpdater === 'function') {
        uiUpdater(clampedValue);
    } else {
        console.error(`Invalid uiUpdater provided for ${slider.id}`);
    }
    // console.log(`${slider.id} updated to: ${clampedValue}`); // Keep logs minimal unless debugging
}

// --- Shared Async Helper for Loop Toggle ---
/**
 * Handles the logic for toggling the audio loop on/off.
 */
async function handleLoopToggle() {
    // console.groupCollapsed("handleLoopToggle Action"); // Keep logs minimal unless debugging
    const wasLooping = audio.getLoopingState();
    // console.log(`Loop state BEFORE toggle: ${wasLooping}`);
    let newState = wasLooping;

    try {
        await audio.resumeContext();

        if (wasLooping) {
            // console.log("Calling audio.stopLoop()");
            audio.stopLoop();
            newState = false;
        } else {
            // console.log("Calling audio.startLoop()");
            await audio.startLoop();
            newState = audio.getLoopingState();
        }
        // console.log(`Loop state AFTER toggle action: ${newState}`);

    } catch (err) {
        ui.showError(`Could not toggle loop: ${err.message}`);
        console.error("Error toggling loop:", err);
        newState = audio.getLoopingState();
    } finally {
         ui.updateLoopButton(newState);
         // console.groupEnd(); // Keep logs minimal unless debugging
    }
}

// --- Initialization ---
async function initializeApp() {
    console.log("Initializing application...");

    // Pass collected DOM elements to uiUpdater (if refactored - currently uses internal lookups)
    // If uiUpdater.js is updated later to accept elements via init:
    /*
    ui.init({
        controlsContainer, errorMessageDiv, playOnceBtn, loopToggleBtn,
        reverseToggleBtn, tempoSlider, tempoValueSpan, pitchSlider,
        pitchValueSpan, volumeSlider, volumeValueSpan, mainImage
    });
    */
    // For now, stick to the compatible setControlsContainer if it exists
    if (ui.setControlsContainer) {
        ui.setControlsContainer(controlsContainer);
    } else {
        // This warning is valid if uiUpdater hasn't been updated yet
        console.warn("ui.setControlsContainer function not found in uiUpdater.js (may indicate uiUpdater hasn't been refactored yet).");
    }

    ui.clearError();

    // 1. Validate Input Data
    let imageSrc;
    let audioSource;
    try {
        imageSrc = validateAndFormatDataSource(
            typeof imageBase64 !== 'undefined' ? imageBase64 : undefined,
            'data:image/jpeg;base64,', 'Image'
        );
        ui.setImageSource(imageSrc); // uiUpdater needs mainImage reference internally
    } catch (e) {
        ui.showError(`Failed to load image: ${e.message}`);
        console.error("Image loading error:", e);
        if(controlsContainer) ui.disableControls(); // Disable only if container exists
        return;
    }
    try {
         audioSource = validateAndFormatDataSource(
             typeof audioBase64_Opus !== 'undefined' ? audioBase64_Opus : undefined,
             'data:audio/opus;base64,', 'Audio'
         );
    } catch (e) {
         ui.showError(`Invalid audio data provided: ${e.message}`);
         console.error("Audio data error:", e);
         if(controlsContainer) ui.disableControls();
         return;
     }

    // 2. Initialize Audio Processor
    console.log("Initializing audio...");
    const audioReady = await audio.init(audioSource);
    if (!audioReady) {
        console.error("Audio initialization failed. Controls remain disabled.");
        if(controlsContainer) ui.disableControls();
        return;
    }

    // 3. Setup Post-Audio Initialization
    console.log("Audio ready. Setting up UI and listeners.");
    ui.enableControls();
    setupEventListeners();

    // 4. Initialize Keyboard Shortcuts
    keyboardShortcuts.init({
        tempoSlider: tempoSlider,
        pitchSlider: pitchSlider,
        volumeSlider: volumeSlider,
        // No longer need to pass audio/ui modules if keyboardShortcuts imports them directly
    });

    // 5. Set Initial UI Values
    console.groupCollapsed("Setting Initial UI Values");
    try {
        const sliderConfigs = [
            { slider: tempoSlider, updater: ui.updateTempoDisplay, label: 'Tempo', parser: parseInt },
            { slider: pitchSlider, updater: ui.updatePitchDisplay, label: 'Pitch' },
            { slider: volumeSlider, updater: ui.updateVolumeDisplay, label: 'Volume' }
        ];
        sliderConfigs.forEach(config => {
            if (config.slider) {
                const parser = config.parser || parseFloat;
                const value = parser(config.slider.value);
                // console.log(`Initial ${config.label}: ${value}`); // Minimal logging
                if (typeof config.updater === 'function') {
                    config.updater(value);
                } else { console.warn(`${config.label} UI updater function not found.`); }
            } else { console.warn(`${config.label} slider not found for initial setup.`); }
        });

        ui.updateLoopButton(audio.getLoopingState());
        ui.updateReverseButton(audio.getReverseState());

    } catch (error) {
         console.error("Error setting initial UI values:", error);
         ui.showError("Problem setting initial control values.");
    }
    console.groupEnd();

    console.log("Application initialized successfully.");
}

// --- REMOVED Local Definition of isTextInputFocused ---
// The function is now imported from utils.js as _isInputFocused

// --- Helper for Adding Event Listeners ---
/**
 * Attaches an event listener if the element exists, warns if not.
 * @param {Element | null} element - The DOM element to attach the listener to.
 * @param {string} eventName - The name of the event (e.g., 'click', 'input').
 * @param {EventListenerOrEventListenerObject} handler - The event handler function.
 * @param {string} elementNameForWarn - A descriptive name for the element for warning messages.
 */
function addListener(element, eventName, handler, elementNameForWarn) {
    if (element) {
        element.addEventListener(eventName, handler);
    } else {
        // Only warn if the element is generally expected
        const optionalElements = ['infoToggleBtn', 'referencePanel']; // Add other non-critical elements here
        if (!optionalElements.includes(elementNameForWarn)) {
            console.warn(`[setupEventListeners] Element "${elementNameForWarn}" not found. Listener not attached.`);
        } else {
             // console.log(`[setupEventListeners] Optional element "${elementNameForWarn}" not found. Listener not attached.`); // Less severe log for optional
        }
    }
}

// --- Event Listener Setup (Refactored with addListener helper) ---
function setupEventListeners() {
    console.log("Setting up event listeners...");

    // --- Control Listeners ---
    addListener(mainImage, 'click', handleLoopToggle, 'mainImage');
    addListener(playOnceBtn, 'click', () => audio.playOnce(), 'playOnceBtn');
    addListener(loopToggleBtn, 'click', handleLoopToggle, 'loopToggleBtn');
    addListener(reverseToggleBtn, 'click', () => {
        audio.resumeContext()
             .then(() => ui.updateReverseButton(audio.toggleReverse()))
             .catch(err => {
                console.error("Error toggling reverse:", err);
                ui.showError(`Could not toggle reverse: ${err.message}`);
             });
    }, 'reverseToggleBtn');

    // --- Slider Listeners (Using helper within helper) ---
    addListener(tempoSlider, 'input', (e) => handleSliderInput(e, audio.setTempo, ui.updateTempoDisplay, parseInt), 'tempoSlider');
    addListener(pitchSlider, 'input', (e) => handleSliderInput(e, audio.setPitch, ui.updatePitchDisplay), 'pitchSlider');
    addListener(volumeSlider, 'input', (e) => handleSliderInput(e, audio.setVolume, ui.updateVolumeDisplay), 'volumeSlider');

    // --- Global Keydown Listener (Using imported _isInputFocused and optional chaining) ---
    window.addEventListener('keydown', (e) => {
        // Use imported function to check focus state
        const blockSpace = _isInputFocused(e.target) || e.target?.tagName?.toLowerCase() === 'button'; // Also block if focused on *any* button

        if (e.code === 'Space' && !blockSpace && !e.repeat) {
            // Ensure no modifier keys are pressed for this specific action
            if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                e.preventDefault(); // Prevent default space action (scroll, button click)
                // console.log("Spacebar pressed for playOnce"); // Minimal logging
                audio.playOnce(); // Assumes playOnce handles context internally
            }
        }
        // Other global keydowns (if any needed outside keyboardShortcuts.js) would go here
    });

    // --- Info Button Listener (Optional Elements) ---
     addListener(infoToggleBtn, 'click', () => {
        console.log("Info button clicked."); // <-- ADD THIS

         if (referencePanel) { // Need to check panel existence here too
            console.log("Reference panel element found:", referencePanel); // <-- ADD THIS
            console.log("Panel innerHTML BEFORE init:", `"${referencePanel.innerHTML.trim()}"`); // <-- ADD THIS

            initReferencePanel(referencePanel);
            console.log("Panel innerHTML AFTER init:", `"${referencePanel.innerHTML.trim()}"`); // <-- ADD THIS

            toggleReferencePanel(referencePanel);
         } else {
             console.warn("Info button clicked, but reference panel element is missing.");
         }
     }, 'infoToggleBtn'); // Reference panel check is inside handler

     console.log("Event listeners setup complete.");
}

// --- Start the Application ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// --- END OF FILE main.js ---