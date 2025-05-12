// js/modules/compressor.js
import { createSlider, slider } from '../ui/slider.js';

export function createCompressorModule(audioCtx, parentEl, id) {
  const input = audioCtx.createGain();    // Module's main I/O node
  const output = audioCtx.createGain();   // Internal summing node for dry/wet

  const compressorNode = audioCtx.createDynamicsCompressor();
  const makeupGain = audioCtx.createGain(); // For output gain post-compression

  // Dry path (often compressors are either 100% wet or bypassed)
  // input.connect(output); // If you want a dry mix
  
  // Wet path: input -> compressor -> makeupGain -> output
  input.connect(compressorNode);
  compressorNode.connect(makeupGain);
  makeupGain.connect(output);

  // Default settings
  // compressorNode.threshold.value = -24; // dB
  // compressorNode.knee.value = 30;      // dB
  // compressorNode.ratio.value = 12;       // Ratio
  // compressorNode.attack.value = 0.003;   // seconds
  // compressorNode.release.value = 0.25;   // seconds
  // makeupGain.gain.value = 1.0;        // Linear gain for makeup
  // For a compressor, typically, you don't want a dry signal mixed in by input.gain if following insert model.
  // The effect is usually on the whole signal. So set input.gain.value = 0.
  // If any dry signal is desired, it could be managed via a separate "dry" gain node in parallel.
  // The chorus pattern is: input.gain.value=0, input.connect(output) [for dry if it was >0], input.connect(effectchain).connect(output), output.connect(input)
  // For a compressor that replaces the signal, let's NOT connect input to output directly for dry, and set input.gain.value=0 effectively.
  // The signal from input -> compressor -> makeupGain -> output then -> input
  // If input.gain.value = 0, input itself doesn't contribute to output when `input.connect(output)` is called.
  // For a typical compressor use case (affecting 100% of signal passing through), we make `input.gain` 0.
  
  input.gain.value = 0; // No direct pass-through from `input`'s gain stage itself.
                        // Signal ONLY goes through compressor chain.
  // Output from effect chain (output) feeds back to main io node (input).
  output.connect(input);


  parentEl.innerHTML = `<h3>Compressor ${id}</h3>`;
  slider(parentEl, 'Threshold (dB)', -100, 0, compressorNode.threshold.value, 1, v => compressorNode.threshold.value = v);
  slider(parentEl, 'Knee (dB)', 0, 40, compressorNode.knee.value, 1, v => compressorNode.knee.value = v);
  slider(parentEl, 'Ratio', 1, 20, compressorNode.ratio.value, 0.1, v => compressorNode.ratio.value = v);
  slider(parentEl, 'Attack (s)', 0, 1, compressorNode.attack.value, 0.001, v => compressorNode.attack.value = v);
  slider(parentEl, 'Release (s)', 0, 1, compressorNode.release.value, 0.01, v => compressorNode.release.value = v);
  slider(parentEl, 'Makeup Gain', 0, 5, makeupGain.gain.value, 0.1, v => makeupGain.gain.value = v);

  return {
    id,
    audioNode: input,
    threshold: compressorNode.threshold,
    knee: compressorNode.knee,
    ratio: compressorNode.ratio,
    attack: compressorNode.attack,
    release: compressorNode.release,
    makeup: makeupGain.gain,
    dispose() {
      input.disconnect();
      output.disconnect();
      compressorNode.disconnect();
      makeupGain.disconnect();
      parentEl.replaceChildren();
      console.log(`[Compressor ${id}] disposed`);
    }
  };
}