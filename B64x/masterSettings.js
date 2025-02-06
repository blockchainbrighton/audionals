// masterSettings.js

const bpmSlider = document.getElementById('bpm-slider');
const bpmDisplay = document.getElementById('bpm-display');

// Initialize BPM from global settings
const initialBPM = parseFloat(window.unifiedSequencerSettings.getBPM());
console.log(`Initial BPM from global settings: ${initialBPM}`);
bpmSlider.value = initialBPM;
bpmDisplay.value = initialBPM;

/**
 * Updates the global BPM and logs the update.
 * @param {number|string} bpm - The new BPM value.
 */
function updateGlobalBPM(bpm) {
    // Convert bpm to a number with two decimals
    const newBPM = parseFloat(bpm).toFixed(1);
    window.unifiedSequencerSettings.setBPM(newBPM);
    console.log(`Global BPM updated to: ${newBPM}`);
    return newBPM;
}

// When the slider is moved
bpmSlider.addEventListener('input', () => {
    // Parse and fix the value to two decimal places
    const newBPM = parseFloat(bpmSlider.value).toFixed(1);
    // Update the number input to reflect the new BPM
    bpmDisplay.value = newBPM;
    // Update global BPM settings
    updateGlobalBPM(newBPM);
    console.log(`Updated BPM from slider: ${newBPM}`);
    // Send BPM update to external modules if necessary
    emitMessage('BPMUpdate', newBPM);
});

// When the number input is changed (user edits directly)
bpmDisplay.addEventListener('change', () => {
    const newBPM = parseFloat(bpmDisplay.value).toFixed(1);
    // Update the slider to reflect the new BPM
    bpmSlider.value = newBPM;
    // Update global BPM settings
    updateGlobalBPM(newBPM);
    console.log(`Updated BPM from number input: ${newBPM}`);
    emitMessage('BPMUpdate', newBPM);
});