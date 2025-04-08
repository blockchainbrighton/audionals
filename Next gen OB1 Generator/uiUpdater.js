// --- DOM Elements ---
const controlsContainer = document.getElementById('controls-container');
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

// --- UI Update Functions ---

export function updateTempoDisplay(bpm) {
    tempoValueSpan.textContent = bpm;
}

export function updatePitchDisplay(rate) {
    pitchValueSpan.textContent = Math.round(rate * 100); // Display as percentage
}

export function updateVolumeDisplay(level) {
    volumeValueSpan.textContent = Math.round(level * 100); // Display as percentage
}

export function updateLoopButton(isLooping) {
    loopToggleBtn.textContent = `Play Loop: ${isLooping ? 'On' : 'Off'}`;
    loopToggleBtn.classList.toggle('active', isLooping);
}

export function updateReverseButton(isReversed) {
    reverseToggleBtn.textContent = `Reverse: ${isReversed ? 'On' : 'Off'}`;
    reverseToggleBtn.classList.toggle('active', isReversed);
}

export function enableControls() {
    controlsContainer.classList.remove('disabled');
    playOnceBtn.disabled = false;
    loopToggleBtn.disabled = false;
    reverseToggleBtn.disabled = false;
    tempoSlider.disabled = false;
    pitchSlider.disabled = false;
    volumeSlider.disabled = false;
    // Keep image clickable regardless? Or follow general disabled state?
    // mainImage.style.cursor = 'pointer'; // Ensure cursor is pointer
}

export function disableControls() {
    controlsContainer.classList.add('disabled');
    playOnceBtn.disabled = true;
    loopToggleBtn.disabled = true;
    reverseToggleBtn.disabled = true;
    tempoSlider.disabled = true;
    pitchSlider.disabled = true;
    volumeSlider.disabled = true;
    // mainImage.style.cursor = 'not-allowed';
}

export function showError(message) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.style.display = message ? 'block' : 'none';
    console.error("Error Displayed:", message); // Also log to console
}

export function clearError() {
    errorMessageDiv.textContent = '';
    errorMessageDiv.style.display = 'none';
}

export function setImageSource(src) {
    if (mainImage) {
        mainImage.src = src;
    } else {
        console.error("Image element not found");
    }
}