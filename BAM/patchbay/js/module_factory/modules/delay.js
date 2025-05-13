// js/module_factory/modules/delay.js
import { createSlider } from '../ui/slider.js'; // Ensure this path is correct

export function createDelayModule(audioCtx, parentEl, id) {
  // 1. Create Audio Nodes
  const input = audioCtx.createGain();
  const delayNode = audioCtx.createDelay(5.0);
  const feedbackGain = audioCtx.createGain();
  const wetLevelGain = audioCtx.createGain();
  const output = audioCtx.createGain();

  // 2. Set Default Values for AudioParams
  delayNode.delayTime.setValueAtTime(0.5, audioCtx.currentTime);
  feedbackGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  wetLevelGain.gain.setValueAtTime(0.5, audioCtx.currentTime); // This is for 'wetGain'
  input.gain.setValueAtTime(0.7, audioCtx.currentTime);       // This is for 'dryGain'

  // 3. Wire Audio Nodes
  // Dry path directly from input node's gain to output
  input.connect(output);

  // Wet path:
  // Signal for wet path also comes from 'input' but before its main gain stage,
  // or 'input' is the entry point and its gain is the dry level.
  // Let's assume 'input' is the single entry point.
  input.connect(delayNode);
  delayNode.connect(feedbackGain);
  feedbackGain.connect(delayNode); // Feedback loop
  delayNode.connect(wetLevelGain);
  wetLevelGain.connect(output);

  // 4. Create UI Elements
  const uiElements = []; // Keep track of created UI elements for disposal

  const titleEl = Object.assign(document.createElement('h3'), {
    textContent: `Delay ${id}`
  });
  parentEl.appendChild(titleEl);
  uiElements.push(titleEl);

  const sliderConfigs = [
    {
      labelText: 'Time',
      param: delayNode.delayTime,
      min: 0.01, max: 5.0, step: 0.01,
      unit: 's', decimalPlaces: 2
    },
    {
      labelText: 'Feedback',
      param: feedbackGain.gain,
      min: 0, max: 0.95, step: 0.01,
      decimalPlaces: 2
    },
    {
      labelText: 'Wet Level', // UI Label
      paramName: 'wetGain', // Key for MODULE_DEFS and params object
      param: wetLevelGain.gain,
      min: 0, max: 1, step: 0.01,
      decimalPlaces: 2
    },
    {
      labelText: 'Dry Level', // UI Label
      paramName: 'dryGain', // Key for MODULE_DEFS and params object
      param: input.gain,
      min: 0, max: 1, step: 0.01,
      decimalPlaces: 2
    },
  ];

  sliderConfigs.forEach(config => {
    const sliderWrapper = createSlider({ // createSlider returns the wrapper
      parent: parentEl,
      labelText: config.labelText,
      min: config.min,
      max: config.max,
      step: config.step,
      value: config.param.value,
      unit: config.unit || '',
      decimalPlaces: config.decimalPlaces,
      onInput: (newValue) => {
        // Use setValueAtTime for immediate changes, or setTargetAtTime for smooth ramps
        config.param.setValueAtTime(newValue, audioCtx.currentTime);
      }
    });
    uiElements.push(sliderWrapper); // <<< CORRECT: Add the wrapper returned by createSlider
  });

  // Define the dispose function first
  function dispose() {
    // Disconnect audio nodes
    input.disconnect();
    delayNode.disconnect();
    feedbackGain.disconnect();
    wetLevelGain.disconnect();
    output.disconnect();

    // Remove UI elements
    uiElements.forEach(el => {
        if (el && el.parentNode) { // Check if element exists and has a parent
            el.remove();
        }
    });
    console.log(`Delay module ${id} disposed.`);
  }

  // Now create the moduleAPI object using the defined dispose function
  const moduleAPI = {
    id,
    audioNode: input,  // Main audio input for the module
    outputNode: output, // Main audio output from the module
    params: {
        delayTime: delayNode.delayTime,
        feedback: feedbackGain.gain,
        wetGain: wetLevelGain.gain,   // Matches MODULE_DEFS
        dryGain: input.gain          // Matches MODULE_DEFS
    },
    dispose // Shorthand for dispose: dispose
  };

  // Optional: Log for verification during development
  // console.log('Delay module API created:', moduleAPI);
  // console.log('Is delayModule.params.dryGain an AudioParam?', moduleAPI.params.dryGain instanceof AudioParam);
  // console.log('Is delayModule.params.wetGain an AudioParam?', moduleAPI.params.wetGain instanceof AudioParam);

  return moduleAPI;
}