// lfo.js


let lfo; // Define LFO oscillator at a higher scope for broader control

function toggleLFO(primaryOscillator) {
    let lfoSwitch = document.getElementById('lfoSwitch').checked;
    if (lfoSwitch && !lfo) {
        startLFO(primaryOscillator); // Pass primaryOscillator as an argument
    } else if (lfo) {
        lfo.stop();
        lfo = null; // Clear the LFO after stopping it
    }
}

// Adjust your event listener setup as needed to provide the primaryOscillator
// This might involve restructuring how and where toggleLFO is called from

function startLFO(primaryOscillator) {
    lfo = audioContext.createOscillator();
    let lfoRate = parseFloat(document.getElementById('lfoRate').value);
    let lfoGain = audioContext.createGain();
    
    lfo.frequency.setValueAtTime(lfoRate, audioContext.currentTime); // Set LFO rate
    lfoGain.gain.setValueAtTime(15, audioContext.currentTime); // Example LFO intensity; adjust as needed
    
    lfo.connect(lfoGain);
    // Ensure primaryOscillator is available and connected correctly
    lfoGain.connect(primaryOscillator.frequency); // Apply LFO to primary oscillator frequency
    
    lfo.start();
}
