// js/module_factory/modules/delay.js
import { createSlider } from '../ui/slider.js'; // Ensure this path is correct for your project structure

export function createDelayModule(audioCtx, parentEl, id) {
  // 1. Create Audio Nodes
  const input = audioCtx.createGain();       // Main input to the module, also acts as dry signal path
  const output = audioCtx.createGain();      // Main output of the module
  const delayNode = audioCtx.createDelay(5.0); // Max delay time 5s
  const feedbackGain = audioCtx.createGain();
  const wetLevelGain = audioCtx.createGain();

  // 2. Set Default Values for AudioParams
  delayNode.delayTime.value = 0.5;  // s
  feedbackGain.gain.value = 0.3;    // 0 to 1 (or slightly >1 for self-oscillation, but 0.95 is safer)
  wetLevelGain.gain.value = 0.5;    // 0 to 1
  input.gain.value = 0.7;           // This is the "Dry Level" gain

  // 3. Wire Audio Nodes
  // Dry path:
  input.connect(output);

  // Wet path:
  input.connect(delayNode);
  delayNode.connect(feedbackGain);
  feedbackGain.connect(delayNode); // Feedback loop
  delayNode.connect(wetLevelGain);
  wetLevelGain.connect(output);

  // 4. Create UI Elements
  // Module Title
  const titleEl = Object.assign(document.createElement('h3'), {
    textContent: `Delay ${id}`
  });
  parentEl.appendChild(titleEl);

  // Slider configurations
  const sliderConfigs = [
    {
      labelText: 'Time',
      param: delayNode.delayTime,
      min: 0.01, max: 5.0, step: 0.01,
      unit: 's'
    },
    {
      labelText: 'Feedback',
      param: feedbackGain.gain,
      min: 0, max: 0.95, step: 0.01
    },
    {
      labelText: 'Wet Level',
      param: wetLevelGain.gain,
      min: 0, max: 1, step: 0.01
    },
    {
      labelText: 'Dry Level', // This controls the gain of the main 'input' node
      param: input.gain,
      min: 0, max: 1, step: 0.01
    },
  ];

  // Create sliders using the shared function
  const uiElements = [titleEl]; // Keep track of created UI elements for disposal

  sliderConfigs.forEach(config => {
    const sliderElement = createSlider({
      parent: parentEl,
      labelText: config.labelText,
      min: config.min,
      max: config.max,
      step: config.step,
      value: config.param.value, // Use the AudioParam's current value as the initial slider value
      unit: config.unit || '',   // Pass unit if defined, otherwise default in createSlider will be used
      onInput: (newValue) => {
        config.param.value = newValue; // Update the corresponding AudioParam
      }
    });
    // createSlider returns the input element. To remove the whole UI (label, input, readout),
    // you'd need to store its parent (the one implicitly created by createSlider if not label)
    // or have createSlider return the wrapper. For simplicity now, we'll just track the input.
    // A better approach for `dispose` would be for `createSlider` to return the top-level element it creates.
    // Assuming createSlider appends directly to `parent`, we can find its children later or
    // modify createSlider to return the wrapper.
    // For now, let's assume createSlider appends label, input, readout as siblings.
    // We can get the created elements for removal if needed, but it's simpler if createSlider returns a wrapper.
    // Let's assume for now we can just clear parentEl or handle it externally.
    // If we want to be precise:
    // The `createSlider` appends `label, input, readout` directly to `parent`.
    // So, to remove them, we'd need references to all three or their common ancestor if `createSlider` created one.
    // The current `createSlider` doesn't return a single wrapper.
    // We'll add the input's direct parent (the label provided by createSlider doesn't wrap input and readout)
    // This is tricky. Let's simplify `dispose` or suggest `createSlider` improvement.

    // For a simple dispose, we'll collect the elements `createSlider` is known to create.
    // This assumes `label, input, readout` are the last three children added to parentEl.
    // This is fragile. A better `createSlider` would return a single container element.
    // Let's store what `createSlider` *returns* (the input) and its siblings that were just added.
    const children = Array.from(parentEl.childNodes);
    // Assuming label, input, readout are the last 3 added:
    uiElements.push(...children.slice(-3));
  });


  // 5. Return Module API
  return {
    id,
    audioNode: input,  // The main input node for connecting to other modules
    outputNode: output, // The main output node for connecting to other modules
    // Expose AudioParams directly if needed for automation or direct setting
    params: {
        delayTime: delayNode.delayTime,
        feedback: feedbackGain.gain,
        wetLevel: wetLevelGain.gain,
        dryLevel: input.gain,
    },
    dispose() {
      // Disconnect audio nodes
      input.disconnect();
      delayNode.disconnect();
      feedbackGain.disconnect();
      wetLevelGain.disconnect();
      output.disconnect(); // Disconnect from any downstream nodes

      // Remove UI elements
      uiElements.forEach(el => el.remove());
      // If createSlider created a wrapper and returned it:
      // sliderWrappers.forEach(wrapper => wrapper.remove());
      // titleEl.remove(); // (already in uiElements if pushed)

      console.log(`Delay module ${id} disposed.`);
    }
  };
}