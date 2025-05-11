// js/module_factory/modules/filter.js

/**
 * Creates a BiquadFilterNode and its UI.
 * @param {AudioContext} audioCtx - The AudioContext.
 * @param {HTMLElement} parentElement - The module's main DOM element to append UI to.
 * @returns {BiquadFilterNode} The created BiquadFilterNode.
 */
export function createFilterModule(audioCtx, parentElement) {
    const audioNode = audioCtx.createBiquadFilter();
    audioNode.type = "lowpass";
    audioNode.frequency.value = 500;
    audioNode.Q.value = 1;
  
    // Frequency Control
    const freqSlider = document.createElement('input');
    freqSlider.type = 'range';
    freqSlider.min = 20;
    freqSlider.max = audioCtx.sampleRate / 2; // Max practical cutoff
    freqSlider.value = 500;
    freqSlider.step = 1;
    freqSlider.className = 'module-slider';
    freqSlider.addEventListener('input', () => audioNode.frequency.value = parseFloat(freqSlider.value));
  
    const freqLabel = document.createElement('label');
    freqLabel.textContent = 'Cutoff:';
    freqLabel.htmlFor = freqSlider.id = `filter-cutoff-${Math.random().toString(36).substring(7)}`;
  
    const freqValueDisplay = document.createElement('span');
    freqValueDisplay.textContent = freqSlider.value + ' Hz';
    freqSlider.addEventListener('input', () => freqValueDisplay.textContent = freqSlider.value + ' Hz');
  
    parentElement.appendChild(freqLabel);
    parentElement.appendChild(freqSlider);
    parentElement.appendChild(freqValueDisplay);
  
    // Q Factor Control
    const qSlider = document.createElement('input');
    qSlider.type = 'range';
    qSlider.min = 0.0001;
    qSlider.max = 20; // Practical range for Q
    qSlider.value = 1;
    qSlider.step = 0.1;
    qSlider.className = 'module-slider';
    qSlider.addEventListener('input', () => audioNode.Q.value = parseFloat(qSlider.value));
  
    const qLabel = document.createElement('label');
    qLabel.textContent = 'Q:';
    qLabel.htmlFor = qSlider.id = `filter-q-${Math.random().toString(36).substring(7)}`;
  
    const qValueDisplay = document.createElement('span');
    qValueDisplay.textContent = qSlider.value;
    qSlider.addEventListener('input', () => qValueDisplay.textContent = parseFloat(qSlider.value).toFixed(2));
  
  
    parentElement.appendChild(qLabel);
    parentElement.appendChild(qSlider);
    parentElement.appendChild(qValueDisplay);
  
    // Filter Type Selector (Optional, but good for a filter module)
    const typeSelector = document.createElement('select');
    const filterTypes = ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch", "allpass"];
    filterTypes.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
      if (type === audioNode.type) option.selected = true;
      typeSelector.appendChild(option);
    });
    typeSelector.addEventListener('change', () => audioNode.type = typeSelector.value);
    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'Type:';
    typeLabel.htmlFor = typeSelector.id = `filter-type-${Math.random().toString(36).substring(7)}`;
    parentElement.appendChild(typeLabel);
    parentElement.appendChild(typeSelector);
  
  
    return audioNode;
  }