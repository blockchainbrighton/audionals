// --- START OF FILE uiUpdater.js ---

// --- DOM Elements (Looked up internally) ---
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
// --- >>> NEW: Multiplier Slider Lookup <<< ---
const multiplierSlider = document.getElementById('multiplier-slider');
// --- >>> END NEW <<< ---
const multiplierValueSpan = document.getElementById('multiplier-value'); // Already existed for text display

const mainImage = document.getElementById('main-image');

// List of control elements found internally, used for enable/disable helper
// Filter out nulls in case elements don't exist in the DOM
// --- >>> ADDED multiplierSlider to the list <<< ---
const controlElementsList = [
    playOnceBtn,
    loopToggleBtn,
    reverseToggleBtn,
    tempoSlider,
    pitchSlider,
    volumeSlider,
    multiplierSlider, // Add the new slider here
].filter(el => el !== null);
// --- >>> END ADDITION <<< ---

// --- Exported Function (Interface for main.js) ---
// setControlsContainer function remains the same...
export function setControlsContainer(containerElement) {
    if (containerElement instanceof HTMLElement) {
        controlsContainer = containerElement;
        console.log("UI Updater: Controls container reference updated via setControlsContainer.");
    } else {
        console.error("UI Updater: Invalid element passed to setControlsContainer. Internal reference unchanged.");
    }
}


// --- Internal Helper Functions ---
// updateValueDisplay remains the same...
function updateValueDisplay(spanRef, value, formatter = (v) => String(v), elementName = 'Value') {
     if (spanRef) {
         spanRef.textContent = formatter(value);
     } else {
         console.warn(`UpdateValueDisplay: Span element not found for ${elementName}.`);
     }
}
// updateToggleButton remains the same...
function updateToggleButton(buttonRef, isActive, textPrefix) {
     if (buttonRef) {
         buttonRef.textContent = `${textPrefix}: ${isActive ? 'On' : 'Off'}`;
         buttonRef.classList.toggle('active', !!isActive);
     } else {
          console.warn(`UpdateToggleButton: Button element not found for prefix "${textPrefix}"`);
     }
}
// setControlsDisabledState remains the same (it now includes multiplierSlider via the list)...
function setControlsDisabledState(isDisabled) {
    if (controlsContainer) {
         controlsContainer.classList.toggle('disabled', isDisabled);
    } else {
         console.warn(`SetControlsDisabledState: Controls container element not found! Cannot toggle class.`);
    }
    controlElementsList.forEach(el => {
        el.disabled = isDisabled;
    });
     console.log(`Controls ${isDisabled ? 'disabled' : 'enabled'}. Found ${controlElementsList.length} controls.`);
}


// --- Exported UI Update Functions ---
// Tempo, Pitch, Volume, Loop, Reverse functions remain the same...
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

// enable/disable functions remain the same...
export function enableControls() {
    setControlsDisabledState(false);
}
export function disableControls() {
    setControlsDisabledState(true);
}

// Error handling functions remain the same...
export function showError(message) {
    if (errorMessageDiv) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = message ? 'block' : 'none';
        console.error("UI Error Displayed:", message);
    } else {
        console.error("UI Error (Error message div not found!):", message);
    }
}
export function clearError() {
    if (errorMessageDiv) {
        errorMessageDiv.textContent = '';
        errorMessageDiv.style.display = 'none';
    } else {
        console.warn("clearError: Error message div not found.");
    }
}

// setImageSource remains the same...
export function setImageSource(src) {
    if (mainImage) {
        mainImage.src = src;
        mainImage.style.visibility = 'visible';
    } else {
        console.error("setImageSource: Main image element not found");
    }
}

// --- >>> updateScheduleMultiplierDisplay remains the same (targets the SPAN) <<< ---
export function updateScheduleMultiplierDisplay(multiplier) {
    updateValueDisplay(multiplierValueSpan, multiplier, (v) => `x${v}`, 'Multiplier');
}
// --- >>> END <<< ---


// Initial checks log...
if (!controlsContainer) console.warn("UI Updater: Initial lookup failed for controlsContainer.");
if (!errorMessageDiv) console.warn("UI Updater: Initial lookup failed for errorMessageDiv.");
if (!mainImage) console.warn("UI Updater: Initial lookup failed for mainImage.");
// --- >>> Log if the new slider was found <<< ---
if (!multiplierSlider) console.warn("UI Updater: Initial lookup failed for multiplierSlider.");
// --- >>> END <<< ---
console.log(`UI Updater: Initialized. Found ${controlElementsList.length} control elements internally.`);

// --- END OF FILE uiUpdater.js ---