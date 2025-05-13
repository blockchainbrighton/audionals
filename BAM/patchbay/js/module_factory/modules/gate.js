// js/module_factory/modules/gate.js
import { createSlider } from '../ui/slider.js'; // Only import createSlider

export function createGateModule(audioCtx, parentEl, id) {
  // 1. Audio Nodes
  const input = audioCtx.createGain();    // Module's main I/O node (insert style)
  const outputInternal = audioCtx.createGain(); // Collects processed signal before routing back

  const gateGain = audioCtx.createGain(); // The actual gain node acting as the gate
  const analyserNode = audioCtx.createAnalyser();

  analyserNode.fftSize = 256; // Smaller for faster response
  const bufferLength = analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  // 2. State
  let animationFrameId = null;
  let currentThreshold = -50; // dB
  let attackTime = 0.01;      // seconds
  let releaseTime = 0.05;     // seconds
  let isGateOpen = false;

  // 3. Audio Path (Insert Style: input -> effects -> back to input)
  // Path: input (source) -> analyserNode (for level detection)
  //       input (source) -> gateGain (actual gating) -> outputInternal (collects wet) -> input (module out)
  input.connect(analyserNode);  // analyser listens to the input
  input.connect(gateGain);      // signal also goes to the gate itself
  gateGain.connect(outputInternal);
  outputInternal.connect(input); // Processed signal back to the main I/O node

  // Default to fully wet; input.gain controls dry passthrough (set to 0 for typical gate)
  input.gain.value = 0;   // No direct dry pass-through from the main 'input' gain stage
  gateGain.gain.value = 0; // Start gate closed

  // 4. UI Elements Management
  const uiElements = [];

  // 5. Core Logic (Level Processing)
  function processAudioLevel() {
    analyserNode.getByteTimeDomainData(dataArray);
    let sumSquares = 0.0;
    for (let i = 0; i < bufferLength; i++) {
      const normSample = (dataArray[i] / 128.0) - 1.0;
      sumSquares += normSample * normSample;
    }
    const rms = Math.sqrt(sumSquares / bufferLength);
    const db = 20 * Math.log10(rms || 0.00001); // Use a floor to avoid log(0)

    const now = audioCtx.currentTime;
    if (db > currentThreshold) {
      if (!isGateOpen) {
        gateGain.gain.cancelScheduledValues(now);
        gateGain.gain.setTargetAtTime(1.0, now, attackTime); // Open gate
        isGateOpen = true;
      }
    } else {
      if (isGateOpen) {
        gateGain.gain.cancelScheduledValues(now);
        gateGain.gain.setTargetAtTime(0.0, now, releaseTime); // Close gate
        isGateOpen = false;
      }
    }
    animationFrameId = requestAnimationFrame(processAudioLevel);
  }

  processAudioLevel(); // Start the processing loop

  // 6. Create UI
  const titleEl = Object.assign(document.createElement('h3'), {
    textContent: `Gate ${id}`
  });
  parentEl.appendChild(titleEl);
  uiElements.push(titleEl);

  const thresholdSliderWrapper = createSlider({
    parent: parentEl,
    labelText: 'Threshold',
    min: -100, max: 0, step: 1, value: currentThreshold,
    unit: 'dB',
    decimalPlaces: 0,
    onInput: v => currentThreshold = v
  });
  uiElements.push(thresholdSliderWrapper);

  const attackSliderWrapper = createSlider({
    parent: parentEl,
    labelText: 'Attack',
    min: 0.001, max: 0.5, step: 0.001, value: attackTime,
    unit: 's',
    decimalPlaces: 3,
    onInput: v => attackTime = v
  });
  uiElements.push(attackSliderWrapper);

  const releaseSliderWrapper = createSlider({
    parent: parentEl,
    labelText: 'Release',
    min: 0.005, max: 1.0, step: 0.005, value: releaseTime, // Min release usually slightly > 0
    unit: 's',
    decimalPlaces: 3,
    onInput: v => releaseTime = v
  });
  uiElements.push(releaseSliderWrapper);

  // 7. Return Module API
  return {
    id,
    audioNode: input, // Main I/O node
    // Exposing internal state for direct manipulation (less common for gate params via LFO)
    // params: {
    //   setThreshold: (val) => currentThreshold = val,
    //   getThreshold: () => currentThreshold,
    //   // ... similar for attack/release
    // },
    dispose() {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = null;

      // Disconnect audio nodes
      input.disconnect();
      // analyserNode was connected from input, gateGain from input
      // outputInternal was connected from gateGain
      // They will be disconnected when input is disconnected.
      // For thoroughness:
      analyserNode.disconnect();
      gateGain.disconnect();
      outputInternal.disconnect();


      // Remove UI elements
      uiElements.forEach(el => el.remove());
      console.log(`Gate module ${id} disposed.`);
    }
  };
}