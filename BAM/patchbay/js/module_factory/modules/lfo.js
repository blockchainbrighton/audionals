// js/module_factory/modules/lfo.js
import { createSlider } from '../ui/slider.js'; // Import the shared slider

/**
 * Creates an LFO (OscillatorNode + GainNode for depth) and its UI.
 * @param {AudioContext} audioCtx - The AudioContext.
 * @param {HTMLElement} parentEl - The module's main DOM element to append UI to.
 * @param {string} id - The unique ID for this module instance.
 * @returns {object} An object containing the audioNode (lfoDepth), id, params, and dispose method.
 */
export function createLfoModule(audioCtx, parentEl, id) {
  // 1. Audio Nodes
  const lfoOscillator = audioCtx.createOscillator();
  lfoOscillator.type = 'sine'; // Default waveform
  lfoOscillator.frequency.setValueAtTime(5, audioCtx.currentTime); // Default LFO rate
  lfoOscillator.start();

  const lfoDepth = audioCtx.createGain(); // Controls LFO amplitude/depth
  lfoDepth.gain.setValueAtTime(100, audioCtx.currentTime); // Default depth (e.g., for freq mod +/- 100Hz)

  lfoOscillator.connect(lfoDepth); // Oscillator output scaled by depth

  // 2. UI Elements Management
  const uiElements = [];

  // 3. Create Module Title
  const titleEl = Object.assign(document.createElement('h3'), {
    textContent: `LFO ${id}`
  });
  parentEl.appendChild(titleEl);
  uiElements.push(titleEl);

  // 4. Create LFO Waveform Selector
  const waveformWrapper = document.createElement('div');
  waveformWrapper.className = 'lfo-waveform-selector setting-group';

  const waveformLabel = Object.assign(document.createElement('label'),{
    textContent: 'Wave:',
    htmlFor: `lfo-wave-${id}`
  });
  const waveformSelector = Object.assign(document.createElement('select'), {
    id: `lfo-wave-${id}`
  });
  const lfoTypes = ['sine', 'square', 'sawtooth', 'triangle'];
  lfoTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    if (type === lfoOscillator.type) option.selected = true;
    waveformSelector.appendChild(option);
  });
  waveformSelector.addEventListener('change', () => {
    lfoOscillator.type = waveformSelector.value;
  });
  waveformWrapper.append(waveformLabel, waveformSelector);
  parentEl.appendChild(waveformWrapper);
  uiElements.push(waveformWrapper);


  // 5. Create Sliders
  // LFO Rate Slider
  const rateSliderWrapper = createSlider({
    parent: parentEl,
    labelText: 'Rate',
    min: 0.01, max: 30, step: 0.01, // Adjusted range for LFO
    value: lfoOscillator.frequency.value,
    unit: 'Hz',
    decimalPlaces: 2,
    onInput: (newValue) => {
      lfoOscillator.frequency.setValueAtTime(newValue, audioCtx.currentTime);
    }
  });
  uiElements.push(rateSliderWrapper);

  // LFO Depth Slider
  const depthSliderWrapper = createSlider({
    parent: parentEl,
    labelText: 'Depth',
    min: 0, max: 1000, step: 1, // Max depth depends on typical target param range
    value: lfoDepth.gain.value,
    unit: '', // Unit depends on what it's modulating
    decimalPlaces: 0,
    onInput: (newValue) => {
      lfoDepth.gain.setValueAtTime(newValue, audioCtx.currentTime);
    }
  });
  uiElements.push(depthSliderWrapper);

  // 6. Return Module API
  return {
    id,
    audioNode: lfoDepth, // This is the node to connect FROM, to modulate other params
    params: {
      frequency: lfoOscillator.frequency, // Expose for direct connection/automation
      depth: lfoDepth.gain,             // Expose for direct connection/automation
      // 'type' is not an AudioParam, controlled by the select element
      setType: (newType) => { // Method to set type if needed externally
        if (lfoTypes.includes(newType)) {
          lfoOscillator.type = newType;
          waveformSelector.value = newType; // Update UI
        }
      }
    },
    dispose() {
      // Stop and disconnect audio nodes
      lfoOscillator.stop();
      lfoOscillator.disconnect();
      lfoDepth.disconnect();

      // Remove UI elements
      uiElements.forEach(el => el.remove());
      console.log(`LFO module ${id} disposed.`);
    }
  };
}