// js/module_factory/modules/lfo.js

/**
 * Creates an LFO (OscillatorNode + GainNode for depth) and its UI.
 * @param {AudioContext} audioCtx - The AudioContext.
 * @param {HTMLElement} parentElement - The module's main DOM element to append UI to.
 * @returns {GainNode} The GainNode representing the LFO's output (depth controlled).
 */
export function createLfoModule(audioCtx, parentElement) {
    const lfoOscillator = audioCtx.createOscillator(); // This is the LFO's core oscillator
    lfoOscillator.frequency.value = 5; // Default LFO rate (e.g., 5 Hz)
    lfoOscillator.start();
  
    const lfoDepth = audioCtx.createGain(); // GainNode to control the LFO's amplitude/depth
    lfoDepth.gain.value = 100; // Default depth (e.g., for frequency modulation +/- 100Hz)
  
    lfoOscillator.connect(lfoDepth); // The oscillator's output is scaled by the lfoDepth GainNode
  
    // LFO Rate Slider
    const rateSlider = document.createElement('input');
    rateSlider.type = 'range';
    rateSlider.min = 0.1; // Very slow
    rateSlider.max = 20;  // Up to 20 Hz
    rateSlider.value = 5;
    rateSlider.step = 0.1;
    rateSlider.className = 'module-slider';
    rateSlider.addEventListener('input', () => lfoOscillator.frequency.value = parseFloat(rateSlider.value));
  
    const rateLabel = document.createElement('label');
    rateLabel.textContent = 'Rate:';
    rateLabel.htmlFor = rateSlider.id = `lfo-rate-${Math.random().toString(36).substring(7)}`;
  
    const rateValueDisplay = document.createElement('span');
    rateValueDisplay.textContent = rateSlider.value + ' Hz';
    rateSlider.addEventListener('input', () => rateValueDisplay.textContent = parseFloat(rateSlider.value).toFixed(1) + ' Hz');
  
    parentElement.appendChild(rateLabel);
    parentElement.appendChild(rateSlider);
    parentElement.appendChild(rateValueDisplay);
  
    // LFO Depth Slider
    const depthSlider = document.createElement('input');
    depthSlider.type = 'range';
    depthSlider.min = 0;
    depthSlider.max = 500; // Adjust max depth as needed
    depthSlider.value = 100;
    depthSlider.step = 1;
    depthSlider.className = 'module-slider';
    depthSlider.addEventListener('input', () => lfoDepth.gain.value = parseFloat(depthSlider.value));
  
    const depthLabel = document.createElement('label');
    depthLabel.textContent = 'Depth:';
    depthLabel.htmlFor = depthSlider.id = `lfo-depth-${Math.random().toString(36).substring(7)}`;
  
    const depthValueDisplay = document.createElement('span');
    depthValueDisplay.textContent = depthSlider.value;
    depthSlider.addEventListener('input', () => depthValueDisplay.textContent = depthSlider.value);
  
  
    parentElement.appendChild(depthLabel);
    parentElement.appendChild(depthSlider);
    parentElement.appendChild(depthValueDisplay);
  

    console.log('LFO Module: createLfoModule returning:', lfoDepth); // ADD THIS LOG

    // The lfoDepth GainNode is returned as the connectable output of the LFO module
    return { audioNode: lfoDepth /*, anyOtherLfoSpecificData */ };
  }