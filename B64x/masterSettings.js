// masterSettings.js

const bpmSlider = document.getElementById('bpm-slider');
const bpmDisplay = document.getElementById('bpm-display');

// Initialize BPM from global settings (parsing as float for decimals)
const initialBPM = parseFloat(window.unifiedSequencerSettings.getBPM());
bpmSlider.value = initialBPM;
bpmDisplay.value = initialBPM.toFixed(1);

/**
 * Updates the global BPM and logs the update.
 * @param {number|string} bpm - The new BPM value.
 */
function updateGlobalBPM(bpm) {
    const newBPM = parseFloat(bpm).toFixed(1);
    window.unifiedSequencerSettings.setBPM(newBPM);
    console.log(`Global BPM updated to: ${newBPM}`);
    return newBPM;
}

// When the slider is moved
bpmSlider.addEventListener('input', () => {
    const newBPM = parseFloat(bpmSlider.value).toFixed(1);
    bpmDisplay.value = newBPM;
    updateGlobalBPM(newBPM);
    emitMessage('BPMUpdate', newBPM);
  });
  
  // When the number input is changed (user edits directly)
  bpmDisplay.addEventListener('change', () => {
    const newBPM = parseFloat(bpmDisplay.value).toFixed(1);
    bpmSlider.value = newBPM;
    updateGlobalBPM(newBPM);
    emitMessage('BPMUpdate', newBPM);
  });