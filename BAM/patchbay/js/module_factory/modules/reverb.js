// js/module_factory/modules/reverb.js
import { createSlider } from '../ui/slider.js'; // Import the shared slider

// Helper to create a simple all-pass like delay element
// This remains internal and uses fixed values passed during creation for simplicity.
// If these needed UI controls, createAP would need 'parentEl' and 'id' context.
function createAP(audioCtx, delayTimeValue, feedbackValue, directMixValue = 0.5) {
  const input = audioCtx.createGain();
  const output = audioCtx.createGain();
  const delay = audioCtx.createDelay(1.0); // Max 1s delay for AP
  const feedback = audioCtx.createGain();
  const direct = audioCtx.createGain(); // For the "all-pass" like feed-forward path

  delay.delayTime.setValueAtTime(delayTimeValue, audioCtx.currentTime);
  feedback.gain.setValueAtTime(feedbackValue, audioCtx.currentTime);
  direct.gain.setValueAtTime(1.0 - directMixValue, audioCtx.currentTime); // Feed-forward part
  const wetFromDelayGain = audioCtx.createGain();
  wetFromDelayGain.gain.setValueAtTime(directMixValue, audioCtx.currentTime); // Delayed part

  input.connect(direct);
  direct.connect(output);

  input.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay); // Feedback loop
  delay.connect(wetFromDelayGain);
  wetFromDelayGain.connect(output);

  return { input, output, delay, feedback, direct, wetFromDelayGain,
    // Expose params if they were to be controlled externally:
    // delayTimeParam: delay.delayTime,
    // feedbackParam: feedback.gain
  };
}


export function createReverbModule(audioCtx, parentEl, id) {
  // 1. Audio Nodes (Insert Style)
  const input = audioCtx.createGain();  // Module's main I/O node
  const outputInternal = audioCtx.createGain(); // Internal summing for dry/wet before routing back

  const wetLevelGain = audioCtx.createGain();

  // Create a few "all-pass like" stages or simple delays
  // These values are fixed for this simple reverb model.
  const ap1 = createAP(audioCtx, 0.025, 0.35, 0.5);
  const ap2 = createAP(audioCtx, 0.037, 0.30, 0.5);
  const ap3 = createAP(audioCtx, 0.051, 0.25, 0.5);
  const ap4 = createAP(audioCtx, 0.063, 0.20, 0.5); // Added one more for more diffusion

  // 2. Default Settings
  wetLevelGain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  input.gain.setValueAtTime(0.6, audioCtx.currentTime); // This is the Dry Level in insert mode

  // 3. Audio Path (Insert Style: input -> effects -> back to input)
  // Dry path is controlled by input.gain.value.
  // Wet path: input (source) -> ap1 -> ap2 -> ap3 -> ap4 -> wetLevelGain -> outputInternal -> input (module out)
  input.connect(ap1.input);
  ap1.output.connect(ap2.input);
  ap2.output.connect(ap3.input);
  ap3.output.connect(ap4.input);
  ap4.output.connect(wetLevelGain);
  wetLevelGain.connect(outputInternal);
  outputInternal.connect(input); // Wet signal summed back at the main I/O node.

  // 4. UI Elements Management
  const uiElements = [];

  // 5. Create Module Title
  const titleEl = Object.assign(document.createElement('h3'), {
    textContent: `Reverb ${id}`
  });
  parentEl.appendChild(titleEl);
  uiElements.push(titleEl);

  // 6. Create Sliders
  const dryLevelSliderWrapper = createSlider({
    parent: parentEl,
    labelText: 'Dry Level',
    min: 0, max: 1, step: 0.01,
    value: input.gain.value,
    unit: '', decimalPlaces: 2,
    onInput: v => input.gain.setValueAtTime(v, audioCtx.currentTime)
  });
  uiElements.push(dryLevelSliderWrapper);

  const wetLevelSliderWrapper = createSlider({
    parent: parentEl,
    labelText: 'Wet Level',
    min: 0, max: 1, step: 0.01,
    value: wetLevelGain.gain.value,
    unit: '', decimalPlaces: 2,
    onInput: v => wetLevelGain.gain.setValueAtTime(v, audioCtx.currentTime)
  });
  uiElements.push(wetLevelSliderWrapper);

  // Example: if you wanted to control one of the AP feedback gains
  // const ap1FeedbackSliderWrapper = createSlider({
  //   parent: parentEl,
  //   labelText: 'AP1 Fdbk',
  //   min: 0, max: 0.9, step: 0.01, // Keep feedback below 1 for stability
  //   value: ap1.feedback.gain.value,
  //   unit: '', decimalPlaces: 2,
  //   onInput: v => ap1.feedback.gain.setValueAtTime(v, audioCtx.currentTime)
  // });
  // uiElements.push(ap1FeedbackSliderWrapper);

  // 7. Return Module API
  return {
    id,
    audioNode: input, // Main I/O node
    params: {
      dryLevel: input.gain,
      wetLevel: wetLevelGain.gain,
      // If AP params were exposed:
      // ap1Feedback: ap1.feedbackParam,
    },
    dispose() {
      // Disconnect main I/O node, which should break the loop
      input.disconnect();

      // Disconnect internal effect chain nodes
      wetLevelGain.disconnect();
      // Disconnect all parts of each AP stage
      [ap1, ap2, ap3, ap4].forEach(ap => {
          ap.input.disconnect();
          ap.output.disconnect();
          ap.delay.disconnect();
          ap.feedback.disconnect();
          ap.direct.disconnect();
          ap.wetFromDelayGain.disconnect();
      });
      outputInternal.disconnect();


      // Remove UI elements
      uiElements.forEach(el => el.remove());
      console.log(`Reverb module ${id} disposed.`);
    }
  };
}