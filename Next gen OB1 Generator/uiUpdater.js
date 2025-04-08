// --- DOM Elements ---
// Use 'let' so it can be reassigned by setControlsContainer if needed,
// but initialize it here so the module works even if the function isn't called.
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

// --- NEW Function ---
/**
 * Allows external modules (like main.js) to explicitly set the
 * reference to the main controls container element.
 * @param {HTMLElement} containerElement - The DOM element for the controls container.
 */
export function setControlsContainer(containerElement) {
    // Basic validation: Check if it's a valid HTML element
    if (containerElement instanceof HTMLElement) {
        controlsContainer = containerElement;
        console.log("UI Updater: Controls container reference received from main.js.");
    } else {
        console.error("UI Updater: Invalid element passed to setControlsContainer. Using internally found element if available.");
        // Optionally fall back to finding it again if it wasn't found initially
        if (!controlsContainer) {
             controlsContainer = document.getElementById('controls-container');
        }
    }
}
// --- End NEW Function ---


// --- UI Update Functions ---

export function updateTempoDisplay(bpm) {
    if (tempoValueSpan) {
        tempoValueSpan.textContent = bpm;
    } else { console.warn("Tempo value span not found"); }
}

export function updatePitchDisplay(rate) {
     if (pitchValueSpan) {
        pitchValueSpan.textContent = Math.round(rate * 100); // Display as percentage
     } else { console.warn("Pitch value span not found"); }
}

export function updateVolumeDisplay(level) {
    if (volumeValueSpan) {
        volumeValueSpan.textContent = Math.round(level * 100); // Display as percentage
    } else { console.warn("Volume value span not found"); }
}

export function updateLoopButton(isLooping) {
    if (loopToggleBtn) {
        loopToggleBtn.textContent = `Play Loop: ${isLooping ? 'On' : 'Off'}`;
        loopToggleBtn.classList.toggle('active', isLooping === true); // Explicitly check boolean true
    } else { console.warn("Loop toggle button not found"); }
}

export function updateReverseButton(isReversed) {
     if (reverseToggleBtn) {
        reverseToggleBtn.textContent = `Reverse: ${isReversed ? 'On' : 'Off'}`;
        reverseToggleBtn.classList.toggle('active', isReversed === true); // Explicitly check boolean true
     } else { console.warn("Reverse toggle button not found"); }
}

export function enableControls() {
    // Add checks to ensure elements exist before modifying them
    if (!controlsContainer) { console.error("EnableControls: Controls container not found!"); return; }
    controlsContainer.classList.remove('disabled');

    if (playOnceBtn) playOnceBtn.disabled = false; else console.warn("EnableControls: Play Once button not found.");
    if (loopToggleBtn) loopToggleBtn.disabled = false; else console.warn("EnableControls: Loop Toggle button not found.");
    if (reverseToggleBtn) reverseToggleBtn.disabled = false; else console.warn("EnableControls: Reverse Toggle button not found.");
    if (tempoSlider) tempoSlider.disabled = false; else console.warn("EnableControls: Tempo slider not found.");
    if (pitchSlider) pitchSlider.disabled = false; else console.warn("EnableControls: Pitch slider not found.");
    if (volumeSlider) volumeSlider.disabled = false; else console.warn("EnableControls: Volume slider not found.");
}

export function disableControls() {
    if (!controlsContainer) { console.error("DisableControls: Controls container not found!"); return; }
    controlsContainer.classList.add('disabled');

    if (playOnceBtn) playOnceBtn.disabled = true; else console.warn("DisableControls: Play Once button not found.");
    if (loopToggleBtn) loopToggleBtn.disabled = true; else console.warn("DisableControls: Loop Toggle button not found.");
    if (reverseToggleBtn) reverseToggleBtn.disabled = true; else console.warn("DisableControls: Reverse Toggle button not found.");
    if (tempoSlider) tempoSlider.disabled = true; else console.warn("DisableControls: Tempo slider not found.");
    if (pitchSlider) pitchSlider.disabled = true; else console.warn("DisableControls: Pitch slider not found.");
    if (volumeSlider) volumeSlider.disabled = true; else console.warn("DisableControls: Volume slider not found.");
}

export function showError(message) {
    if (errorMessageDiv) {
        errorMessageDiv.textContent = message;
        // Use visibility or opacity for smoother transitions if needed,
        // but display: block/none is functional.
        errorMessageDiv.style.display = message ? 'block' : 'none';
    } else {
        console.error("Error message div not found! Cannot display:", message);
        return; // Exit if the error element isn't there
    }
    console.error("UI Error Displayed:", message); // Log to console regardless
}


export function clearError() {
    if (errorMessageDiv) {
        errorMessageDiv.textContent = '';
        errorMessageDiv.style.display = 'none';
    } else { console.warn("Error message div not found for clearing."); }
}

export function setImageSource(src) {
    if (mainImage) {
        mainImage.src = src;
    } else {
        console.error("setImageSource: Main image element not found");
    }
}

// Add null checks to element references at the top (optional but safer)
if (!controlsContainer) console.error("UI Updater: Initial controlsContainer element not found!");
if (!errorMessageDiv) console.error("UI Updater: Initial errorMessageDiv element not found!");
// ... add similar checks for other essential elements if desired ...