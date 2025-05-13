// js/module_factory/modules/gain.js
import { createSlider } from '../ui/slider.js'; // Assuming you have a slider UI component

export function createGainModule(audioCtx, parentEl, moduleId) {
  const gainNode = audioCtx.createGain();
  // Set a default gain value (e.g., 0.7 for slightly less than unity, or 1 for unity)
  gainNode.gain.setValueAtTime(0.7, audioCtx.currentTime);

  // --- UI Elements ---
  const titleEl = Object.assign(document.createElement('h3'), {
    textContent: `Gain ${moduleId.replace('module-','')}` // Cleaner title
  });
  parentEl.appendChild(titleEl);

  // Example: Slider for gain control
  const gainSliderWrapper = createSlider({
    parent: parentEl,
    labelText: 'Level', // UI label for the slider
    min: 0,
    max: 2, // Allow some boost (gain of 2 is +6dB)
    step: 0.01,
    value: gainNode.gain.value, // Initial value from the AudioParam
    unit: '', // No unit for gain usually, or could be 'dB' if converted
    decimalPlaces: 2,
    onInput: (newValue) => {
      gainNode.gain.setValueAtTime(newValue, audioCtx.currentTime);
    }
  });

  // --- Dispose function for cleanup ---
  function dispose() {
    gainNode.disconnect(); // Disconnect the audio node
    // Remove UI elements
    titleEl.remove();
    gainSliderWrapper.remove();
    console.log(`Gain module ${moduleId} disposed.`);
  }

  // --- Module API ---
  // This is the object that will be merged into the module's state
  return {
    id: moduleId,
    audioNode: gainNode, // This GainNode is the primary audio processing unit.
                         // For a simple gain module, it acts as both input and output.
    // No separate 'outputNode' is strictly needed if connection_manager uses audioNode as default output.
    // However, if you want to be explicit like with Delay:
    // outputNode: gainNode, 
    
    params: {
      // This 'gain' key matches the 'params.gain' path in MODULE_DEFS.lfoTargets
      // It MUST be the AudioParam object itself, not its .value
      gain: gainNode.gain 
    },
    dispose
  };
}