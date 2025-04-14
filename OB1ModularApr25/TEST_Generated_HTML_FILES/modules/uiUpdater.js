// --- START OF FILE uiUpdater.js ---

// --- Module State ---
// Keep references at module level, but initialize to null
let controlsContainer = null; // Set via setControlsContainer or init
let errorMessageDiv = null;
let playOnceBtn = null;
let loopToggleBtn = null;
let reverseToggleBtn = null;
let tempoSlider = null;
let tempoValueSpan = null; // Will be found in init
let pitchSlider = null;
let pitchValueSpan = null; // Will be found in init
let volumeSlider = null;
let volumeValueSpan = null; // Will be found in init
let multiplierSlider = null;
let multiplierValueSpan = null; // Will be found in init
let mainImage = null;

let controlElementsList = []; // Will be populated in init

/**
 * Initializes the UI Updater by finding essential DOM elements
 * This should be called AFTER the layout is built (e.g., in main.js initializeApp).
 */
export function init() {
    console.log("UI Updater: Initializing element references...");
    // Find elements *now* that the DOM should be ready
    controlsContainer = document.getElementById('controls-container');
    errorMessageDiv = document.getElementById('error-message');
    playOnceBtn = document.getElementById('play-once-btn');
    loopToggleBtn = document.getElementById('loop-toggle-btn');
    reverseToggleBtn = document.getElementById('reverse-toggle-btn');
    tempoSlider = document.getElementById('tempo-slider');
    tempoValueSpan = document.getElementById('tempo-value'); // Find the span
    pitchSlider = document.getElementById('pitch-slider');
    pitchValueSpan = document.getElementById('pitch-value'); // Find the span
    volumeSlider = document.getElementById('volume-slider');
    volumeValueSpan = document.getElementById('volume-value'); // Find the span
    multiplierSlider = document.getElementById('multiplier-slider');
    multiplierValueSpan = document.getElementById('multiplier-value'); // Find the span
    mainImage = document.getElementById('main-image');

    // Re-populate the list used for enabling/disabling
    controlElementsList = [
        playOnceBtn, loopToggleBtn, reverseToggleBtn,
        tempoSlider, pitchSlider, volumeSlider, multiplierSlider
    ].filter(el => el !== null); // Filter out any that might still be missing

    // Log found elements for debugging
    if (!controlsContainer) console.warn("UI Updater init: controlsContainer not found.");
    if (!tempoValueSpan) console.warn("UI Updater init: tempoValueSpan not found.");
    if (!pitchValueSpan) console.warn("UI Updater init: pitchValueSpan not found.");
    if (!volumeValueSpan) console.warn("UI Updater init: volumeValueSpan not found.");
    if (!multiplierValueSpan) console.warn("UI Updater init: multiplierValueSpan not found.");
    console.log(`UI Updater init: Found ${controlElementsList.length} control elements.`);
}

// --- Exported Function (Interface for main.js) ---
export function setControlsContainer(containerElement) {
    // This can still be used if main.js needs to set it explicitly,
    // but init() will also find it.
    if (containerElement instanceof HTMLElement) {
        controlsContainer = containerElement;
        console.log("UI Updater: Controls container reference updated via setControlsContainer.");
    } else {
        console.error("UI Updater: Invalid element passed to setControlsContainer.");
    }
}


// --- Internal Helper Functions ---
// updateValueDisplay can now rely on spanRef being valid if init() worked
function updateValueDisplay(spanRef, value, formatter = (v) => String(v), elementName = 'Value') {
     if (spanRef) {
         // Check if formatter is a function before calling
         if (typeof formatter === 'function') {
             spanRef.textContent = formatter(value);
         } else {
             console.error(`Invalid formatter provided for ${elementName}`);
             spanRef.textContent = value; // Fallback to raw value
         }
     } else {
         // This warning is now more critical if it appears after init()
         console.warn(`UpdateValueDisplay: Span element reference is missing for ${elementName}. Was UI Updater initialized correctly?`);
     }
}

function updateToggleButton(buttonRef, isActive, textPrefix) {
     if (buttonRef) {
         buttonRef.textContent = `${textPrefix}: ${isActive ? 'On' : 'Off'}`;
         buttonRef.classList.toggle('active', !!isActive);
     } else {
          console.warn(`UpdateToggleButton: Button element reference is missing for "${textPrefix}"`);
     }
}

function setControlsDisabledState(isDisabled) {
    // Check controlsContainer validity each time
    const container = controlsContainer || document.getElementById('controls-container');
    if (container) {
         container.classList.toggle('disabled', isDisabled);
    } else {
         console.warn(`SetControlsDisabledState: Controls container element not found! Cannot toggle class.`);
    }
    // Use the populated list
    controlElementsList.forEach(el => {
        if (el) el.disabled = isDisabled; // Add extra null check inside loop
    });
     // console.log(`Controls ${isDisabled ? 'disabled' : 'enabled'}. List size: ${controlElementsList.length}`);
}


// --- Exported UI Update Functions ---
// These now use the module-level variables populated by init()
export function updateTempoDisplay(bpm) {
    updateValueDisplay(tempoValueSpan, bpm, String, 'Tempo'); // Simplify formatter
}
export function updatePitchDisplay(rate) {
     updateValueDisplay(pitchValueSpan, rate, (v) => `${Math.round(v * 100)}`, 'Pitch');
}
export function updateVolumeDisplay(level) {
    updateValueDisplay(volumeValueSpan, level, (v) => `${Math.round(v * 100)}`, 'Volume');
}
export function updateLoopButton(isLooping) {
     updateToggleButton(loopToggleBtn, isLooping, 'Play Loop');
}
export function updateReverseButton(isReversed) {
     updateToggleButton(reverseToggleBtn, isReversed, 'Reverse');
}
export function updateScheduleMultiplierDisplay(multiplier) {
    updateValueDisplay(multiplierValueSpan, multiplier, (v) => `x${v}`, 'Multiplier');
}

export function enableControls() {
    setControlsDisabledState(false);
}
export function disableControls() {
    setControlsDisabledState(true);
}

export function showError(message) {
    // Lookup errorMessageDiv each time for robustness, or rely on init()
    const errorDiv = errorMessageDiv || document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = message ? 'block' : 'none';
        // Avoid logging the error twice if it came from console.error elsewhere
        // console.error("UI Error Displayed:", message);
    } else {
        console.error("UI Error (Error message div not found!):", message);
    }
}
export function clearError() {
    const errorDiv = errorMessageDiv || document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }
}

export function setImageSource(src) {
    // Lookup image each time or rely on init()
    const img = mainImage || document.getElementById('main-image');
    if (img) {
        img.src = src;
        img.style.visibility = 'visible'; // Make visible only when src is set
    } else {
        console.error("setImageSource: Main image element not found");
    }
}


// --- END OF FILE uiUpdater.js ---