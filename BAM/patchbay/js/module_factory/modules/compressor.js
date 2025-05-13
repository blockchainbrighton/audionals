// js/modules/compressor.js
import { createSlider } from '../ui/slider.js'; // Only import createSlider

export function createCompressorModule(audioCtx, parentEl, id) {
  // 1. Audio Nodes
  // 'input' acts as the main I/O node for the module (insert style)
  // Signal enters 'input', goes to compressor chain, and the processed signal
  // is fed back into 'input' to become the module's output.
  // 'input.gain' controls the "dry" signal pass-through.
  const input = audioCtx.createGain();
  const compressorNode = audioCtx.createDynamicsCompressor();
  const makeupGain = audioCtx.createGain(); // For output gain post-compression

  // 'outputInternal' is where the processed wet signal collects before routing back to 'input'
  // Naming it explicitly to avoid confusion with a module's main output if it had separate dry/wet paths.
  // In this insert model, 'input' is the main output point.
  // However, for clarity in the chain, let's imagine 'outputInternal' as the end of the wet path.
  // The original code used `output` for this, which is fine, but let's ensure connections are clear.

  // 2. Default Values for AudioParams
  compressorNode.threshold.value = -24;  // dB
  compressorNode.knee.value = 30;       // dB
  compressorNode.ratio.value = 12;        // Ratio (12:1)
  compressorNode.attack.value = 0.003;    // seconds
  compressorNode.release.value = 0.25;    // seconds
  makeupGain.gain.value = 1.0;         // Linear gain (0dB)

  // For a typical insert compressor, we want 100% wet signal.
  // So, the direct pass-through gain of the 'input' node is set to 0.
  input.gain.value = 0;

  // 3. Wire Audio Nodes (Insert Style: input -> effects -> back to input)
  // Signal path: input -> compressorNode -> makeupGain -> (back to) input
  input.connect(compressorNode);
  compressorNode.connect(makeupGain);
  makeupGain.connect(input); // The processed signal is fed back to the 'input' node,
                             // which acts as the module's output.

  // 4. Create UI Elements
  const uiElements = []; // Store all created UI elements for disposal

  // Module Title
  const titleEl = Object.assign(document.createElement('h3'), {
    textContent: `Compressor ${id}`
  });
  parentEl.appendChild(titleEl);
  uiElements.push(titleEl);

  // Slider configurations
  const sliderConfigs = [
    {
      labelText: 'Threshold',
      param: compressorNode.threshold,
      min: -100, max: 0, step: 1,
      unit: 'dB',
      decimalPlaces: 0
    },
    {
      labelText: 'Knee',
      param: compressorNode.knee,
      min: 0, max: 40, step: 1,
      unit: 'dB',
      decimalPlaces: 0
    },
    {
      labelText: 'Ratio',
      param: compressorNode.ratio,
      min: 1, max: 20, step: 0.1,
      unit: ':1', // Displayed as "12 :1"
      decimalPlaces: 1
    },
    {
      labelText: 'Attack',
      param: compressorNode.attack,
      min: 0.000, max: 1.0, step: 0.001, // Min attack can be very small
      unit: 's',
      decimalPlaces: 3
    },
    {
      labelText: 'Release',
      param: compressorNode.release,
      min: 0.01, max: 1.0, step: 0.01,
      unit: 's',
      decimalPlaces: 2
    },
    {
      labelText: 'Makeup Gain',
      param: makeupGain.gain,
      min: 0, max: 5, step: 0.1, // Range for linear gain, 5 is +14dB approx.
      unit: '', // Linear gain, could also convert to dB for display if desired
      decimalPlaces: 1
    }
  ];

  // Create sliders using the shared function
  sliderConfigs.forEach(config => {
    const sliderWrapper = createSlider({
      parent: parentEl,
      labelText: config.labelText,
      min: config.min,
      max: config.max,
      step: config.step,
      value: config.param.value, // Use the AudioParam's current value
      unit: config.unit || '',
      decimalPlaces: config.decimalPlaces,
      onInput: (newValue) => {
        // For ratio, the AudioParam expects just the number, not the ":1"
        config.param.value = newValue;
      }
    });
    uiElements.push(sliderWrapper);
  });

  // 5. Return Module API
  return {
    id,
    audioNode: input, // This is the node to connect TO (as input) and connect FROM (as output)
    // Expose AudioParams directly for automation or direct setting
    params: {
      threshold: compressorNode.threshold,
      knee: compressorNode.knee,
      ratio: compressorNode.ratio,
      attack: compressorNode.attack,
      release: compressorNode.release,
      makeup: makeupGain.gain,
    },
    dispose() {
      // Disconnect audio nodes
      // Since 'input' is connected to itself via the chain,
      // disconnecting 'input' from everything it's connected TO,
      // and everything connected TO 'input' is usually sufficient.
      input.disconnect();
      compressorNode.disconnect();
      makeupGain.disconnect();

      // Remove UI elements
      uiElements.forEach(el => el.remove());
      console.log(`Compressor module ${id} disposed.`);
    }
  };
}