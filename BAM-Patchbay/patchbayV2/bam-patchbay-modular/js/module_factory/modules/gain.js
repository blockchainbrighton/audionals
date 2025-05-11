// js/module_factory/modules/gain.js

/**
 * Creates a GainNode and its UI.
 * @param {AudioContext} audioCtx - The AudioContext.
 * @param {HTMLElement} parentElement - The module's main DOM element to append UI to.
 * @returns {GainNode} The created GainNode.
 */
export function createGainModule(audioCtx, parentElement) {
    const audioNode = audioCtx.createGain();
    audioNode.gain.value = 0.5;
  
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = 1;
    slider.step = 0.01;
    slider.value = 0.5;
    slider.className = 'module-slider';
    slider.addEventListener('input', () => audioNode.gain.value = parseFloat(slider.value));
  
    const label = document.createElement('label');
    label.textContent = 'Gain:';
    label.htmlFor = slider.id = `gain-level-${Math.random().toString(36).substring(7)}`;
  
    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = slider.value;
    slider.addEventListener('input', () => valueDisplay.textContent = parseFloat(slider.value).toFixed(2));
  
    parentElement.appendChild(label);
    parentElement.appendChild(slider);
    parentElement.appendChild(valueDisplay);
  
    return { audioNode: audioNode }; // <<< CHANGE: Return an object
  }