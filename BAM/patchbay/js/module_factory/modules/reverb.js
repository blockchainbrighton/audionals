// js/module_factory/modules/reverb.js


import { createSlider, slider } from '../ui/slider.js';

// Helper to create a simple all-pass like delay element
function createAP(audioCtx, delayTimeValue, feedbackValue) {
    const input = audioCtx.createGain();
    const output = audioCtx.createGain();
    const delay = audioCtx.createDelay(1.0); // Max 1s delay for AP
    const feedback = audioCtx.createGain();
    const direct = audioCtx.createGain();

    delay.delayTime.value = delayTimeValue;
    feedback.gain.value = feedbackValue;
    direct.gain.value = 0.5; // Adjust for mix

    input.connect(direct);
    direct.connect(output);

    input.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay); // Feedback
    delay.connect(output);   // Wet from delay

    return { input, output, delay, feedback, direct };
}


export function createReverbModule(audioCtx, parentEl, id) {
  const input = audioCtx.createGain();  // Module's main I/O node
  const output = audioCtx.createGain(); // Internal summing node

  const wetLevelGain = audioCtx.createGain();

  // Create a few "all-pass like" stages or simple delays
  const ap1 = createAP(audioCtx, 0.025, 0.35); // Short delays, some feedback
  const ap2 = createAP(audioCtx, 0.037, 0.30);
  const ap3 = createAP(audioCtx, 0.051, 0.25);

  // Dry path
  input.connect(output);

  // Wet path: input -> ap1 -> ap2 -> ap3 -> wetLevel -> output
  input.connect(ap1.input);
  ap1.output.connect(ap2.input);
  ap2.output.connect(ap3.input);
  ap3.output.connect(wetLevelGain);
  wetLevelGain.connect(output);

  // Default settings
  wetLevelGain.gain.value = 0.4;
  input.gain.value = 0.8; // Dry level

  // Route mixed signal back to input
  output.connect(input);

  const title = document.createElement('h3');
  title.textContent = `Reverb ${id}`;
  parentEl.appendChild(title);
  
  slider(parentEl, 'Wet Level', 0, 1, 0.4, 0.01, v => wetLevelGain.gain.value = v);
  slider(parentEl, 'Dry Level', 0, 1, 0.8, 0.01, v => input.gain.value = v);
  // Could add sliders for individual AP delays/feedbacks if desired (makes it complex)
  // Example for one parameter:
  // slider(parentEl, 'Decay (AP1 Feedback)', 0, 0.7, 0.35, 0.01, v => ap1.feedback.gain.value = v);


  return {
    id,
    audioNode: input,
    wetGain: wetLevelGain.gain,
    dryGain: input.gain,
    // Expose internal elements if LFO targets are needed for them, e.g.:
    // ap1Feedback: ap1.feedback.gain,
    dispose() {
      input.disconnect();
      output.disconnect();
      wetLevelGain.disconnect();
      ap1.input.disconnect(); ap1.output.disconnect(); ap1.delay.disconnect(); ap1.feedback.disconnect(); ap1.direct.disconnect();
      ap2.input.disconnect(); ap2.output.disconnect(); ap2.delay.disconnect(); ap2.feedback.disconnect(); ap2.direct.disconnect();
      ap3.input.disconnect(); ap3.output.disconnect(); ap3.delay.disconnect(); ap3.feedback.disconnect(); ap3.direct.disconnect();
      parentEl.replaceChildren();
      console.log(`[Reverb ${id}] disposed`);
    }
  };
}