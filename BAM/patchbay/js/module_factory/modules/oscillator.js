// js/module_factory/modules/oscillator.js
import { createSlider } from '../ui/slider.js'; // Import the shared slider

/**
 * Creates an OscillatorNode, its UI, and allows its frequency to be modulated.
 * @param {AudioContext} audioCtx - The AudioContext.
 * @param {HTMLElement} parentEl - The module's main DOM element to append UI to.
 * @param {string} id - The unique ID for this module instance.
 * @returns {object} Module data including the audioNode, id, params, and dispose method.
 */
export function createOscillatorModule(audioCtx, parentEl, id) {
  // 1. Audio Nodes
  const mainOscillatorNode = audioCtx.createOscillator();

  // Internal ConstantSourceNode for manual frequency control via slider.
  // Its output is summed with any external modulation at mainOscillatorNode.frequency.
  const manualFrequencyControl = audioCtx.createConstantSource();
  manualFrequencyControl.offset.setValueAtTime(440, audioCtx.currentTime); // Default A4
  manualFrequencyControl.connect(mainOscillatorNode.frequency);
  manualFrequencyControl.start();

  mainOscillatorNode.type = 'sawtooth'; // Default waveform
  // mainOscillatorNode.frequency.value = 0; // This is important if using ConstantSource for base freq
                                         // The ConstantSource sets the base, LFOs add to it.
                                         // The .frequency AudioParam of the oscillator itself will sum all inputs.
  mainOscillatorNode.start();

  // 2. UI Elements Management
  const uiElements = [];

  // 3. Create Module Title
  const titleEl = Object.assign(document.createElement('h3'), {
    textContent: `Oscillator ${id}`
  });
  parentEl.appendChild(titleEl);
  uiElements.push(titleEl);

  // 4. Waveform Type Selector
  const waveformWrapper = document.createElement('div');
  waveformWrapper.className = 'osc-waveform-selector setting-group';

  const waveformLabel = Object.assign(document.createElement('label'),{
    textContent: 'Wave:',
    htmlFor: `osc-wave-${id}`
  });
  const waveformSelector = Object.assign(document.createElement('select'),{
    id: `osc-wave-${id}`
  });
  const oscillatorTypes = ['sine', 'square', 'sawtooth', 'triangle', 'custom']; // 'custom' for WaveTable
  oscillatorTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    if (type === mainOscillatorNode.type) option.selected = true;
    waveformSelector.appendChild(option);
  });
  waveformSelector.addEventListener('change', () => {
    mainOscillatorNode.type = waveformSelector.value;
    // If type is 'custom', you'd need logic to load/set a WaveTable
  });

  waveformWrapper.append(waveformLabel, waveformSelector);
  parentEl.appendChild(waveformWrapper);
  uiElements.push(waveformWrapper);

  // 5. Manual Frequency Slider
  const freqSliderWrapper = createSlider({
    parent: parentEl,
    labelText: 'Frequency',
    min: 20,    // Min audible/practical frequency
    max: 8000,  // Max frequency (adjust as needed, e.g., 20kHz for full range)
    step: 1,    // Whole Hz steps
    value: manualFrequencyControl.offset.value,
    unit: 'Hz',
    decimalPlaces: 0,
    onInput: (newValue) => {
      manualFrequencyControl.offset.setValueAtTime(newValue, audioCtx.currentTime);
    }
  });
  uiElements.push(freqSliderWrapper);

  // Optional: Detune Slider (semitones or cents)
  const detuneSliderWrapper = createSlider({
    parent: parentEl,
    labelText: 'Detune',
    min: -1200, // Cents (-12 semitones)
    max: 1200,  // Cents (+12 semitones)
    step: 1,    // Cents
    value: mainOscillatorNode.detune.value, // Default is 0 cents
    unit: 'cents',
    decimalPlaces: 0,
    onInput: (newValue) => {
      mainOscillatorNode.detune.setValueAtTime(newValue, audioCtx.currentTime);
    }
  });
  uiElements.push(detuneSliderWrapper);

  // 6. Return Module API
  return {
    id,
    audioNode: mainOscillatorNode, // Main output node. Its .frequency and .detune are primary targets.
    params: {
      frequency: mainOscillatorNode.frequency, // Modulate this directly to ADD to manualFrequencyControl
      detune: mainOscillatorNode.detune,
      // 'type' is not an AudioParam
      setType: (newType) => {
        if (oscillatorTypes.includes(newType)) {
            mainOscillatorNode.type = newType;
            waveformSelector.value = newType; // Update UI
        }
      },
      // Expose manual frequency if needed, though direct modulation of .frequency is preferred
      // manualFrequency: manualFrequencyControl.offset
    },
    dispose() {
      // Stop and disconnect audio nodes
      mainOscillatorNode.stop();
      mainOscillatorNode.disconnect();
      manualFrequencyControl.stop();
      manualFrequencyControl.disconnect();

      // Remove UI elements
      uiElements.forEach(el => el.remove());
      console.log(`Oscillator module ${id} disposed.`);
    }
  };
}