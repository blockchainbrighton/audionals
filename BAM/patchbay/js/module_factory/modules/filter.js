// js/module_factory/modules/filter.js
import { createSlider } from '../ui/slider.js'; // Ensure this path is correct

/**
 * Creates a BiquadFilterNode and its UI.
 * @param {AudioContext} audioCtx - The AudioContext.
 * @param {HTMLElement} parentEl - The module's main DOM element to append UI to.
 * @param {string} id - The unique ID for this module instance.
 * @returns {object} An object containing the audioNode, id, and dispose method.
 */
export function createFilterModule(audioCtx, parentEl, id) {
  // 1. Audio Node Setup
  const audioNode = audioCtx.createBiquadFilter();
  audioNode.type = "lowpass"; // Default type
  audioNode.frequency.setValueAtTime(500, audioCtx.currentTime); // Default frequency
  audioNode.Q.setValueAtTime(1, audioCtx.currentTime);           // Default Q
  // Gain is only used for lowshelf, highshelf, peaking. Default is 0dB.
  // audioNode.gain.setValueAtTime(0, audioCtx.currentTime);

  // 2. UI Elements Management
  const uiElements = []; // Store all top-level UI elements created by this module

  // 3. Create Module Title
  const titleEl = Object.assign(document.createElement('h3'), {
    textContent: `Filter ${id}`
  });
  parentEl.appendChild(titleEl);
  uiElements.push(titleEl);

  // 4. Create Filter Type Selector
  const typeSelectorWrapper = document.createElement('div');
  typeSelectorWrapper.className = 'filter-type-selector-container setting-group'; // Add a class for styling

  const typeLabel = Object.assign(document.createElement('label'), {
    textContent: 'Type:',
    htmlFor: `filter-type-${id}` // Use module id for unique htmlFor
  });

  const typeSelector = Object.assign(document.createElement('select'), {
    id: `filter-type-${id}`
  });

  const filterTypes = ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch", "allpass"];
  filterTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    if (type === audioNode.type) option.selected = true;
    typeSelector.appendChild(option);
  });

  typeSelector.addEventListener('change', () => {
    audioNode.type = typeSelector.value;
    // Future enhancement: Enable/disable Gain slider based on type
    // const gainSlider = uiElements.find(el => el.dataset.param === 'gain');
    // if (gainSlider) {
    //   const isGainRelevant = ['lowshelf', 'highshelf', 'peaking'].includes(audioNode.type);
    //   gainSlider.style.display = isGainRelevant ? '' : 'none';
    // }
  });

  typeSelectorWrapper.append(typeLabel, typeSelector);
  parentEl.appendChild(typeSelectorWrapper);
  uiElements.push(typeSelectorWrapper);

  // 5. Create Sliders using the shared function

  // Frequency Control
  const freqSliderWrapper = createSlider({
    parent: parentEl,
    labelText: 'Frequency',
    min: 20,
    max: audioCtx.sampleRate / 2, // Nyquist frequency
    step: 1,
    value: audioNode.frequency.value,
    unit: 'Hz',
    decimalPlaces: 0,
    onInput: (newValue) => {
      // Use setTargetAtTime for smoother transitions if a small time constant is desired
      // audioNode.frequency.setTargetAtTime(newValue, audioCtx.currentTime, 0.01);
      audioNode.frequency.setValueAtTime(newValue, audioCtx.currentTime);
    }
  });
  freqSliderWrapper.dataset.param = 'frequency'; // For potential future access
  uiElements.push(freqSliderWrapper);

  // Q Factor Control
  const qSliderWrapper = createSlider({
    parent: parentEl,
    labelText: 'Q Factor',
    min: 0.0001,
    max: 30, // Adjusted max for more practical range, can go higher if needed
    step: 0.01,
    value: audioNode.Q.value,
    unit: '',
    decimalPlaces: 2,
    onInput: (newValue) => {
      audioNode.Q.setValueAtTime(newValue, audioCtx.currentTime);
    }
  });
  qSliderWrapper.dataset.param = 'q';
  uiElements.push(qSliderWrapper);

  // Optional: Gain Control (for lowshelf, highshelf, peaking)
  // By default, let's add it and hide it if not applicable, or you can choose to not add it.
  const gainSliderWrapper = createSlider({
    parent: parentEl,
    labelText: 'Gain',
    min: -40, // dB
    max: 40,  // dB
    step: 0.1,
    value: audioNode.gain.value, // This is 0dB by default
    unit: 'dB',
    decimalPlaces: 1,
    onInput: (newValue) => {
      audioNode.gain.setValueAtTime(newValue, audioCtx.currentTime);
    }
  });
  gainSliderWrapper.dataset.param = 'gain';
  uiElements.push(gainSliderWrapper);

  // Initially hide gain slider if filter type doesn't use it
  const updateGainSliderVisibility = () => {
    const isGainRelevant = ['lowshelf', 'highshelf', 'peaking'].includes(audioNode.type);
    gainSliderWrapper.style.display = isGainRelevant ? '' : 'none';
  };
  typeSelector.addEventListener('change', updateGainSliderVisibility); // Update on type change
  updateGainSliderVisibility(); // Initial check


  // 6. Return Module API
  return {
    id,
    audioNode: audioNode,
    // Expose params if direct manipulation or LFO connection is desired
    params: {
        frequency: audioNode.frequency,
        q: audioNode.Q,
        gain: audioNode.gain,
        // 'type' is not an AudioParam, so it's handled via the select element
    },
    dispose() {
      // Disconnect audio node
      audioNode.disconnect();

      // Remove UI elements
      uiElements.forEach(el => {
        if (el && el.parentNode) {
          el.remove();
        }
      });
      console.log(`Filter module ${id} disposed.`);
    }
  };
}