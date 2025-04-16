// --- START OF FILE uiUpdater.js ---

// --- Module State ---
let controlsContainer, errorMessageDiv, playOnceBtn, loopToggleBtn, reverseToggleBtn, 
    tempoSlider, tempoValueSpan, pitchSlider, pitchValueSpan, volumeSlider, volumeValueSpan,
    multiplierSlider, multiplierValueSpan, mainImage;

let controlElementsList = [];

/**
 * Initializes the UI Updater by finding essential DOM elements
 * This should be called AFTER the layout is built.
 */
export function init() {
    console.log("UI Updater: Initializing element references...");
    
    // Store references
    controlsContainer = document.getElementById('controls-container');
    errorMessageDiv = document.getElementById('error-message');
    playOnceBtn = document.getElementById('play-once-btn');
    loopToggleBtn = document.getElementById('loop-toggle-btn');
    reverseToggleBtn = document.getElementById('reverse-toggle-btn');
    tempoSlider = document.getElementById('tempo-slider');
    tempoValueSpan = document.getElementById('tempo-value');
    pitchSlider = document.getElementById('pitch-slider');
    pitchValueSpan = document.getElementById('pitch-value');
    volumeSlider = document.getElementById('volume-slider');
    volumeValueSpan = document.getElementById('volume-value');
    multiplierSlider = document.getElementById('multiplier-slider');
    multiplierValueSpan = document.getElementById('multiplier-value');
    mainImage = document.getElementById('main-image');

    // Populate control elements list
    controlElementsList = [
        playOnceBtn, loopToggleBtn, reverseToggleBtn,
        tempoSlider, pitchSlider, volumeSlider, multiplierSlider
    ].filter(Boolean);

    // Log found elements for debugging
    controlElementsList.forEach(el => el || console.warn("Element not found."));
    console.log(`UI Updater init: Found ${controlElementsList.length} control elements.`);
}

// --- Exported Function ---
export function setControlsContainer(containerElement) {
    if (containerElement instanceof HTMLElement) {
        controlsContainer = containerElement;
        console.log("UI Updater: Controls container reference updated.");
    } else {
        console.error("UI Updater: Invalid element passed to setControlsContainer.");
    }
}

// --- Internal Helper Functions ---
const updateValueDisplay = (spanRef, value, formatter = String, elementName = 'Value') => {
    if (!spanRef) return console.warn(`Missing span for ${elementName}.`);
    spanRef.textContent = formatter(value);
};

const updateToggleButton = (buttonRef, isActive, textPrefix) => {
    if (!buttonRef) return console.warn(`Button missing for ${textPrefix}`);
    buttonRef.textContent = `${textPrefix}: ${isActive ? 'On' : 'Off'}`;
    buttonRef.classList.toggle('active', isActive);
};

const setControlsDisabledState = (isDisabled) => {
    const container = controlsContainer || document.getElementById('controls-container');
    if (container) {
        container.classList.toggle('disabled', isDisabled);
    } else {
        console.warn("Controls container not found!");
    }
    controlElementsList.forEach(el => el && (el.disabled = isDisabled));
};

// --- Exported UI Update Functions ---
export const updateTempoDisplay = bpm => updateValueDisplay(tempoValueSpan, bpm);
export const updatePitchDisplay = rate => updateValueDisplay(pitchValueSpan, rate, v => `${Math.round(v * 100)}`);
export const updateVolumeDisplay = level => updateValueDisplay(volumeValueSpan, level, v => `${Math.round(v * 100)}`);
export const updateLoopButton = isLooping => updateToggleButton(loopToggleBtn, isLooping, 'Play Loop');
export const updateReverseButton = isReversed => updateToggleButton(reverseToggleBtn, isReversed, 'Reverse');
export const updateScheduleMultiplierDisplay = multiplier => updateValueDisplay(multiplierValueSpan, multiplier, v => `x${v}`);

export const enableControls = () => setControlsDisabledState(false);
export const disableControls = () => setControlsDisabledState(true);

export const showError = message => {
    if (errorMessageDiv) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = message ? 'block' : 'none';
    } else {
        console.error("Error message div not found!");
    }
};

export const clearError = () => {
    if (errorMessageDiv) {
        errorMessageDiv.textContent = '';
        errorMessageDiv.style.display = 'none';
    }
};

export const setImageSource = (src) => {
    if (mainImage) {
        mainImage.src = src;
        mainImage.style.visibility = 'visible';
    } else {
        console.error("Main image element not found");
    }
};

// --- END OF FILE uiUpdater.js ---
