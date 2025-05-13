// js/module_factory/modules/reverb.js
import { createSlider } from '../ui/slider.js';

// Helper createAP: No changes needed here if the fix is applied in createReverbModule
function createAP(audioCtx, delayTimeValue, feedbackValue, directMixValue = 0.5) {
  const input = audioCtx.createGain();
  const output = audioCtx.createGain();
  const delay = audioCtx.createDelay(1.0);
  const feedback = audioCtx.createGain();
  const direct = audioCtx.createGain();
  const wetFromDelayGain = audioCtx.createGain();

  delay.delayTime.setValueAtTime(delayTimeValue, audioCtx.currentTime);
  feedback.gain.setValueAtTime(feedbackValue, audioCtx.currentTime);
  // These gains depend on directMixValue
  direct.gain.setValueAtTime(1.0 - directMixValue, audioCtx.currentTime);
  wetFromDelayGain.gain.setValueAtTime(directMixValue, audioCtx.currentTime);

  input.connect(direct);
  direct.connect(output);

  input.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wetFromDelayGain);
  wetFromDelayGain.connect(output);

  return { input, output, delay, feedback, direct, wetFromDelayGain };
}


export function createReverbModule(audioCtx, parentEl, id) {
  const input = audioCtx.createGain();
  const outputInternal = audioCtx.createGain();
  const wetLevelGain = audioCtx.createGain();

  // Create "all-pass like" stages
  // TRY THIS FIRST: Change directMixValue to 1.0 for all AP calls
  const ap1 = createAP(audioCtx, 0.025, 0.35, 1.0); // Original was 0.5
  const ap2 = createAP(audioCtx, 0.037, 0.30, 1.0); // Original was 0.5
  const ap3 = createAP(audioCtx, 0.051, 0.25, 1.0); // Original was 0.5
  const ap4 = createAP(audioCtx, 0.063, 0.20, 1.0); // Original was 0.5

  // Default Settings
  wetLevelGain.gain.setValueAtTime(0.5, audioCtx.currentTime); // Slightly increase default wet
  input.gain.setValueAtTime(0.5, audioCtx.currentTime);    // Balance with wet

  // Audio Path
  input.connect(ap1.input);
  ap1.output.connect(ap2.input);
  ap2.output.connect(ap3.input);
  ap3.output.connect(ap4.input);
  ap4.output.connect(wetLevelGain);
  wetLevelGain.connect(outputInternal);
  outputInternal.connect(input); // Wet signal summed back

  const uiElements = [];
  const titleEl = Object.assign(document.createElement('h3'), { textContent: `Reverb ${id}` });
  parentEl.appendChild(titleEl);
  uiElements.push(titleEl);

  const dryLevelSliderWrapper = createSlider({
    parent: parentEl, labelText: 'Dry Level', min: 0, max: 1, step: 0.01,
    value: input.gain.value, unit: '', decimalPlaces: 2,
    onInput: v => input.gain.setValueAtTime(v, audioCtx.currentTime)
  });
  uiElements.push(dryLevelSliderWrapper);

  const wetLevelSliderWrapper = createSlider({
    parent: parentEl, labelText: 'Wet Level', min: 0, max: 1, step: 0.01,
    value: wetLevelGain.gain.value, unit: '', decimalPlaces: 2,
    onInput: v => wetLevelGain.gain.setValueAtTime(v, audioCtx.currentTime)
  });
  uiElements.push(wetLevelSliderWrapper);

   // 7. Return Module API
   return {
    id,
    audioNode: input, // Main I/O node
    params: {
      dryGain: input.gain,         // <--- RENAMED from dryLevel
      wetGain: wetLevelGain.gain,  // <--- RENAMED from wetLevel
    },
    dispose() {
      input.disconnect();
      wetLevelGain.disconnect();
      [ap1, ap2, ap3, ap4].forEach(ap => {
          ap.input.disconnect(); ap.output.disconnect(); ap.delay.disconnect();
          ap.feedback.disconnect(); ap.direct.disconnect(); ap.wetFromDelayGain.disconnect();
      });
      outputInternal.disconnect();
      uiElements.forEach(el => el.remove());
      console.log(`Reverb module ${id} disposed.`);
    }
  };
}