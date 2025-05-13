// js/module_factory/modules/delay.js
import { createSlider } from '../ui/slider.js'; // Ensure this path is correct

export function createDelayModule(audioCtx, parentEl, id) {
  // 1. Create Audio Nodes
  const entryPointNode = audioCtx.createGain(); // True audio input for the module
  const delayNode = audioCtx.createDelay(5.0);  // Max delay time
  const feedbackGain = audioCtx.createGain();
  const wetLevelGain = audioCtx.createGain();   // Controls level of the wet (delayed) signal
  const dryLevelGain = audioCtx.createGain();   // Controls level of the dry (original) signal
  const outputNode = audioCtx.createGain();     // True audio output for the module

  // 2. Set Default Values for AudioParams
  delayNode.delayTime.setValueAtTime(0.5, audioCtx.currentTime); // Default delay time
  feedbackGain.gain.setValueAtTime(0.3, audioCtx.currentTime);   // Default feedback
  wetLevelGain.gain.setValueAtTime(0.5, audioCtx.currentTime);   // Default wet level
  dryLevelGain.gain.setValueAtTime(0.7, audioCtx.currentTime);   // Default dry level

  // 3. Wire Audio Nodes
  // Dry Path:
  entryPointNode.connect(dryLevelGain);
  dryLevelGain.connect(outputNode);

  // Wet Path:
  entryPointNode.connect(delayNode);
  delayNode.connect(feedbackGain);
  feedbackGain.connect(delayNode); // Feedback loop

  delayNode.connect(wetLevelGain);
  wetLevelGain.connect(outputNode);

  // 4. Create UI Elements
  const uiElements = []; 

  const titleEl = Object.assign(document.createElement('h3'), {
    textContent: `Delay ${id.replace('module-','')}` // Cleaner title
  });
  parentEl.appendChild(titleEl);
  uiElements.push(titleEl);

  const sliderConfigs = [
    {
      labelText: 'Time',
      paramName: 'delayTime', // For MODULE_DEFS lfoTargets
      param: delayNode.delayTime,
      min: 0.01, max: 5.0, step: 0.01,
      unit: 's', decimalPlaces: 2
    },
    {
      labelText: 'Feedback',
      paramName: 'feedback', // For MODULE_DEFS lfoTargets
      param: feedbackGain.gain,
      min: 0, max: 0.95, step: 0.01, // Max feedback < 1 to prevent runaway
      decimalPlaces: 2
    },
    {
      labelText: 'Wet Level',
      paramName: 'wetGain', // For MODULE_DEFS lfoTargets
      param: wetLevelGain.gain,
      min: 0, max: 1, step: 0.01,
      decimalPlaces: 2
    },
    {
      labelText: 'Dry Level',
      paramName: 'dryGain', // For MODULE_DEFS lfoTargets
      param: dryLevelGain.gain,
      min: 0, max: 1, step: 0.01,
      decimalPlaces: 2
    },
  ];

  sliderConfigs.forEach(config => {
    const sliderWrapper = createSlider({
      parent: parentEl,
      labelText: config.labelText,
      min: config.min,
      max: config.max,
      step: config.step,
      value: config.param.value, // Use current value from AudioParam
      unit: config.unit || '',
      decimalPlaces: config.decimalPlaces,
      onInput: (newValue) => {
        config.param.setValueAtTime(newValue, audioCtx.currentTime);
      }
    });
    uiElements.push(sliderWrapper);
  });

  function dispose() {
    // Disconnect all internal audio nodes specific to this module
    entryPointNode.disconnect();
    delayNode.disconnect();
    feedbackGain.disconnect();
    wetLevelGain.disconnect();
    dryLevelGain.disconnect();
    outputNode.disconnect(); // This is the final output, ensure it's clean

    // Remove UI elements
    uiElements.forEach(el => {
        if (el && el.parentNode) {
            el.remove();
        }
    });
    console.log(`Delay module ${id} disposed.`);
  }

  const moduleAPI = {
    id,
    audioNode: entryPointNode, // This is the input node for the module
    outputNode: outputNode,    // This is the output node for the module
    params: { // For LFO modulation access
        delayTime: delayNode.delayTime,
        feedback: feedbackGain.gain,
        wetGain: wetLevelGain.gain,
        dryGain: dryLevelGain.gain
    },
    dispose
  };

  return moduleAPI;
}
