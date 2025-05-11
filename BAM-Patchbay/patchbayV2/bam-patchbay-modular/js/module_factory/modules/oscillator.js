// js/module_factory/modules/oscillator.js

/**
 * Creates an OscillatorNode and its UI.
 * @param {AudioContext} audioCtx - The AudioContext.
 * @param {HTMLElement} parentElement - The module's main DOM element to append UI to.
 * @returns {OscillatorNode} The created OscillatorNode.
 */
export function createOscillatorModule(audioCtx, parentElement) {
    const audioNode = audioCtx.createOscillator();
    audioNode.frequency.value = 440; // Default A4
    audioNode.start();
  
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 20;
    slider.max = 2000;
    slider.value = 440;
    slider.className = 'module-slider'; // Optional: for styling
    slider.addEventListener('input', () => audioNode.frequency.value = parseFloat(slider.value));
  
    const label = document.createElement('label');
    label.textContent = 'Freq:';
    label.htmlFor = slider.id = `osc-freq-${Math.random().toString(36).substring(7)}`; // Unique ID for label
  
    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = slider.value + ' Hz';
    slider.addEventListener('input', () => valueDisplay.textContent = slider.value + ' Hz');
  
  
    parentElement.appendChild(label);
    parentElement.appendChild(slider);
    parentElement.appendChild(valueDisplay);
  
    return audioNode;
  }