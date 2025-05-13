// js/module_factory/modules/gain.js
import { createSlider } from '../ui/slider.js';

export function createGainModule(audioCtx, parentEl, id) { // Added id, consistently use parentEl
  const audioNode = audioCtx.createGain();
  audioNode.gain.value = 0.5; // Default gain

  const uiElements = []; // To store UI elements for disposal

  // Optional: Add a title like other modules for consistency
  const titleEl = Object.assign(document.createElement('h3'), {
    textContent: `Gain ${id}`
  });
  parentEl.appendChild(titleEl);
  uiElements.push(titleEl);

  const gainSliderWrapper = createSlider({
    parent: parentEl,
    labelText: 'Gain', // createSlider adds the colon if you set a class
    min: 0, max: 1, step: 0.01, value: audioNode.gain.value, // Use current value
    unit: '', // Or 'dB' if you convert, but linear is fine
    decimalPlaces: 2,
    onInput: v => (audioNode.gain.value = v)
  });
  uiElements.push(gainSliderWrapper); // Add slider wrapper for disposal

  return {
    id, // Return the id
    audioNode,
    dispose() {
      audioNode.disconnect(); // Disconnect audio node

      // Remove all UI elements this module created
      uiElements.forEach(el => {
        if (el && el.parentNode) {
            el.remove();
        }
      });
      console.log(`Gain module ${id} disposed.`);
    }
  };
}