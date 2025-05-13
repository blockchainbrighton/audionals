// js/module_factory/modules/delay.js
// Helper slider function (can be in a shared file)
import { createSlider, slider } from '../ui/slider.js';

export function createDelayModule(audioCtx, parentEl, id) {
  const input = audioCtx.createGain();    // Module's main I/O node
  const output = audioCtx.createGain();   // Internal summing node

  const delayNode = audioCtx.createDelay(5.0); // Max 5s delay
  const feedbackGain = audioCtx.createGain();
  const wetLevelGain = audioCtx.createGain();

  // Dry path: input -> output
  input.connect(output);

  // Wet path: input -> delay -> wetLevel -> output
  input.connect(delayNode);
  delayNode.connect(feedbackGain);
  feedbackGain.connect(delayNode); // Feedback loop
  delayNode.connect(wetLevelGain);
  wetLevelGain.connect(output);

  // Default settings
  delayNode.delayTime.value = 0.5;
  feedbackGain.gain.value = 0.3;
  wetLevelGain.gain.value = 0.5;
  input.gain.value = 0.7; // Dry level default

  // Route mixed signal back to input, making 'input' the actual output for the chain
  output.connect(input);
  // Important: The original dry signal via input.gain is mixed in 'output'.
  // To avoid doubling the dry signal when output.connect(input) happens,
  // the original input.gain typically acts as "Dry Mix".
  // If input.gain.value was 0 (like chorus example), dry would be from input->output path only *if* that path has gain.
  // The chorus pattern (input.gain.value=0, explicit dry input.connect(output), explicit wet input.connect(effect).connect(output), then output.connect(input))
  // means 'input' node primarily becomes the post-mix output.
  // Here, we'll set input.gain to control dry level.
  
  // UI
  const title = document.createElement('h3');
  title.textContent = `Delay ${id}`;
  parentEl.appendChild(title);
  
  slider(parentEl, 'Time (s)', 0.01, 5.0, 0.5, 0.01, v => delayNode.delayTime.value = v);
  slider(parentEl, 'Feedback', 0, 0.95, 0.3, 0.01, v => feedbackGain.gain.value = v);
  slider(parentEl, 'Wet Level', 0, 1, 0.5, 0.01, v => wetLevelGain.gain.value = v);
  slider(parentEl, 'Dry Level', 0, 1, 0.7, 0.01, v => input.gain.value = v);


  return {
    id,
    audioNode: input, // This is the node connected by the factory
    // Expose internal nodes for LFO targets or direct manipulation
    delayTime: delayNode.delayTime,
    feedback: feedbackGain.gain,
    wetGain: wetLevelGain.gain,
    dryGain: input.gain, // Dry is controlled by input.gain in this setup
    dispose() {
      input.disconnect();
      output.disconnect();
      delayNode.disconnect();
      feedbackGain.disconnect();
      wetLevelGain.disconnect();
      parentEl.replaceChildren();
      console.log(`[Delay ${id}] disposed`);
    }
  };
}