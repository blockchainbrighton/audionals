// --- START OF FILE uiUpdater.js ---

// --- uiUpdater.js ---

// Existing elements
let controlsContainer, errorMessageDiv, playOnceBtn, loopToggleBtn, reverseToggleBtn,
    tempoSlider, tempoValueSpan, pitchSlider, pitchValueSpan, volumeSlider, volumeValueSpan,
    multiplierSlider, multiplierValueSpan, mainImage;

// New effect elements
let delayTimeSlider, delayTimeValueSpan, delayFeedbackSlider, delayFeedbackValueSpan,
    filterTypeSelect, filterFrequencySlider, filterFrequencyValueSpan,
    filterQSlider, filterQValueSpan, filterGainSlider, filterGainValueSpan;

// Combined list for enabling/disabling
let controlElementsList = [];

export function init() {
    console.log("UI Updater: Initializing element references...");

    // Get existing elements
    controlsContainer = document.getElementById("controls-container");
    errorMessageDiv = document.getElementById("error-message");
    playOnceBtn = document.getElementById("play-once-btn");
    loopToggleBtn = document.getElementById("loop-toggle-btn");
    reverseToggleBtn = document.getElementById("reverse-toggle-btn");
    tempoSlider = document.getElementById("tempo-slider");
    tempoValueSpan = document.getElementById("tempo-value");
    pitchSlider = document.getElementById("pitch-slider");
    pitchValueSpan = document.getElementById("pitch-value");
    volumeSlider = document.getElementById("volume-slider");
    volumeValueSpan = document.getElementById("volume-value");
    multiplierSlider = document.getElementById("multiplier-slider");
    multiplierValueSpan = document.getElementById("multiplier-value");
    mainImage = document.getElementById("main-image");

    // Get new effect elements
    delayTimeSlider = document.getElementById("delay-time-slider");
    delayTimeValueSpan = document.getElementById("delay-time-value");
    delayFeedbackSlider = document.getElementById("delay-feedback-slider");
    delayFeedbackValueSpan = document.getElementById("delay-feedback-value");
    filterTypeSelect = document.getElementById("filter-type-select");
    filterFrequencySlider = document.getElementById("filter-freq-slider");
    filterFrequencyValueSpan = document.getElementById("filter-freq-value");
    filterQSlider = document.getElementById("filter-q-slider");
    filterQValueSpan = document.getElementById("filter-q-value");
    filterGainSlider = document.getElementById("filter-gain-slider");
    filterGainValueSpan = document.getElementById("filter-gain-value");

    // Populate the list of all controls that can be disabled/enabled
    controlElementsList = [
        playOnceBtn, loopToggleBtn, reverseToggleBtn,
        tempoSlider, pitchSlider, volumeSlider, multiplierSlider,
        delayTimeSlider, delayFeedbackSlider, filterTypeSelect,
        filterFrequencySlider, filterQSlider, filterGainSlider
    ].filter(Boolean); // Filter out any nulls if elements weren't found

    // Log found status for new elements
    if (!delayTimeSlider) console.warn("Element not found: delay-time-slider");
    if (!delayFeedbackSlider) console.warn("Element not found: delay-feedback-slider");
    if (!filterTypeSelect) console.warn("Element not found: filter-type-select");
    if (!filterFrequencySlider) console.warn("Element not found: filter-freq-slider");
    if (!filterQSlider) console.warn("Element not found: filter-q-slider");
    if (!filterGainSlider) console.warn("Element not found: filter-gain-slider");


    controlElementsList.forEach(el => {
        if (!el) console.warn("A control element was not found during UI Updater init.");
    });
    console.log(`UI Updater init: Found ${controlElementsList.length} control elements.`);
}

// Allow external setting if needed, though unlikely now with init
export function setControlsContainer(element) {
    if (element instanceof HTMLElement) {
        controlsContainer = element;
        console.log("UI Updater: Controls container reference updated.");
    } else {
        console.error("UI Updater: Invalid element passed to setControlsContainer.");
    }
}

// --- Private Helpers ---

const updateValueDisplay = (spanElement, value, formatter = String, controlName = "Value") => {
    if (!spanElement) {
        // console.warn(`Missing span for ${controlName}. Cannot update display.`);
        return;
    }
    try {
         spanElement.textContent = formatter(value);
    } catch (e) {
        console.error(`Error formatting value for ${controlName}:`, e);
        spanElement.textContent = "Err";
    }
};

const updateToggleButton = (buttonElement, isActive, baseText) => {
    if (!buttonElement) {
        console.warn(`Button missing for ${baseText}`);
        return;
    }
    buttonElement.textContent = `${baseText}: ${isActive ? "On" : "Off"}`;
    buttonElement.classList.toggle("active", isActive);
};

const setControlsDisabledState = (isDisabled) => {
    // Disable/enable the main container first
    const container = controlsContainer || document.getElementById("controls-container");
    if (container) {
        container.classList.toggle("disabled", isDisabled);
    } else {
        console.warn("Controls container not found! Cannot toggle disabled class.");
    }

    // Disable/enable individual controls
    controlElementsList.forEach(control => {
        if (control) {
            control.disabled = isDisabled;
        }
    });
     // console.log(`Controls ${isDisabled ? 'disabled' : 'enabled'}.`);
};

// --- Public Update Functions ---

// Existing Updaters
export const updateTempoDisplay = (value) => updateValueDisplay(tempoValueSpan, value);
export const updatePitchDisplay = (value) => updateValueDisplay(pitchValueSpan, value, v => `${parseFloat(v).toFixed(2)}`); // Show pitch multiplier more accurately
export const updateVolumeDisplay = (value) => updateValueDisplay(volumeValueSpan, value, v => `${Math.round(parseFloat(v) * 100)}`);
export const updateLoopButton = (isActive) => updateToggleButton(loopToggleBtn, isActive, "Play Loop");
export const updateReverseButton = (isActive) => updateToggleButton(reverseToggleBtn, isActive, "Reverse");
export const updateScheduleMultiplierDisplay = (value) => updateValueDisplay(multiplierValueSpan, value, v => `x${v}`);

// New Effect Updaters
export const updateDelayTimeDisplay = (value) => updateValueDisplay(delayTimeValueSpan, value, v => `${parseFloat(v).toFixed(2)}`); // Seconds with 2 decimal places
export const updateDelayFeedbackDisplay = (value) => updateValueDisplay(delayFeedbackValueSpan, value, v => `${Math.round(parseFloat(v) * 100)}`); // Percentage
// No display update needed for filter type (select shows it)
export const updateFilterFrequencyDisplay = (value) => updateValueDisplay(filterFrequencyValueSpan, value, v => `${Math.round(parseFloat(v))}`); // Hz, rounded
export const updateFilterQDisplay = (value) => updateValueDisplay(filterQValueSpan, value, v => `${parseFloat(v).toFixed(1)}`); // Q value with 1 decimal place
export const updateFilterGainDisplay = (value) => updateValueDisplay(filterGainValueSpan, value, v => `${parseFloat(v).toFixed(1)}`); // dB value with 1 decimal place


// --- General UI State ---

export const enableControls = () => setControlsDisabledState(false);
export const disableControls = () => setControlsDisabledState(true);

export const showError = (message) => {
    if (errorMessageDiv) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = message ? "block" : "none"; // Show only if message exists
    } else {
        console.error("Error message div not found! Message:", message);
    }
};

export const clearError = () => {
    if (errorMessageDiv) {
        errorMessageDiv.textContent = "";
        errorMessageDiv.style.display = "none";
    }
};

export const setImageSource = (src) => {
    if (mainImage) {
        mainImage.src = src;
        mainImage.style.visibility = "visible"; // Make visible once src is set
    } else {
        console.error("Main image element not found");
    }
};

// --- END OF FILE uiUpdater.js ---