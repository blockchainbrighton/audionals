// js/module_factory/module_audio_and_ui.js
import { audioCtx } from '../../audio_context.js';

/**
 * Creates the AudioNode and associated UI for a given module type.
 * @param {string} type - The type of the module ('oscillator', 'gain', 'output', 'filter', 'lfo').
 * @param {HTMLElement} parentElement - The module's main DOM element to append UI to.
 * @returns {AudioNode|AudioDestinationNode|null} The created AudioNode or null if type is unknown.
 */
export function createAudioNodeAndUI(type, parentElement) {
  let audioNode;

  if (type === 'oscillator') {
    audioNode = audioCtx.createOscillator();
    audioNode.frequency.value = 440;
    audioNode.start();
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 20;
    slider.max = 2000;
    slider.value = 440;
    slider.addEventListener('input', () => audioNode.frequency.value = parseFloat(slider.value));
    const label = document.createElement('label');
    label.textContent = 'Freq:';
    parentElement.appendChild(label);
    parentElement.appendChild(slider);

  } else if (type === 'gain') {
    audioNode = audioCtx.createGain();
    audioNode.gain.value = 0.5;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = 1;
    slider.step = 0.01;
    slider.value = 0.5;
    slider.addEventListener('input', () => audioNode.gain.value = parseFloat(slider.value));
    const label = document.createElement('label');
    label.textContent = 'Gain:';
    parentElement.appendChild(label);
    parentElement.appendChild(slider);

  } else if (type === 'filter') {
    audioNode = audioCtx.createBiquadFilter();
    audioNode.type = "lowpass";
    audioNode.frequency.value = 500;
    audioNode.Q.value = 1;

    const freqSlider = document.createElement('input');
    freqSlider.type = 'range';
    freqSlider.min = 20;
    freqSlider.max = audioCtx.sampleRate / 2;
    freqSlider.value = 500;
    freqSlider.step = 1;
    freqSlider.addEventListener('input', () => audioNode.frequency.value = parseFloat(freqSlider.value));
    const freqLabel = document.createElement('label');
    freqLabel.textContent = 'Cutoff:';
    parentElement.appendChild(freqLabel);
    parentElement.appendChild(freqSlider);

    const qSlider = document.createElement('input');
    qSlider.type = 'range';
    qSlider.min = 0.0001;
    qSlider.max = 20;
    qSlider.value = 1;
    qSlider.step = 0.1;
    qSlider.addEventListener('input', () => audioNode.Q.value = parseFloat(qSlider.value));
    const qLabel = document.createElement('label');
    qLabel.textContent = 'Q:';
    parentElement.appendChild(qLabel);
    parentElement.appendChild(qSlider);

  } else if (type === 'lfo') {
    audioNode = audioCtx.createOscillator(); // LFO is an oscillator
    audioNode.frequency.value = 5; // Default LFO rate (e.g., 5 Hz)
    audioNode.start();

    // LFO Rate Slider
    const rateSlider = document.createElement('input');
    rateSlider.type = 'range';
    rateSlider.min = 0.1; // Very slow
    rateSlider.max = 20;  // Up to 20 Hz (can go higher if desired)
    rateSlider.value = 5;
    rateSlider.step = 0.1;
    rateSlider.addEventListener('input', () => audioNode.frequency.value = parseFloat(rateSlider.value));
    const rateLabel = document.createElement('label');
    rateLabel.textContent = 'Rate:';
    parentElement.appendChild(rateLabel);
    parentElement.appendChild(rateSlider);

    // LFO Depth/Amount (Gain node to scale LFO output)
    // The LFO's oscillator output is typically -1 to 1.
    // We often want to scale this before applying it to a parameter.
    // So, LFO's actual "output" node for connection will be a GainNode.
    const lfoDepth = audioCtx.createGain();
    lfoDepth.gain.value = 100; // e.g., for frequency modulation, a depth of 100 means +/- 100Hz
    audioNode.connect(lfoDepth); // Oscillator connects to the Depth GainNode
    // The 'lfoDepth' GainNode becomes the effective output of the LFO module
    // So, we return lfoDepth as the audioNode to be connected from.
    // To keep track of the original oscillator for rate changes, we can store it.
    // However, for simplicity of the `modules[id].audioNode` structure,
    // we'll make the `lfoDepth` the primary `audioNode` for connection purposes.
    // The `audioNode` (oscillator) is still controlled by the slider.

    const depthSlider = document.createElement('input');
    depthSlider.type = 'range';
    depthSlider.min = 0;
    depthSlider.max = 500; // Adjust max depth as needed (e.g., for freq mod)
    depthSlider.value = 100;
    depthSlider.step = 1;
    depthSlider.addEventListener('input', () => lfoDepth.gain.value = parseFloat(depthSlider.value));
    const depthLabel = document.createElement('label');
    depthLabel.textContent = 'Depth:';
    parentElement.appendChild(depthLabel);
    parentElement.appendChild(depthSlider);

    return lfoDepth; // Return the GainNode as the LFO's connectable output

  } else if (type === 'output') {
    audioNode = audioCtx.destination;
  } else {
    console.error("Unknown module type for audio/UI:", type);
    return null;
  }
  return audioNode;
}