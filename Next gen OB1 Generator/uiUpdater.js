// --- START OF FILE uiUpdater.js ---

// --- DOM Elements (Looked up internally) ---
// Use 'let' for controlsContainer as it can be updated by setControlsContainer
let controlsContainer = document.getElementById('controls-container');
const errorMessageDiv = document.getElementById('error-message');
const playOnceBtn = document.getElementById('play-once-btn');
const loopToggleBtn = document.getElementById('loop-toggle-btn');
const reverseToggleBtn = document.getElementById('reverse-toggle-btn');
const tempoSlider = document.getElementById('tempo-slider');
const tempoValueSpan = document.getElementById('tempo-value');
const pitchSlider = document.getElementById('pitch-slider');
const pitchValueSpan = document.getElementById('pitch-value');
const volumeSlider = document.getElementById('volume-slider');
const volumeValueSpan = document.getElementById('volume-value');
const mainImage = document.getElementById('main-image');

// List of control elements found internally, used for enable/disable helper
// Filter out nulls in case elements don't exist in the DOM
const controlElementsList = [
    playOnceBtn,
    loopToggleBtn,
    reverseToggleBtn,
    tempoSlider,
    pitchSlider,
    volumeSlider,
].filter(el => el !== null); // Use filter(Boolean) or filter(el => el) as shorthand

// --- Exported Function (Interface for main.js) ---
/**
 * Allows external modules (like main.js) to explicitly set the
 * reference to the main controls container element. This maintains
 * compatibility with the original design.
 * @param {HTMLElement} containerElement - The DOM element for the controls container.
 */
export function setControlsContainer(containerElement) {
    // Basic validation: Check if it's a valid HTML element
    if (containerElement instanceof HTMLElement) {
        controlsContainer = containerElement; // Update the module-level reference
        console.log("UI Updater: Controls container reference updated via setControlsContainer.");
    } else {
        console.error("UI Updater: Invalid element passed to setControlsContainer. Internal reference unchanged.");
        // No need to find it again here, as it was already looked up initially.
    }
}

// --- Internal Helper Functions ---

/**
 * Generic helper to update the text content of a value display span,
 * optionally applying a formatting function. Uses internally found elements.
 * @param {HTMLElement | null} spanRef - Reference to the span element.
 * @param {*} value - The raw value to display.
 * @param {function(any): string} [formatter=(v) => String(v)] - Function to format the value for display.
 * @param {string} [elementName='Value'] - Name of the element for logging warnings.
 */
function updateValueDisplay(spanRef, value, formatter = (v) => String(v), elementName = 'Value') {
     if (spanRef) { // Check if element exists
         spanRef.textContent = formatter(value);
     } else {
         console.warn(`UpdateValueDisplay: Span element not found for ${elementName}.`);
     }
}

/**
 * Generic helper to update the state (text and class) of a toggle button. Uses internally found elements.
 * @param {HTMLButtonElement | null} buttonRef - Reference to the button element.
 * @param {boolean} isActive - The state of the toggle (true = active/on).
 * @param {string} textPrefix - The text to display before "On" or "Off".
 */
function updateToggleButton(buttonRef, isActive, textPrefix) {
     if (buttonRef) { // Check if element exists
         buttonRef.textContent = `${textPrefix}: ${isActive ? 'On' : 'Off'}`;
         buttonRef.classList.toggle('active', !!isActive); // Ensure boolean check for class toggle
     } else {
          console.warn(`UpdateToggleButton: Button element not found for prefix "${textPrefix}"`);
     }
}

/**
 * Internal helper to set the disabled state of all registered control elements
 * and toggle a class on the main controls container. Uses internally found elements.
 * @param {boolean} isDisabled - True to disable controls, false to enable.
 */
function setControlsDisabledState(isDisabled) {
    // Toggle class on the container first
    if (controlsContainer) { // Check if container exists (it might be null initially or after failed setControlsContainer)
         controlsContainer.classList.toggle('disabled', isDisabled);
    } else {
         // Log error but continue trying to disable individual controls
         console.warn(`SetControlsDisabledState: Controls container element not found! Cannot toggle class.`);
    }

    // Iterate over the validated list of control elements found internally
    controlElementsList.forEach(el => {
        // el is guaranteed non-null here because of the filter during list creation
        el.disabled = isDisabled;
    });
     console.log(`Controls ${isDisabled ? 'disabled' : 'enabled'}.`);
}

// --- Exported UI Update Functions (Using Helpers and Internal Elements) ---

export function updateTempoDisplay(bpm) {
    updateValueDisplay(tempoValueSpan, bpm, (v) => String(v), 'Tempo');
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

export function enableControls() {
    setControlsDisabledState(false); // Use helper
}

export function disableControls() {
    setControlsDisabledState(true); // Use helper
}

export function showError(message) {
    if (errorMessageDiv) { // Check if element exists
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = message ? 'block' : 'none';
        // Log only if the div was actually found and updated
        console.error("UI Error Displayed:", message);
    } else {
        // Log that the div is missing, plus the message that couldn't be shown
        console.error("UI Error (Error message div not found!):", message);
    }
}

export function clearError() {
    if (errorMessageDiv) { // Check if element exists
        errorMessageDiv.textContent = '';
        errorMessageDiv.style.display = 'none';
    } else {
        console.warn("clearError: Error message div not found.");
    }
}

export function setImageSource(src) {
    if (mainImage) { // Check if element exists
        mainImage.src = src;
    } else {
        console.error("setImageSource: Main image element not found");
    }
}

// Optional: Initial checks logged to console (can be removed if too verbose)
// These run only once when the module loads.
if (!controlsContainer) console.warn("UI Updater: Initial lookup failed for controlsContainer.");
if (!errorMessageDiv) console.warn("UI Updater: Initial lookup failed for errorMessageDiv.");
if (!mainImage) console.warn("UI Updater: Initial lookup failed for mainImage.");
console.log(`UI Updater: Initialized. Found ${controlElementsList.length} control elements internally.`);

// --- END OF FILE uiUpdater.js ---